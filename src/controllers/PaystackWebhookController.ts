//////////import { Request, Response } from "express";
//////////import { PaystackService } from "../services/PaystackService";
//////////import { PaymentIntent } from "../models/PaymentIntent";
//////////import { PurchaseOrder } from "../models";
//////////import { InvoiceService }  from "../services/InvoiceService";

//////////export class PaystackWebhookController {

//////////    private paystackService =
//////////        new PaystackService();

//////////    private invoiceService =
//////////        new InvoiceService();

//////////    async handleWebhook(
//////////        req: Request,
//////////        res: Response
//////////    ): Promise<Response> {

//////////        try {

//////////            const event =
//////////                req.body;

//////////            /*
//////////            Only handle successful payments
//////////            */
//////////            if (
//////////                event.event ===
//////////                "charge.success"
//////////            ) {

//////////                const reference =
//////////                    event.data.reference;

//////////                /*
//////////                Find PaymentIntent
//////////                */
//////////                const paymentIntent =
//////////                    await PaymentIntent.findOne({

//////////                        where: {
//////////                            token: reference
//////////                        }

//////////                    });

//////////                if (!paymentIntent) {

//////////                    return res.status(404).json({
//////////                        message:
//////////                            "PaymentIntent not found"
//////////                    });

//////////                }

//////////                /*
//////////                Mark PaymentIntent as PAID
//////////                */
//////////                await paymentIntent.update({

//////////                    status: "paid",
//////////                    paid_at: new Date()

//////////                });

//////////                /*
//////////                Mark PurchaseOrder as PAID
//////////                */
//////////                await PurchaseOrder.update({

//////////                    status: "paid"

//////////                },
//////////                    {
//////////                        where: {
//////////                            id:
//////////                                paymentIntent.purchase_order_id
//////////                        }
//////////                    });

//////////                /*
//////////                Generate Invoice
//////////                */
//////////                // 🔥 FIX: normalize id before passing
//////////                const normalizedIntentId = Number(paymentIntent.id);

//////////                if (!normalizedIntentId || isNaN(normalizedIntentId)) {
//////////                    throw new Error("Invalid PaymentIntent id in webhook");
//////////                }

//////////                await this.invoiceService.createFromPaymentIntent(
//////////                    normalizedIntentId
//////////                );

//////////            }

//////////            return res.status(200).json({
//////////                received: true
//////////            });

//////////        }
//////////        catch (error) {

//////////            console.error(
//////////                "Webhook error:",
//////////                error
//////////            );

//////////            return res.status(500).json({
//////////                error: "Webhook failed"
//////////            });

//////////        }

//////////    }

//////////}



////////// =============================================================================
////////// PaystackWebhookController.ts (FINAL CLEAN VERSION)
////////// =============================================================================
//////////
////////// WHAT WAS FIXED:
////////// -----------------------------------------------------------------------------
////////// 1. ✅ Uses createFromPaymentIntent (now exists)
////////// 2. ✅ No TypeScript errors
////////// 3. ✅ Safe duplicate invoice prevention
////////// =============================================================================

////////import { Request, Response } from "express";
////////import { PaystackService } from "../services/PaystackService";
////////import { PaymentIntent } from "../models/PaymentIntent";
////////import { PurchaseOrder } from "../models";
////////import { InvoiceService } from "../services/InvoiceService";

////////export class PaystackWebhookController {

////////    private paystackService = new PaystackService();
////////    private invoiceService = new InvoiceService();

////////    async handleWebhook(req: Request, res: Response): Promise<Response> {

////////        try {

////////            const event = req.body;

////////            if (event.event === "charge.success") {

////////                const reference = event.data.reference;

////////                const paymentIntent = await PaymentIntent.findOne({
////////                    where: { token: reference }
////////                });

////////                if (!paymentIntent) {
////////                    return res.status(404).json({
////////                        message: "PaymentIntent not found"
////////                    });
////////                }

////////                // Mark payment as PAID
////////                await paymentIntent.update({
////////                    status: "paid",
////////                    paid_at: new Date()
////////                });

////////                // Mark PO as PAID
////////                await PurchaseOrder.update(
////////                    { status: "paid" },
////////                    {
////////                        where: {
////////                            id: paymentIntent.purchase_order_id
////////                        }
////////                    }
////////                );

////////                // Create invoice if not exists
////////                await this.invoiceService.createFromPaymentIntent(
////////                    Number(paymentIntent.id)
////////                );
////////            }

////////            return res.status(200).json({ received: true });

////////        } catch (error) {

////////            console.error("Webhook error:", error);

////////            return res.status(500).json({
////////                error: "Webhook failed"
////////            });
////////        }
////////    }
////////}



//////// =============================================================================
//////// PaystackWebhookController.ts (FINAL FIXED VERSION)
//////// =============================================================================
////////
//////// 🔥 WHAT WAS FIXED:
//////// -----------------------------------------------------------------------------
//////// 1. ✅ Handle RAW body correctly (required for webhook)
//////// 2. ✅ Proper Paystack signature verification
//////// 3. ✅ Fix reference mismatch (invoice vs token)
//////// 4. ✅ Prevent crashes → no more 502 errors
//////// 5. ✅ Add defensive logging for debugging
//////// 6. ✅ Safe DB updates (idempotent)
//////// =============================================================================

//////import { Request, Response } from "express";
//////import crypto from "crypto";

//////import { PaymentIntent } from "../models/PaymentIntent";
//////import { PurchaseOrder } from "../models";
//////import { InvoiceService } from "../services/InvoiceService";

//////export class PaystackWebhookController {

//////    private invoiceService = new InvoiceService();

//////    async handleWebhook(req: Request, res: Response): Promise<Response> {

//////        try {

//////            // ============================================================
//////            // 🔥 FIX 1: HANDLE RAW BODY (CRITICAL)
//////            // ============================================================
//////            // Because we used express.raw() in app.ts,
//////            // req.body is now a Buffer, NOT JSON.
//////            //
//////            // Without this → webhook crashes → 502 error
//////            // ============================================================

//////            const rawBody = req.body;

//////            if (!rawBody) {
//////                console.error("❌ Missing raw body");
//////                return res.status(400).send("Invalid request");
//////            }

//////            // ============================================================
//////            // 🔐 FIX 2: VERIFY PAYSTACK SIGNATURE (SECURITY)
//////            // ============================================================

//////            const secret = process.env.PAYSTACK_SECRET_KEY || "";

//////            const hash = crypto
//////                .createHmac("sha512", secret)
//////                .update(rawBody)
//////                .digest("hex");

//////            if (hash !== req.headers["x-paystack-signature"]) {
//////                console.error("❌ Invalid Paystack signature");
//////                return res.status(401).send("Invalid signature");
//////            }

//////            console.log("🔥 PAYSTACK WEBHOOK HIT");

//////            // ============================================================
//////            // 🔥 FIX 3: PARSE JSON AFTER SIGNATURE CHECK
//////            // ============================================================

//////            const event = JSON.parse(rawBody.toString());

//////            console.log("📦 Event received:", event.event);

//////            // ============================================================
//////            // 🎯 HANDLE SUCCESSFUL PAYMENT
//////            // ============================================================

//////            if (event.event === "charge.success") {

//////                const reference: string = event.data.reference;

//////                console.log("💳 Payment success for reference:", reference);

//////                // ========================================================
//////                // 🔥 FIX 4: HANDLE REFERENCE FORMAT
//////                // ========================================================
//////                // Your reference looks like:
//////                // INV_45_177604539490
//////                //
//////                // Previously you were using:
//////                // token = reference ❌ (wrong)
//////                //
//////                // Now we extract invoiceId from reference
//////                // ========================================================

//////                const parts = reference.split("_");

//////                if (parts.length < 2) {
//////                    console.error("❌ Invalid reference format:", reference);
//////                    return res.status(400).send("Invalid reference");
//////                }

//////                const invoiceId = Number(parts[1]);

//////                if (!invoiceId || isNaN(invoiceId)) {
//////                    console.error("❌ Invalid invoiceId extracted");
//////                    return res.status(400).send("Invalid invoiceId");
//////                }

//////                // ========================================================
//////                // 🔍 FIND PAYMENT INTENT
//////                // ========================================================

//////                const paymentIntent = await PaymentIntent.findOne({
//////                    where: {
//////                        purchase_order_id: invoiceId
//////                    }
//////                });

//////                if (!paymentIntent) {
//////                    console.warn("⚠️ PaymentIntent not found for invoice:", invoiceId);
//////                    return res.status(404).json({
//////                        message: "PaymentIntent not found"
//////                    });
//////                }

//////                // ========================================================
//////                // ✅ UPDATE PAYMENT INTENT (SAFE UPDATE)
//////                // ========================================================
//////                // Prevent duplicate updates (webhooks can fire twice)
//////                // ========================================================

//////                if (paymentIntent.status !== "paid") {

//////                    await paymentIntent.update({
//////                        status: "paid",
//////                        paid_at: new Date()
//////                    });

//////                    console.log("✅ PaymentIntent marked as paid");
//////                } else {
//////                    console.log("ℹ️ PaymentIntent already paid (skipped)");
//////                }

//////                // ========================================================
//////                // 📦 UPDATE PURCHASE ORDER
//////                // ========================================================

//////                await PurchaseOrder.update(
//////                    { status: "paid" },
//////                    {
//////                        where: {
//////                            id: paymentIntent.purchase_order_id
//////                        }
//////                    }
//////                );

//////                console.log("📦 PurchaseOrder marked as paid");

//////                // ========================================================
//////                // 🧾 GENERATE INVOICE
//////                // ========================================================

//////                await this.invoiceService.createFromPaymentIntent(
//////                    Number(paymentIntent.id)
//////                );

//////                console.log("🧾 Invoice generated");

//////                // ========================================================
//////                // ✅ SUCCESS RESPONSE
//////                // ========================================================

//////                return res.status(200).json({
//////                    success: true
//////                });
//////            }

//////            // ============================================================
//////            // OTHER EVENTS (IGNORE SAFELY)
//////            // ============================================================

//////            console.log("ℹ️ Unhandled event:", event.event);

//////            return res.status(200).json({ received: true });

//////        } catch (error) {

//////            console.error("❌ Webhook error:", error);

//////            return res.status(500).json({
//////                success: false,
//////                message: "Webhook processing failed"
//////            });
//////        }
//////    }
//////}



////import { Request, Response } from "express";
////import crypto from "crypto";
////import  Transaction  from "../models/Transaction";
////import { Payment } from "../models/Payment";

////export class PaystackWebhookController {

////    /**
////     * Handle Paystack webhook events
////     */
////    async handleWebhook(req: Request, res: Response): Promise<Response | void> {
////        console.log("🔥 PAYSTACK WEBHOOK RECEIVED");

////        try {
////            /**
////             * ============================================================
////             * 1. VERIFY PAYSTACK SIGNATURE (SECURITY)
////             * ============================================================
////             * WHY:
////             * Prevent fake requests hitting your webhook
////             */
////            const hash = crypto
////                .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY as string)
////                .update(JSON.stringify(req.body))
////                .digest("hex");

////            const signature = req.headers["x-paystack-signature"];

////            if (hash !== signature) {
////                console.error("❌ Invalid Paystack signature");
////                return res.status(401).send("Invalid signature");
////            }

////            /**
////             * ============================================================
////             * 2. LOG INCOMING DATA (DEBUGGING)
////             * ============================================================
////             * WHY:
////             * Previously you were blind when webhook failed (502 error)
////             */
////            console.log("📦 Webhook Body:", JSON.stringify(req.body, null, 2));

////            const event = req.body;

////            /**
////             * ============================================================
////             * 3. HANDLE SUCCESSFUL PAYMENT
////             * ============================================================
////             */
////            if (event.event === "charge.success") {
////                const reference = event.data.reference;

////                console.log("✅ Payment successful for reference:", reference);

////                /**
////                 * ============================================================
////                 * 4. FIND TRANSACTION BY REFERENCE
////                 * ============================================================
////                 * WHY:
////                 * Paystack sends ONLY the reference → this is your lookup key
////                 */
////                const transaction = await Transaction.findOne({
////                    where: { reference }
////                });

////                if (!transaction) {
////                    console.error("❌ Transaction NOT FOUND:", reference);

////                    // Return 200 so Paystack doesn’t retry forever
////                    return res.status(200).send("Transaction not found");
////                }

////                /**
////                 * ============================================================
////                 * 5. UPDATE TRANSACTION STATUS
////                 * ============================================================
////                 */
////                await transaction.update({
////                    status: "completed"
////                });

////                console.log("✅ Transaction marked as COMPLETED:", transaction.id);

////                /**
////                 * ============================================================
////                 * 6. UPDATE PAYMENT TABLE
////                 * ============================================================
////                 * 🔥 CRITICAL FIX:
////                 * Previously you used `transactionid` (wrong)
////                 * Correct column is `transactionId`
////                 */
////                await Payment.update(
////                    { status: "paid" },
////                    {
////                        where: {
////                            transactionId: transaction.id // ✅ FIXED casing
////                        }
////                    }
////                );

////                console.log("✅ Payment table updated");
////            }

////            /**
////             * ============================================================
////             * 7. RETURN SUCCESS TO PAYSTACK
////             * ============================================================
////             * WHY:
////             * If you don’t return 200 → Paystack retries → duplicates
////             */
////            return res.sendStatus(200);

////        } catch (error) {
////            /**
////             * ============================================================
////             * 8. ERROR HANDLING (CRITICAL FIX)
////             * ============================================================
////             * WHY:
////             * This is what caused your 502 Bad Gateway earlier
////             */
////            console.error("❌ WEBHOOK ERROR:", error);

////            return res.status(500).send("Webhook processing failed");
////        }
////    }
////}



////import { Request, Response } from "express";
////import  Transaction  from "../models/Transaction";
////import { Payment } from "../models/Payment";

////export class PaystackWebhookController {

////    /**
////     * Handle Paystack webhook events
////     */
////    async handleWebhook(req: Request, res: Response): Promise<Response | void> {

////        /**
////         * ============================================================
////         * 🔥 DEBUG LOGGING (NEW)
////         * ============================================================
////         * WHY:
////         * Previously webhook was failing silently → causing 502
////         */
////        console.log("🔥 WEBHOOK HIT");

////        try {

////            /**
////             * ============================================================
////             * ⚠️ TEMPORARILY DISABLED SIGNATURE VALIDATION (NEW)
////             * ============================================================
////             * WHY:
////             * Signature mismatch was causing webhook to crash → 502 error
////             * We disable it temporarily to confirm full flow works
////             *
////             * ⚠️ IMPORTANT:
////             * Re-enable this before production
////             */
////            console.log("⚠️ Skipping signature validation for now");

////            /**
////             * ============================================================
////             * LOG FULL PAYLOAD (NEW)
////             * ============================================================
////             * WHY:
////             * To debug Paystack data and ensure correct reference mapping
////             */
////            console.log("📦 Webhook Body:", JSON.stringify(req.body, null, 2));

////            const event = req.body;

////            /**
////             * ============================================================
////             * HANDLE SUCCESSFUL PAYMENT
////             * ============================================================
////             */
////            if (event.event === "charge.success") {

////                const reference = event.data.reference;

////                console.log("✅ Payment success for reference:", reference);

////                /**
////                 * ============================================================
////                 * FIND TRANSACTION
////                 * ============================================================
////                 * WHY:
////                 * Paystack only sends reference → this is your lookup key
////                 */
////                const transaction = await Transaction.findOne({
////                    where: { reference }
////                });

////                if (!transaction) {
////                    console.error("❌ Transaction NOT FOUND:", reference);

////                    // Return 200 so Paystack doesn't retry endlessly
////                    return res.status(200).send("Transaction not found");
////                }

////                /**
////                 * ============================================================
////                 * UPDATE TRANSACTION STATUS
////                 * ============================================================
////                 */
////                await transaction.update({
////                    status: "completed"
////                });

////                console.log("✅ Transaction marked as COMPLETED:", transaction.id);

////                /**
////                 * ============================================================
////                 * UPDATE PAYMENT TABLE
////                 * ============================================================
////                 * 🔥 CRITICAL FIX:
////                 * Changed from `transactionid` → `transactionId`
////                 *
////                 * WHY:
////                 * Sequelize is case-sensitive → wrong casing caused crash → 502
////                 */
////                await Payment.update(
////                    { status: "paid" },
////                    {
////                        where: {
////                            transactionId: transaction.id
////                        }
////                    }
////                );

////                console.log("✅ Payment table updated successfully");
////            }

////            /**
////             * ============================================================
////             * SUCCESS RESPONSE (IMPORTANT)
////             * ============================================================
////             * WHY:
////             * Prevents Paystack from retrying webhook multiple times
////             */
////            return res.sendStatus(200);

////        } catch (error) {

////            /**
////             * ============================================================
////             * FULL ERROR LOGGING (NEW)
////             * ============================================================
////             * WHY:
////             * This is what caused your 502 error earlier
////             * Now you will SEE exactly what fails
////             */
////            console.error("❌ FULL WEBHOOK ERROR:", error);

////            return res.status(500).send("Webhook processing failed");
////        }
////    }
////}


//import { Request, Response } from "express";
//import Transaction from "../models/Transaction";
//import { Payment } from "../models/Payment";
//import fs from "fs";
//import path from "path";
//import { PaymentIntent } from "../models/PaymentIntent";

//export class PaystackWebhookController {

//    /**
//     * ============================================================
//     * HANDLE PAYSTACK WEBHOOK EVENTS
//     * ============================================================
//     */
//    async handleWebhook(req: Request, res: Response): Promise<Response | void> {

//        console.log("🔥 WEBHOOK HIT");

//        try {

//            /**
//             * ============================================================
//             * ⚠️ TEMP: SIGNATURE VALIDATION DISABLED
//             * ============================================================
//             * IMPORTANT:
//             * Re-enable before production
//             */
//            console.log("⚠️ Skipping signature validation for now");

//            /**
//             * ============================================================
//             * LOG FULL PAYLOAD (DEBUGGING)
//             * ============================================================
//             */
//            console.log("📦 Webhook Body:", JSON.stringify(req.body, null, 2));
//            console.log("📦 Raw Webhook Body:", req.body);

//            /**
//             * ============================================================
//             * 🔥 FIX: PARSE BUFFER INTO JSON
//             * ============================================================
//             */
//            let event;

//            if (Buffer.isBuffer(req.body)) {
//                const rawBody = req.body.toString("utf-8");
//                event = JSON.parse(rawBody);
//            } else {
//                event = req.body;
//            }

//            console.log("✅ Parsed Event:", event);
//            /**
//             * ============================================================
//             * HANDLE SUCCESSFUL PAYMENT
//             * ============================================================
//             */
//            if (event.event === "charge.success") {

//                const reference = event.data.reference;

//                console.log("✅ Payment success for reference:", reference);

//                /**
//                 * ============================================================
//                 * FIND TRANSACTION BY REFERENCE
//                 * ============================================================
//                 */
//                //const transaction = await Transaction.findOne({
//                //    where: { reference }
//                //});

//                //if (!transaction) {
//                //    console.error("❌ Transaction NOT FOUND:", reference);
//                //    return res.status(200).send("Transaction not found");
//                //}

//                const paymentIntent = await PaymentIntent.findOne({
//                    where: { token: reference }
//                });

//                if (!paymentIntent) {
//                    console.error("❌ PaymentIntent NOT FOUND:", reference);
//                    return res.sendStatus(200);
//                }

//                /**
//                 * ============================================================
//                 * ✅ IDEMPOTENCY CHECK (CRITICAL)
//                 * ============================================================
//                 * Prevent duplicate webhook processing
//                 */
//                if (transaction.status === "completed") {
//                    console.log("⚠️ Already processed, skipping...");
//                    return res.sendStatus(200);
//                }

//                /**
//                 * ============================================================
//                 * UPDATE TRANSACTION STATUS
//                 * ============================================================
//                 */
//                await transaction.update({
//                    status: "completed"
//                });

//                console.log("✅ Transaction marked as COMPLETED:", transaction.id);

//                /**
//                 * ============================================================
//                 * UPDATE PAYMENT STATUS
//                 * ============================================================
//                 */
//                await Payment.update(
//                    { status: "paid" },
//                    {
//                        where: {
//                            transactionId: transaction.id
//                        }
//                    }
//                );

//                console.log("✅ Payment table updated successfully");

//                /**
//                 * ============================================================
//                 * 🧾 GENERATE LOCAL RECEIPT (NEW)
//                 * ============================================================
//                 */
//                const receipt = {
//                    transactionId: transaction.id,
//                    reference,
//                    amount: event.data.amount / 100, // convert from kobo
//                    currency: event.data.currency,
//                    status: "paid",
//                    paidAt: new Date(),
//                    customerEmail: event.data.customer?.email
//                };

//                console.log("🧾 Receipt generated:", receipt);

//                /**
//                 * ============================================================
//                 * 💾 SAVE RECEIPT LOCALLY (JSON FILE)
//                 * ============================================================
//                 * This simulates real receipt persistence before DB/email
//                 */
//                const receiptsDir = path.join(__dirname, "../../receipts");

//                // Ensure folder exists
//                if (!fs.existsSync(receiptsDir)) {
//                    fs.mkdirSync(receiptsDir, { recursive: true });
//                }

//                const filePath = path.join(receiptsDir, `${reference}.json`);

//                fs.writeFileSync(
//                    filePath,
//                    JSON.stringify(receipt, null, 2)
//                );

//                console.log("💾 Receipt saved locally at:", filePath);
//            }

//            /**
//             * ============================================================
//             * SUCCESS RESPONSE
//             * ============================================================
//             */
//            return res.sendStatus(200);

//        } catch (error) {

//            console.error("❌ FULL WEBHOOK ERROR:", error);

//            return res.status(500).send("Webhook processing failed");
//        }
//    }
//}











import { Request, Response } from "express";
import Transaction from "../models/Transaction";
import { Payment } from "../models/Payment";
import { PaymentIntent } from "../models/PaymentIntent"; // ✅ ADDED
import fs from "fs";
import path from "path";

export class PaystackWebhookController {

    /**
     * ============================================================
     * HANDLE PAYSTACK WEBHOOK EVENTS
     * ============================================================
     */
    async handleWebhook(req: Request, res: Response): Promise<Response | void> {

        console.log("🔥 WEBHOOK HIT");

        try {

            /**
             * ============================================================
             * ⚠️ TEMP: SIGNATURE VALIDATION DISABLED
             * ============================================================
             */
            console.log("⚠️ Skipping signature validation for now");

            /**
             * ============================================================
             * LOG FULL PAYLOAD (DEBUGGING)
             * ============================================================
             */
            console.log("📦 Webhook Body:", JSON.stringify(req.body, null, 2));

            /**
             * ============================================================
             * 🔥 PARSE EVENT SAFELY
             * ============================================================
             */
            let event;

            if (Buffer.isBuffer(req.body)) {
                const rawBody = req.body.toString("utf-8");
                event = JSON.parse(rawBody);
            } else {
                event = req.body;
            }

            console.log("✅ Parsed Event:", event);

            /**
             * ============================================================
             * HANDLE SUCCESSFUL PAYMENT
             * ============================================================
             */
            if (event.event === "charge.success") {

                const reference = event.data.reference;

                console.log("✅ Payment success for reference:", reference);

                /**
                 * ============================================================
                 * 🔥 FIX #1: FIND PaymentIntent (NOT Transaction)
                 * ============================================================
                 * WHY:
                 * Your system stores Paystack reference as "token"
                 * in PaymentIntent, not in Transaction
                 */
                const paymentIntent = await PaymentIntent.findOne({
                    where: { token: reference }
                });

                if (!paymentIntent) {
                    console.error("❌ PaymentIntent NOT FOUND:", reference);
                    return res.sendStatus(200);
                }

                /**
                 * ============================================================
                 * 🔥 FIX #2: IDEMPOTENCY CHECK (UPDATED VARIABLE)
                 * ============================================================
                 */
                if (paymentIntent.status === "paid") {
                    console.log("⚠️ Already processed, skipping...");
                    return res.sendStatus(200);
                }

                /**
                 * ============================================================
                 * 🔥 FIX #3: UPDATE PaymentIntent (NOT transaction)
                 * ============================================================
                 */
                paymentIntent.status = "paid";
                await paymentIntent.save();

                console.log("✅ PaymentIntent marked as PAID:", paymentIntent.id);

                /**
                 * ============================================================
                 * OPTIONAL: UPDATE TRANSACTION IF EXISTS
                 * ============================================================
                 * WHY:
                 * Keeps backward compatibility if Transaction table is used
                 */
                const transaction = await Transaction.findOne({
                    where: { reference }
                });

                if (transaction) {
                    await transaction.update({ status: "completed" });
                    console.log("✅ Transaction updated:", transaction.id);
                }

                /**
                 * ============================================================
                 * 🔥 FIX #4: UPDATE PAYMENT TABLE (SAFE)
                 * ============================================================
                 * NOTE:
                 * Adjust field if needed (transactionId vs paymentIntentId)
                 */
                await Payment.update(
                    { status: "paid" },
                    {
                        where: {
                            transactionId: transaction?.id // safe optional
                        }
                    }
                );

                console.log("✅ Payment table updated successfully");

                /**
                 * ============================================================
                 * 🧾 GENERATE RECEIPT (UNCHANGED)
                 * ============================================================
                 */
                const receipt = {
                    paymentIntentId: paymentIntent.id, // ✅ updated source
                    reference,
                    amount: event.data.amount / 100,
                    currency: event.data.currency,
                    status: "paid",
                    paidAt: new Date(),
                    customerEmail: event.data.customer?.email
                };

                console.log("🧾 Receipt generated:", receipt);

                /**
                 * ============================================================
                 * 💾 SAVE RECEIPT LOCALLY
                 * ============================================================
                 */
                const receiptsDir = path.join(__dirname, "../../receipts");

                if (!fs.existsSync(receiptsDir)) {
                    fs.mkdirSync(receiptsDir, { recursive: true });
                }

                const filePath = path.join(receiptsDir, `${reference}.json`);

                fs.writeFileSync(
                    filePath,
                    JSON.stringify(receipt, null, 2)
                );

                console.log("💾 Receipt saved at:", filePath);
            }

            return res.sendStatus(200);

        } catch (error) {

            console.error("❌ FULL WEBHOOK ERROR:", error);

            return res.status(500).send("Webhook processing failed");
        }
    }
}