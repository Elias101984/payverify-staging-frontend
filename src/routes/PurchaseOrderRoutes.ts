// =============================================================================
// src/routes/PurchaseOrderRoutes.ts
// Purchase Order Routes — PAYMENT-RECOVERY PRODUCTION VERSION
// =============================================================================
//
// WHAT CHANGED
// -----------------------------------------------------------------------------
// ✅ Preserved every existing Purchase Order route.
// ✅ Added:
//      POST /api/purchase-orders/:id/payment-request
//
// WHY
// -----------------------------------------------------------------------------
// A captured PO remains unpaid when the user closes the Payment Request modal
// without paying. Older rows may still carry the legacy `approved` status.
//
// The new endpoint lets the returning user click "Complete Payment" and safely
// create or reopen the existing PaymentIntent + Invoice, then display the same
// PaymentRequestModal with:
// - Copy Link
// - Download QR
// - Download PDF
// - Open Invoice
//
// IMPORTANT ROUTE ORDER
// -----------------------------------------------------------------------------
// /stats remains above /:id so Express does not treat "stats" as an ID.
//
// =============================================================================

import { Router } from 'express';

import { PurchaseOrderController } from '../controllers/PurchaseOrderController';
import { PurchaseOrderService } from '../services/PurchaseOrderService';

import { authenticate } from '../middlewares/authMiddleware';


// =============================================================================
// FACTORY FUNCTION
// =============================================================================
export const createPurchaseOrderRoutes = (
    models: any,
    sequelize: any
) => {

    const router = Router();

    const service =
        new PurchaseOrderService(
            models,
            sequelize
        );

    const controller =
        new PurchaseOrderController(
            service
        );


    // =========================================================================
    // CREATE PURCHASE ORDER
    // POST /api/purchase-orders
    // =========================================================================
    router.post(
        '/',
        authenticate,
        controller.createPurchaseOrder.bind(controller)
    );


    // =========================================================================
    // GET PURCHASE ORDER STATS
    // GET /api/purchase-orders/stats
    //
    // MUST remain above /:id.
    // =========================================================================
    router.get(
        '/stats',
        authenticate,
        controller.getPurchaseOrderStats.bind(controller)
    );


    // =========================================================================
    // GET ALL PURCHASE ORDERS
    // GET /api/purchase-orders
    // =========================================================================
    router.get(
        '/',
        authenticate,
        controller.getAllPurchaseOrders.bind(controller)
    );


    // =========================================================================
    // GET PURCHASE ORDER BY ID
    // GET /api/purchase-orders/:id
    // =========================================================================
    router.get(
        '/:id',
        authenticate,
        controller.getPurchaseOrderById.bind(controller)
    );


    // =========================================================================
    // NEW: CREATE OR REOPEN PAYMENT REQUEST
    // POST /api/purchase-orders/:id/payment-request
    //
    // WHY:
// Returns the existing payment request when one exists, otherwise creates
// the PaymentIntent + Invoice. The order remains unpaid until Paystack's
// successful webhook marks the transaction paid.
    // =========================================================================
    router.post(
        '/:id/payment-request',
        authenticate,
        controller.createPaymentRequest.bind(controller)
    );


    // =========================================================================
    // UPDATE EXISTING PURCHASE ORDER
    // PUT /api/purchase-orders/:id
    // =========================================================================
    router.put(
        '/:id',
        authenticate,
        controller.updatePurchaseOrder.bind(controller)
    );


    // =========================================================================
    // UPDATE PURCHASE ORDER STATUS — PUT
    // PUT /api/purchase-orders/:id/status
    // =========================================================================
    router.put(
        '/:id/status',
        authenticate,
        controller.updatePurchaseOrderStatus.bind(controller)
    );


    // =========================================================================
    // DELETE PURCHASE ORDER
    // DELETE /api/purchase-orders/:id
    // =========================================================================
    router.delete(
        '/:id',
        authenticate,
        controller.deletePurchaseOrder.bind(controller)
    );


    // =========================================================================
    // ADD ITEM TO PURCHASE ORDER
    // POST /api/purchase-orders/:id/items
    // =========================================================================
    router.post(
        '/:id/items',
        authenticate,
        controller.addItemToPurchaseOrder.bind(controller)
    );


    // =========================================================================
    // UPDATE PURCHASE ORDER STATUS — PATCH
    // PATCH /api/purchase-orders/:id/status
    // =========================================================================
    router.patch(
        '/:id/status',
        authenticate,
        controller.updatePurchaseOrderStatus.bind(controller)
    );


    return router;
};
