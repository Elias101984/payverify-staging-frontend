//// =============================================================================
//// PaymentIntentController.ts
//// =============================================================================
////
//// PURPOSE
//// Handles:
////
//// 1) Public retrieval of PaymentIntent via token
////    GET /api/payment-intents/public/:token
////
//// 2) Sending payment link via email (SendGrid)
////    POST /api/payment-intents/send-link
////
//// 3) Marking payment as paid (simulation or webhook)
////    POST /api/payment-intents/:id/mark-paid
////
//// 4) NEW — Initialize Paystack payment (PUBLIC)
////    POST /api/payment-intents/paystack/init/:token
////
//// DESIGN PRINCIPLES
////
//// • SRP compliant
//// • Backward compatible (NO breaking changes)
//// • Safe validation
//// • Production-ready structure
////
//// FIXES APPLIED
////
//// ✅ FIX #1: Paystack method properly placed INSIDE class
////            (this was causing your 18 TS errors)
////
//// ✅ FIX #2: Defensive token + id validation
////
//// ✅ FIX #3: Safe numeric handling for amount
////
//// =============================================================================

//import { Request, Response } from "express";

//import { PaymentIntentService } from "../services/PaymentIntentService";
//import { NotificationService } from "../services/NotificationService";
//import { PaymentIntent } from "../models/PaymentIntent";
//import { PaystackService } from "../services/PaystackService";

//export class PaymentIntentController {
//  private paymentIntentService = new PaymentIntentService();
//  private notificationService = new NotificationService();

//  // =============================================================================
//  // PUBLIC: Get PaymentIntent by token
//  // =============================================================================
//  // Route:
//  // GET /api/payment-intents/public/:token
//  // =============================================================================
//  getPublicByToken = async (
//    req: Request,
//    res: Response
//  ): Promise<void> => {
//    try {
//      const token = String(req.params.token || "").trim();

//      if (!token) {
//        res.status(400).json({
//          success: false,
//          message: "Token is required",
//        });
//        return;
//      }

//      const intent = await this.paymentIntentService.getByToken(token);

//      if (!intent) {
//        res.status(404).json({
//          success: false,
//          message: "Payment request not found",
//        });
//        return;
//      }

//      res.json({
//        success: true,
//        data: intent,
//      });
//    } catch (error: any) {
//      console.error("getPublicByToken error:", error);

//      res.status(500).json({
//        success: false,
//        message: error.message || "Failed to load payment request",
//      });
//    }
//  };

//  // =============================================================================
//  // Send Payment Link via Email
//  // =============================================================================
//  // Route:
//  // POST /api/payment-intents/send-link
//  // =============================================================================
//  sendPaymentLink = async (
//    req: Request,
//    res: Response
//  ): Promise<void> => {
//    try {
//      const { email, paymentLink, amount, qrUrl } = req.body;

//      // -------------------------------------------------------------------------
//      // Validation
//      // -------------------------------------------------------------------------
//      if (!email) {
//        res.status(400).json({
//          success: false,
//          message: "email is required",
//        });
//        return;
//      }

//      if (!paymentLink || !amount) {
//        res.status(400).json({
//          success: false,
//          message: "paymentLink and amount are required",
//        });
//        return;
//      }

//      // -------------------------------------------------------------------------
//      // Send notification
//      // -------------------------------------------------------------------------
//      await this.notificationService.sendPaymentNotification({
//        email,
//        paymentLink,
//        amount,
//        qrUrl,
//      });

//      res.json({
//        success: true,
//        message: "Payment email sent successfully",
//      });
//    } catch (error: any) {
//      console.error("sendPaymentLink error:", error);

//      res.status(500).json({
//        success: false,
//        message: error.message || "Failed to send payment email",
//      });
//    }
//  };

//  // =============================================================================
//  // Mark PaymentIntent as Paid (SIMULATION / WEBHOOK SUPPORT)
//  // =============================================================================
//  // Route:
//  // POST /api/payment-intents/:id/mark-paid
//  // =============================================================================
//  markPaid = async (req: Request, res: Response): Promise<void> => {
//    try {
//      const id = Number(req.params.id);

//      if (!id || isNaN(id)) {
//        res.status(400).json({
//          success: false,
//          message: "Valid PaymentIntent id required",
//        });
//        return;
//      }

//      const intent = await PaymentIntent.findByPk(id);

//      if (!intent) {
//        res.status(404).json({
//          success: false,
//          message: "PaymentIntent not found",
//        });
//        return;
//      }

//      intent.status = "paid";
//      intent.paid_at = new Date();

//      await intent.save();

//      res.json({
//        success: true,
//        data: intent,
//      });
//    } catch (error: any) {
//      console.error("markPaid error:", error);

//      res.status(500).json({
//        success: false,
//        message: error.message,
//      });
//    }
//  };

//  // =============================================================================
//  // NEW — Initialize Paystack Payment (PUBLIC)
//  // =============================================================================
//  // Route:
//  // POST /api/payment-intents/paystack/init/:token
//  //
//  // PURPOSE:
//  // • Creates Paystack hosted checkout session
//  // • Returns authorization_url to frontend
//  //
//  // IMPORTANT:
//  // This method was previously OUTSIDE the class,
//  // which caused your 18 TypeScript errors.
//  // =============================================================================
//  initPaystackPublic = async (
//    req: Request,
//    res: Response
//  ): Promise<void> => {
//    try {
//      const token = String(req.params.token || "").trim();

//      if (!token) {
//        res.status(400).json({
//          success: false,
//          message: "token is required",
//        });
//        return;
//      }

//      // -------------------------------------------------------------------------
//      // Get payment intent
//      // -------------------------------------------------------------------------
//      const intent = await this.paymentIntentService.getByToken(token);

//      if (!intent) {
//        res.status(404).json({
//          success: false,
//          message: "Payment intent not found",
//        });
//        return;
//      }

//      // -------------------------------------------------------------------------
//      // Initialize Paystack
//      // -------------------------------------------------------------------------
//      const paystack = new PaystackService();

//      const reference = `pv_${intent.id}_${Date.now()}`;

//      const result = await paystack.initializeTransaction({
//        email: (intent as any).customer_email || "test@example.com",
//        amountNaira: Number(intent.amount),
//        reference,
//      });

//      res.json({
//        success: true,
//        data: result.data,
//      });
//    } catch (error: any) {
//      console.error("initPaystackPublic error:", error);

//      res.status(500).json({
//        success: false,
//        message: error.message || "Failed to initialize Paystack payment",
//      });
//    }
//  };
//}



// =============================================================================
// PaymentIntentController.ts
// =============================================================================
//
// PURPOSE
// Handles:
//
// 1) Public retrieval of PaymentIntent via token
//    GET /api/payment-intents/public/:token
//
// 2) Sending payment link via email (SendGrid)
//    POST /api/payment-intents/send-link
//
// 3) Marking payment as paid (simulation or webhook)
//    POST /api/payment-intents/:id/mark-paid
//
// 4) Initialize Paystack payment (PUBLIC)
//    POST /api/payment-intents/paystack/init/:token
//
// DESIGN PRINCIPLES
//
// • SRP compliant
// • Backward compatible (NO breaking changes)
// • Safe validation
// • Production-ready structure
//
// FIXES APPLIED
//
// ✅ FIX #1: UUID-safe handling in markPaid
// ✅ FIX #2: Removed numeric coercion bug
// ✅ FIX #3: Added idempotent payment protection
// ✅ FIX #4: Defensive validation hardened
//
// =============================================================================

import { Request, Response } from "express";

import { PaymentIntentService } from "../services/PaymentIntentService";
import { NotificationService } from "../services/NotificationService";
import { PaymentIntent } from "../models/PaymentIntent";
import { PaystackService } from "../services/PaystackService";

export class PaymentIntentController {
    private paymentIntentService = new PaymentIntentService();
    private notificationService = new NotificationService();

    // =============================================================================
    // PUBLIC: Get PaymentIntent by token
    // =============================================================================
    // Route:
    // GET /api/payment-intents/public/:token
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
                data: intent,
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
    // Send Payment Link via Email
    // =============================================================================
    // Route:
    // POST /api/payment-intents/send-link
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
    // Mark PaymentIntent as Paid (SIMULATION / WEBHOOK SUPPORT)
    // =============================================================================
    // Route:
    // POST /api/payment-intents/:id/mark-paid
    // =============================================================================
    markPaid = async (req: Request, res: Response): Promise<void> => {
        try {
            // ✅ FIX: UUID-safe extraction (NO Number())
            const id = String(req.params.id || "").trim();

            if (!id) {
                res.status(400).json({
                    success: false,
                    message: "Valid PaymentIntent id required",
                });
                return;
            }

            const intent = await PaymentIntent.findByPk(id);

            if (!intent) {
                res.status(404).json({
                    success: false,
                    message: "PaymentIntent not found",
                });
                return;
            }

            // ✅ IMPORTANT: idempotent protection (prevents double-pay bugs)
            if (intent.status === "paid") {
                res.json({
                    success: true,
                    message: "Payment already marked as paid",
                    data: intent,
                });
                return;
            }

            intent.status = "paid";
            intent.paid_at = new Date();

            await intent.save();

            res.json({
                success: true,
                data: intent,
            });
        } catch (error: any) {
            console.error("markPaid error:", error);

            res.status(500).json({
                success: false,
                message: error.message || "Failed to mark payment as paid",
            });
        }
    };

    // =============================================================================
    // Initialize Paystack Payment (PUBLIC)
    // =============================================================================
    // Route:
    // POST /api/payment-intents/paystack/init/:token
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

            const paystack = new PaystackService();

            const reference = `pv_${intent.id}_${Date.now()}`;

            const result = await paystack.initializeTransaction({
                email: (intent as any).customer_email || "test@example.com",
                amountNaira: Number(intent.amount),
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
                message: error.message || "Failed to initialize Paystack payment",
            });
        }
    };
}