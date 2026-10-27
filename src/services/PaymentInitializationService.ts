import crypto from "crypto";
import { Invoice } from "../models/Invoice";
import Merchant from "../models/Merchant";
import Payment from "../models/Payment";
import { PaymentIntent } from "../models/PaymentIntent";
import Transaction from "../models/Transaction";
import { PaystackService } from "./PaystackService";

const paystack = new PaystackService();

export class PaymentInitializationService {
    async initializeInvoicePayment(payload: {
        invoiceId: number;
        email?: string;
        phone?: string;
    }) {
        const { invoiceId } = payload;
        const receiptEmail = String(payload.email || '').trim() || null;
        const receiptPhone = String(payload.phone || '').trim() || null;

        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            throw new Error("Invoice not found");
        }

        if (invoice.status === "paid") {
            throw new Error("Invoice already paid");
        }

        if (invoice.status === "cancelled") {
            throw new Error(
                "This order was cancelled and can no longer be paid. Create a new order."
            );
        }

        const amountNaira = Number(invoice.amount);

        if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
            throw new Error("Invalid invoice amount");
        }

        const paymentIntentId =
            String(invoice.payment_intent_id || "").trim();

        if (!paymentIntentId) {
            throw new Error("Invoice payment intent is missing");
        }

        const paymentIntent =
            await PaymentIntent.findByPk(paymentIntentId);

        if (!paymentIntent) {
            throw new Error("Payment intent not found");
        }

        if (paymentIntent.status === "paid") {
            throw new Error("Payment already completed");
        }

        if (!invoice.public_token) {
            throw new Error("Invoice public token is missing");
        }

        // Settlement must be configured before starting or resuming checkout.
        // Manual merchant approval is not required.
        const paymentMerchant = await Merchant.findByPk(invoice.merchant_id);

        if (!paymentMerchant) {
            throw new Error("Merchant not found");
        }

        if (!String(paymentMerchant.paystack_subaccount_code || "").trim()) {
            throw new Error("Merchant settlement subaccount not configured");
        }
        // Check the previous attempt before reusing or replacing checkout.
        if (paymentIntent.gateway_reference) {
            if (
                Number(invoice.merchant_id) !== Number(paymentIntent.merchant_id) ||
                Math.round(Number(paymentIntent.amount) * 100) !==
                Math.round(amountNaira * 100)
            ) {
                throw new Error("Payment ownership or amount mismatch");
            }

            // Verification errors stop checkout; never assume an unknown attempt failed.
            const verified = await paystack.verifyTransaction(
                paymentIntent.gateway_reference
            );

            if (
                !verified.status ||
                verified.data?.reference !== paymentIntent.gateway_reference ||
                verified.data?.currency !== "NGN" ||
                Number(verified.data?.amount) !== Math.round(amountNaira * 100)
            ) {
                throw new Error("Unable to confirm the previous payment attempt");
            }

            const previousStatus = String(
                verified.data.status || ""
            ).toLowerCase();

            if (previousStatus === "success") {
                throw new Error(
                    "Payment already received. Refresh the invoice while confirmation completes."
                );
            }

            if (["pending", "processing", "queued"].includes(previousStatus)) {
                throw new Error(
                    "Your previous payment is still processing. Please wait and refresh."
                );
            }

            if (previousStatus === "ongoing") {
                if (!paymentIntent.gateway_authorization_url) {
                    throw new Error("Payment is ongoing. Please complete the existing checkout.");
                }

                return {
                    reference: paymentIntent.gateway_reference,
                    authorization_url: paymentIntent.gateway_authorization_url,
                    access_code: paymentIntent.gateway_access_code || undefined,
                    resumed: true,
                };
            }

            if (!["failed", "abandoned"].includes(previousStatus)) {
                throw new Error(
                    "The previous payment needs review before another attempt can begin."
                );
            }

            // A confirmed failed/abandoned attempt falls through to initialization
            // below, creating a fresh reference for the same order and invoice.
        }

        if (
            Number(invoice.merchant_id) !==
            Number(paymentIntent.merchant_id)
        ) {
            throw new Error("Payment ownership mismatch");
        }

        const expectedAmountKobo =
            Math.round(Number(paymentIntent.amount) * 100);

        const invoiceAmountKobo =
            Math.round(amountNaira * 100);

        if (
            !Number.isFinite(expectedAmountKobo) ||
            expectedAmountKobo <= 0 ||
            expectedAmountKobo !== invoiceAmountKobo
        ) {
            throw new Error("Payment amount mismatch");
        }

        const merchant = await Merchant.findByPk(
            invoice.merchant_id
        );

        if (!merchant) {
            throw new Error("Merchant not found");
        }

        await invoice.update({
            customer_email: receiptEmail || undefined,
            status: "processing",
        });

        // Paystack requires an email even when the customer chooses a printed
        // or SMS receipt. This address is used only for gateway initialization;
        // the optional customer address remains null in PayVerify.
        const gatewayEmail =
            receiptEmail ||
            String(merchant.email || '').trim() ||
            String(process.env.PAYSTACK_FALLBACK_EMAIL || '').trim() ||
            'payments@payverify.ng';

        // The public token identifies the PayVerify invoice page. The gateway
        // reference identifies this Paystack attempt; they are deliberately
        // different so an order can safely resume without creating a new order.
        const reference =
            `PV_${invoice.id}_${crypto.randomBytes(10).toString("hex")}`;

        const transaction = await Transaction.create({
            amount: amountNaira,
            status: "pending",
            merchantId: invoice.merchant_id,
            reference,
        });

        const payment = await Payment.create({
            transactionId: transaction.id,
            bankAccountId: null,
            amount: amountNaira,
            method: "paystack",
            status: "initiated",
        });

        const frontendUrl =
            String(
                process.env.FRONTEND_URL ||
                "http://localhost:5173"
            ).replace(/\/+$/, "");

        const callbackUrl =
            `${frontendUrl}/pay/${encodeURIComponent(invoice.public_token)}`;

        const subaccount =
            String(merchant.paystack_subaccount_code || "").trim();

        const platformFeeKobo = Math.max(
            0,
            Math.round(Number(merchant.platform_fee_kobo || 0))
        );

        if (platformFeeKobo >= expectedAmountKobo) {
            await Promise.all([
                transaction.update({ status: "failed" }),
                payment.update({ status: "failed" }),
                invoice.update({ status: "pending" }),
            ]);
            throw new Error("Platform fee must be less than the invoice amount");
        }

        try {
            const response = await paystack.initializePayment({
                email: gatewayEmail,
                amountNaira,
                reference,
                callback_url: callbackUrl,
                metadata: {
                    invoiceId,
                    paymentIntentId: paymentIntent.id,
                    purchaseOrderId: paymentIntent.purchase_order_id,
                    merchantId: invoice.merchant_id,
                    source: "payverify_invoice",
                },
                ...(subaccount
                    ? {
                        subaccount,
                        transaction_charge: platformFeeKobo,
                        bearer: merchant.paystack_fee_bearer,
                    }
                    : {}),
            });

            await paymentIntent.update({
                customer_email: receiptEmail,
                customer_phone: receiptPhone,
                gateway_reference: reference,
                gateway_authorization_url:
                    response.data.authorization_url,
                gateway_access_code:
                    response.data.access_code,
                payment_started_at: new Date(),
            });

            return {
                reference,
                authorization_url:
                    response.data.authorization_url,
                access_code:
                    response.data.access_code,
                resumed: false,
            };
        } catch (error) {
            await Promise.all([
                transaction.update({ status: "failed" }),
                payment.update({ status: "failed" }),
                invoice.update({ status: "pending" }),
            ]);

            throw error;
        }
    }
}
