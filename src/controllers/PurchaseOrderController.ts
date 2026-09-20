import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { PaymentIntentService } from '../services/PaymentIntentService';
import { Invoice } from '../models/Invoice';
import { PaymentIntent } from '../models/PaymentIntent';
import Merchant from '../models/Merchant';
import { Op } from 'sequelize';
import { PaymentReconciliationService } from '../services/PaymentReconciliationService';
import { SettlementReconciliationService } from '../services/SettlementReconciliationService';

export class PurchaseOrderController {
    private readonly purchaseOrderService: PurchaseOrderService;
    private readonly paymentIntentService: PaymentIntentService;
    private readonly reconciliation = new PaymentReconciliationService();
    private readonly settlement = new SettlementReconciliationService();

    constructor(purchaseOrderService: PurchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
        this.paymentIntentService = new PaymentIntentService();
    }

    private paymentPackage = (
        paymentIntent: PaymentIntent | null,
        merchant: Merchant,
        purchaseOrder: any
    ) => {
        if (!paymentIntent) return null;
        const json = typeof (paymentIntent as any).toJSON === 'function'
            ? (paymentIntent as any).toJSON()
            : paymentIntent;
        return {
            ...json,
            merchant_name: merchant.name,
            purchase_order_reference:
                purchaseOrder.poReference || `PO-${purchaseOrder.id}`,
        };
    };

    // =========================================================================
    // RESOLVE AUTHENTICATED MERCHANT
    // =========================================================================
    // Never trust merchantId sent from the frontend.
    // The merchant is always derived from the authenticated JWT user.
    // =========================================================================
    private getAuthenticatedMerchant = async (
        req: Request,
        res: Response
    ): Promise<Merchant | null> => {
        const userId = Number((req as any).user?.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized. User context is missing.',
            });

            return null;
        }

        const merchant = await Merchant.findOne({
            where: { userId },
        });

        if (!merchant) {
            res.status(403).json({
                success: false,
                message: 'No merchant is linked to this user account.',
            });

            return null;
        }

        return merchant;
    };

    // =========================================================================
    // PARSE PURCHASE ORDER ID
    // =========================================================================
    private parsePurchaseOrderId = (
        req: Request,
        res: Response
    ): number | null => {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            res.status(400).json({
                success: false,
                message: 'Invalid purchase order ID.',
            });

            return null;
        }

        return id;
    };

    // =========================================================================
    // CREATE PURCHASE ORDER
    // =========================================================================
    createPurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });

                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            // The merchant-facing flow is direct: creating an order also
            // creates its invoice/payment package.  `false` remains available
            // only for capture-only integrations/imports.
            const collectPayment =
                req.body?.collectPayment !== false;

            // Do not mutate req.body and do not accept merchantId from the client.
            // collectPayment is a workflow command, not a PurchaseOrder column.
            const {
                collectPayment: ignoredCollectPayment,
                merchantId: ignoredMerchantId,
                ...orderBody
            } = req.body;

            const purchaseOrderPayload = {
                ...orderBody,
                merchantId: merchant.id,
            };

            let purchaseOrder =
                await this.purchaseOrderService.createPurchaseOrder(
                    purchaseOrderPayload
                );

            let paymentIntent = null;
            let invoice = null;

            // Direct-sale workflow: the authenticated merchant has finished
            // taking the order details, so create the unique payment package in
            // the same request. There is no per-order approval step.
            if (collectPayment) {
                const currentStatus = String(
                    purchaseOrder.status ||
                    purchaseOrder.getDataValue?.('status') ||
                    ''
                ).toLowerCase();

                if (currentStatus === 'cancelled') {
                    res.status(409).json({
                        success: false,
                        message:
                            'This order was cancelled. Create a new order instead of resuming it.',
                    });
                    return;
                }

                if (currentStatus === 'rejected') {
                    res.status(409).json({
                        success: false,
                        message:
                            'This order was rejected. Create a new order instead of resuming it.',
                    });
                    return;
                }

                paymentIntent = await PaymentIntent.findOne({
                    where: {
                        purchase_order_id: Number(purchaseOrder.id),
                        merchant_id: merchant.id,
                    },
                    order: [['createdAt', 'DESC']],
                });

                if (!paymentIntent) {
                    paymentIntent =
                        await this.paymentIntentService.createFromPurchaseOrder(
                            purchaseOrder
                        );
                }

                invoice = await Invoice.findOne({
                    where: {
                        payment_intent_id: paymentIntent.id,
                        merchant_id: merchant.id,
                    },
                });
            }

            res.status(201).json({
                success: true,
                data: purchaseOrder,
                paymentIntent: this.paymentPackage(paymentIntent, merchant, purchaseOrder),
                invoice,
            });
        } catch (error: any) {
            console.error('createPurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to create purchase order.',
            });
        }
    };

    // =========================================================================
    // GET AUTHENTICATED MERCHANT'S PURCHASE ORDERS
    // =========================================================================
    getAllPurchaseOrders = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const page = Math.max(Number(req.query.page) || 1, 1);
            const requestedLimit = Number(req.query.limit) || 20;

            // Prevent users from requesting an excessive number of records.
            const limit = Math.min(Math.max(requestedLimit, 1), 100);

            const result =
                await this.purchaseOrderService.getAllPurchaseOrders(
                    { merchantId: merchant.id },
                    page,
                    limit
                );

            // PurchaseOrder and PaymentIntent deliberately remain separate
            // models. Enrich this read response so the dashboard can display
            // order, payment and settlement state without conflating them.
            const orderIds = result.purchaseOrders
                .map((order: any) => Number(order.id))
                .filter((id: number) => Number.isInteger(id) && id > 0);

            const paymentIntents = orderIds.length
                ? await PaymentIntent.findAll({
                    where: {
                        merchant_id: merchant.id,
                        purchase_order_id: { [Op.in]: orderIds },
                    },
                    order: [['createdAt', 'DESC']],
                })
                : [];

            const latestIntentByOrder = new Map<number, PaymentIntent>();
            for (const intent of paymentIntents) {
                const orderId = Number(intent.purchase_order_id);
                if (!latestIntentByOrder.has(orderId)) {
                    latestIntentByOrder.set(orderId, intent);
                }
            }

            // Settlement is a separate Paystack lifecycle from charge.success.
            // Reconcile paid intents while serving the dashboard list so the
            // Settlement column can move from Awaiting settlement to Settled
            // without requiring the merchant to open each order individually.
            await Promise.all(
                Array.from(latestIntentByOrder.values())
                    .filter((intent) => intent.status === 'paid')
                    .map(async (intent) => {
                        try {
                            await this.settlement.reconcile(intent);
                        } catch (error) {
                            console.warn(
                                'Settlement reconciliation deferred for order',
                                intent.purchase_order_id,
                                error instanceof Error
                                    ? error.message
                                    : 'Unknown error'
                            );
                        }
                    })
            );

            const enrichedOrders = result.purchaseOrders.map((order: any) => {
                const plainOrder = typeof order?.toJSON === 'function'
                    ? order.toJSON()
                    : order;
                const intent = latestIntentByOrder.get(Number(plainOrder.id));
                const paymentStatus = intent?.status ||
                    (plainOrder.status === 'paid' ? 'paid' : 'not_started');

                return {
                    ...plainOrder,
                    paymentStatus,
                    settlementStatus: paymentStatus === 'paid'
                        ? (intent?.settlement_status || 'pending')
                        : null,
                    settlementId: intent?.paystack_settlement_id || null,
                    settlementAmountKobo: intent?.settlement_amount_kobo || null,
                    settlementDate: intent?.settlement_date || null,
                    settlementCheckedAt: intent?.settlement_checked_at || null,
                };
            });

            res.status(200).json({
                success: true,
                data: enrichedOrders,
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
            });
        } catch (error: any) {
            console.error('getAllPurchaseOrders error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to retrieve purchase orders.',
            });
        }
    };

    // =========================================================================
    // GET ONE PURCHASE ORDER
    // =========================================================================
    //
    // CHANGED FOR RESUMABLE PAYMENT
    // -------------------------------------------------------------------------
    // Previously this endpoint returned only the PurchaseOrder, its items and
    // merchant. PurchaseOrderService intentionally does not load payment-domain
    // models, so invoice/paymentIntent were always missing from the response.
    //
    // The controller now:
    // 1. Loads the merchant-owned PurchaseOrder through PurchaseOrderService.
    // 2. Finds the latest PaymentIntent created for that PurchaseOrder.
    // 3. Finds the Invoice linked to that PaymentIntent.
    // 4. Places invoice and paymentIntent INSIDE data so the existing frontend
    //    can read po.invoice and po.paymentIntent without changing API shape.
    //
    // WHY:
    // A customer can leave and return later, open the PO details page, and
    // continue the existing invoice payment flow without creating another
    // PurchaseOrder, PaymentIntent or Invoice. Older rows may still carry the
    // legacy `approved` status, but approval is not required for new orders.
    // =========================================================================
    getPurchaseOrderById = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const purchaseOrder =
                await this.purchaseOrderService.getPurchaseOrderById(
                    id,
                    merchant.id
                );

            if (!purchaseOrder) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            // -----------------------------------------------------------------
            // NEW: Find the existing PaymentIntent for this PurchaseOrder.
            //
            // IMPORTANT:
            // We query the payment model here instead of adding it to
            // DatabaseModels/PurchaseOrderService. This preserves the existing
            // service responsibility and merchant-isolation design.
            // -----------------------------------------------------------------
            let paymentIntent = await PaymentIntent.findOne({
                where: {
                    purchase_order_id: id,
                },
                order: [['createdAt', 'DESC']],
            });

            if (paymentIntent?.status !== 'paid' && paymentIntent?.gateway_reference) {
                const linkedInvoice = await Invoice.findOne({
                    where: { payment_intent_id: paymentIntent.id, merchant_id: merchant.id },
                });
                if (linkedInvoice) {
                    try {
                        await this.reconciliation.reconcileInvoice(
                            linkedInvoice.id,
                            paymentIntent.gateway_reference
                        );
                        await Promise.all([paymentIntent.reload(), purchaseOrder.reload()]);
                    } catch (error) {
                        console.warn('Order payment reconciliation deferred:',
                            error instanceof Error ? error.message : 'Unknown error');
                    }
                }
            }
            if (paymentIntent?.status === 'paid') {
                try { await this.settlement.reconcile(paymentIntent); }
                catch (error) {
                    console.warn('Settlement reconciliation deferred:',
                        error instanceof Error ? error.message : 'Unknown error');
                }
            }

            // -----------------------------------------------------------------
            // NEW: Find the Invoice linked to the PaymentIntent.
            //
            // The invoice is optional because a capture-only/pending order may
            // legitimately have no payment records yet.
            // -----------------------------------------------------------------
            const invoice = paymentIntent
                ? await Invoice.findOne({
                    where: {
                        payment_intent_id: paymentIntent.id,
                        merchant_id: merchant.id,
                    },
                    order: [['createdAt', 'DESC']],
                })
                : null;

            const purchaseOrderJson =
                typeof (purchaseOrder as any).toJSON === 'function'
                    ? (purchaseOrder as any).toJSON()
                    : purchaseOrder;

            // -----------------------------------------------------------------
            // CHANGED RESPONSE:
            //
            // invoice/paymentIntent are included inside data because the
            // frontend currently stores response.data.data as the PO object.
            //
            // The top-level copies are also retained for backwards compatibility
            // with clients that may already read response.data.invoice.
            // -----------------------------------------------------------------
            const enrichedPurchaseOrder = {
                ...purchaseOrderJson,
                invoice,
                paymentIntent: this.paymentPackage(paymentIntent, merchant, purchaseOrder),

                // Convenience properties used by the details UI.
                invoiceId: invoice?.id ?? null,
                invoiceStatus: invoice?.status ?? null,
                paymentIntentId: paymentIntent?.id ?? null,
                paymentStatus: paymentIntent?.status ?? null,
                settlementStatus: paymentIntent?.status === 'paid'
                    ? (paymentIntent.settlement_status || 'pending')
                    : null,
                settlementId: paymentIntent?.paystack_settlement_id ?? null,
                settlementAmountKobo: paymentIntent?.settlement_amount_kobo ?? null,
                settlementDate: paymentIntent?.settlement_date ?? null,
                settlementCheckedAt: paymentIntent?.settlement_checked_at ?? null,
            };

            res.status(200).json({
                success: true,
                data: enrichedPurchaseOrder,
                invoice,
                paymentIntent: this.paymentPackage(paymentIntent, merchant, purchaseOrder),
            });
        } catch (error: any) {
            console.error('getPurchaseOrderById error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to retrieve purchase order.',
            });
        }
    };

    // =========================================================================
    // CREATE OR REOPEN PAYMENT REQUEST
    // =========================================================================
    //
    // NEW ENDPOINT:
    // POST /api/purchase-orders/:id/payment-request
    //
    // WHAT IT DOES:
    // 1. Validates the authenticated merchant owns the Purchase Order.
    // 2. Requires an unpaid, non-cancelled order; no per-order approval is
    //    required. Older rows with `approved` status remain compatible.
    // 3. Creates or reuses the PaymentIntent.
    // 4. Creates or reuses the Invoice.
    // 5. Returns the data required by PaymentRequestModal.
    //
    // WHY:
    // If the user closes the Payment Request modal, the order remains unpaid.
    // When the user returns and clicks "Complete Payment", this endpoint safely
    // reopens the same payment request instead of creating duplicates.
    // =========================================================================
    createPaymentRequest = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id =
                this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant =
                await this.getAuthenticatedMerchant(
                    req,
                    res
                );

            if (!merchant) {
                return;
            }

            const purchaseOrder =
                await this.purchaseOrderService.getPurchaseOrderById(
                    id,
                    merchant.id
                );

            if (!purchaseOrder) {
                res.status(404).json({
                    success: false,
                    message:
                        'Purchase order not found.',
                });

                return;
            }

            const status = String(
                purchaseOrder.status || ''
            ).toLowerCase();

            if (status === 'paid') {
                res.status(409).json({
                    success: false,
                    message:
                        'This purchase order has already been paid.',
                });

                return;
            }

            if (status === 'rejected' || status === 'cancelled') {
                res.status(409).json({
                    success: false,
                    message:
                        status === 'cancelled'
                            ? 'This purchase order was cancelled. Create a new order instead.'
                            : 'This purchase order was rejected. Create a new order instead.',
                });

                return;
            }

            const paymentIntent =
                await this.paymentIntentService.createFromPurchaseOrder(
                    purchaseOrder
                );

            // -------------------------------------------------------------
            // FIX:
            // Load the Invoice directly from the Invoice model.
            //
            // WHY:
            // PaymentIntentService does not expose
            // getInvoiceByPaymentIntentId() in the current codebase.
            // The old call caused TS2339 compilation errors.
            // -------------------------------------------------------------
            const invoice = await Invoice.findOne({
                where: {
                    payment_intent_id: paymentIntent.id,
                    merchant_id: merchant.id,
                },
                order: [['createdAt', 'DESC']],
            });

            if (!invoice) {
                throw new Error(
                    'Payment request was created, but its invoice could not be loaded.'
                );
            }

            res.status(200).json({
                success: true,
                message:
                    'Payment request is ready.',

                // The modal consumes paymentIntent directly.
                data: {
                    paymentIntent: this.paymentPackage(paymentIntent, merchant, purchaseOrder),
                    invoice,
                },
            });
        } catch (error: any) {
            console.error(
                'createPaymentRequest error:',
                error
            );

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to create payment request.',
            });
        }
    };


    // =========================================================================
    // UPDATE PURCHASE ORDER
    // =========================================================================
    updatePurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            // Never allow ownership to be reassigned from the request body.
            const {
                merchantId: ignoredMerchantId,
                userId: ignoredUserId,
                ...safePayload
            } = req.body;

            const updatedPurchaseOrder =
                await this.purchaseOrderService.updatePurchaseOrder(
                    id,
                    merchant.id,
                    safePayload
                );

            if (!updatedPurchaseOrder) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            res.status(200).json({
                success: true,
                data: updatedPurchaseOrder,
            });
        } catch (error: any) {
            console.error('updatePurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to update purchase order.',
            });
        }
    };

    // =========================================================================
    // UPDATE PURCHASE ORDER STATUS
    // =========================================================================
    updatePurchaseOrderStatus = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const status = String(req.body.status || '')
                .trim()
                .toLowerCase();

            // The merchant-facing order flow no longer has per-order
            // approval/rejection. New orders are captured and packaged for
            // payment immediately; this endpoint is retained for cancellation
            // (and a harmless pending reset for older integrations).
            const allowedStatuses = ['pending', 'cancelled'];

            if (status === 'approved' || status === 'rejected') {
                res.status(410).json({
                    success: false,
                    message:
                        'Per-order approval and rejection are no longer used. Create the order to generate its payment package immediately.',
                });
                return;
            }

            if (!allowedStatuses.includes(status)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${allowedStatuses.join(
                        ', '
                    )}.`,
                });

                return;
            }

            // Once Paystack checkout has started, cancellation is temporarily
            // blocked to avoid a race where the customer pays a cancelled order.
            // The merchant can refresh/verify the payment and then use the
            // refund workflow if the charge completed.
            const pendingPaymentIntent = status === 'cancelled'
                ? await PaymentIntent.findOne({
                    where: {
                        purchase_order_id: id,
                        merchant_id: merchant.id,
                        status: 'pending',
                    },
                    order: [['createdAt', 'DESC']],
                })
                : null;

            if (
                status === 'cancelled' &&
                pendingPaymentIntent?.payment_started_at
            ) {
                res.status(409).json({
                    success: false,
                    message:
                        'Payment has already started for this order. Verify the payment result before cancelling; issue a refund if payment completed.',
                });
                return;
            }

            // This service method must use both id and merchantId in its query.
            const purchaseOrder =
                await this.purchaseOrderService.updatePurchaseOrderStatus(
                    id,
                    merchant.id,
                    status
                );

            if (!purchaseOrder) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            if (status === 'cancelled' && pendingPaymentIntent) {
                await pendingPaymentIntent.update({ status: 'expired' });
                await Invoice.update(
                    { status: 'cancelled' },
                    {
                        where: {
                            payment_intent_id: pendingPaymentIntent.id,
                            merchant_id: merchant.id,
                        },
                    }
                );
            }

            res.status(200).json({
                success: true,
                data: purchaseOrder,
            });
        } catch (error: any) {
            console.error('updatePurchaseOrderStatus error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to update purchase order status.',
            });
        }
    };

    // =========================================================================
    // DELETE PURCHASE ORDER
    // =========================================================================
    deletePurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const deleted =
                await this.purchaseOrderService.deletePurchaseOrder(
                    id,
                    merchant.id
                );

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            res.status(200).json({
                success: true,
                message: 'Purchase order deleted successfully.',
            });
        } catch (error: any) {
            console.error('deletePurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message || 'Failed to delete purchase order.',
            });
        }
    };

    // =========================================================================
    // ADD ITEM TO PURCHASE ORDER
    // =========================================================================
    addItemToPurchaseOrder = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const id = this.parsePurchaseOrderId(req, res);

            if (!id) {
                return;
            }

            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const item =
                await this.purchaseOrderService.addItemToPurchaseOrder(
                    id,
                    merchant.id,
                    req.body
                );

            if (!item) {
                res.status(404).json({
                    success: false,
                    message: 'Purchase order not found.',
                });

                return;
            }

            res.status(201).json({
                success: true,
                data: item,
            });
        } catch (error: any) {
            console.error('addItemToPurchaseOrder error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to add item to purchase order.',
            });
        }
    };

    // =========================================================================
    // PURCHASE ORDER STATS
    // =========================================================================
    getPurchaseOrderStats = async (
        req: Request,
        res: Response
    ): Promise<void> => {
        try {
            const merchant = await this.getAuthenticatedMerchant(req, res);

            if (!merchant) {
                return;
            }

            const stats =
                await this.purchaseOrderService.getPurchaseOrderStats(
                    merchant.id
                );

            res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            console.error('getPurchaseOrderStats error:', error);

            res.status(500).json({
                success: false,
                message:
                    error.message ||
                    'Failed to retrieve purchase order statistics.',
            });
        }
    };
}
