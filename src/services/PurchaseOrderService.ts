/**
 * =============================================================================
 * src/services/PurchaseOrderService.ts
 * PurchaseOrderService (MERCHANT-ISOLATED / PRODUCTION-SAFE VERSION)
 * =============================================================================
 *
 * WHAT THIS VERSION PRESERVES
 * -----------------------------------------------------------------------------
 * ✅ Creates purchase orders and line items inside a database transaction
 * ✅ Recalculates totals on the server
 * ✅ Supports the Continue Order workflow by updating the existing PO
 * ✅ Returns purchase orders with their items and merchant
 * ✅ Preserves pagination
 * ✅ Supports add-item, delete, cancellation/status compatibility, and statistics
 * ✅ Keeps PaymentIntent and Invoice creation outside this service
 *
 * CRITICAL SECURITY CHANGES
 * -----------------------------------------------------------------------------
 * ✅ Every read, update, status change, item addition, and delete is scoped by:
 *
 *      purchaseOrder.id + authenticated merchantId
 *
 * ✅ A merchant can no longer retrieve another merchant's order by guessing its ID.
 * ✅ A merchant can no longer edit, approve, reject, add items to, or delete another
 *    merchant's purchase order.
 * ✅ Statistics are calculated only from the authenticated merchant's orders.
 * ✅ Client-supplied merchantId is not used for ownership checks after creation.
 *
 * WHY THIS CHANGE WAS REQUIRED
 * -----------------------------------------------------------------------------
 * QA found that a newly registered merchant could:
 *
 * 1. View purchase orders belonging to other merchants.
 * 2. Approve or reject purchase orders belonging to other merchants. (The
 *    per-order approval flow has since been retired.)
 *
 * Filtering only in the React UI would not fix the vulnerability. Ownership must
 * be enforced in the backend database queries, which this service now does.
 *
 * EXPECTED CONTROLLER METHOD CALLS
 * -----------------------------------------------------------------------------
 * getPurchaseOrderById(id, merchantId)
 * updatePurchaseOrder(id, merchantId, updateData)
 * updatePurchaseOrderStatus(id, merchantId, status)
 * deletePurchaseOrder(id, merchantId)
 * addItemToPurchaseOrder(id, merchantId, item)
 * getPurchaseOrderStats(merchantId)
 *
 * IMPORTANT ARCHITECTURE RULE
 * -----------------------------------------------------------------------------
 * This service manages purchase orders only.
 * PaymentIntent and Invoice creation remain in the controller/payment services.
 * =============================================================================
 */

/**
 * PAYMENT RESUME ARCHITECTURE NOTE
 * -----------------------------------------------------------------------------
 * No Invoice or PaymentIntent Sequelize includes are added to this service.
 *
 * WHY:
 * - DatabaseModels does not expose Invoice or PaymentIntent.
 * - PurchaseOrderService remains responsible only for merchant-scoped PO data.
 * - PurchaseOrderController should load and attach the related PaymentIntent
 *   and Invoice when returning the PO details response.
 *
 * This prevents TypeScript errors such as:
 *   Property 'Invoice' does not exist on type 'DatabaseModels'.
 *   Property 'PaymentIntent' does not exist on type 'DatabaseModels'.
 * -----------------------------------------------------------------------------
 */

import { Sequelize, Transaction } from "sequelize";
import { DatabaseModels } from "../types";

export class PurchaseOrderService {
    private readonly models: DatabaseModels;
    private readonly sequelize: Sequelize;

    constructor(models: DatabaseModels, sequelize: Sequelize) {
        this.models = models;
        this.sequelize = sequelize;
    }

    // =============================================================================
    // SHARED VALIDATION HELPERS
    // =============================================================================

    /**
     * Ensures an ID is a positive integer before it is used in a query.
     */
    private validatePositiveId(value: number, fieldName: string): void {
        if (!Number.isInteger(value) || value <= 0) {
            throw new Error(`A valid ${fieldName} is required.`);
        }
    }

    /**
     * Normalizes and validates one purchase-order line item.
     *
     * WHY:
     * Totals must be calculated from validated quantity and unit price values on
     * the server. The frontend must not be trusted to provide lineTotal.
     */
    private normalizeItem(item: any, index?: number): {
        itemName: string;
        description: string | null;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
    } {
        const itemPosition =
            typeof index === "number" ? ` for line item ${index + 1}` : "";

        const itemName = String(
            item?.itemName ||
            item?.name ||
            ""
        ).trim();

        const quantity = Number(item?.quantity);
        const unitPrice = Number(item?.unitPrice);

        if (!itemName) {
            throw new Error(`Item name is required${itemPosition}.`);
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(
                `Quantity must be greater than zero${itemPosition}.`
            );
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(
                `Unit price must be valid${itemPosition}.`
            );
        }

        return {
            itemName,
            description: item?.description ?? null,
            quantity,
            unitPrice,
            lineTotal: quantity * unitPrice,
        };
    }

    // =============================================================================
    // CREATE PURCHASE ORDER
    // =============================================================================
    //
    // SECURITY:
    // merchantId must already have been resolved by the controller from the
    // authenticated JWT user. The frontend must not choose the merchant owner.
    // =============================================================================
    async createPurchaseOrder(data: any): Promise<any> {
        const merchantId = Number(data.merchantId);
        this.validatePositiveId(merchantId, "merchantId");

        // `poReference` is the client request key for offline/retry-safe order
        // capture.  The database column is already unique, so a reconnect can
        // safely replay the same payload without creating a second order.
        const suppliedPoReference = data.poReference == null
            ? ""
            : String(data.poReference).trim();
        const poReference = suppliedPoReference || `PO-${merchantId}-${Date.now()}`;

        if (poReference.length > 50) {
            throw new Error("Purchase order reference must be 50 characters or fewer.");
        }

        if (suppliedPoReference) {
            const existing = await this.models.PurchaseOrder.findOne({
                where: {
                    poReference,
                    merchantId,
                },
            });

            if (existing) {
                return this.getPurchaseOrderById(
                    Number(existing.getDataValue("id")),
                    merchantId
                );
            }
        }

        const transaction: Transaction =
            await this.sequelize.transaction();

        try {
            const rawItems = Array.isArray(data.items)
                ? data.items
                : [];

            const normalizedItems = rawItems.map(
                (item: any, index: number) =>
                    this.normalizeItem(item, index)
            );

            const totalAmount = normalizedItems.reduce(
                (sum: number, item) => sum + item.lineTotal,
                0
            );

            const purchaseOrder =
                await this.models.PurchaseOrder.create(
                    {
                        poReference,
                        merchantId,
                        totalAmount: String(totalAmount),
                        description: data.description ?? null,
                        dueDate: data.dueDate ?? null,
                        customerName: String(data.customerName || '').trim() || null,
                        customerEmail: String(data.customerEmail || '').trim() || null,
                        customerPhone: String(data.customerPhone || '').trim() || null,

                        // WHY:
                        // New orders always begin as pending. A client must not
                        // self-create an already approved or completed order.
                        status: "pending",
                    },
                    { transaction }
                );

            const purchaseOrderId = Number(
                purchaseOrder.getDataValue("id")
            );

            for (const item of normalizedItems) {
                await this.models.PurchaseOrderItem.create(
                    {
                        purchaseOrderId,
                        itemName: item.itemName,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: String(item.unitPrice),
                        lineTotal: String(item.lineTotal),
                    },
                    { transaction }
                );
            }

            await transaction.commit();

            // merchantId is included so the newly created record is still
            // retrieved through the same ownership-safe method.
            return await this.getPurchaseOrderById(
                purchaseOrderId,
                merchantId
            );
        } catch (error) {
            if (!(transaction as any).finished) {
                await transaction.rollback();
            }

            // Two reconnect attempts can arrive at the same time.  The unique
            // `po_reference` constraint wins that race; return the order that
            // was committed by the other request instead of surfacing a false
            // failure to the merchant.
            if (
                suppliedPoReference &&
                (error as any)?.name === "SequelizeUniqueConstraintError"
            ) {
                const existing = await this.models.PurchaseOrder.findOne({
                    where: {
                        poReference,
                        merchantId,
                    },
                });

                if (existing) {
                    return this.getPurchaseOrderById(
                        Number(existing.getDataValue("id")),
                        merchantId
                    );
                }
            }

            console.error(
                "PurchaseOrder CREATE ERROR:",
                error
            );

            throw error;
        }
    }

    // =============================================================================
    // ADD ITEM TO PURCHASE ORDER
    // =============================================================================
    //
    // WHAT CHANGED:
    // merchantId is now required, and the PO is loaded using both its ID and
    // merchantId. A merchant therefore cannot add an item to another merchant's PO.
    // =============================================================================
    async addItemToPurchaseOrder(
        purchaseOrderId: number,
        merchantId: number,
        item: any
    ): Promise<any | null> {
        this.validatePositiveId(
            purchaseOrderId,
            "purchase order ID"
        );
        this.validatePositiveId(merchantId, "merchantId");

        const transaction: Transaction =
            await this.sequelize.transaction();

        try {
            const purchaseOrder =
                await this.models.PurchaseOrder.findOne({
                    where: {
                        id: purchaseOrderId,
                        merchantId,
                    },
                    transaction,
                });

            // Returning null lets the controller respond with 404 without
            // exposing whether an order exists for another merchant.
            if (!purchaseOrder) {
                await transaction.rollback();
                return null;
            }

            const currentStatus = String(
                purchaseOrder.getDataValue("status") || ""
            ).toLowerCase();

            if (
                currentStatus === "paid" ||
                currentStatus === "completed"
            ) {
                throw new Error(
                    "Items cannot be added to a paid or completed purchase order."
                );
            }

            const normalizedItem = this.normalizeItem(item);

            await this.models.PurchaseOrderItem.create(
                {
                    purchaseOrderId,
                    itemName: normalizedItem.itemName,
                    description: normalizedItem.description,
                    quantity: normalizedItem.quantity,
                    unitPrice: String(normalizedItem.unitPrice),
                    lineTotal: String(normalizedItem.lineTotal),
                },
                { transaction }
            );

            const items =
                await this.models.PurchaseOrderItem.findAll({
                    where: { purchaseOrderId },
                    transaction,
                });

            const newTotal = items.reduce(
                (sum: number, existingItem: any) =>
                    sum +
                    Number(
                        existingItem.getDataValue?.("lineTotal") ??
                        existingItem.lineTotal ??
                        0
                    ),
                0
            );

            await purchaseOrder.update(
                {
                    totalAmount: String(newTotal),
                },
                { transaction }
            );

            await transaction.commit();

            return await this.getPurchaseOrderById(
                purchaseOrderId,
                merchantId
            );
        } catch (error) {
            // Roll back only when the transaction has not already been finished.
            if (!(transaction as any).finished) {
                await transaction.rollback();
            }

            console.error("ADD ITEM ERROR:", error);
            throw error;
        }
    }

    // =============================================================================
    // GET PURCHASE ORDER BY ID
    // =============================================================================
    //
    // CRITICAL SECURITY FIX:
    // findByPk(id) was replaced by findOne({ where: { id, merchantId } }).
    //
    // WHY:
    // An ID alone is not proof of ownership. Both values must match.
    // =============================================================================
    async getPurchaseOrderById(
        id: number,
        merchantId: number
    ): Promise<any | null> {
        this.validatePositiveId(id, "purchase order ID");
        this.validatePositiveId(merchantId, "merchantId");

        return this.models.PurchaseOrder.findOne({
            where: {
                id,
                merchantId,
            },
            include: [
                {
                    model:
                        this.models.PurchaseOrderItem,
                    as: "items",
                },
                {
                    model:
                        this.models.Merchant,
                    as: "merchant",
                },
            ],
        });
    }

    // =============================================================================
    // GET ALL PURCHASE ORDERS
    // =============================================================================
    //
    // SECURITY:
    // The controller must pass { merchantId: authenticatedMerchant.id }.
    // This method also refuses a missing/invalid merchantId so an accidental empty
    // filter can never return every merchant's records.
    // =============================================================================
    async getAllPurchaseOrders(
        filter: any = {},
        page: number = 1,
        limit: number = 10
    ): Promise<{
        purchaseOrders: any[];
        total: number;
    }> {
        const merchantId = Number(filter.merchantId);
        this.validatePositiveId(merchantId, "merchantId");

        const safePage =
            Number.isFinite(page) && page > 0
                ? Math.floor(page)
                : 1;

        const safeLimit =
            Number.isFinite(limit) && limit > 0
                ? Math.min(Math.floor(limit), 100)
                : 10;

        const offset =
            (safePage - 1) * safeLimit;

        // Force the authenticated merchantId into the final filter.
        // Spreading filter first prevents any later property from overriding it.
        const secureFilter = {
            ...filter,
            merchantId,
        };

        const result =
            await this.models.PurchaseOrder.findAndCountAll({
                where: secureFilter,
                include: [
                    {
                        model:
                            this.models.PurchaseOrderItem,
                        as: "items",
                    },
                    {
                        model:
                            this.models.Merchant,
                        as: "merchant",
                    },
                ],
                distinct: true,
                offset,
                limit: safeLimit,
                order: [["createdAt", "DESC"]],
            });

        return {
            purchaseOrders: result.rows,
            total: Number(result.count),
        };
    }

    // =============================================================================
    // UPDATE EXISTING PURCHASE ORDER
    // =============================================================================
    //
    // WHAT CHANGED:
    // - merchantId is required.
    // - The existing PO is located with { id, merchantId }.
    // - Ownership cannot be changed through updateData.
    // - Status cannot be changed here; use updatePurchaseOrderStatus().
    // - Items are replaced transactionally when an items array is supplied.
    //
    // WHY:
    // This preserves Continue Order while preventing cross-merchant updates.
    // =============================================================================
    async updatePurchaseOrder(
        id: number,
        merchantId: number,
        updateData: any
    ): Promise<any | null> {
        this.validatePositiveId(id, "purchase order ID");
        this.validatePositiveId(merchantId, "merchantId");

        const transaction: Transaction =
            await this.sequelize.transaction();

        try {
            const purchaseOrder =
                await this.models.PurchaseOrder.findOne({
                    where: {
                        id,
                        merchantId,
                    },
                    transaction,
                });

            if (!purchaseOrder) {
                await transaction.rollback();
                return null;
            }

            const currentStatus = String(
                purchaseOrder.getDataValue("status") || ""
            ).toLowerCase();

            if (
                currentStatus === "paid" ||
                currentStatus === "completed"
            ) {
                throw new Error(
                    "A paid or completed purchase order cannot be edited."
                );
            }

            if (currentStatus === "cancelled") {
                throw new Error(
                    "A cancelled purchase order cannot be edited. Create a new order instead."
                );
            }

            const hasItemsUpdate =
                Array.isArray(updateData?.items);

            const normalizedItems = hasItemsUpdate
                ? updateData.items.map(
                    (item: any, index: number) =>
                        this.normalizeItem(item, index)
                )
                : [];

            if (
                hasItemsUpdate &&
                normalizedItems.length === 0
            ) {
                throw new Error(
                    "A purchase order must contain at least one item."
                );
            }

            const headerUpdate: Record<string, any> = {};

            if (updateData?.description !== undefined) {
                headerUpdate.description =
                    updateData.description || null;
            }

            if (updateData?.dueDate !== undefined) {
                headerUpdate.dueDate =
                    updateData.dueDate || null;
            }

            if (updateData?.customerName !== undefined) {
                headerUpdate.customerName =
                    String(updateData.customerName || '').trim() || null;
            }

            if (updateData?.customerEmail !== undefined) {
                headerUpdate.customerEmail =
                    String(updateData.customerEmail || '').trim() || null;
            }

            if (updateData?.customerPhone !== undefined) {
                headerUpdate.customerPhone =
                    String(updateData.customerPhone || '').trim() || null;
            }

            // poReference may be edited only when supplied.
            // merchantId and status are intentionally excluded.
            if (updateData?.poReference !== undefined) {
                const poReference = String(
                    updateData.poReference || ""
                ).trim();

                if (!poReference) {
                    throw new Error(
                        "Purchase order reference cannot be empty."
                    );
                }

                headerUpdate.poReference = poReference;
            }

            if (hasItemsUpdate) {
                const totalAmount =
                    normalizedItems.reduce(
                        (sum: number, item: any) =>
                            sum + item.lineTotal,
                        0
                    );

                headerUpdate.totalAmount =
                    String(totalAmount);
            }

            if (Object.keys(headerUpdate).length > 0) {
                await purchaseOrder.update(
                    headerUpdate,
                    { transaction }
                );
            }

            if (hasItemsUpdate) {
                await this.models.PurchaseOrderItem.destroy({
                    where: {
                        purchaseOrderId: id,
                    },
                    transaction,
                });

                for (const item of normalizedItems) {
                    await this.models.PurchaseOrderItem.create(
                        {
                            purchaseOrderId: id,
                            itemName: item.itemName,
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: String(item.unitPrice),
                            lineTotal: String(item.lineTotal),
                        },
                        { transaction }
                    );
                }
            }

            await transaction.commit();

            return await this.getPurchaseOrderById(
                id,
                merchantId
            );
        } catch (error) {
            if (!(transaction as any).finished) {
                await transaction.rollback();
            }

            console.error(
                "PurchaseOrder UPDATE ERROR:",
                error
            );

            throw error;
        }
    }

    // =============================================================================
    // DELETE PURCHASE ORDER
    // =============================================================================
    //
    // CRITICAL SECURITY FIX:
    // The parent PO is checked with { id, merchantId } before any child items are
    // deleted. This prevents a merchant from deleting another merchant's line items
    // by supplying a foreign purchaseOrderId.
    // =============================================================================
    async deletePurchaseOrder(
        id: number,
        merchantId: number
    ): Promise<boolean> {
        this.validatePositiveId(id, "purchase order ID");
        this.validatePositiveId(merchantId, "merchantId");

        const transaction: Transaction =
            await this.sequelize.transaction();

        try {
            const purchaseOrder =
                await this.models.PurchaseOrder.findOne({
                    where: {
                        id,
                        merchantId,
                    },
                    transaction,
                });

            if (!purchaseOrder) {
                await transaction.rollback();
                return false;
            }

            const currentStatus = String(
                purchaseOrder.getDataValue("status") || ""
            ).toLowerCase();

            if (
                currentStatus === "paid" ||
                currentStatus === "completed"
            ) {
                throw new Error(
                    "A paid or completed purchase order cannot be deleted."
                );
            }

            await this.models.PurchaseOrderItem.destroy({
                where: {
                    purchaseOrderId: id,
                },
                transaction,
            });

            await purchaseOrder.destroy({ transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            if (!(transaction as any).finished) {
                await transaction.rollback();
            }

            console.error(
                "PurchaseOrder DELETE ERROR:",
                error
            );

            throw error;
        }
    }

    // =============================================================================
    // UPDATE PURCHASE ORDER STATUS
    // =============================================================================
    //
    // CRITICAL SECURITY FIX:
    // Both id and merchantId are required in the update WHERE clause.
    //
    // WHY:
    // Previously, any authenticated account that knew an order ID could change it.
    // =============================================================================
    async updatePurchaseOrderStatus(
        id: number,
        merchantId: number,
        status: string
    ): Promise<any | null> {
        this.validatePositiveId(id, "purchase order ID");
        this.validatePositiveId(merchantId, "merchantId");

        const normalizedStatus =
            String(status || "").trim().toLowerCase();

        // Per-order approval/rejection was retired. Keep legacy values readable
        // for existing rows, but do not allow new transitions into them.
        const allowedStatuses = ["pending", "cancelled"];

        if (normalizedStatus === "approved" || normalizedStatus === "rejected") {
            throw new Error(
                "Per-order approval and rejection are no longer used. Create the order to generate its payment package immediately."
            );
        }

        if (!allowedStatuses.includes(normalizedStatus)) {
            throw new Error(
                `Invalid status. Allowed values: ${allowedStatuses.join(", ")}.`
            );
        }

        const purchaseOrder =
            await this.models.PurchaseOrder.findOne({
                where: {
                    id,
                    merchantId,
                },
            });

        if (!purchaseOrder) {
            return null;
        }

        const currentStatus = String(
            purchaseOrder.getDataValue("status") || ""
        ).toLowerCase();

        if (
            currentStatus === "paid" ||
            currentStatus === "completed"
        ) {
            throw new Error(
                "The status of a paid or completed purchase order cannot be changed."
            );
        }

        if (
            currentStatus === "cancelled" &&
            normalizedStatus !== "cancelled"
        ) {
            throw new Error(
                "A cancelled purchase order cannot be reopened. Create a new order instead."
            );
        }

        await purchaseOrder.update({
            status: normalizedStatus,
        });

        return this.getPurchaseOrderById(
            id,
            merchantId
        );
    }

    // =============================================================================
    // GET PURCHASE ORDER STATS
    // =============================================================================
    //
    // WHAT CHANGED:
    // All count and sum queries are filtered by merchantId.
    //
    // WHY:
    // Dashboard counts must match the authenticated merchant's list and must not
    // reveal totals belonging to other businesses.
    // =============================================================================
    async getPurchaseOrderStats(
        merchantId: number
    ): Promise<{
        totalOrders: number;
        totalValue: number;
        pending: number;
        approved: number;
        rejected: number;
        completed: number;
    }> {
        this.validatePositiveId(merchantId, "merchantId");

        const { PurchaseOrder } = this.models;

        const [
            totalOrders,
            totalValueResult,
            pending,
            approved,
            rejected,
            completed,
        ] = await Promise.all([
            PurchaseOrder.count({
                where: { merchantId },
            }),

            PurchaseOrder.sum("totalAmount", {
                where: { merchantId },
            }),

            PurchaseOrder.count({
                where: {
                    merchantId,
                    status: "pending",
                },
            }),

            PurchaseOrder.count({
                where: {
                    merchantId,
                    status: "approved",
                },
            }),

            PurchaseOrder.count({
                where: {
                    merchantId,
                    status: "rejected",
                },
            }),

            PurchaseOrder.count({
                where: {
                    merchantId,
                    status: "completed",
                },
            }),
        ]);

        return {
            totalOrders: Number(totalOrders) || 0,
            totalValue: Number(totalValueResult) || 0,
            pending: Number(pending) || 0,
            approved: Number(approved) || 0,
            rejected: Number(rejected) || 0,
            completed: Number(completed) || 0,
        };
    }
}
