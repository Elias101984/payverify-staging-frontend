import express from "express";
import { handlePaystackWebhook } from "../controllers/InvoicePaymentController";

const router = express.Router();

// MUST be raw for signature verification
router.post(
    "/paystack",
    express.raw({ type: "application/json" }),
    handlePaystackWebhook
);

export default router;