import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/db';

export interface VerifiedChargeInput {
    paymentIntentId: string;
    merchantId: number;
    reference: string;
    paystackTransactionId: number;
    amountKobo: number;
    currency: string;
    verifiedAt: Date;
}

export class VerifiedChargeRegistrationService {
    async register(
        input: VerifiedChargeInput,
        transaction: Transaction
    ): Promise<{ chargeId: string; created: boolean }> {
        const {
            paymentIntentId,
            merchantId,
            reference,
            paystackTransactionId,
            amountKobo,
            currency,
            verifiedAt,
        } = input;

        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentIntentId) ||
            !Number.isSafeInteger(merchantId) || merchantId <= 0 ||
            !reference.trim() || reference.length > 255 ||
            !Number.isSafeInteger(paystackTransactionId) || paystackTransactionId <= 0 ||
            !Number.isSafeInteger(amountKobo) || amountKobo <= 0 ||
            currency !== 'NGN' ||
            !(verifiedAt instanceof Date) || Number.isNaN(verifiedAt.getTime())
        ) {
            throw new Error('Invalid verified charge data');
        }

        const rows = await sequelize.query<{ id: string }>(
            `
            INSERT INTO paystack_charges (
                payment_intent_id,
                merchant_id,
                paystack_reference,
                paystack_transaction_id,
                amount_kobo,
                currency,
                verified_at
            )
            VALUES (
                :paymentIntentId,
                :merchantId,
                :reference,
                :paystackTransactionId,
                :amountKobo,
                :currency,
                :verifiedAt
            )
            ON CONFLICT (paystack_reference) DO NOTHING
            RETURNING id::text AS id
            `,
            {
                type: QueryTypes.SELECT,
                transaction,
                replacements: {
                    paymentIntentId,
                    merchantId,
                    reference: reference.trim(),
                    paystackTransactionId,
                    amountKobo,
                    currency,
                    verifiedAt,
                },
            }
        );

        if (rows.length) {
            return { chargeId: rows[0].id, created: true };
        }

        const existing = await sequelize.query<{
            id: string;
            payment_intent_id: string;
            merchant_id: number;
            paystack_transaction_id: string;
            amount_kobo: string;
            currency: string;
        }>(
            `
            SELECT
                id::text AS id,
                payment_intent_id::text AS payment_intent_id,
                merchant_id,
                paystack_transaction_id::text AS paystack_transaction_id,
                amount_kobo::text AS amount_kobo,
                currency
            FROM paystack_charges
            WHERE paystack_reference = :reference
            `,
            {
                type: QueryTypes.SELECT,
                transaction,
                replacements: { reference: reference.trim() },
            }
        );

        const charge = existing[0];

        if (
            !charge ||
            charge.payment_intent_id !== paymentIntentId ||
            Number(charge.merchant_id) !== merchantId ||
            charge.paystack_transaction_id !== String(paystackTransactionId) ||
            charge.amount_kobo !== String(amountKobo) ||
            charge.currency.trim() !== currency
        ) {
            throw new Error('Verified charge identity conflict');
        }

        return { chargeId: charge.id, created: false };
    }
}
