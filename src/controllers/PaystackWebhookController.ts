import crypto from 'crypto';
import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';

import { PaymentReconciliationService } from '../services/PaymentReconciliationService';
import { SettlementReconciliationService } from '../services/SettlementReconciliationService';
import { sequelize } from '../config/db';
import Transaction from '../models/Transaction';

type PaystackWebhookEvent = {
    event?: string;
    data?: Record<string, any> & {
        reference?: string;
        metadata?: { invoiceId?: string | number };
    };
};

export class PaystackWebhookController {
    private readonly reconciliation = new PaymentReconciliationService();
    // NEW: After Paystack confirms the charge, immediately check whether the
    // transaction has appeared in a merchant subaccount settlement batch.
    private readonly settlement = new SettlementReconciliationService();

    private verifySignature(rawBody: Buffer, signature: string): boolean {
        const secret = String(process.env.PAYSTACK_SECRET_KEY || '');
        if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');
        const expected = crypto.createHmac('sha512', secret)
            .update(rawBody).digest('hex');
        const expectedBuffer = Buffer.from(expected, 'utf8');
        const receivedBuffer = Buffer.from(signature, 'utf8');
        return expectedBuffer.length === receivedBuffer.length &&
            crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
    }

    private eventReference(data: Record<string, any> = {}): string {
        return String(
            data.reference ||
            data.transaction_reference ||
            data.merchant_transaction_reference ||
            data.transaction?.reference ||
            ''
        ).trim();
    }

    private amountInNaira(value: unknown): number {
        const amountKobo = Number(value || 0);
        return Number.isFinite(amountKobo) ? amountKobo / 100 : 0;
    }

    private async recordRefund(eventName: string, data: Record<string, any>): Promise<void> {
        const reference = this.eventReference(data);
        if (!reference) return;

        const transaction = await Transaction.findOne({ where: { reference } });
        if (!transaction) return;

        const status = eventName === 'refund.processed'
            ? 'succeeded'
            : eventName === 'refund.failed'
                ? 'failed'
                : 'pending';
        const amount = this.amountInNaira(
            data.amount ?? data.refund_amount ?? data.transaction?.amount
        );

        const updated = await sequelize.query(
            `
            UPDATE refunds
            SET status = :status,
                amount = CASE WHEN :amount > 0 THEN :amount ELSE amount END,
                processed_at = CASE WHEN :status IN ('succeeded','failed') THEN NOW() ELSE processed_at END,
                updated_at = NOW()
            WHERE id = (
                SELECT id FROM refunds
                WHERE transaction_id = :transactionId
                ORDER BY created_at DESC
                LIMIT 1
            )
            RETURNING id
            `,
            {
                type: QueryTypes.SELECT,
                replacements: { status, amount, transactionId: transaction.id },
            }
        ) as any[];

        if (!updated.length) {
            await sequelize.query(
                `
                INSERT INTO refunds (transaction_id, amount, reason, status, processed_at)
                VALUES (
                    :transactionId,
                    :amount,
                    'Recorded from Paystack webhook',
                    :status,
                    CASE WHEN :status IN ('succeeded','failed') THEN NOW() ELSE NULL END
                )
                `,
                {
                    type: QueryTypes.INSERT,
                    replacements: {
                        transactionId: transaction.id,
                        amount: amount || Number(transaction.amount),
                        status,
                    },
                }
            );
        }
    }

    private async recordDispute(eventName: string, data: Record<string, any>): Promise<void> {
        const reference = this.eventReference(data);
        if (!reference) return;

        const transaction = await Transaction.findOne({ where: { reference } });
        if (!transaction) return;

        const resolution = String(data.resolution || '').toLowerCase();
        const status = eventName === 'charge.dispute.resolve'
            ? resolution.includes('won')
                ? 'won'
                : resolution.includes('lost') || resolution === 'merchant-accepted'
                    ? 'lost'
                    : 'canceled'
            : 'open';
        const amount = this.amountInNaira(
            data.refund_amount ?? data.amount ?? data.transaction?.amount
        ) || Number(transaction.amount);
        const reasonCode = String(
            data.category || data.reason_code || data.reason || 'paystack-dispute'
        ).slice(0, 120);

        const existing = await sequelize.query(
            `
            SELECT id
            FROM disputes
            WHERE transaction_id = :transactionId
              AND status = 'open'
            ORDER BY opened_at DESC
            LIMIT 1
            `,
            {
                type: QueryTypes.SELECT,
                replacements: { transactionId: transaction.id },
            }
        ) as Array<{ id: number }>;

        if (existing.length) {
            await sequelize.query(
                `
                UPDATE disputes
                SET status = :status,
                    amount = :amount,
                    reason_code = :reasonCode,
                    closed_at = CASE WHEN :status <> 'open' THEN NOW() ELSE closed_at END,
                    updated_at = NOW()
                WHERE id = :id
                `,
                {
                    type: QueryTypes.UPDATE,
                    replacements: { id: existing[0].id, status, amount, reasonCode },
                }
            );
            return;
        }

        if (status === 'open') {
            await sequelize.query(
                `
                INSERT INTO disputes (transaction_id, amount, reason_code, status)
                VALUES (:transactionId, :amount, :reasonCode, 'open')
                `,
                {
                    type: QueryTypes.INSERT,
                    replacements: { transactionId: transaction.id, amount, reasonCode },
                }
            );
        }
    }

    async handleWebhook(req: Request, res: Response): Promise<Response> {
        try {
            if (!Buffer.isBuffer(req.body)) return res.sendStatus(400);
            const header = req.headers['x-paystack-signature'];
            const signature = Array.isArray(header) ? header[0] : header;
            if (!signature || !this.verifySignature(req.body, signature)) {
                return res.sendStatus(401);
            }

            let event: PaystackWebhookEvent;
            try {
                event = JSON.parse(req.body.toString('utf8'));
            } catch {
                return res.sendStatus(400);
            }

            const eventName = String(event.event || '');
            const eventData = event.data || {};

            if (eventName.startsWith('refund.')) {
                await this.recordRefund(eventName, eventData);
                return res.sendStatus(200);
            }

            if (eventName.startsWith('charge.dispute.')) {
                await this.recordDispute(eventName, eventData);
                return res.sendStatus(200);
            }

            if (eventName !== 'charge.success') return res.sendStatus(200);
            const reference = String(event.data?.reference || '').trim();
            const invoiceId = Number(event.data?.metadata?.invoiceId);
            if (!reference || !Number.isInteger(invoiceId) || invoiceId <= 0) {
                console.warn('Paystack charge.success missing invoice/reference');
                return res.sendStatus(200);
            }

            const result = await this.reconciliation.reconcileInvoice(invoiceId, reference);
            // NEW: Persist settlement_status/settlement_id when Paystack has
            // already included this transaction in a settlement batch. If it
            // is not settled yet, this records `pending`; dashboard polling
            // will retry the reconciliation later.
            await this.settlement.reconcile(result.intent);
            console.info(`Payment verified and reconciled: ${reference}`);
            return res.sendStatus(200);
        } catch (error) {
            console.error('Paystack webhook processing error:',
                error instanceof Error ? error.message : 'Unknown error');
            return res.sendStatus(500);
        }
    }
}
