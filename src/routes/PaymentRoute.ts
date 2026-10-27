import { Router } from "express";

const router = Router();

// Retired: payments must use the verified invoice checkout.
router.post("/initialize", (_req, res) => {
    res.status(410).json({
        success: false,
        code: "PAYMENT_ENDPOINT_RETIRED",
        message: "Please open your invoice payment link to continue payment.",
    });
});

export default router;