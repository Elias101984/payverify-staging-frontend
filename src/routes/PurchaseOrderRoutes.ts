// src/routes/PurchaseOrderRoutes.ts
// ------------------------------------------------------------------------------------
// Purchase Order Routes — FINAL PRODUCTION VERSION
//
// FIXES APPLIED:
//
// ✔ Proper dependency injection of models and sequelize
// ✔ Controller methods correctly bound to preserve class context
// ✔ Added GET /stats endpoint safely
// ✔ Prevented Express route collision (/stats vs /:id)
// ✔ Fully compatible with PurchaseOrderController and PurchaseOrderService
// ✔ Future-proof enterprise-grade structure
//
// IMPORTANT NOTE:
// Route order matters in Express.
// "/stats" MUST be defined BEFORE "/:id"
// Otherwise Express treats "stats" as an ID parameter.
//
// Example failure case:
// GET /stats → Express interprets "stats" as ":id"
// ------------------------------------------------------------------------------------

import { Router } from 'express';

import { PurchaseOrderController } from '../controllers/PurchaseOrderController';
import { PurchaseOrderService } from '../services/PurchaseOrderService';

import { authenticate } from '../middlewares/authMiddleware';


// ------------------------------------------------------------------------------------
// Factory Function
// Allows injection of Sequelize models and sequelize instance
// ------------------------------------------------------------------------------------

export const createPurchaseOrderRoutes = (
    models: any,
    sequelize: any
) => {

    const router = Router();

    const service =
        new PurchaseOrderService(models, sequelize);

    const controller =
        new PurchaseOrderController(service);


    // --------------------------------------------------------------------------------
    // CREATE PURCHASE ORDER
    // POST /api/purchase-orders
    // --------------------------------------------------------------------------------

    router.post(
        '/',
        authenticate,
        controller.createPurchaseOrder.bind(controller)
    );


    // --------------------------------------------------------------------------------
    // GET PURCHASE ORDER STATS  ✅ NEW FIX
    // GET /api/purchase-orders/stats
    //
    // MUST be above "/:id"
    // --------------------------------------------------------------------------------

    router.get(
        '/stats',
        authenticate,
        controller.getPurchaseOrderStats.bind(controller)
    );


    // --------------------------------------------------------------------------------
    // GET ALL PURCHASE ORDERS
    // GET /api/purchase-orders
    // --------------------------------------------------------------------------------

    router.get(
        '/',
        authenticate,
        controller.getAllPurchaseOrders.bind(controller)
    );


    // --------------------------------------------------------------------------------
    // GET PURCHASE ORDER BY ID
    // GET /api/purchase-orders/:id
    // --------------------------------------------------------------------------------

    router.get(
        '/:id',
        authenticate,
        controller.getPurchaseOrderById.bind(controller)
    );


    // --------------------------------------------------------------------------------
    // UPDATE PURCHASE ORDER
    // PUT /api/purchase-orders/:id
    // --------------------------------------------------------------------------------

    router.put(
        '/:id/status',
        authenticate,
        controller.updatePurchaseOrderStatus.bind(controller)
    );

    


    // --------------------------------------------------------------------------------
    // DELETE PURCHASE ORDER
    // DELETE /api/purchase-orders/:id
    // --------------------------------------------------------------------------------

    router.delete(
        '/:id',
        authenticate,
        controller.deletePurchaseOrder.bind(controller)
    );


    // --------------------------------------------------------------------------------
    // ADD ITEM TO PURCHASE ORDER
    // POST /api/purchase-orders/:id/items
    // --------------------------------------------------------------------------------

    router.post(
        '/:id/items',
        authenticate,
        controller.addItemToPurchaseOrder.bind(controller)
    );


    // --------------------------------------------------------------------------------
    // UPDATE PURCHASE ORDER STATUS
    // PATCH /api/purchase-orders/:id/status
    // --------------------------------------------------------------------------------

    router.patch(
        '/:id/status',
        authenticate,
        controller.updatePurchaseOrderStatus.bind(controller)
    );


    // --------------------------------------------------------------------------------
    // Return configured router
    // --------------------------------------------------------------------------------

    return router;
};
