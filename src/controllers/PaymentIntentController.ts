import { Request, Response } from "express";

import { PaymentIntentService } from "../services/PaymentIntentService";
import { NotificationService } from "../services/NotificationService";
import { PaystackService } from "../services/PaystackService";

/**
 * PaymentIntentController
 *
 * Public customer-facing payment intent operations.
 *
 * SECURITY NOTES:
 * - Payment completion is NEVER performed by this controller.
 * - A payment becomes paid only through the verified Paystack webhook flow.
 * - Amount and payment reference are derived from server-side PaymentIntent data.
 * - The opaque PaymentIntent token is used as the Paystack reference so the
 *   webhook can bind the Paystack transaction to the correct internal intent.
 */
export class PaymentIntentController {
    private paymentIntentService = new PaymentIntentService();
    private notificationService = new NotificationService();

    // =============================================================================
    // PUBLIC: GET PAYMENT INTENT BY TOKEN
    // Route: GET /api/payment-intents/public/:token
    // =============================================================================
    getPublicByToken = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const token = String(req.params.token || "").trim();

            if (!token) {
                res.status(400).json({
                    success: false,
                    message: "Token is required",
                });
                return;
            }

            const intent = await this.paymentIntentService.getByToken(token);

            if (!intent) {
                res.status(404).json({
                    success: false,
                    message: "Payment request not found",
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    token: intent.token,
                    amount: Number(intent.amount),
                    status: intent.status,
                    payment_link: intent.payment_link,
                    qr_url: intent.qr_url,
                    expires_at: intent.expires_at,
                },
            });
        } catch (error: any) {
            console.error("getPublicByToken error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to load payment request",
            });
        }
    };

    // =============================================================================
    // SEND PAYMENT LINK VIA EMAIL
    // Route: POST /api/payment-intents/send-link
    //
    // NOTE:
    // This is preserved for compatibility in this change. The route still needs
    // a separate hardening pass so arbitrary browser-supplied payment content is
    // not treated as trusted notification data.
    // =============================================================================
    sendPaymentLink = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const { email, paymentLink, amount, qrUrl } = req.body;

            if (!email) {
                res.status(400).json({
                    success: false,
                    message: "email is required",
                });
                return;
            }

            if (!paymentLink || !amount) {
                res.status(400).json({
                    success: false,
                    message: "paymentLink and amount are required",
                });
                return;
            }

            await this.notificationService.sendPaymentNotification({
                email,
                paymentLink,
                amount,
                qrUrl,
            });

            res.json({
                success: true,
                message: "Payment email sent successfully",
            });
        } catch (error: any) {
            console.error("sendPaymentLink error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to send payment email",
            });
        }
    };

    // =============================================================================
    // INITIALIZE PAYSTACK PAYMENT (PUBLIC)
    // Route: POST /api/payment-intents/public/:token/paystack/init
    //
    // SECURITY:
    // - Token identifies the server-side PaymentIntent.
    // - Amount comes from the PaymentIntent, never from the browser.
    // - Reference MUST equal PaymentIntent.token because the hardened webhook
    //   requires an exact reference match before marking anything paid.
    // - No fake/default email is used.
    // - This method initializes checkout only; it cannot complete payment.
    // =============================================================================
    initPaystackPublic = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const token = String(req.params.token || "").trim();

            if (!token) {
                res.status(400).json({
                    success: false,
                    message: "token is required",
                });
                return;
            }

            const intent = await this.paymentIntentService.getByToken(token);

            if (!intent) {
                res.status(404).json({
                    success: false,
                    message: "Payment intent not found",
                });
                return;
            }

            if (intent.status === "paid") {
                res.status(409).json({
                    success: false,
                    message: "Payment already completed",
                });
                return;
            }

            const amountNaira = Number(intent.amount);

            if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
                res.status(400).json({
                    success: false,
                    message: "Invalid payment amount",
                });
                return;
            }

            const email = String(
                (intent as any).customer_email || req.body?.email || ""
            ).trim();

            if (!email) {
                res.status(400).json({
                    success: false,
                    message: "Customer email is required",
                });
                return;
            }

            // IMPORTANT:
            // Do not generate pv_<id>_<timestamp> here.
            // The verified webhook requires reference === PaymentIntent.token.
            const reference = String(intent.token || "").trim();

            if (!reference) {
                res.status(500).json({
                    success: false,
                    message: "Payment reference unavailable",
                });
                return;
            }

            const paystack = new PaystackService();

            const result = await paystack.initializeTransaction({
                email,
                amountNaira,
                reference,
            });

            res.json({
                success: true,
                data: result.data,
            });
        } catch (error: any) {
            console.error("initPaystackPublic error:", error);

            res.status(500).json({
                success: false,
                message:
                    error.message || "Failed to initialize Paystack payment",
            });
        }
    };
}
