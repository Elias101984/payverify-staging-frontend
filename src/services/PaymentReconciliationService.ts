import { Transaction as SequelizeTransaction } from 'sequelize';

import { sequelize } from '../config/db';
import { Invoice } from '../models/Invoice';
import Payment from '../models/Payment';
import { PaymentIntent } from '../models/PaymentIntent';
import PurchaseOrder from '../models/PurchaseOrder';
import Transaction from '../models/Transaction';
import { sendInvoicePaidEmail } from './_emailService';
import { PaystackService } from './PaystackService';
import { VerifiedChargeRegistrationService } from './VerifiedChargeRegistrationService';
import { sendPaidReceiptSms } from './SmsReceiptService';

/**
 * Converts a Paystack success into PayVerify's paid state. It is deliberately
 * shared by the signed webhook and the callback/status poll so local testing
 * can recover when Paystack cannot deliver webhooks to localhost.
 */
export class PaymentReconciliationService {
    private readonly paystack = new PaystackService();
    private readonly chargeRegistration = new VerifiedChargeRegistrationService();

    async reconcileInvoice(invoiceId: number, reference?: string) {
        const invoice = await Invoice.findByPk(invoiceId);
        if (!invoice) throw new Error('Invoice not found');

        const intent = await PaymentIntent.findByPk(invoice.payment_intent_id);
        if (!intent) throw new Error('Payment intent not found');

        const expectedReference =
            String(intent.gateway_reference || intent.token || '').trim();
        const candidateReference = String(reference ?? expectedReference).trim();

        if (!expectedReference || !candidateReference ||
            candidateReference !== expectedReference) {
            throw new Error('Payment reference mismatch');
        }

        // Preserve the existing paid-state response.
        // Historical paid charges require a separate verified backfill.
        if (intent.status === 'paid' || invoice.status === 'paid') {
            return { paid: true, transitioned: false, invoice, intent };
        }

        const verified = await this.paystack.verifyTransaction(candidateReference);
        if (verified.status !== true || verified.data?.status !== 'success') {
            return { paid: false, transitioned: false, invoice, intent };
        }

        const metadataInvoiceId = Number(verified.data.metadata?.invoiceId);
        const expectedKobo = Math.round(Number(intent.amount) * 100);
        const invoiceKobo = Math.round(Number(invoice.amount) * 100);

        if (
            verified.data.reference !== candidateReference ||
            metadataInvoiceId !== Number(invoice.id) ||
            verified.data.currency !== 'NGN' ||
            Number(verified.data.amount) !== expectedKobo ||
            invoiceKobo !== expectedKobo ||
            Number(invoice.merchant_id) !== Number(intent.merchant_id)
        ) {
            throw new Error('Verified payment details do not match this invoice');
        }

        const gatewayTransactionId = Number(verified.data.id);
        if (!Number.isSafeInteger(gatewayTransactionId) || gatewayTransactionId <= 0) {
            throw new Error('Verified Paystack transaction ID is missing or invalid');
        }

        let transitioned = false;
        const paidAt = verified.data.paid_at
            ? new Date(verified.data.paid_at)
            : new Date();

        await sequelize.transaction(async (dbTransaction: SequelizeTransaction) => {
            const lockedIntent = await PaymentIntent.findByPk(intent.id, {
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE,
            });
            if (!lockedIntent) throw new Error('Payment intent disappeared');
            const alreadyPaid = lockedIntent.status === 'paid';
            if (lockedIntent.gateway_reference !== candidateReference) {
                throw new Error('Payment reference changed before reconciliation');
            }

            const order = await PurchaseOrder.findByPk(
                lockedIntent.purchase_order_id,
                { transaction: dbTransaction, lock: dbTransaction.LOCK.UPDATE }
            );
            const lockedInvoice = await Invoice.findByPk(invoice.id, {
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE,
            });
            if (
                !lockedInvoice ||
                lockedInvoice.payment_intent_id !== lockedIntent.id ||
                Number(lockedInvoice.merchant_id) !== Number(lockedIntent.merchant_id) ||
                Math.round(Number(lockedInvoice.amount) * 100) !== expectedKobo ||
                Math.round(Number(lockedIntent.amount) * 100) !== expectedKobo
            ) {
                throw new Error('Invoice or payment ownership changed before reconciliation');
            }
            await this.chargeRegistration.register(
                {
                    paymentIntentId: lockedIntent.id,
                    merchantId: Number(lockedIntent.merchant_id),
                    reference: candidateReference,
                    paystackTransactionId: gatewayTransactionId,
                    amountKobo: expectedKobo,
                    currency: verified.data.currency,
                    verifiedAt: paidAt,
                },
                dbTransaction
            );

            if (alreadyPaid) return;

            transitioned = true;
            await lockedIntent.update(
                { status: 'paid', paid_at: paidAt },
                { transaction: dbTransaction }
            );
            await lockedInvoice.update(
    {
        status: 'paid',
        amountPaid: Number(lockedInvoice.amount),
        balanceDue: 0
    },
    { transaction: dbTransaction }
);
            if (order) {
                const currentOrderStatus = String(order.status || '').trim().toLowerCase();
                if (currentOrderStatus !== 'cancelled') {
                    await order.update({ status: 'paid' }, { transaction: dbTransaction });
                }
            }

            const internalTransaction = await Transaction.findOne({
                where: { reference: candidateReference },
                transaction: dbTransaction,
                lock: dbTransaction.LOCK.UPDATE,
            });
            if (internalTransaction) {
                await internalTransaction.update(
                    { status: 'completed' },
                    { transaction: dbTransaction }
                );
                const payment = await Payment.findOne({
                    where: { transactionId: internalTransaction.id },
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });
                if (payment) {
                    await payment.update(
                        { status: 'success', paidAt },
                        { transaction: dbTransaction }
                    );
                }
            }
        });

        if (transitioned) {
            const baseUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173')
                .replace(/\/+$/, '');
            const receiptUrl = `${baseUrl}/pay/${encodeURIComponent(String(invoice.public_token || ''))}`;
            if (intent.customer_email) {
                void sendInvoicePaidEmail(
                    intent.customer_email,
                    invoice.id,
                    Number(invoice.amount),
                    receiptUrl
                );
            }
            if (intent.customer_phone) {
                void sendPaidReceiptSms({
                    to: intent.customer_phone,
                    invoiceId: invoice.id,
                    amount: Number(invoice.amount),
                    receiptUrl,
                });
            }
        }

        await Promise.all([invoice.reload(), intent.reload()]);
        return { paid: true, transitioned, invoice, intent };
    }
}
