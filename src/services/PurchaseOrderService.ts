//////// src/services/PurchaseOrderService.ts

///////**
////// * =============================================================================
////// * PurchaseOrderService (SAFE + CLEAN VERSION)
////// * =============================================================================
////// *
////// * What this fixes (and why)
////// * 1) Removes ANY PaymentIntent references from this file
////// *    - Your recent compile errors show PurchaseOrderService.ts referencing PaymentIntent
////// *      which breaks because DatabaseModels does not include PaymentIntent.
////// *
////// * 2) Keeps the correct NAMED EXPORT:
////// *    export class PurchaseOrderService
////// *    - Fixes TS2305: "has no exported member 'PurchaseOrderService'"
////// *
////// * 3) Preserves your existing behavior:
////// *    - Explicit mapping (prevents NOT NULL issues)
////// *    - Transaction safety
////// *    - Items creation
////// *    - Includes merchant in fetch
////// *
////// * IMPORTANT:
////// * PaymentIntent creation must happen in the controller layer (approval flow),
////// * NOT inside this service, to preserve SRP and avoid model type coupling.
////// * =============================================================================
////// */

//////import { Sequelize, Transaction } from 'sequelize';
//////import { DatabaseModels } from '../types';

//////export class PurchaseOrderService {

//////    private models: DatabaseModels;
//////    private sequelize: Sequelize;

//////    constructor(models: DatabaseModels, sequelize: Sequelize) {
//////        this.models = models;
//////        this.sequelize = sequelize;
//////    }

//////    /**
//////     * =========================================================================
//////     * CREATE PURCHASE ORDER
//////     * =========================================================================
//////     */
//////    async createPurchaseOrder(data: any): Promise<any> {

//////        const transaction: Transaction =
//////            await this.sequelize.transaction();

//////        try {

//////            // -----------------------------------------------------------------
//////            // Generate poReference if missing
//////            // -----------------------------------------------------------------
//////            const poReference =
//////                data.poReference ??
//////                `PO-${data.merchantId ?? 'ADMIN'}-${Date.now()}`;

//////            // -----------------------------------------------------------------
//////            // Calculate totalAmount safely
//////            // -----------------------------------------------------------------
//////            let totalAmount = 0;

//////            if (Array.isArray(data.items)) {

//////                totalAmount =
//////                    data.items.reduce(
//////                        (sum: number, item: any) => {

//////                            const quantity =
//////                                Number(item.quantity) || 0;

//////                            const unitPrice =
//////                                Number(item.unitPrice) || 0;

//////                            return sum + (quantity * unitPrice);
//////                        },
//////                        0
//////                    );
//////            }

//////            // -----------------------------------------------------------------
//////            // CRITICAL:
//////            // DO NOT pass raw "data"
//////            // Map explicitly to DB model fields
//////            // -----------------------------------------------------------------
//////            const purchaseOrder =
//////                await this.models.PurchaseOrder.create({

//////                    poReference: poReference,

//////                    // NOTE:
//////                    // If merchantId is missing, this will become NaN.
//////                    // You should enforce merchantId in controller or resolve it there.
//////                    merchantId:
//////                        Number(data.merchantId),

//////                    // Sequelize DECIMAL should be string
//////                    totalAmount:
//////                        String(totalAmount),

//////                    description:
//////                        data.description ?? null,

//////                    dueDate:
//////                        data.dueDate ?? null,

//////                    status:
//////                        data.status ?? 'pending'

//////                }, { transaction });

//////            const purchaseOrderId: number =
//////                purchaseOrder.getDataValue('id');

//////            // -----------------------------------------------------------------
//////            // Create PurchaseOrderItems
//////            // -----------------------------------------------------------------
//////            if (Array.isArray(data.items)) {

//////                for (const item of data.items) {

//////                    const quantity =
//////                        Number(item.quantity);

//////                    const unitPrice =
//////                        Number(item.unitPrice);

//////                    const lineTotal =
//////                        quantity * unitPrice;

//////                    await this.models.PurchaseOrderItem.create({

//////                        purchaseOrderId,

//////                        itemName:
//////                            item.itemName,

//////                        quantity:
//////                            quantity,

//////                        unitPrice:
//////                            String(unitPrice),

//////                        lineTotal:
//////                            String(lineTotal),

//////                        description:
//////                            item.description ?? null

//////                    }, { transaction });
//////                }
//////            }

//////            await transaction.commit();

//////            return await this.getPurchaseOrderById(
//////                purchaseOrderId
//////            );
//////        }
//////        catch (error) {

//////            await transaction.rollback();

//////            console.error(
//////                "PurchaseOrder CREATE ERROR:",
//////                error
//////            );

//////            throw error;
//////        }
//////    }

//////    /**
//////     * =========================================================================
//////     * GET PURCHASE ORDER BY ID
//////     * =========================================================================
//////     */
//////    async getPurchaseOrderById(id: number): Promise<any> {

//////        return this.models.PurchaseOrder.findByPk(id, {

//////            include: [
//////                {
//////                    model: this.models.PurchaseOrderItem,
//////                    as: 'items'
//////                },
//////                {
//////                    model: this.models.Merchant,
//////                    as: 'merchant'
//////                }
//////            ]
//////        });
//////    }

//////    /**
//////     * =========================================================================
//////     * GET ALL PURCHASE ORDERS
//////     * =========================================================================
//////     */
//////    async getAllPurchaseOrders(
//////        filter: any = {},
//////        page: number = 1,
//////        limit: number = 10
//////    ) {

//////        const offset = (page - 1) * limit;

//////        const result =
//////            await this.models.PurchaseOrder.findAndCountAll({

//////                where: filter,

//////                include: [
//////                    {
//////                        model: this.models.PurchaseOrderItem,
//////                        as: 'items'
//////                    },
//////                    {
//////                        model: this.models.Merchant,
//////                        as: 'merchant'
//////                    }
//////                ],

//////                offset,
//////                limit,

//////                order: [['createdAt', 'DESC']]
//////            });

//////        return {
//////            purchaseOrders: result.rows,
//////            total: result.count
//////        };
//////    }

//////    /**
//////     * =========================================================================
//////     * UPDATE PURCHASE ORDER
//////     * =========================================================================
//////     */
//////    async updatePurchaseOrder(id: number, updateData: any) {

//////        if (updateData.totalAmount !== undefined) {
//////            updateData.totalAmount = String(updateData.totalAmount);
//////        }

//////        await this.models.PurchaseOrder.update(
//////            updateData,
//////            { where: { id } }
//////        );

//////        return this.getPurchaseOrderById(id);
//////    }

//////    /**
//////     * =========================================================================
//////     * DELETE PURCHASE ORDER
//////     * =========================================================================
//////     */
//////    async deletePurchaseOrder(id: number): Promise<boolean> {

//////        await this.models.PurchaseOrderItem.destroy({
//////            where: { purchaseOrderId: id }
//////        });

//////        await this.models.PurchaseOrder.destroy({
//////            where: { id }
//////        });

//////        return true;
//////    }

//////    /**
//////     * =========================================================================
//////     * ADD ITEM
//////     * =========================================================================
//////     */
//////    async addItemToPurchaseOrder(id: number, item: any) {

//////        const quantity =
//////            Number(item.quantity);

//////        const unitPrice =
//////            Number(item.unitPrice);

//////        const lineTotal =
//////            quantity * unitPrice;

//////        await this.models.PurchaseOrderItem.create({

//////            purchaseOrderId: id,

//////            itemName:
//////                item.itemName,

//////            quantity:
//////                quantity,

//////            unitPrice:
//////                String(unitPrice),

//////            lineTotal:
//////                String(lineTotal),

//////            description:
//////                item.description ?? null
//////        });

//////        return this.getPurchaseOrderById(id);
//////    }

//////    /**
//////     * =========================================================================
//////     * UPDATE STATUS
//////     * =========================================================================
//////     */
//////    async updatePurchaseOrderStatus(id: number, status: string) {

//////        await this.models.PurchaseOrder.update(
//////            { status },
//////            { where: { id } }
//////        );

//////        return this.getPurchaseOrderById(id);
//////    }

//////    /**
//////     * =========================================================================
//////     * GET PURCHASE ORDER STATS
//////     * =========================================================================
//////     */
//////    async getPurchaseOrderStats() {

//////        const { PurchaseOrder } = this.models;

//////        const totalOrders =
//////            await PurchaseOrder.count();

//////        const totalValue =
//////            await PurchaseOrder.sum('totalAmount') || 0;

//////        const pending =
//////            await PurchaseOrder.count({
//////                where: { status: 'pending' }
//////            });

//////        const completed =
//////            await PurchaseOrder.count({
//////                where: { status: 'completed' }
//////            });

//////        return {
//////            totalOrders,
//////            totalValue,
//////            pending,
//////            completed
//////        };
//////    }


//////}



////// =============================================================================
////// InvoiceService
////// =============================================================================
//////
////// PURPOSE
////// Handles all invoice lifecycle operations:
//////
////// 1. Generate PDF invoice from PaymentIntent
////// 2. Create Invoice record after successful payment (Webhook)
//////
////// FULLY COMPATIBLE WITH:
//////
////// • PaymentIntent model
////// • PurchaseOrder model
////// • PurchaseOrderItem model
////// • Paystack webhook flow
////// • Receipt download endpoint
//////
////// =============================================================================

////import PDFDocument from "pdfkit";
////import { Buffer } from "buffer";

////// Named Sequelize model imports
////import { PaymentIntent } from "../models/PaymentIntent";
////import PurchaseOrder from "../models/PurchaseOrder";
////import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
////import { Invoice } from "../models/Invoice";

////export class InvoiceService {

////    // =============================================================================
////    // Generate PDF Invoice
////    // =============================================================================
////    //
////    // PURPOSE
////    // Creates a proper PDF invoice based on PaymentIntent and PurchaseOrder data
////    //
////    // RETURNS
////    // PDF Buffer for download or email
////    //
////    // =============================================================================

////    async generateInvoicePdf(
////        paymentIntentId: number
////    ): Promise<Buffer> {

////        if (!paymentIntentId)
////            throw new Error("Valid PaymentIntent id required");


////        // =============================================================================
////        // Load PaymentIntent
////        // =============================================================================

////        const intent =
////            await PaymentIntent.findByPk(
////                paymentIntentId
////            );

////        if (!intent)
////            throw new Error("PaymentIntent not found");


////        // =============================================================================
////        // Load Purchase Order
////        // =============================================================================

////        const po =
////            await PurchaseOrder.findByPk(
////                intent.purchase_order_id
////            );

////        if (!po)
////            throw new Error("PurchaseOrder not found");


////        // =============================================================================
////        // Load Line Items
////        // =============================================================================

////        const items =
////            await PurchaseOrderItem.findAll({

////                where: {
////                    purchaseOrderId: po.id
////                }

////            });


////        // =============================================================================
////        // Create PDF
////        // =============================================================================

////        const doc =
////            new PDFDocument({

////                size: "A4",
////                margin: 50

////            });

////        const buffers: Buffer[] = [];

////        doc.on(
////            "data",
////            buffers.push.bind(buffers)
////        );


////        // =============================================================================
////        // Header
////        // =============================================================================

////        doc.fontSize(22)
////            .text("PayVerify Invoice", {
////                align: "center"
////            });

////        doc.moveDown();

////        doc.fontSize(12)
////            .text(`Invoice Date: ${new Date().toLocaleString()}`);

////        doc.text(`PaymentIntent ID: ${intent.id}`);

////        doc.text(`Purchase Order ID: ${po.id}`);

////        doc.moveDown();


////        // =============================================================================
////        // Line Items
////        // =============================================================================

////        doc.fontSize(14)
////            .text("Line Items");

////        doc.moveDown();

////        doc.fontSize(12);

////        let total = 0;

////        items.forEach((item: any) => {

////            const lineTotal =
////                Number(item.quantity) *
////                Number(item.unitPrice);

////            total += lineTotal;

////            doc.text(
////                `${item.description}  |  Qty: ${item.quantity}  |  Unit: ₦${item.unitPrice}  |  Total: ₦${lineTotal}`
////            );

////        });


////        doc.moveDown();


////        // =============================================================================
////        // Total
////        // =============================================================================

////        doc.fontSize(16)
////            .text(
////                `TOTAL: ₦${total.toLocaleString()}`,
////                { align: "right" }
////            );


////        doc.moveDown();


////        // =============================================================================
////        // Footer
////        // =============================================================================

////        doc.fontSize(10)
////            .text(
////                "Powered by PayVerify",
////                { align: "center" }
////            );


////        doc.end();


////        // =============================================================================
////        // Return PDF Buffer
////        // =============================================================================

////        return new Promise((resolve) => {

////            doc.on(
////                "end",
////                () => resolve(
////                    Buffer.concat(buffers)
////                )
////            );

////        });

////    }


////    // =============================================================================
////    // Create Invoice Record from PaymentIntent
////    // =============================================================================
////    //
////    // PURPOSE
////    // Called automatically by Paystack webhook after successful payment.
////    //
////    // This creates the official Invoice record in the database.
////    //
////    // DOES NOT generate PDF here.
////    //
////    // PDF is generated only when requested.
////    //
////    // =============================================================================

////    async createFromPaymentIntent(
////        paymentIntentId: number
////    ): Promise<any> {

////        if (!paymentIntentId)
////            throw new Error(
////                "PaymentIntent id required"
////            );


////        // =============================================================================
////        // Load PaymentIntent
////        // =============================================================================

////        const intent =
////            await PaymentIntent.findByPk(
////                paymentIntentId
////            );

////        if (!intent)
////            throw new Error(
////                "PaymentIntent not found"
////            );


////        // =============================================================================
////        // Prevent duplicate invoice creation
////        // =============================================================================

////        const existing =
////            await Invoice.findOne({

////                where: {
////                    payment_intent_id:
////                        paymentIntentId
////                }

////            });

////        if (existing)
////            return existing;


////        // =============================================================================
////        // Create Invoice Record
////        // =============================================================================

////        const invoice =
////            await Invoice.create({

////                payment_intent_id:
////                    intent.id,

////                merchant_id:
////                    intent.merchant_id,

////                amount:
////                    intent.amount,

////                status:
////                    "paid",

////                issued_at:
////                    new Date()

////            });

////        return invoice;

////    }

////}



///**
// * =============================================================================
// * PurchaseOrderService (CLEAN SRP VERSION)
// * =============================================================================
// *
// * 🔧 WHAT CHANGED (IMPORTANT)
// * -----------------------------------------------------------------------------
// * 1. ❌ REMOVED InvoiceService code from this file
// *    - Previously this file incorrectly contained Invoice logic
// *    - Violated SRP and broke TS imports
// *
// * 2. ❌ REMOVED pdfkit, PaymentIntent, Invoice imports
// *    - PurchaseOrderService must NOT know about payments or invoices
// *    - Prevents circular dependencies and future scaling issues
// *
// * 3. ✅ RESTORED proper PurchaseOrder domain responsibility
// *
// * 4. ✅ ENSURED named export:
// *        export class PurchaseOrderService
// *    - Fixes TS2305 "no exported member"
// *
// * 5. ✅ PRESERVED transaction safety and explicit mapping
// *
// * ARCHITECTURE RULE
// * -----------------------------------------------------------------------------
// * PurchaseOrderService → manages orders only
// * InvoiceService       → manages invoices only
// * PaymentIntentService → manages payment intents
// *
// * =============================================================================
// */

//import { Sequelize, Transaction } from "sequelize";
//import { DatabaseModels } from "../types";

//export class PurchaseOrderService {
//    private models: DatabaseModels;
//    private sequelize: Sequelize;a

//    constructor(models: DatabaseModels, sequelize: Sequelize) {
//        this.models = models;
//        this.sequelize = sequelize;
//    }

//    /**
//     * =========================================================================
//     * CREATE PURCHASE ORDER
//     * =========================================================================
//     */
//    async createPurchaseOrder(data: any): Promise<any> {
//        const transaction: Transaction = await this.sequelize.transaction();

//        try {
//            // ---------------------------------------------------------------------
//            // Generate PO reference safely
//            // ---------------------------------------------------------------------
//            const poReference =
//                data.poReference ??
//                `PO-${data.merchantId ?? "ADMIN"}-${Date.now()}`;

//            // ---------------------------------------------------------------------
//            // Calculate total safely
//            // ---------------------------------------------------------------------
//            let totalAmount = 0;

//            if (Array.isArray(data.items)) {
//                totalAmount = data.items.reduce((sum: number, item: any) => {
//                    const quantity = Number(item.quantity) || 0;
//                    const unitPrice = Number(item.unitPrice) || 0;
//                    return sum + quantity * unitPrice;
//                }, 0);
//            }

//            // ---------------------------------------------------------------------
//            // Explicit DB mapping (prevents NOT NULL issues)
//            // ---------------------------------------------------------------------
//            const purchaseOrder = await this.models.PurchaseOrder.create(
//                {
//                    poReference,
//                    merchantId: Number(data.merchantId),
//                    totalAmount: String(totalAmount), // DECIMAL safety
//                    description: data.description ?? null,
//                    dueDate: data.dueDate ?? null,
//                    status: data.status ?? "pending",
//                },
//                { transaction }
//            );

//            const purchaseOrderId: number =
//                purchaseOrder.getDataValue("id");

//            // ---------------------------------------------------------------------
//            // Create line items
//            // ---------------------------------------------------------------------
//            if (Array.isArray(data.items)) {
//                for (const item of data.items) {
//                    const quantity = Number(item.quantity);
//                    const unitPrice = Number(item.unitPrice);
//                    const lineTotal = quantity * unitPrice;

//                    await this.models.PurchaseOrderItem.create(
//                        {
//                            purchaseOrderId,
//                            itemName: item.itemName,
//                            quantity,
//                            unitPrice: String(unitPrice),
//                            lineTotal: String(lineTotal),
//                            description: item.description ?? null,
//                        },
//                        { transaction }
//                    );
//                }
//            }

//            await transaction.commit();

//            return await this.getPurchaseOrderById(purchaseOrderId);
//        } catch (error) {
//            await transaction.rollback();

//            console.error("PurchaseOrder CREATE ERROR:", error);
//            throw error;
//        }
//    }

//    /**
//     * =========================================================================
//     * GET PURCHASE ORDER BY ID
//     * =========================================================================
//     */
//    async getPurchaseOrderById(id: number): Promise<any> {
//        return this.models.PurchaseOrder.findByPk(id, {
//            include: [
//                { model: this.models.PurchaseOrderItem, as: "items" },
//                { model: this.models.Merchant, as: "merchant" },
//            ],
//        });
//    }

//    /**
//     * =========================================================================
//     * GET ALL PURCHASE ORDERS (paginated)
//     * =========================================================================
//     */
//    async getAllPurchaseOrders(
//        filter: any = {},
//        page: number = 1,
//        limit: number = 10
//    ) {
//        const offset = (page - 1) * limit;

//        const result = await this.models.PurchaseOrder.findAndCountAll({
//            where: filter,
//            include: [
//                { model: this.models.PurchaseOrderItem, as: "items" },
//                { model: this.models.Merchant, as: "merchant" },
//            ],
//            offset,
//            limit,
//            order: [["createdAt", "DESC"]],
//        });

//        return {
//            purchaseOrders: result.rows,
//            total: result.count,
//        };
//    }

//    /**
//     * =========================================================================
//     * UPDATE PURCHASE ORDER
//     * =========================================================================
//     */
//    async updatePurchaseOrder(id: number, updateData: any) {
//        if (updateData.totalAmount !== undefined) {
//            updateData.totalAmount = String(updateData.totalAmount);
//        }

//        await this.models.PurchaseOrder.update(updateData, {
//            where: { id },
//        });

//        return this.getPurchaseOrderById(id);
//    }

//    /**
//     * =========================================================================
//     * DELETE PURCHASE ORDER
//     * =========================================================================
//     */
//    async deletePurchaseOrder(id: number): Promise<boolean> {
//        await this.models.PurchaseOrderItem.destroy({
//            where: { purchaseOrderId: id },
//        });

//        await this.models.PurchaseOrder.destroy({
//            where: { id },
//        });

//        return true;
//    }

//    /**
//     * =========================================================================
//     * UPDATE STATUS
//     * =========================================================================
//     */
//    async updatePurchaseOrderStatus(id: number, status: string) {
//        await this.models.PurchaseOrder.update(
//            { status },
//            { where: { id } }
//        );

//        return this.getPurchaseOrderById(id);
//    }

//    /**
//     * =========================================================================
//     * STATS
//     * =========================================================================
//     */
//    async getPurchaseOrderStats() {
//        const { PurchaseOrder } = this.models;

//        const totalOrders = await PurchaseOrder.count();
//        const totalValue = (await PurchaseOrder.sum("totalAmount")) || 0;

//        const pending = await PurchaseOrder.count({
//            where: { status: "pending" },
//        });

//        const completed = await PurchaseOrder.count({
//            where: { status: "completed" },
//        });

//        return {
//            totalOrders,
//            totalValue,
//            pending,
//            completed,
//        };
//    }
//}



/**
 * =============================================================================
 * PurchaseOrderService (PRODUCTION-SAFE VERSION)
 * =============================================================================
 *
 * 🔧 WHAT CHANGED (NEW IN THIS VERSION)
 * -----------------------------------------------------------------------------
 * ✅ FIXED: stray character after sequelize property (build breaker)
 * ✅ ADDED: addItemToPurchaseOrder (required by controller)
 * ✅ ADDED: automatic total recalculation after item insert
 * ✅ ADDED: transaction safety for item addition
 * ✅ HARDENED: numeric parsing and DECIMAL handling
 * ✅ PRESERVED: SRP (no payment/invoice coupling)
 *
 * =============================================================================
 */

import { Sequelize, Transaction } from "sequelize";
import { DatabaseModels } from "../types";

export class PurchaseOrderService {
    private models: DatabaseModels;

    // ✅ FIXED: removed stray character that was breaking build
    private sequelize: Sequelize;

    constructor(models: DatabaseModels, sequelize: Sequelize) {
        this.models = models;
        this.sequelize = sequelize;
    }

    // =============================================================================
    // CREATE PURCHASE ORDER
    // =============================================================================
    async createPurchaseOrder(data: any): Promise<any> {
        const transaction: Transaction = await this.sequelize.transaction();

        try {
            const poReference =
                data.poReference ??
                `PO-${data.merchantId ?? "ADMIN"}-${Date.now()}`;

            let totalAmount = 0;

            if (Array.isArray(data.items)) {
                totalAmount = data.items.reduce((sum: number, item: any) => {
                    const quantity = Number(item.quantity) || 0;
                    const unitPrice = Number(item.unitPrice) || 0;
                    return sum + quantity * unitPrice;
                }, 0);
            }

            const purchaseOrder = await this.models.PurchaseOrder.create(
                {
                    poReference,
                    merchantId: Number(data.merchantId),
                    totalAmount: String(totalAmount),
                    description: data.description ?? null,
                    dueDate: data.dueDate ?? null,
                    status: data.status ?? "pending",
                },
                { transaction }
            );

            const purchaseOrderId: number =
                purchaseOrder.getDataValue("id");

            // create items
            if (Array.isArray(data.items)) {
                for (const item of data.items) {
                    const quantity = Number(item.quantity);
                    const unitPrice = Number(item.unitPrice);
                    const lineTotal = quantity * unitPrice;

                    await this.models.PurchaseOrderItem.create(
                        {
                            purchaseOrderId,
                            itemName: item.itemName,
                            quantity,
                            unitPrice: String(unitPrice),
                            lineTotal: String(lineTotal),
                            description: item.description ?? null,
                        },
                        { transaction }
                    );
                }
            }

            await transaction.commit();

            return await this.getPurchaseOrderById(purchaseOrderId);
        } catch (error) {
            await transaction.rollback();
            console.error("PurchaseOrder CREATE ERROR:", error);
            throw error;
        }
    }

    // =============================================================================
    // ⭐ NEW — ADD ITEM TO PURCHASE ORDER (ENTERPRISE SAFE)
    // =============================================================================
    /**
     * WHY THIS WAS ADDED
     * ---------------------------------------------------------------------------
     * Your controller already calls addItemToPurchaseOrder().
     * The method was missing → caused TS2339 compile error.
     *
     * WHAT THIS METHOD DOES
     * ---------------------------------------------------------------------------
     * ✅ validates purchase order exists
     * ✅ inserts line item
     * ✅ recalculates totalAmount (CRITICAL for finance)
     * ✅ runs inside transaction
     */
    async addItemToPurchaseOrder(
        purchaseOrderId: number,
        item: any
    ): Promise<any> {
        const transaction = await this.sequelize.transaction();

        try {
            // ---------------------------------------------------------------------
            // Validate purchase order
            // ---------------------------------------------------------------------
            const purchaseOrder =
                await this.models.PurchaseOrder.findByPk(
                    purchaseOrderId,
                    { transaction }
                );

            if (!purchaseOrder) {
                throw new Error("Purchase order not found");
            }

            // ---------------------------------------------------------------------
            // Create new line item
            // ---------------------------------------------------------------------
            const quantity = Number(item.quantity) || 0;
            const unitPrice = Number(item.unitPrice) || 0;
            const lineTotal = quantity * unitPrice;

            await this.models.PurchaseOrderItem.create(
                {
                    purchaseOrderId,
                    itemName: item.itemName,
                    quantity,
                    unitPrice: String(unitPrice),
                    lineTotal: String(lineTotal),
                    description: item.description ?? null,
                },
                { transaction }
            );

            // ---------------------------------------------------------------------
            // 🔥 CRITICAL: Recalculate order total
            // ---------------------------------------------------------------------
            const items =
                await this.models.PurchaseOrderItem.findAll({
                    where: { purchaseOrderId },
                    transaction,
                });

            const newTotal = items.reduce((sum: number, i: any) => {
                return sum + Number(i.lineTotal || 0);
            }, 0);

            await purchaseOrder.update(
                { totalAmount: String(newTotal) },
                { transaction }
            );

            await transaction.commit();

            return this.getPurchaseOrderById(purchaseOrderId);
        } catch (error) {
            await transaction.rollback();
            console.error("ADD ITEM ERROR:", error);
            throw error;
        }
    }

    // =============================================================================
    // GET PURCHASE ORDER BY ID
    // =============================================================================
    async getPurchaseOrderById(id: number): Promise<any> {
        return this.models.PurchaseOrder.findByPk(id, {
            include: [
                { model: this.models.PurchaseOrderItem, as: "items" },
                { model: this.models.Merchant, as: "merchant" },
            ],
        });
    }

    // =============================================================================
    // GET ALL PURCHASE ORDERS
    // =============================================================================
    async getAllPurchaseOrders(
        filter: any = {},
        page: number = 1,
        limit: number = 10
    ) {
        const offset = (page - 1) * limit;

        const result = await this.models.PurchaseOrder.findAndCountAll({
            where: filter,
            include: [
                { model: this.models.PurchaseOrderItem, as: "items" },
                { model: this.models.Merchant, as: "merchant" },
            ],
            offset,
            limit,
            order: [["createdAt", "DESC"]],
        });

        return {
            purchaseOrders: result.rows,
            total: result.count,
        };
    }

    // =============================================================================
    // UPDATE PURCHASE ORDER
    // =============================================================================
    async updatePurchaseOrder(id: number, updateData: any) {
        if (updateData.totalAmount !== undefined) {
            updateData.totalAmount = String(updateData.totalAmount);
        }

        await this.models.PurchaseOrder.update(updateData, {
            where: { id },
        });

        return this.getPurchaseOrderById(id);
    }

    // =============================================================================
    // DELETE PURCHASE ORDER
    // =============================================================================
    async deletePurchaseOrder(id: number): Promise<boolean> {
        await this.models.PurchaseOrderItem.destroy({
            where: { purchaseOrderId: id },
        });

        await this.models.PurchaseOrder.destroy({
            where: { id },
        });

        return true;
    }

    // =============================================================================
    // UPDATE STATUS
    // =============================================================================
    async updatePurchaseOrderStatus(id: number, status: string) {
        await this.models.PurchaseOrder.update(
            { status },
            { where: { id } }
        );

        return this.getPurchaseOrderById(id);
    }

    // =============================================================================
    // STATS
    // =============================================================================
    async getPurchaseOrderStats() {
        const { PurchaseOrder } = this.models;

        const totalOrders = await PurchaseOrder.count();
        const totalValue =
            (await PurchaseOrder.sum("totalAmount")) || 0;

        const pending = await PurchaseOrder.count({
            where: { status: "pending" },
        });

        const completed = await PurchaseOrder.count({
            where: { status: "completed" },
        });

        return {
            totalOrders,
            totalValue,
            pending,
            completed,
        };
    }
}

