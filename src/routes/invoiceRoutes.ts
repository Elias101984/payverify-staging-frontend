//import { Router } from "express";
//import { InvoiceController } from "../controllers/InvoiceController";
//import { initializeInvoicePayment,} from "../controllers/InvoicePaymentController";

//const router = Router();

//const controller =
//    new InvoiceController();

///**
// * ============================================================
// * ✅ PUBLIC invoice fetch (REQUIRED for InvoicePayPage)
// * GET /api/public/invoices/:invoiceId
// * ============================================================
// */
//router.get(
//    "/public/:invoiceId",
//    controller.getPublicInvoiceById.bind(controller)
//);


//router.get(
//    "/token/:token/pdf",
//    controller.downloadInvoicePDFByToken.bind(controller)
//);

//router.post(
//    "/:invoiceId/paystack/initialize",
//    initializeInvoicePayment
//);

//export default router;


import { Router } from "express";
import { InvoiceController }  from "../controllers/InvoiceController";
import { initializeInvoicePayment } from "../controllers/InvoicePaymentController";

const router = Router();
const controller = new InvoiceController();

/**
 * ============================================================
 * PUBLIC invoice fetch
 * GET /api/invoices/public/:invoiceId
 * ============================================================
 */
router.get(
    "/public/:invoiceId",
    controller.getPublicInvoiceById.bind(controller)
);

/**
 * ============================================================
 * Download invoice PDF by token
 * GET /api/invoices/token/:token/pdf
 * ============================================================
 */
router.get(
    "/token/:token/pdf",
    controller.downloadInvoicePDFByToken.bind(controller)
);

/**
 * ============================================================
 * Initialize Paystack payment
 * POST /api/invoices/:invoiceId/paystack/initialize
 * ============================================================
 */
router.post(
    "/:invoiceId/paystack/initialize",
    initializeInvoicePayment
);

export default router;