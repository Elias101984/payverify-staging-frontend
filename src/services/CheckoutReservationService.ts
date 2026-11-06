import { sequelize } from "../config/db";
import { Invoice } from "../models/Invoice";
import { PaymentIntent } from "../models/PaymentIntent";
import PurchaseOrder from "../models/PurchaseOrder";
import Transaction from "../models/Transaction";
import Payment from "../models/Payment";

export class CheckoutReservationService {
    static async reserveCheckout(params: {
        invoiceId: number;
        paymentIntentId: string;
        reference: string;
        customerEmail: string | null;
        customerPhone: string | null;
        verifiedFailedReference?: string;
        amountNaira: number;
    }): Promise<void> {
        await sequelize.transaction(async (transaction) => {
            // Maintain the same lock order as payment reconciliation.
            const intent = await PaymentIntent.findByPk(
                params.paymentIntentId,
                {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                }
            );

            if (!intent) {
                throw new Error("Payment intent not found");
            }

            if (intent.status !== "pending") {
                throw new Error("Payment intent is no longer payable");
            }

            if (
                intent.expires_at &&
                new Date(intent.expires_at).getTime() <= Date.now()
            ) {
                throw new Error("Payment intent has expired");
            }

            const order = await PurchaseOrder.findByPk(
                intent.purchase_order_id,
                {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                }
            );

            if (!order) {
                throw new Error("Purchase order not found");
            }

            const orderStatus = String(order.status || "")
                .trim()
                .toLowerCase();

            if (
                ["cancelled", "paid", "completed"].includes(orderStatus)
            ) {
                throw new Error("Purchase order is not payable");
            }

            const invoice = await Invoice.findByPk(
                params.invoiceId,
                {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                }
            );

            if (
                !invoice ||
                String(invoice.payment_intent_id) !== intent.id ||
                Number(invoice.merchant_id) !== Number(intent.merchant_id)
            ) {
                throw new Error("Invoice ownership mismatch");
            }

            if (
                invoice.status === "cancelled" ||
                invoice.status === "paid"
            ) {
                throw new Error("Invoice is no longer payable");
            }

            const existingReference =
                String(intent.gateway_reference || "").trim();

            const verifiedFailedReference =
                String(params.verifiedFailedReference || "").trim();

            if (existingReference) {
                if (
                    !verifiedFailedReference ||
                    existingReference !== verifiedFailedReference
                ) {
                    throw new Error(
                        "A payment attempt already exists. Verify its status before retrying."
                    );
                }
            } else if (intent.payment_started_at) {
                throw new Error(
                    "Payment initiation requires review before retrying."
                );
            }

            const expectedKobo = Math.round(Number(intent.amount) * 100);
            if (
                !Number.isFinite(expectedKobo) || expectedKobo <= 0 ||
                expectedKobo !== Math.round(Number(invoice.amount) * 100) ||
                expectedKobo !== Math.round(params.amountNaira * 100) ||
                Number(order.merchantId) !== Number(intent.merchant_id)
            ) {
                throw new Error("Checkout amount or merchant mismatch");
            }

            // Records are committed with the reservation before Paystack is called.
            const internalTransaction = await Transaction.create({
                amount: params.amountNaira,
                status: "pending",
                merchantId: intent.merchant_id,
                reference: params.reference,
            }, { transaction });
            await Payment.create({
                transactionId: internalTransaction.id,
                bankAccountId: null,
                amount: params.amountNaira,
                method: "paystack",
                status: "initiated",
            }, { transaction });

            await intent.update(
                {
                    gateway_reference: params.reference,
                    gateway_authorization_url: null,
                    gateway_access_code: null,
                    payment_started_at: new Date(),
                    customer_email: params.customerEmail,
                    customer_phone: params.customerPhone,
                },
                { transaction }
            );

            await invoice.update(
                {
                    status: "processing",
                    customer_email: params.customerEmail || undefined,
                },
                { transaction }
            );
        });
    }
    static async cancelUnstartedOrder(orderId: number, merchantId: number): Promise<"missing" | "cancelled"> {
        return sequelize.transaction(async (transaction) => {
            const intents = await PaymentIntent.findAll({
                where: { purchase_order_id: orderId, merchant_id: merchantId },
                order: [["id", "ASC"]],
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            const order = await PurchaseOrder.findOne({
                where: { id: orderId, merchantId },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!order) return "missing";
            const status = String(order.status || "").toLowerCase();
            if (["paid", "completed"].includes(status)) {
                throw new Error("Paid or completed orders cannot be cancelled");
            }
            if (intents.some(intent =>
                intent.status === "paid" ||
                Boolean(intent.payment_started_at || intent.gateway_reference)
            )) {
                throw new Error("Payment has already started for this order. Verify payment before cancelling.");
            }
            if (status !== "cancelled") {
                await order.update({ status: "cancelled" }, { transaction });
            }
            for (const intent of intents) {
                if (intent.status === "pending") {
                    await intent.update({ status: "expired" }, { transaction });
                }
                const invoices = await Invoice.findAll({
                    where: { payment_intent_id: intent.id, merchant_id: merchantId },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                for (const invoice of invoices) {
                    if (invoice.status === "paid") {
                        throw new Error("Paid invoice cannot be cancelled");
                    }
                    await invoice.update({ status: "cancelled" }, { transaction });
                }
            }
            return "cancelled";
        });
    }

}