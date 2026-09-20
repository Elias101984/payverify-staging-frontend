/**
 * =============================================================================
 * src/routes/paystackWebhookRoutes.ts
 * PAYSTACK WEBHOOK ROUTES
 * =============================================================================
 *
 * PURPOSE
 * -----------------------------------------------------------------------------
 * Routing only. All Paystack business logic remains in:
 *
 *     PaystackWebhookController
 *
 * FINAL PUBLIC ENDPOINT
 * -----------------------------------------------------------------------------
 * POST /api/webhooks/paystack
 *
 * HOW THE PATH IS FORMED
 * -----------------------------------------------------------------------------
 * app.ts mounts this router at:
 *
 *     /api/webhooks
 *
 * This router registers:
 *
 *     /paystack
 *
 * Combined URL:
 *
 *     /api/webhooks/paystack
 *
 * IMPORTANT
 * -----------------------------------------------------------------------------
 * Do not mount this router at "/api/webhooks/paystack" while also keeping the
 * "/paystack" route below. That would create:
 *
 *     /api/webhooks/paystack/paystack
 * =============================================================================
 */

import { Router } from "express";
import { PaystackWebhookController } from "../controllers/PaystackWebhookController";

const router = Router();
const controller =
    new PaystackWebhookController();

router.post(
    "/paystack",
    controller.handleWebhook.bind(controller)
);

export default router;