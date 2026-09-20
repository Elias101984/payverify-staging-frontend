// =============================================================================
// InvoicePaymentController.ts (V2 — VERIFICATION-FIRST PAYMENT FLOW)
// =============================================================================
//
// PURPOSE
// -----------------------------------------------------------------------------
// Handles invoice payment flows and Paystack webhooks.
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ Kept legacy initializeInvoicePayment() so existing working flows do not break.
// ✅ Added startPayment() for the new verification-first flow.
// ✅ Added continuePayment() for Paystack initialization after user acknowledgment.
// ✅ Moved Paystack initialization logic for the V2 flow into PaymentInitializationService.
// ✅ Kept the existing hardened Paystack webhook logic intact.
//
// WHY
// -----------------------------------------------------------------------------
// The old endpoint verified the merchant and initialized Paystack in the same
// request. That caused the frontend to redirect to Paystack before showing the
// PayVerify verification modal.
//
// The new V2 flow is:
// 1) POST /api/invoices/:invoiceId/payments/start
// 2) Frontend shows VerificationModal
// 3) POST /api/invoices/:invoiceId/payments/continue
// 4) Paystack webhook marks invoice paid
//
// =============================================================================

import { Request, Response } from "express";
import crypto from "crypto";

import { PaystackService } from "../services/PaystackService";
import { Invoice } from "../models/Invoice";
import Payment from "../models/Payment";
import Transaction from "../models/Transaction";

// =============================================================================
// NEW: PAYMENT STATUS PROPAGATION MODELS
// -----------------------------------------------------------------------------
// Used only by the Paystack webhook so a confirmed payment updates the complete
// business chain:
//
// Invoice -> PaymentIntent -> PurchaseOrder
// =============================================================================
import { PaymentIntent } from "../models/PaymentIntent";
import PurchaseOrder from "../models/PurchaseOrder";
import VerificationGatewayService from "../services/VerificationGatewayService";
import { PaymentInitializationService } from "../services/PaymentInitializationService";

import {
    sendInvoicePaidEmail,
    sendPaymentFailedEmail,
} from "../services/_emailService";

const paystack = new PaystackService();

const verificationGateway = new VerificationGatewayService();

const paymentInitializationService =
    new PaymentInitializationService();

// =============================================================================
// Helpers
// =============================================================================

function buildReference(invoiceId: number): string {
    return `INV_${invoiceId}_${Date.now()}`;
}

function verifyPaystackSignature(
    rawBody: Buffer,
    signature?: string
): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";

    if (!signature || !secret) {
        return false;
    }

    const hash = crypto
        .createHmac("sha512", secret)
        .update(rawBody)
        .digest("hex");

    return hash === signature;
}

function extractInvoiceId(reference: string): number | null {
    try {
        const parts = reference.split("_");
        const id = Number(parts[1]);

        return Number.isFinite(id) ? id : null;
    } catch {
        return null;
    }
}

// =============================================================================
// LEGACY PAYMENT INITIALIZATION
// POST /api/invoices/:invoiceId/paystack/initialize
//
// WHY THIS STILL EXISTS
// -----------------------------------------------------------------------------
// This is the original working endpoint. We are keeping it temporarily so that
// existing flows do not break while the new verification-first V2 flow is tested.
// Once V2 is stable, this endpoint can be deprecated.
// =============================================================================

export const initializeInvoicePayment = async (
    req: Request,
    res: Response
) => {
    try {
        const invoiceId = Number(req.params.invoiceId);

        if (!invoiceId || Number.isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: "Valid invoiceId is required.",
            });
        }

        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
        }

        const invoiceToken =
            String(req.body?.invoiceToken || "").trim();

        if (
            !invoiceToken ||
            !invoice.public_token ||
            invoice.public_token !== invoiceToken
        ) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found.",
            });
        }

        if (invoice.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "Invoice already paid",
            });
        }

        if (invoice.status === "cancelled") {
            return res.status(409).json({
                success: false,
                message: "This order was cancelled and can no longer be paid.",
            });
        }

        const customerEmail =
            String(req.body?.email || invoice.customer_email || "").trim();

        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                message: "Customer email is required",
            });
        }

        // SECURITY:
        // Verify the merchant server-side before creating a Paystack checkout.
        // The browser is never trusted to tell us whether a merchant is verified.
        let verification;

        try {
            verification = await verificationGateway.verifyMerchant({
                merchantId: invoice.merchant_id,
            });
        } catch (error) {
            console.error("Verification API unavailable:", error);

            return res.status(503).json({
                success: false,
                message: "Verification service is currently unavailable.",
            });
        }

        if (!verification.verified) {
            return res.status(400).json({
                success: false,
                message: "Merchant verification failed.",
            });
        }

        // IMPORTANT:
        // Use the shared PaymentInitializationService rather than creating a
        // second INV_<id>_<timestamp> reference here. The service derives the
        // amount, merchant, PaymentIntent and reference from server-side data.
        // Its reference is PaymentIntent.token, which is the same reference
        // required by the hardened Paystack webhook.
        const result =
            await paymentInitializationService.initializeInvoicePayment({
                invoiceId,
                email: customerEmail,
            });

        return res.json({
            success: true,
            ...result,
            verification: {
                verified: verification.verified,
                merchantId: verification.merchantId,
                merchantName: verification.merchantName,
                trustScore: verification.trustScore,
                verificationBadge: verification.verificationBadge,
                verificationCount: verification.verificationCount,
            },
        });
    } catch (error: any) {
        console.error(
            "initializeInvoicePayment error:",
            error?.response?.data || error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to initialize payment",
        });
    }
};

// =============================================================================
// START PAYMENT (V2)
// POST /api/invoices/:invoiceId/payments/start
//
// PURPOSE
// -----------------------------------------------------------------------------
// Verify merchant only. Does NOT initialize Paystack.
// =============================================================================

export const startPayment = async (
    req: Request,
    res: Response
) => {
    try {
        const invoiceId = Number(req.params.invoiceId);

        if (!invoiceId || Number.isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: "Valid invoiceId is required.",
            });
        }

        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found.",
            });
        }

        if (invoice.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "Invoice already paid.",
            });
        }

        if (invoice.status === "cancelled") {
            return res.status(409).json({
                success: false,
                message: "This order was cancelled and can no longer be paid.",
            });
        }

        const customerEmail =
            String(req.body?.email || invoice.customer_email || "").trim();

        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                message: "Customer email is required.",
            });
        }

        const amountNaira = Number(invoice.amount);

        if (!amountNaira || amountNaira <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid invoice amount.",
            });
        }

        let verification;

        try {
            console.log("Calling Verification API:", {
                merchantId: invoice.merchant_id,
            });

            verification = await verificationGateway.verifyMerchant({
                merchantId: invoice.merchant_id,
            });

            console.log("Verification Response:", verification);
        } catch (error) {
            console.error("Verification API unavailable:", error);

            return res.status(503).json({
                success: false,
                message: "Verification API unavailable.",
            });
        }

        return res.json({
            verified: verification.verified,

            status: verification.verified
                ? "VERIFIED"
                : "NOT_VERIFIED",

            trustSessionId: crypto.randomUUID(),

            verificationId: crypto.randomUUID(),

            reasonCode: verification.reasonCode,

            message:
                verification.message ||
                "Merchant verification completed.",

            // ==========================================================
            // Flattened verification payload
            // ==========================================================
            merchantName: verification.merchantName,

            bankName: verification.bankName,

            accountName: verification.accountName,

            accountNumberMasked: verification.accountNumberMasked,

            trustScore: verification.trustScore,

            verificationStatus: verification.verificationStatus,

            verificationCount: verification.verificationCount,

            verificationBadge: verification.verificationBadge,
        });
    } catch (error) {
        console.error("startPayment error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to start payment.",
        });
    }
};

// =============================================================================
// CONTINUE PAYMENT (V2)
// POST /api/invoices/:invoiceId/payments/continue
//
// PURPOSE
// -----------------------------------------------------------------------------
// Initialize Paystack after user reviews and acknowledges verification details.
// =============================================================================

export const continuePayment = async (
    req: Request,
    res: Response
) => {
    try {
        const invoiceId = Number(req.params.invoiceId);

        if (!invoiceId || Number.isNaN(invoiceId)) {
            return res.status(400).json({
                success: false,
                message: "Valid invoiceId is required.",
            });
        }

        const invoice = await Invoice.findByPk(invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found.",
            });
        }

        const invoiceToken =
            String(req.body?.invoiceToken || "").trim();

        if (
            !invoiceToken ||
            !invoice.public_token ||
            invoice.public_token !== invoiceToken
        ) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found.",
            });
        }

        if (invoice.status === "paid") {
            return res.status(409).json({
                success: false,
                message: "Invoice already paid.",
            });
        }

        const email =
            String(req.body?.email || invoice.customer_email || "").trim();
        const phone = String(req.body?.phone || "").trim();

        // SECURITY:
        // Do not treat trustSessionId / verificationId echoed by the browser
        // as authorization. The previous implementation only checked that
        // those strings were non-empty.
        //
        // Re-run merchant verification on the server immediately before
        // initializing the financial transaction.
        let verification;

        try {
            verification = await verificationGateway.verifyMerchant({
                merchantId: invoice.merchant_id,
            });
        } catch (error) {
            console.error("Verification API unavailable:", error);

            return res.status(503).json({
                success: false,
                message: "Verification API unavailable.",
            });
        }

        // Verification is the PayVerify trust gate. Payment cannot be
        // initialized when the merchant/account match is unavailable or fails.
        if (!verification.verified) {
            return res.status(409).json({
                success: false,
                code: "MERCHANT_NOT_VERIFIED",
                message:
                    verification.message ||
                    "Merchant could not be verified. Payment is paused until verification succeeds.",
                verification: {
                    verified: false,
                    reasonCode: verification.reasonCode,
                    merchantName: verification.merchantName,
                    bankName: verification.bankName,
                    accountName: verification.accountName,
                    accountNumberMasked: verification.accountNumberMasked,
                    trustScore: verification.trustScore,
                    verificationStatus: verification.verificationStatus,
                    verificationBadge: verification.verificationBadge,
                },
            });
        }

        // PaymentInitializationService derives amount, merchant and reference
        // from our database. The browser cannot choose financial values.
        const result =
            await paymentInitializationService.initializeInvoicePayment({
                invoiceId,
                email: email || undefined,
                phone: phone || undefined,
            });

        return res.json(result);
    } catch (error: any) {
        console.error("continuePayment error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to continue payment.",
        });
    }
};

// =============================================================================
// PAYSTACK WEBHOOK
// POST /api/webhooks/paystack
// =============================================================================
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// The existing signature validation, Paystack verification, email notifications,
// and HTTP behavior are preserved.
//
// Only the record-matching and successful-payment updates were strengthened:
//
// 1. Find the exact Transaction using the unique Paystack reference.
// 2. Find the exact Payment using that Transaction ID.
// 3. Mark Transaction and Payment successful.
// 4. Mark the Invoice paid.
// 5. Follow Invoice.payment_intent_id to the PaymentIntent.
// 6. Follow PaymentIntent.purchase_order_id to the PurchaseOrder.
// 7. Mark both PaymentIntent and PurchaseOrder paid.
//
// WHY
// -----------------------------------------------------------------------------
// The previous implementation selected the latest Paystack Payment in the
// database. With concurrent customers, that could update the wrong Payment.
// It also left the Purchase Order status at "approved" after successful payment.
//
// This handler is idempotent: repeated Paystack webhook deliveries do not create
// records or incorrectly apply the payment twice.
// =============================================================================

export const handlePaystackWebhook = async (
    req: any,
    res: Response
) => {
    try {
        const signatureHeader =
            req.headers["x-paystack-signature"];

        const signature = Array.isArray(signatureHeader)
            ? signatureHeader[0]
            : signatureHeader;

        const rawBody: Buffer = req.body;

        const isValid =
            verifyPaystackSignature(
                rawBody,
                signature
            );

        if (!isValid) {
            console.warn(
                "❌ Invalid Paystack signature"
            );

            return res.sendStatus(401);
        }

        const event =
            JSON.parse(
                rawBody.toString("utf8")
            );

        const reference =
            String(
                event?.data?.reference || ""
            ).trim();

        if (!reference) {
            return res.sendStatus(200);
        }

        // ---------------------------------------------------------------------
        // Resolve the exact internal transaction/payment from the Paystack
        // reference. This prevents another customer's latest payment from being
        // updated accidentally.
        // ---------------------------------------------------------------------
        const transaction =
            await Transaction.findOne({
                where: {
                    reference,
                },
            });

        const payment = transaction
            ? await Payment.findOne({
                where: {
                    transactionId:
                        transaction.id,
                    method: "paystack",
                },
                order: [
                    ["createdAt", "DESC"]
                ],
            })
            : null;

        // ---------------------------------------------------------------------
        // FAILED PAYMENT
        // ---------------------------------------------------------------------
        if (event.event === "charge.failed") {
            const invoiceId =
                extractInvoiceId(reference);

            if (
                transaction &&
                transaction.status !== "failed"
            ) {
                await transaction.update({
                    status: "failed",
                });
            }

            if (
                payment &&
                payment.status !== "failed"
            ) {
                await payment.update({
                    status: "failed",
                });
            }

            if (invoiceId) {
                const invoice =
                    await Invoice.findByPk(
                        invoiceId
                    );

                if (
                    invoice &&
                    invoice.customer_email
                ) {
                    await sendPaymentFailedEmail(
                        invoice.customer_email,
                        invoice.id,
                        Number(invoice.amount)
                    );
                }
            }

            return res.sendStatus(200);
        }

        if (event.event !== "charge.success") {
            return res.sendStatus(200);
        }

        // ---------------------------------------------------------------------
        // Preserve the existing server-to-server Paystack verification.
        // The database is never marked paid from the webhook event alone.
        // ---------------------------------------------------------------------
        const verify =
            await paystack.verifyTransaction(
                reference
            );

        if (verify.data.status !== "success") {
            return res.sendStatus(200);
        }

        const invoiceId =
            extractInvoiceId(reference);

        if (!invoiceId) {
            console.error(
                "Paystack success received but invoice ID could not be extracted:",
                reference
            );

            return res.sendStatus(500);
        }

        const invoice =
            await Invoice.findByPk(
                invoiceId
            );

        if (!invoice) {
            console.error(
                "Paystack success received but invoice was not found:",
                {
                    reference,
                    invoiceId,
                }
            );

            return res.sendStatus(500);
        }

        // ---------------------------------------------------------------------
        // Update the Transaction.
        //
        // IMPORTANT:
        // The Transaction model uses the enum:
        //
        //   pending | completed | failed
        //
        // so we must use "completed" instead of "success".
        // ---------------------------------------------------------------------
        if (
            transaction &&
            transaction.status !== "completed"
        ) {
            await transaction.update({
                status: "completed",
            });
        }

        if (
            payment &&
            payment.status !== "success"
        ) {
            await payment.update({
                status: "success",
            });
        }

        const invoiceWasAlreadyPaid =
            invoice.status === "paid";

        if (!invoiceWasAlreadyPaid) {
            await invoice.update({
                status: "paid",
            });
        }

        const paymentIntentId =
            Number(
                invoice.payment_intent_id
            );

        const paymentIntent =
            Number.isInteger(
                paymentIntentId
            ) &&
                paymentIntentId > 0
                ? await PaymentIntent.findByPk(
                    paymentIntentId
                )
                : null;

        if (
            paymentIntent &&
            paymentIntent.status !== "paid"
        ) {
            await paymentIntent.update({
                status: "paid",
            });
        }

        const purchaseOrderId =
            Number(
                paymentIntent?.purchase_order_id
            );

        const purchaseOrder =
            Number.isInteger(
                purchaseOrderId
            ) &&
                purchaseOrderId > 0
                ? await PurchaseOrder.findByPk(
                    purchaseOrderId
                )
                : null;

        if (
            purchaseOrder &&
            purchaseOrder.status !== "paid"
        ) {
            await purchaseOrder.update({
                status: "paid",
            });
        }

        console.log(
            "✅ Paystack payment status updated:",
            {
                reference,
                transactionId:
                    transaction?.id ?? null,
                paymentId:
                    payment?.id ?? null,
                invoiceId:
                    invoice.id,
                paymentIntentId:
                    paymentIntent?.id ?? null,
                purchaseOrderId:
                    purchaseOrder?.id ?? null,
            }
        );

        if (
            !invoiceWasAlreadyPaid &&
            invoice.customer_email
        ) {
            await sendInvoicePaidEmail(
                invoice.customer_email,
                invoice.id,
                Number(invoice.amount),
                `${process.env.FRONTEND_URL}/invoice/pay/${invoice.id}`
            );
        }

        return res.sendStatus(200);
    } catch (error) {
        console.error(
            "handlePaystackWebhook error:",
            error
        );

        return res.sendStatus(500);
    }
};
