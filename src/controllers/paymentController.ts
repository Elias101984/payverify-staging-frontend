// =============================================================================
// PaymentController.ts (FINAL FIXED VERSION)
//
// WHAT WAS ADDED:
// ------------------------------------------------------------
// ✅ verifyPayment method
// ✅ Uses token instead of reference (FIXES TS ERROR)
// ✅ Updates PaymentIntent → paid
// ✅ Updates Invoice → paid
// ✅ Email placeholder (non-breaking)
//
// WHY:
// - Paystack returns "reference"
// - You store it as "token"
// - So we must match: token === reference
// =============================================================================

import { Request, Response } from "express";
import { PaystackService } from "../services/PaystackService";
import { PaymentIntent } from "../models/PaymentIntent";
import { Invoice } from "../models/Invoice";
import axios from "axios";
import PurchaseOrder from "../models/PurchaseOrder";
import Transaction from "../models/Transaction";


export class PaymentController {

    private paystackService =
        new PaystackService();

    // =============================================================================
    // CREATE PAYMENT (UNCHANGED)
    // =============================================================================
    async createPayment(
        req: Request,
        res: Response
    ): Promise<Response> {

        try {

            const {
                email,
                amount,
                paymentIntentId
            } = req.body;

            // 🔥 This becomes Paystack reference
            const reference =
                `PAY-${paymentIntentId}-${Date.now()}`;

            const callbackUrl =
                `${process.env.FRONTEND_URL}/payment-success`;

            const result =
                await this.paystackService.initializePayment(
                    email,
                    amount,
                    reference,
                    callbackUrl
                );

            // 🔥 Store reference as token
            await PaymentIntent.update(
                {
                    token: reference,
                    payment_link:
                        result.data.authorization_url
                },
                {
                    where: {
                        id: paymentIntentId
                    }
                });

            return res.json({
                success: true,
                paymentUrl:
                    result.data.authorization_url,
                reference
            });

        }
        catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Failed to initialize payment"
            });

        }
    }

 //   // =============================================================================
 //   // 🔥 NEW: VERIFY PAYMENT (CRITICAL FIX)
 //   // =============================================================================
 //   async verifyPayment(
 //       req: Request,
 //       res: Response
 //   ): Promise<Response> {

 //       try {

 //           const { reference } = req.body;

 //           // ============================================================
 //           // VERIFY WITH PAYSTACK
 //           // ============================================================
 //           const verifyRes = await axios.get(
 //               `https://api.paystack.co/transaction/verify/${reference}`,
 //               {
 //                   headers: {
 //                       Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
 //                   }
 //               }
 //           );

 //           const data = verifyRes.data.data;

 //           if (data.status !== "success") {
 //               return res.status(400).json({
 //                   message: "Payment not successful"
 //               });
 //           }

 //           // ============================================================
 //           // 🔥 FIX: USE TOKEN (NOT reference)
 //           // ============================================================
 //           const paymentIntent = await PaymentIntent.findOne({
 //               where: { token: reference } // ✅ FIXED
 //           });

 //           if (!paymentIntent) {
 //               return res.status(404).json({
 //                   message: "Payment not found"
 //               });
 //           }

 //           // ============================================================
 //           // UPDATE PAYMENT STATUS
 //           // ============================================================
 //           paymentIntent.status = "paid";
 //           await paymentIntent.save();

 //           // ============================================================
 //           // UPDATE INVOICE STATUS
 //           // ============================================================
 //           const invoice = await Invoice.findOne({
 //               where: {
 //                   payment_intent_id: paymentIntent.id
 //               }
 //           });

 //           if (invoice) {

 //               invoice.status = "paid";
 //               await invoice.save();

 //               // ============================================================
 //               // EMAIL PLACEHOLDER (SAFE FOR NOW)
 //               // ============================================================
 //               if (invoice.customer_email) {
 //                   console.log(
 //                       "📧 EMAIL WOULD BE SENT TO:",
 //                       invoice.customer_email
 //                   );
 //               }
 //           }

 //           //// ============================================================
 //           //// 🔥 NEW: UPDATE PURCHASE ORDER STATUS
 //           //// ============================================================

 //           //const purchaseOrder = await PurchaseOrder.findOne({
 //           //    where: {
 //           //        poReference: reference
 //           //    }
 //           //});

 //           /**
 //            * ============================================================
 //            * UPDATE PURCHASE ORDER STATUS
 //            * ============================================================
 //            * WHY:
 //            * Paystack reference does not match PurchaseOrder reference.
 //            * PaymentIntent already has the purchase_order_id.
 //            */
 //           const purchaseOrder = await PurchaseOrder.findByPk(
 //               paymentIntent.purchase_order_id
 //           );

 //           if (purchaseOrder) {
 //               purchaseOrder.status = "paid";
 //               await purchaseOrder.save();

 //               console.log("✅ PurchaseOrder updated to PAID:", purchaseOrder.id);
 //           } else {
 //               console.warn(
 //                   "⚠️ PurchaseOrder not found for PaymentIntent:",
 //                   paymentIntent.id
 //               );
 //           }

 //           if (purchaseOrder) {

 //               purchaseOrder.status = "paid";
 //               await purchaseOrder.save();

 //               console.log("✅ PurchaseOrder updated to PAID:", purchaseOrder.poReference);

 //           } else {

 //               console.warn("⚠️ No PurchaseOrder found for reference:", reference);

 //           }

 //           return res.json({
 //               success: true
 //           });

 //           /**
 //* ============================================================
 //* UPDATE TRANSACTION STATUS
 //* ============================================================
 //* WHY:
 //* Transaction.reference does not match Paystack reference.
 //* For MVP, match the latest transaction using merchantId + amount.
 //*/
 //           const transaction = await Transaction.findOne({
 //               where: {
 //                   merchantId: paymentIntent.merchant_id,
 //                   amount: paymentIntent.amount
 //               },
 //               order: [["createdAt", "DESC"]]
 //           });

 //           if (transaction) {
 //               transaction.status = "completed";
 //               await transaction.save();

 //               console.log("✅ Transaction updated to COMPLETED:", transaction.id);
 //           } else {
 //               console.warn(
 //                   "⚠️ Transaction not found for PaymentIntent:",
 //                   paymentIntent.id
 //               );
 //           }

 //       }
 //       catch (error) {

 //           console.error("Verification error:", error);

 //           return res.status(500).json({
 //               message: "Verification failed"
 //           });
 //       }

    //   }



    // =============================================================================
    // VERIFY PAYMENT (FINAL CLEAN WORKING VERSION)
    // =============================================================================

    async verifyPayment(
        req: Request,
        res: Response
    ): Promise<Response> {

        try {

            const { reference } = req.body;

            console.log("💳 Verifying payment reference:", reference);

            // ============================================================
            // VERIFY PAYMENT WITH PAYSTACK
            // ============================================================
            const verifyRes = await axios.get(
                `https://api.paystack.co/transaction/verify/${reference}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                    }
                }
            );

            const data = verifyRes.data.data;

            // ============================================================
            // ENSURE PAYMENT WAS SUCCESSFUL
            // ============================================================
            if (data.status !== "success") {

                console.warn("❌ Payment verification failed");

                return res.status(400).json({
                    success: false,
                    message: "Payment not successful"
                });
            }

            // ============================================================
            // FIND PAYMENT INTENT
            // ============================================================
            // IMPORTANT:
            // We store Paystack reference inside `token`
            // ============================================================
            const paymentIntent = await PaymentIntent.findOne({
                where: {
                    token: reference
                }
            });

            if (!paymentIntent) {

                console.error("❌ PaymentIntent not found:", reference);

                return res.status(404).json({
                    success: false,
                    message: "PaymentIntent not found"
                });
            }

            console.log("✅ PaymentIntent found:", paymentIntent.id);

            // ============================================================
            // UPDATE PAYMENT INTENT STATUS
            // ============================================================
            paymentIntent.status = "paid";

            await paymentIntent.save();

            console.log("✅ PaymentIntent updated to PAID");

            // ============================================================
            // UPDATE INVOICE STATUS
            // ============================================================
            const invoice = await Invoice.findOne({
                where: {
                    payment_intent_id: paymentIntent.id
                }
            });

            if (invoice) {

                invoice.status = "paid";

                await invoice.save();

                console.log("✅ Invoice updated to PAID");
            }

            // ============================================================
            // UPDATE PURCHASE ORDER STATUS
            // ============================================================
            // IMPORTANT:
            // Dashboard expects "completed"
            // NOT "paid"
            // ============================================================
            const purchaseOrder = await PurchaseOrder.findByPk(
                paymentIntent.purchase_order_id
            );

            if (purchaseOrder) {

                purchaseOrder.status = "completed";

                await purchaseOrder.save();

                console.log(
                    "✅ PurchaseOrder updated to COMPLETED:",
                    purchaseOrder.id
                );

            } else {

                console.warn(
                    "⚠️ PurchaseOrder not found for PaymentIntent:",
                    paymentIntent.id
                );
            }

            // ============================================================
            // UPDATE TRANSACTION STATUS
            // ============================================================
            // IMPORTANT:
            // Transaction.reference does NOT match Paystack reference
            //
            // So for MVP:
            // Match latest transaction using:
            // merchantId + amount
            // ============================================================
            const transaction = await Transaction.findOne({

                where: {
                    merchantId: paymentIntent.merchant_id,
                    amount: paymentIntent.amount
                },

                order: [["createdAt", "DESC"]]
            });

            if (transaction) {

                transaction.status = "completed";

                await transaction.save();

                console.log(
                    "✅ Transaction updated to COMPLETED:",
                    transaction.id
                );

            } else {

                console.warn(
                    "⚠️ Transaction not found for PaymentIntent:",
                    paymentIntent.id
                );
            }

            // ============================================================
            // SUCCESS RESPONSE
            // ============================================================
            return res.json({
                success: true,
                message: "Payment verified successfully"
            });

        }
        catch (error) {

            console.error("❌ Verification error:", error);

            return res.status(500).json({
                success: false,
                message: "Verification failed"
            });
        }
    }


















}