// =============================================================================
// src/services/PaymentIntentService.ts
// PaymentIntentService — IDEMPOTENT PAYMENT REQUEST VERSION
// =============================================================================
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ createFromPurchaseOrder() now behaves safely when called more than once.
// ✅ If a PaymentIntent already exists, the service reuses it.
// ✅ The service also guarantees that the matching Invoice exists.
// ✅ Added getInvoiceByPaymentIntentId() for controller reuse.
//
// WHY
// -----------------------------------------------------------------------------
// A customer may close the Payment Request modal and return later.
// Clicking "Complete Payment" must reopen the same payment request without:
// - creating another Purchase Order;
// - creating a duplicate PaymentIntent;
// - creating a duplicate Invoice.
//
// This service remains the single place responsible for creating the
// PaymentIntent + Invoice pair.
//
// =============================================================================

import crypto from 'crypto';

import { PaymentIntent } from '../models/PaymentIntent';
import { Invoice } from '../models/Invoice';

export class PaymentIntentService {

    private readonly models: any;

    constructor(models?: any) {
        this.models = models;
    }

    // =========================================================================
    // CREATE OR REUSE PAYMENT REQUEST FROM PURCHASE ORDER
    // =========================================================================
    //
    // IDEMPOTENT BEHAVIOR:
    //
    // Existing intent:
    //      reuse intent
    //      ensure invoice exists
    //      return intent
    //
    // No existing intent:
    //      create intent
    //      create invoice
    //      return intent
    // =========================================================================
    async createFromPurchaseOrder(
        purchaseOrder: any
    ): Promise<any> {

        if (!purchaseOrder) {
            throw new Error('purchaseOrder required');
        }

        if (
            String(
                purchaseOrder.status ||
                purchaseOrder.getDataValue?.('status') ||
                ''
            ).toLowerCase() === 'cancelled'
        ) {
            throw new Error(
                'A cancelled purchase order cannot create or resume a payment request. Create a new order instead.'
            );
        }

        const purchaseOrderId = Number(
            purchaseOrder.id
        );

        if (
            !Number.isInteger(purchaseOrderId) ||
            purchaseOrderId <= 0
        ) {
            throw new Error(
                'purchaseOrder.id missing or invalid'
            );
        }

        const merchantId = Number(
            purchaseOrder.merchantId ??
            purchaseOrder.merchant_id ??
            purchaseOrder.merchant?.id
        );

        if (
            !Number.isInteger(merchantId) ||
            merchantId <= 0
        ) {
            throw new Error(
                'merchant_id missing from purchaseOrder'
            );
        }

        const amount = Number(
            purchaseOrder.totalAmount ??
            purchaseOrder.amount
        );

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            throw new Error(
                'amount missing or invalid on purchaseOrder'
            );
        }

        // ---------------------------------------------------------------------
        // CHANGED:
        // Reuse an existing intent for the same PO.
        //
        // WHY:
        // Closing and reopening the modal must not create duplicate intents.
        // ---------------------------------------------------------------------
        const frontendUrl = String(
            process.env.FRONTEND_URL ||
            "http://localhost:5173"
        ).replace(/\/+$/, "");

        // ========================================================
        // DEBUG
        // Remove after production verification
        // ========================================================
        console.log("========== PAYMENT LINK DEBUG ==========");
        console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
        console.log("Resolved frontendUrl:", frontendUrl);
        console.log("Purchase Order:", purchaseOrderId);
        console.log("========================================");


        let intent = await PaymentIntent.findOne({
            where: {
                purchase_order_id: purchaseOrderId
            },
            order: [["createdAt", "DESC"]]
        });

        if (!intent) {

            const token =
                crypto.randomBytes(32).toString("hex");

            intent = await PaymentIntent.create({
                purchase_order_id: purchaseOrderId,
                merchant_id: merchantId,
                amount,
                token,
                payment_link: `${frontendUrl}/pay/${token}`,
                status: "pending",
                customer_name: purchaseOrder.customerName || null,
                customer_email: purchaseOrder.customerEmail || null,
                customer_phone: purchaseOrder.customerPhone || null
            });

            console.log("Created Payment Link:", intent.payment_link);

        } else {

            // Keep existing intent but repair an outdated payment link if needed.
            const expectedLink = `${frontendUrl}/pay/${intent.token}`;

            if (intent.payment_link !== expectedLink) {

                await intent.update({
                    payment_link: expectedLink
                });

                intent.payment_link = expectedLink;
            }

            // Keep customer details in sync when an order was captured first
            // and its payment request is created later (including offline
            // reconnects).  Do not overwrite a populated value with null.
            const customerUpdate: Record<string, any> = {};
            if (purchaseOrder.customerName && !intent.customer_name) {
                customerUpdate.customer_name = purchaseOrder.customerName;
            }
            if (purchaseOrder.customerEmail && !intent.customer_email) {
                customerUpdate.customer_email = purchaseOrder.customerEmail;
            }
            if (purchaseOrder.customerPhone && !intent.customer_phone) {
                customerUpdate.customer_phone = purchaseOrder.customerPhone;
            }
            if (Object.keys(customerUpdate).length > 0) {
                await intent.update(customerUpdate);
            }
        }

        // ---------------------------------------------------------------------
        // CHANGED:
        // Always ensure the invoice exists—even when the intent already existed.
        //
        // WHY:
        // A previous request may have created the intent but failed before the
        // invoice was inserted. The returning user must still be able to recover.
        // ---------------------------------------------------------------------
        const intentToken =
            intent.token ||
            crypto.randomBytes(32).toString('hex');

        let invoice = await Invoice.findOne({
            where: {
                payment_intent_id: intent.id
            },
            order: [['createdAt', 'DESC']]
        });

        if (!invoice) {
            invoice = await Invoice.create({
                payment_intent_id: intent.id,
                merchant_id: merchantId,
                amount,
                status: 'pending',
                issued_at: new Date(),

                // Must match the token embedded in payment_link.
                public_token: intentToken,
                customer_email: purchaseOrder.customerEmail || undefined
            });
        }

        return intent;
    }

    // =========================================================================
    // GET BY PURCHASE ORDER
    // =========================================================================
    async getByPurchaseOrderId(
        purchaseOrderId: number
    ): Promise<any> {

        return PaymentIntent.findOne({
            where: {
                purchase_order_id: purchaseOrderId
            },
            order: [['createdAt', 'DESC']]
        });
    }

    // =========================================================================
    // GET INVOICE BY PAYMENT INTENT
    // =========================================================================
    //
    // NEW:
    // Used by PurchaseOrderController when returning a Payment Request modal.
    // =========================================================================
    async getInvoiceByPaymentIntentId(
        paymentIntentId: number
    ): Promise<any> {

        return Invoice.findOne({
            where: {
                payment_intent_id: paymentIntentId
            },
            order: [['createdAt', 'DESC']]
        });
    }

    // =========================================================================
    // GET BY TOKEN
    // =========================================================================
    async getByToken(
        token: string
    ): Promise<any> {

        if (!token) {
            throw new Error('token required');
        }

        return PaymentIntent.findOne({
            where: {
                token
            }
        });
    }
}
