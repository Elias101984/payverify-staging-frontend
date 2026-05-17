// =============================================================================
// PublicInvoiceController.ts
// PURPOSE: Load invoice by PUBLIC TOKEN (NOT ID)
// =============================================================================

import { Request, Response } from "express";
import { Invoice } from "../models/Invoice";
import { PaymentIntent } from "../models/PaymentIntent";

export class PublicInvoiceController {

    // =========================================================================
    // GET /api/public/invoices/:token
    // =========================================================================
    async getPublicInvoice(req: Request, res: Response) {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    message: "Invoice token is required",
                });
            }

            // 🔥 CRITICAL — lookup by public_token
            const invoice = await Invoice.findOne({
                where: { public_token: token },
            });

            if (!invoice) {
                return res.status(404).json({
                    message: "Invoice not found",
                });
            }

            // optional: include bank info via PaymentIntent
            const intent = await PaymentIntent.findByPk(
                invoice.payment_intent_id
            );

            return res.json({
                invoice,
                bankAccount: null, // add later if needed
                paymentIntent: intent,
            });
        } catch (err) {
            console.error("Public invoice error:", err);
            return res.status(500).json({
                message: "Failed to load invoice",
            });
        }
    }
}