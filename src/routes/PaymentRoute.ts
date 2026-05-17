/*
===============================================================================
paymentRoutes.ts
===============================================================================

Handles Paystack payment initialization.

===============================================================================
*/

import { Router } from "express";
import { PaymentController } from"../controllers/paymentController";

const router = Router();

const controller =
    new PaymentController();

/*
===============================================================================
Initialize payment from PurchaseOrder / PaymentIntent
===============================================================================
*/
router.post(
    "/initialize",
    controller.createPayment.bind(controller)
);

export default router;
