//////////////////import crypto from 'crypto';
//////////////////import QRCode from 'qrcode';

//////////////////import { PaymentIntent } from '../models/PaymentIntent';

//////////////////export class PaymentIntentService {

//////////////////    async createFromPurchaseOrder(purchaseOrder: any) {

//////////////////        const token =
//////////////////            crypto.randomBytes(32).toString('hex');

//////////////////        const paymentLink =
//////////////////            `${process.env.FRONTEND_URL}/pay/${token}`;

//////////////////        const qrUrl =
//////////////////            await QRCode.toDataURL(paymentLink);

//////////////////        const intent =
//////////////////            await PaymentIntent.create({

//////////////////                purchase_order_id:
//////////////////                    purchaseOrder.id,

//////////////////                merchant_id:
//////////////////                    purchaseOrder.merchant_id,

//////////////////                amount:
//////////////////                    purchaseOrder.amount,

//////////////////                token,

//////////////////                payment_link: paymentLink,

//////////////////                qr_url: qrUrl,

//////////////////                status: 'pending',

//////////////////                expires_at:
//////////////////                    new Date(
//////////////////                        Date.now()
//////////////////                        + 24 * 60 * 60 * 1000
//////////////////                    )
//////////////////            });

//////////////////        return intent;
//////////////////    }

//////////////////    async getByPurchaseOrderId(poId: number) {

//////////////////        return PaymentIntent.findOne({

//////////////////            where: {
//////////////////                purchase_order_id: poId
//////////////////            }
//////////////////        });
//////////////////    }
//////////////////}


////////////////// =============================================================================
////////////////// PaymentIntentService
////////////////// =============================================================================
////////////////// Enterprise-grade service for creating and retrieving payment intents
////////////////// =============================================================================

////////////////import crypto from 'crypto';
////////////////import QRCode from 'qrcode';

////////////////import { PaymentIntent } from '../models/PaymentIntent';

////////////////export class PaymentIntentService {

////////////////    // =============================================================================
////////////////    // Create PaymentIntent from Purchase Order
////////////////    // =============================================================================

////////////////    async createFromPurchaseOrder(purchaseOrder: any) {

////////////////        if (!purchaseOrder)
////////////////            throw new Error("PurchaseOrder is required");


////////////////        const token =
////////////////            crypto.randomBytes(32).toString('hex');


////////////////        const paymentLink =
////////////////            `${process.env.FRONTEND_URL}/pay/${token}`;


////////////////        const qrUrl =
////////////////            await QRCode.toDataURL(paymentLink);


////////////////        const intent =
////////////////            await PaymentIntent.create({

////////////////                purchase_order_id:
////////////////                    purchaseOrder.id,

////////////////                merchant_id:
////////////////                    purchaseOrder.merchant_id,

////////////////                amount:
////////////////                    purchaseOrder.amount,

////////////////                token,

////////////////                payment_link: paymentLink,

////////////////                qr_url: qrUrl,

////////////////                status: 'pending',

////////////////                expires_at:
////////////////                    new Date(
////////////////                        Date.now()
////////////////                        + 24 * 60 * 60 * 1000
////////////////                    )
////////////////            });

////////////////        return intent;
////////////////    }


////////////////    // =============================================================================
////////////////    // Get PaymentIntent by PurchaseOrderId
////////////////    // =============================================================================

////////////////    async getByPurchaseOrderId(poId: number) {

////////////////        if (!poId)
////////////////            throw new Error("poId required");

////////////////        return PaymentIntent.findOne({

////////////////            where: {
////////////////                purchase_order_id: poId
////////////////            }
////////////////        });
////////////////    }
////////////////}



//////////////// src/services/PaymentIntentService.ts
//////////////// =============================================================================
//////////////// PaymentIntentService
//////////////// =============================================================================
////////////////
//////////////// PURPOSE
//////////////// Creates and retrieves PaymentIntent records tied to Purchase Orders.
////////////////
//////////////// Why this version fixes your build
//////////////// - It uses the same "static model import" pattern your PaymentController uses.
//////////////// - It does NOT require DatabaseModels.PaymentIntent to exist.
//////////////// - Prevents merchant_id and amount from being null by mapping correctly.
////////////////
//////////////// =============================================================================

//////////////import crypto from 'crypto';
//////////////import { PaymentIntent } from '../models/PaymentIntent';

//////////////export class PaymentIntentService {

//////////////    // =============================================================================
//////////////    // CREATE FROM PURCHASE ORDER
//////////////    // =============================================================================
//////////////    //
//////////////    // Called when a PurchaseOrder is approved.
//////////////    // Ensures merchant_id + amount are always populated.
//////////////    //
//////////////    // =============================================================================

//////////////    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

//////////////        if (!purchaseOrder)
//////////////            throw new Error('purchaseOrder is required');

//////////////        const purchaseOrderId =
//////////////            purchaseOrder.id;

//////////////        if (!purchaseOrderId)
//////////////            throw new Error('purchaseOrder.id is required');

//////////////        // -------------------------------------------------------------------------
//////////////        // Prevent duplicate intents per purchase order
//////////////        // -------------------------------------------------------------------------
//////////////        const existing =
//////////////            await PaymentIntent.findOne({
//////////////                where: { purchaseOrderId }
//////////////            });

//////////////        if (existing)
//////////////            return existing;

//////////////        // -------------------------------------------------------------------------
//////////////        // FIX: Correctly resolve merchantId
//////////////        // Priority:
//////////////        // 1) purchaseOrder.merchantId
//////////////        // 2) purchaseOrder.merchant?.id (if included)
//////////////        // -------------------------------------------------------------------------
//////////////        const merchantId =
//////////////            purchaseOrder.merchantId ??
//////////////            purchaseOrder.merchant?.id ??
//////////////            null;

//////////////        if (!merchantId) {
//////////////            throw new Error(
//////////////                'PaymentIntent creation failed: merchantId missing on PurchaseOrder'
//////////////            );
//////////////        }

//////////////        // -------------------------------------------------------------------------
//////////////        // FIX: Correctly resolve amount
//////////////        // Priority:
//////////////        // 1) purchaseOrder.totalAmount (your DB field)
//////////////        // 2) purchaseOrder.amount (fallback if you ever pass it)
//////////////        // -------------------------------------------------------------------------
//////////////        const amount =
//////////////            purchaseOrder.totalAmount ??
//////////////            purchaseOrder.amount ??
//////////////            null;

//////////////        if (amount === null || amount === undefined || String(amount).trim() === '') {
//////////////            throw new Error(
//////////////                'PaymentIntent creation failed: amount missing on PurchaseOrder'
//////////////            );
//////////////        }

//////////////        // -------------------------------------------------------------------------
//////////////        // Generate token + payment link
//////////////        // -------------------------------------------------------------------------
//////////////        const token =
//////////////            crypto.randomBytes(32).toString('hex');

//////////////        const frontendUrl =
//////////////            String(process.env.FRONTEND_URL || 'http://localhost:5173');

//////////////        const paymentLink =
//////////////            `${frontendUrl}/pay/${token}`;

//////////////        // -------------------------------------------------------------------------
//////////////        // Create PaymentIntent
//////////////        // NOTE:
//////////////        // We write merchant_id exactly as your DB column expects.
//////////////        // Amount written as string for DECIMAL compatibility.
//////////////        // -------------------------------------------------------------------------
//////////////        const intent =
//////////////            await PaymentIntent.create({

//////////////                purchaseOrderId,
//////////////                merchant_id: merchantId,
//////////////                amount: String(amount),

//////////////                token,
//////////////                paymentLink,

//////////////                status: 'pending'
//////////////            });

//////////////        return intent;
//////////////    }

//////////////    // =============================================================================
//////////////    // GET BY PURCHASE ORDER ID
//////////////    // =============================================================================

//////////////    async getByPurchaseOrderId(poId: number): Promise<any> {

//////////////        return PaymentIntent.findOne({
//////////////            where: { purchaseOrderId: poId }
//////////////        });
//////////////    }
//////////////}

////////////// src/services/PaymentIntentService.ts

/////////////**
//////////// * =============================================================================
//////////// * PaymentIntentService (TYPE-SAFE VERSION — FIXES ALL TS ERRORS)
//////////// * =============================================================================
//////////// *
//////////// * FIXES APPLIED:
//////////// *
//////////// * ✔ Uses correct DB column names:
//////////// *      purchase_order_id
//////////// *      merchant_id
//////////// *
//////////// * ✔ Uses correct data types:
//////////// *      amount → number (NOT string)
//////////// *
//////////// * ✔ Fully compatible with your Sequelize model typing
//////////// *
//////////// * ✔ Prevents NOT NULL merchant_id error
//////////// *
//////////// * ✔ Prevents duplicate PaymentIntent creation
//////////// *
//////////// * =============================================================================
//////////// */

////////////import crypto from 'crypto';
////////////import { PaymentIntent } from '../models/PaymentIntent';

////////////export class PaymentIntentService {

////////////    /**
////////////     * =========================================================================
////////////     * CREATE FROM PURCHASE ORDER
////////////     * =========================================================================
////////////     */

////////////    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

////////////        if (!purchaseOrder)
////////////            throw new Error("purchaseOrder is required");


////////////        const purchaseOrderId =
////////////            purchaseOrder.id;


////////////        if (!purchaseOrderId)
////////////            throw new Error("purchaseOrder.id missing");


////////////        // =========================================================================
////////////        // FIX #1: Use correct DB column name: purchase_order_id
////////////        // =========================================================================

////////////        const existing =
////////////            await PaymentIntent.findOne({

////////////                where: {
////////////                    purchase_order_id: purchaseOrderId
////////////                }
////////////            });


////////////        if (existing)
////////////            return existing;


////////////        // =========================================================================
////////////        // FIX #2: Resolve merchant_id correctly
////////////        // =========================================================================

////////////        const merchantId =
////////////            purchaseOrder.merchantId ??
////////////            purchaseOrder.merchant?.id;


////////////        if (!merchantId)
////////////            throw new Error(
////////////                "merchant_id missing from purchaseOrder"
////////////            );


////////////        // =========================================================================
////////////        // FIX #3: amount must be NUMBER, not string
////////////        // =========================================================================

////////////        const amount =
////////////            Number(
////////////                purchaseOrder.totalAmount ??
////////////                purchaseOrder.amount
////////////            );


////////////        if (!amount)
////////////            throw new Error(
////////////                "amount missing from purchaseOrder"
////////////            );


////////////        // =========================================================================
////////////        // Generate secure token
////////////        // =========================================================================

////////////        const token =
////////////            crypto.randomBytes(32).toString('hex');


////////////        const frontendUrl =
////////////            process.env.FRONTEND_URL ||
////////////            "http://localhost:5173";


////////////        const paymentLink =
////////////            `${frontendUrl}/pay/${token}`;


////////////        // =========================================================================
////////////        // Create PaymentIntent (FIXED TYPES)
////////////        // =========================================================================

////////////        const intent =
////////////            await PaymentIntent.create({

////////////                purchase_order_id: purchaseOrderId,

////////////                merchant_id: merchantId,

////////////                amount: amount,   // NUMBER (correct)

////////////                token,

////////////                payment_link: paymentLink,

////////////                status: "pending"
////////////            });


////////////        return intent;
////////////    }


////////////    /**
////////////     * =========================================================================
////////////     * GET BY PURCHASE ORDER ID
////////////     * =========================================================================
////////////     */

////////////    async getByPurchaseOrderId(purchaseOrderId: number): Promise<any> {

////////////        return PaymentIntent.findOne({

////////////            where: {
////////////                purchase_order_id: purchaseOrderId
////////////            }
////////////        });
////////////    }
////////////}


//////////// src/services/PaymentIntentService.ts

//////////import crypto from 'crypto';
//////////import QRCode from 'qrcode';
//////////import { PaymentIntent } from '../models/PaymentIntent';

//////////export class PaymentIntentService {

//////////    /**
//////////     * =========================================================================
//////////     * CREATE PAYMENT INTENT FROM PURCHASE ORDER
//////////     * =========================================================================
//////////     */

//////////    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

//////////        if (!purchaseOrder)
//////////            throw new Error("purchaseOrder required");


//////////        const purchaseOrderId = purchaseOrder.id;

//////////        if (!purchaseOrderId)
//////////            throw new Error("purchaseOrder.id missing");


//////////        /**
//////////         * Prevent duplicate intents
//////////         */
//////////        const existing =
//////////            await PaymentIntent.findOne({
//////////                where: {
//////////                    purchase_order_id: purchaseOrderId
//////////                }
//////////            });

//////////        if (existing)
//////////            return existing;


//////////        /**
//////////         * Resolve merchant_id safely
//////////         */
//////////        const merchantId =
//////////            purchaseOrder.merchantId ??
//////////            purchaseOrder.merchant?.id;

//////////        if (!merchantId)
//////////            throw new Error("merchant_id missing");


//////////        /**
//////////         * Resolve amount safely
//////////         */
//////////        const amount =
//////////            Number(
//////////                purchaseOrder.totalAmount ??
//////////                purchaseOrder.amount
//////////            );

//////////        if (!amount)
//////////            throw new Error("amount missing");


//////////        /**
//////////         * Generate secure token
//////////         */
//////////        const token =
//////////            crypto.randomBytes(32).toString("hex");


//////////        /**
//////////         * Build payment link
//////////         */
//////////        const frontendUrl =
//////////            process.env.FRONTEND_URL ||
//////////            "http://localhost:5173";

//////////        const paymentLink =
//////////            `${frontendUrl}/pay/${token}`;


//////////        /**
//////////         * Generate QR code URL (base64 image)
//////////         */
//////////        const qrUrl =
//////////            await QRCode.toDataURL(paymentLink);


//////////        /**
//////////         * Set expiration time (24 hours)
//////////         */
//////////        const expiresAt =
//////////            new Date(
//////////                Date.now() + 24 * 60 * 60 * 1000
//////////            );


//////////        /**
//////////         * Create intent (ALL REQUIRED FIELDS FILLED)
//////////         */
//////////        const intent =
//////////            await PaymentIntent.create({

//////////                purchase_order_id: purchaseOrderId,

//////////                merchant_id: merchantId,

//////////                amount: amount,

//////////                token: token,

//////////                payment_link: paymentLink,

//////////                qr_url: qrUrl,

//////////                expires_at: expiresAt,

//////////                status: "pending"
//////////            });


//////////        return intent;
//////////    }


//////////    /**
//////////     * =========================================================================
//////////     * GET INTENT BY PURCHASE ORDER
//////////     * =========================================================================
//////////     */

//////////    async getByPurchaseOrderId(purchaseOrderId: number) {

//////////        return PaymentIntent.findOne({
//////////            where: {
//////////                purchase_order_id: purchaseOrderId
//////////            }
//////////        });
//////////    }

//////////    /**
////////// * ============================================================================
////////// * GET PAYMENT INTENT BY TOKEN
////////// * ============================================================================
////////// * Used by public PaymentPage
////////// */

//////////    async getByToken(token: string): Promise<any> {

//////////        if (!token)
//////////            throw new Error("token required");

//////////        return PaymentIntent.findOne({

//////////            where: {
//////////                token: token
//////////            }
//////////        });
//////////    }

//////////}


////////// src/services/PaymentIntentService.ts

/////////**
//////// * =============================================================================
//////// * PaymentIntentService (HARDENED PRODUCTION VERSION)
//////// * =============================================================================
//////// *
//////// * FIXES APPLIED
//////// * -----------------------------------------------------------------------------
//////// * ✔ Handles camelCase vs snake_case merchantId
//////// * ✔ Prevents FK violation on merchant_id
//////// * ✔ Safely normalizes amount (decimal-safe)
//////// * ✔ Prevents duplicate intents per PO
//////// * ✔ Keeps your QR + token flow intact
//////// * ✔ Improves runtime diagnostics
//////// *
//////// * WHY THIS FIXES YOUR 500 ERROR
//////// * -----------------------------------------------------------------------------
//////// * Your PurchaseOrder sometimes returns:
//////// *
//////// *   merchant_id (snake_case)
//////// *
//////// * but service was only checking:
//////// *
//////// *   merchantId (camelCase)
//////// *
//////// * → merchant_id became undefined
//////// * → FK violation
//////// * → 500 error
//////// * → modal never opened
//////// *
//////// * This version fixes that permanently.
//////// * =============================================================================
//////// */

////////import crypto from "crypto";
////////import QRCode from "qrcode";
////////import { PaymentIntent } from "../models/PaymentIntent";

////////export class PaymentIntentService {

////////    /**
////////     * =========================================================================
////////     * CREATE PAYMENT INTENT FROM PURCHASE ORDER
////////     * =========================================================================
////////     */
////////    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

////////        if (!purchaseOrder)
////////            throw new Error("purchaseOrder required");

////////        const purchaseOrderId = purchaseOrder.id;

////////        if (!purchaseOrderId)
////////            throw new Error("purchaseOrder.id missing");

////////        /**
////////         * ----------------------------------------------------------------------
////////         * Prevent duplicate intents
////////         * ----------------------------------------------------------------------
////////         */
////////        const existing = await PaymentIntent.findOne({
////////            where: { purchase_order_id: purchaseOrderId }
////////        });

////////        if (existing) {
////////            return existing;
////////        }

////////        /**
////////         * ----------------------------------------------------------------------
////////         * 🔥 CRITICAL FIX — Resolve merchant_id safely
////////         * ----------------------------------------------------------------------
////////         * Supports ALL shapes:
////////         *  - merchantId (camelCase)
////////         *  - merchant_id (snake_case)
////////         *  - merchant?.id (included relation)
////////         */
////////        const merchantId =
////////            purchaseOrder.merchantId ??
////////            purchaseOrder.merchant_id ??
////////            purchaseOrder.merchant?.id;

////////        if (!merchantId) {
////////            console.error("❌ PaymentIntent merchant resolution failed", {
////////                purchaseOrderSnapshot: purchaseOrder
////////            });

////////            throw new Error(
////////                "PaymentIntent creation failed: merchant_id missing on PurchaseOrder"
////////            );
////////        }

////////        /**
////////         * ----------------------------------------------------------------------
////////         * Normalize amount safely
////////         * ----------------------------------------------------------------------
////////         */
////////        const rawAmount =
////////            purchaseOrder.totalAmount ??
////////            purchaseOrder.amount;

////////        const amount = Number(rawAmount);

////////        if (Number.isNaN(amount) || amount <= 0) {
////////            console.error("❌ Invalid amount for PaymentIntent", {
////////                rawAmount,
////////                purchaseOrderSnapshot: purchaseOrder
////////            });

////////            throw new Error(
////////                "PaymentIntent creation failed: invalid amount"
////////            );
////////        }

////////        /**
////////         * ----------------------------------------------------------------------
////////         * Generate secure token
////////         * ----------------------------------------------------------------------
////////         */
////////        const token = crypto.randomBytes(32).toString("hex");

////////        /**
////////         * ----------------------------------------------------------------------
////////         * Build payment link
////////         * ----------------------------------------------------------------------
////////         */
////////        const frontendUrl =
////////            process.env.FRONTEND_URL ||
////////            "http://localhost:5173";

////////        const paymentLink = `${frontendUrl}/pay/${token}`;

////////        /**
////////         * ----------------------------------------------------------------------
////////         * Generate QR code
////////         * ----------------------------------------------------------------------
////////         */
////////        const qrUrl = await QRCode.toDataURL(paymentLink);

////////        /**
////////         * ----------------------------------------------------------------------
////////         * Expiration (24 hours)
////////         * ----------------------------------------------------------------------
////////         */
////////        const expiresAt =
////////            new Date(Date.now() + 24 * 60 * 60 * 1000);

////////        /**
////////         * ----------------------------------------------------------------------
////////         * Create PaymentIntent
////////         * ----------------------------------------------------------------------
////////         */
////////        const intent = await PaymentIntent.create({
////////            purchase_order_id: purchaseOrderId,
////////            merchant_id: merchantId,
////////            amount: amount,
////////            token: token,
////////            payment_link: paymentLink,
////////            qr_url: qrUrl,
////////            expires_at: expiresAt,
////////            status: "pending"
////////        });

////////        return intent;
////////    }

////////    /**
////////     * =========================================================================
////////     * GET INTENT BY PURCHASE ORDER
////////     * =========================================================================
////////     */
////////    async getByPurchaseOrderId(purchaseOrderId: number) {
////////        return PaymentIntent.findOne({
////////            where: { purchase_order_id: purchaseOrderId }
////////        });
////////    }

////////    /**
////////     * =========================================================================
////////     * GET PAYMENT INTENT BY TOKEN
////////     * =========================================================================
////////     */
////////    async getByToken(token: string): Promise<any> {

////////        if (!token)
////////            throw new Error("token required");

////////        return PaymentIntent.findOne({
////////            where: { token }
////////        });
////////    }
////////}


//////// src/services/PaymentIntentService.ts

//////import crypto from "crypto";
//////import QRCode from "qrcode";
//////import { PaymentIntent } from "../models/PaymentIntent";
//////import PurchaseOrder from "../models/PurchaseOrder"; // ⭐ ADD THIS

//////export class PaymentIntentService {

//////    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

//////        if (!purchaseOrder?.id)
//////            throw new Error("purchaseOrder.id missing");

//////        const purchaseOrderId = purchaseOrder.id;

//////        // ✅ ALWAYS reload fresh PO from DB (CRITICAL FIX)
//////        const freshPO = await PurchaseOrder.findByPk(purchaseOrderId);

//////        if (!freshPO)
//////            throw new Error("PurchaseOrder not found for PaymentIntent");

//////        // ✅ Prevent duplicates
//////        const existing = await PaymentIntent.findOne({
//////            where: { purchase_order_id: purchaseOrderId }
//////        });

//////        if (existing) return existing;

//////        // 🔥 CRITICAL FIX — ALWAYS use DB value
//////        const merchantId = freshPO.getDataValue("merchantId");

//////        if (!merchantId)
//////            throw new Error("merchant_id missing on PurchaseOrder");

//////        // ✅ amount safe
//////        const amount = Number(
//////            freshPO.getDataValue("totalAmount")
//////        );

//////        if (!amount)
//////            throw new Error("amount missing on PurchaseOrder");

//////        // token
//////        const token = crypto.randomBytes(32).toString("hex");

//////        const frontendUrl =
//////            process.env.FRONTEND_URL || "http://localhost:5173";

//////        const paymentLink = `${frontendUrl}/pay/${token}`;

//////        const qrUrl = await QRCode.toDataURL(paymentLink);

//////        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

//////        // ✅ INSERT (now guaranteed valid FK)
//////        const intent = await PaymentIntent.create({
//////            purchase_order_id: purchaseOrderId,
//////            merchant_id: merchantId,
//////            amount,
//////            token,
//////            payment_link: paymentLink,
//////            qr_url: qrUrl,
//////            expires_at: expiresAt,
//////            status: "pending"
//////        });

//////        return intent;
//////    }
//////}



////import crypto from "crypto";
////import QRCode from "qrcode";
////import { PaymentIntent } from "../models/PaymentIntent";
////import PurchaseOrder from "../models/PurchaseOrder";

/////**
//// * =============================================================================
//// * PaymentIntentService (BUILD-SAFE PRODUCTION VERSION)
//// * =============================================================================
//// *
//// * FIXES APPLIED
//// * -----------------------------------------------------------------------------
//// * ✔ Uses ONLY camelCase model fields (fixes TS2345)
//// * ✔ Safe numeric normalization (fixes TS2322)
//// * ✔ Prevents duplicate PaymentIntents
//// * ✔ Guarantees merchant FK integrity
//// * ✔ Adds missing getByToken() (fixes TS2339)
//// * ✔ Reloads PurchaseOrder from DB for data integrity
//// *
//// * IMPORTANT RULE
//// * -----------------------------------------------------------------------------
//// * Sequelize model → camelCase
//// * Database column → snake_case
//// *
//// * ALWAYS use camelCase in TypeScript.
//// * =============================================================================
//// */

////export class PaymentIntentService {

////    /**
////     * =========================================================================
////     * CREATE PAYMENT INTENT FROM PURCHASE ORDER
////     * =========================================================================
////     */
////    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

////        if (!purchaseOrder?.id) {
////            throw new Error("purchaseOrder.id missing");
////        }

////        const purchaseOrderId = purchaseOrder.id;

////        // ---------------------------------------------------------------------
////        // 🔒 ALWAYS reload fresh PurchaseOrder from DB
////        // Prevents stale payload / missing fields
////        // ---------------------------------------------------------------------
////        const freshPO = await PurchaseOrder.findByPk(purchaseOrderId);

////        if (!freshPO) {
////            throw new Error("PurchaseOrder not found for PaymentIntent");
////        }

////        // ---------------------------------------------------------------------
////        // 🚫 Prevent duplicate intents per PO
////        // ---------------------------------------------------------------------
////        const existing = await PaymentIntent.findOne({
////            where: { purchase_order_id: purchaseOrderId }
////        });

////        if (existing) {
////            return existing;
////        }

////        // ---------------------------------------------------------------------
////        // ✅ CRITICAL FIX — Use camelCase model field
////        // ---------------------------------------------------------------------
////        const merchantId = freshPO.getDataValue("merchantId");

////        if (!merchantId) {
////            throw new Error("merchant_id missing on PurchaseOrder");
////        }

////        // ---------------------------------------------------------------------
////        // ✅ Amount normalization (type safe)
////        // ---------------------------------------------------------------------
////        const rawAmount = freshPO.getDataValue("totalAmount");

////        const amount = Number(rawAmount);

////        if (!amount || Number.isNaN(amount)) {
////            throw new Error("amount missing on PurchaseOrder");
////        }

////        // ---------------------------------------------------------------------
////        // 🔐 Generate secure token
////        // ---------------------------------------------------------------------
////        const token = crypto.randomBytes(32).toString("hex");

////        // ---------------------------------------------------------------------
////        // 🌐 Build payment link
////        // ---------------------------------------------------------------------
////        const frontendUrl =
////            process.env.FRONTEND_URL || "http://localhost:5173";

////        const paymentLink = `${frontendUrl}/pay/${token}`;

////        // ---------------------------------------------------------------------
////        // 🧾 Generate QR code
////        // ---------------------------------------------------------------------
////        const qrUrl = await QRCode.toDataURL(paymentLink);

////        // ---------------------------------------------------------------------
////        // ⏳ Expiration (24 hours)
////        // ---------------------------------------------------------------------
////        const expiresAt =
////            new Date(Date.now() + 24 * 60 * 60 * 1000);

////        // ---------------------------------------------------------------------
////        // 💾 Create PaymentIntent (FK now guaranteed valid)
////        // ---------------------------------------------------------------------
////        const intent = await PaymentIntent.create({
////            purchase_order_id: purchaseOrderId,
////            merchant_id: merchantId,
////            amount: amount,
////            token: token,
////            payment_link: paymentLink,
////            qr_url: qrUrl,
////            expires_at: expiresAt,
////            status: "pending"
////        });

////        return intent;
////    }

////    /**
////     * =========================================================================
////     * GET INTENT BY PURCHASE ORDER ID
////     * =========================================================================
////     */
////    async getByPurchaseOrderId(purchaseOrderId: number): Promise<any> {

////        if (!purchaseOrderId) {
////            throw new Error("purchaseOrderId required");
////        }

////        return PaymentIntent.findOne({
////            where: { purchase_order_id: purchaseOrderId }
////        });
////    }

////    /**
////     * =========================================================================
////     * ✅ GET PAYMENT INTENT BY TOKEN (FIXED — REQUIRED BY CONTROLLER)
////     * =========================================================================
////     */
////    async getByToken(token: string): Promise<any> {

////        if (!token) {
////            throw new Error("token required");
////        }

////        return PaymentIntent.findOne({
////            where: { token }
////        });
////    }
////}


//// src/services/PaymentIntentService.ts
//// =============================================================================
//// PaymentIntentService (FULL FINAL VERSION)
////
//// WHAT WAS FIXED:
//// ------------------------------------------------------------
//// ✅ Invoice created here ONLY
//// ✅ public_token = paymentIntent.token (CRITICAL)
//// ✅ Added getByToken method (fix TS error)
//// ✅ Prevent duplicate records
////
//// =============================================================================

//import crypto from 'crypto';
//import { PaymentIntent } from '../models/PaymentIntent';
//import { Invoice } from '../models/Invoice';

//export class PaymentIntentService {

//    private models: any;

//    constructor(models?: any) {
//        this.models = models;
//    }

//    // =============================================================================
//    // CREATE FROM PURCHASE ORDER
//    // =============================================================================
//    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

//        if (!purchaseOrder)
//            throw new Error("purchaseOrder required");

//        const purchaseOrderId = purchaseOrder.id;

//        const existing = await PaymentIntent.findOne({
//            where: { purchase_order_id: purchaseOrderId }
//        });

//        if (existing)
//            return existing;

//        const merchantId =
//            purchaseOrder.merchantId ??
//            purchaseOrder.merchant?.id;

//        if (!merchantId)
//            throw new Error("merchant_id missing");

//        const amount =
//            Number(
//                purchaseOrder.totalAmount ??
//                purchaseOrder.amount
//            );

//        if (!amount)
//            throw new Error("amount missing");

//        const token =
//            crypto.randomBytes(32).toString('hex');

//        const frontendUrl =
//            process.env.FRONTEND_URL ||
//            "http://localhost:5173";

//        const paymentLink =
//            `${frontendUrl}/pay/${token}`;

//        const intent = await PaymentIntent.create({
//            purchase_order_id: purchaseOrderId,
//            merchant_id: merchantId,
//            amount,
//            token,
//            payment_link: paymentLink,
//            status: "pending"
//        });

//        // 🔥 CREATE INVOICE (ONLY PLACE)
//        const existingInvoice = await Invoice.findOne({
//            where: { payment_intent_id: intent.id }
//        });

//        if (!existingInvoice) {

//            await Invoice.create({
//                payment_intent_id: intent.id,
//                merchant_id: merchantId,
//                amount,
//                status: "pending",
//                issued_at: new Date(),

//                // 🔥 CRITICAL FIX
//                public_token: token
//            });
//        }

//        return intent;
//    }

//    // =============================================================================
//    // GET BY PURCHASE ORDER
//    // =============================================================================
//    async getByPurchaseOrderId(purchaseOrderId: number): Promise<any> {
//        return await PaymentIntent.findOne({
//            where: { purchase_order_id: purchaseOrderId }
//        });
//    }

//    // =============================================================================
//    // GET BY TOKEN (FIXED)
//    // =============================================================================
//    async getByToken(token: string): Promise<any> {

//        if (!token)
//            throw new Error("token required");

//        return await PaymentIntent.findOne({
//            where: { token }
//        });
//    }
//}



// src/services/PaymentIntentService.ts
// =============================================================================
// PaymentIntentService (FINAL CLEAN VERSION)
//
// WHAT CHANGED:
// ------------------------------------------------------------
// ❌ REMOVED: QR code generation from backend
// ✅ REASON: QR should be generated on frontend (faster + simpler)
// ✅ Keeps backend focused on business logic only
//
// =============================================================================

import crypto from 'crypto';
import { PaymentIntent } from '../models/PaymentIntent';
import { Invoice } from '../models/Invoice';

export class PaymentIntentService {

    private models: any;

    constructor(models?: any) {
        this.models = models;
    }

    // =============================================================================
    // CREATE FROM PURCHASE ORDER
    // =============================================================================
    async createFromPurchaseOrder(purchaseOrder: any): Promise<any> {

        if (!purchaseOrder)
            throw new Error("purchaseOrder required");

        const purchaseOrderId = purchaseOrder.id;

        // Prevent duplicate payment intent
        const existing = await PaymentIntent.findOne({
            where: { purchase_order_id: purchaseOrderId }
        });

        if (existing)
            return existing;

        const merchantId =
            purchaseOrder.merchantId ??
            purchaseOrder.merchant?.id;

        if (!merchantId)
            throw new Error("merchant_id missing");

        const amount =
            Number(
                purchaseOrder.totalAmount ??
                purchaseOrder.amount
            );

        if (!amount)
            throw new Error("amount missing");

        const token =
            crypto.randomBytes(32).toString('hex');

        const frontendUrl =
            process.env.FRONTEND_URL ||
            "http://localhost:5173";

        const paymentLink =
            `${frontendUrl}/pay/${token}`;

        // Create payment intent
        const intent = await PaymentIntent.create({
            purchase_order_id: purchaseOrderId,
            merchant_id: merchantId,
            amount,
            token,
            payment_link: paymentLink,
            status: "pending"
        });

        // Create invoice (single source of truth)
        const existingInvoice = await Invoice.findOne({
            where: { payment_intent_id: intent.id }
        });

        if (!existingInvoice) {

            await Invoice.create({
                payment_intent_id: intent.id,
                merchant_id: merchantId,
                amount,
                status: "pending",
                issued_at: new Date(),

                // 🔥 CRITICAL: Must match token used in frontend
                public_token: token
            });
        }

        return intent;
    }

    // =============================================================================
    // GET BY PURCHASE ORDER
    // =============================================================================
    async getByPurchaseOrderId(purchaseOrderId: number): Promise<any> {
        return await PaymentIntent.findOne({
            where: { purchase_order_id: purchaseOrderId }
        });
    }

    // =============================================================================
    // GET BY TOKEN
    // =============================================================================
    async getByToken(token: string): Promise<any> {

        if (!token)
            throw new Error("token required");

        return await PaymentIntent.findOne({
            where: { token }
        });
    }
}