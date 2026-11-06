import { Request, Response } from "express";

import { Invoice } from "../models/Invoice";
import { PaymentIntent } from "../models/PaymentIntent";
import PurchaseOrder from "../models/PurchaseOrder";
import { PurchaseOrderItem } from "../models/PurchaseOrderItem";
import VerificationGatewayService from "../services/VerificationGatewayService";
import { PaymentReconciliationService } from "../services/PaymentReconciliationService";

export class PublicInvoiceController {
    private readonly verificationGateway =
        new VerificationGatewayService();
    private readonly reconciliation = new PaymentReconciliationService();

    async getPublicInvoiceStatus(req: Request, res: Response) {
        const token = String(req.params.token || "").trim();

        if (!token) {
            return res.status(400).json({
                message: "Invoice token is required",
            });
        }

        const invoice = await Invoice.findOne({
            where: { public_token: token },
            attributes: ["id", "payment_intent_id", "status"],
        });

        if (!invoice) {
            return res.status(404).json({
                message: "Invoice not found",
            });
        }

        let paymentIntent = await PaymentIntent.findByPk(
            invoice.payment_intent_id,
            { attributes: ["id", "status", "paid_at", "gateway_reference"] }
        );

        // Paystack cannot call a localhost webhook. A public-token holder may
        // trigger a server-to-server verification, but can never choose the
        // amount, merchant, invoice or trusted reference.
        if (paymentIntent?.status !== 'paid' && paymentIntent?.gateway_reference) {
            try {
                await this.reconciliation.reconcileInvoice(
                    invoice.id,
                    paymentIntent.gateway_reference
                );
                await Promise.all([invoice.reload(), paymentIntent.reload()]);
            } catch (error) {
                console.warn('Payment status reconciliation deferred:',
                    error instanceof Error ? error.message : 'Unknown error');
            }
        }

        return res.json({
            invoiceStatus: invoice.status,
            paymentStatus: paymentIntent?.status || "pending",
            paidAt: paymentIntent?.paid_at || null,
        });
    }

    /**
     * Public, opaque-token invoice summary.
     *
     * The response intentionally exposes only the fields required to review
     * and pay this invoice. Merchant verification is performed server-side and
     * rendered inline with the order summary by the frontend.
     */
    async getPublicInvoice(req: Request, res: Response) {
        try {
            const token = String(req.params.token || "").trim();

            if (!token) {
                return res.status(400).json({
                    message: "Invoice token is required",
                });
            }

            const invoice = await Invoice.findOne({
                where: { public_token: token },
            });

            if (!invoice) {
                return res.status(404).json({
                    message: "Invoice not found",
                });
            }

            const paymentIntent = await PaymentIntent.findByPk(
                invoice.payment_intent_id
            );

            if (!paymentIntent) {
                return res.status(404).json({
                    message: "Payment request not found",
                });
            }

            const purchaseOrder = await PurchaseOrder.findByPk(
                paymentIntent.purchase_order_id
            );

            const items = purchaseOrder
                ? await PurchaseOrderItem.findAll({
                    where: {
                        purchaseOrderId: purchaseOrder.id,
                    },
                    order: [["id", "ASC"]],
                })
                : [];

            let verification: Record<string, unknown>;

            try {
                const result =
                    await this.verificationGateway.verifyMerchant({
                        merchantId: invoice.merchant_id,
                    });

                verification = {
                    available: true,
                    verified: result.verified,
                    merchantName: result.merchantName,
                    bankName: result.bankName,
                    accountName: result.accountName,
                    accountNumberMasked:
                        result.accountNumberMasked,
                    trustScore: result.trustScore,
                    verificationStatus:
                        result.verificationStatus,
                    verificationCount:
                        Number(result.verificationCount || 0),
                    verificationBadge:
                        result.verificationBadge,
                    reasonCode: result.reasonCode,
                    message: result.message,
                    checkedAt: new Date().toISOString(),
                };
            } catch (error) {
                console.error(
                    "Public invoice verification unavailable:",
                    error instanceof Error
                        ? error.message
                        : "Unknown error"
                );

                verification = {
                    available: false,
                    verified: false,
                    verificationStatus: "UNAVAILABLE",
                    message:
                        "Merchant verification is temporarily unavailable. Payment has been paused for your protection.",
                    checkedAt: new Date().toISOString(),
                };
            }

            return res.json({
                invoice: {
                    id: invoice.id,
                    amount: Number(invoice.amount),
                    status: invoice.status,
                    customerEmail: invoice.customer_email || null,
                    issuedAt: invoice.issued_at,
                    publicToken: invoice.public_token,
                },
                payment: {
                    status: paymentIntent.status,
                    paidAt: paymentIntent.paid_at || null,
                    reference: paymentIntent.status === 'paid'
                        ? paymentIntent.gateway_reference || null
                        : null,
                    expiresAt: paymentIntent.expires_at || null,
                    checkoutStarted: Boolean(paymentIntent.gateway_reference),
                    customerName: paymentIntent.customer_name || purchaseOrder?.customerName || null,
                    customerPhone: paymentIntent.customer_phone || null,
                    settlementStatus: paymentIntent.settlement_status || 'pending',
                    settlementId: paymentIntent.paystack_settlement_id || null,
                    settlementDate: paymentIntent.settlement_date || null,
                },
                order: purchaseOrder
                    ? {
                        id: purchaseOrder.id,
                        reference: purchaseOrder.poReference,
                        status: purchaseOrder.status || null,
                        customerName: purchaseOrder.customerName || null,
                        description:
                            purchaseOrder.description || null,
                        totalAmount: Number(
                            purchaseOrder.totalAmount
                        ),
                        items: items.map((item) => ({
                            id: item.id,
                            name: item.itemName,
                            description:
                                item.description || null,
                            quantity: Number(item.quantity),
                            unitPrice: Number(item.unitPrice),
                            lineTotal: Number(item.lineTotal),
                        })),
                    }
                    : null,
                verification,
            });
        } catch (error) {
            console.error("Public invoice error:", error);

            return res.status(500).json({
                message: "Failed to load invoice",
            });
        }
    }
}
