//import { Router } from "express";
//import { PaystackWebhookController } from "../controllers/PaystackWebhookController";

//const router =
//    Router();

//const controller =
//    new PaystackWebhookController();

//router.post(
//    "/paystack",
//    controller.handleWebhook.bind(controller)
//);

//export default router;


/**
 * ============================================================
 * PAYSTACK WEBHOOK ROUTES
 * ============================================================
 * PURPOSE:
 * This file is responsible ONLY for routing (Express layer).
 *
 * WHY THIS FIX WAS NEEDED:
 * Previously, controller logic was mistakenly placed inside this file,
 * which caused:
 * - ❌ No default export
 * - ❌ Route not registered
 * - ❌ Paystack webhook never hit backend
 *
 * FIX:
 * - Move business logic to controller
 * - Keep this file as a clean router
 * - Export default router for app.ts
 * ============================================================
 */

import { Router } from "express";
import { PaystackWebhookController } from "../controllers/PaystackWebhookController";

/**
 * Create Express router instance
 */
const router = Router();

/**
 * Instantiate controller
 * (keeps logic separate from routing — SRP principle)
 */
const controller = new PaystackWebhookController();

/**
 * ============================================================
 * 🔥 PAYSTACK WEBHOOK ENDPOINT
 * ============================================================
 * URL:
 * POST /api/webhooks/paystack
 *
 * Full public URL (via ngrok):
 * https://record-threefold-sprite.ngrok-free.dev/api/webhooks/paystack
 *
 * WHAT IT DOES:
 * - Receives Paystack events
 * - Delegates handling to controller
 */
router.post(
    "/paystack",
    controller.handleWebhook.bind(controller)
);

/**
 * ============================================================
 * ✅ CRITICAL EXPORT FIX
 * ============================================================
 * This MUST be a default export because app.ts imports it like:
 *
 * import paystackWebhookRoutes from "./routes/paystackWebhookRoutes";
 *
 * Without this, you get:
 * ❌ "has no default export" error
 */
export default router;