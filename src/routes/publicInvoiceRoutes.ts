// publicInvoiceRoutes.ts

import { Router } from "express";
import { PublicInvoiceController } from "../controllers/PublicInvoiceController";

const router = Router();
const controller = new PublicInvoiceController();

// 🔥 THIS MUST MATCH FRONTEND
/*router.get("/public/invoices/:token", controller.getPublicInvoice.bind(controller));*/

//router.get("/invoices/:token", controller.getPublicInvoice.bind(controller));

router.get("/public/invoices/:token", controller.getPublicInvoice.bind(controller));

export default router;


