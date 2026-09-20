// src/controllers/transactionController.ts
// --------------------------------------------------------------------------------------
// Transaction Controller
//
// ✅ What’s new / fixed (why):
// - Server-side reference generation everywhere (prevents dupes, removes UI burden).
// - Added `adminCreateTransaction` so admins can create for any merchant (fixes missing export error).
// - Fixed Sequelize eager-loading error by using the correct association alias: `as: 'merchant'`.
// - Added robust pagination + query filters (status, merchantId, date range, reference search) so
//   your charts/table can filter by merchant/date cleanly without server errors.
// - Consistent JSON shape for paginated endpoints: { count, rows, limit, offset }.
// - Safer validation & friendlier error messages.
// --------------------------------------------------------------------------------------

import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { Merchant } from '../models/Merchant';
import Transaction from '../models/Transaction';
import { generateTransactionReference } from '../utils/generateTransactionReference';

type TxStatus = 'pending' | 'completed' | 'failed';

// ---------- tiny helpers (pure) ---------------------------------------------------------

function isValidStatus(s: any): s is TxStatus {
    const v = String(s || '').toLowerCase();
    return v === 'pending' || v === 'completed' || v === 'failed';
}

function parseLimitOffset(req: Request) {
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit ?? 10), 10) || 10));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? 0), 10) || 0);
    return { limit, offset };
}

/** Build a createdAt date-range filter from ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD */
function buildDateRange(startDate?: string, endDate?: string): WhereOptions | undefined {
    if (!startDate && !endDate) return undefined;

    const range: any = {};
    if (startDate) {
        // start of day
        const from = new Date(startDate);
        from.setHours(0, 0, 0, 0);
        range[Op.gte] = from;
    }
    if (endDate) {
        // end of day
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);
        range[Op.lte] = to;
    }
    return { createdAt: range };
}

/** Optional LIKE filter for reference substring search (?ref=XYZ) */
function buildReferenceLike(ref?: string): WhereOptions | undefined {
    if (!ref) return undefined;
    return { reference: { [Op.iLike]: `%${ref}%` } };
}

// ---------- CREATE (merchant) -----------------------------------------------------------

/**
 * POST /api/transactions
 * Merchant creates a transaction for **their own** merchant.
 * - reference is always generated server-side (ignores any client-provided reference)
 */
export const createTransaction = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        const statusRaw = req.body?.status;
        const amountRaw = req.body?.amount;

        const amount = Number(amountRaw);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }
        if (!isValidStatus(statusRaw)) {
            return res.status(400).json({ message: "Status must be one of: 'pending' | 'completed' | 'failed'" });
        }

        const merchant = await Merchant.findOne({ where: { userId } });
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found for the logged-in user' });
        }

        const reference = generateTransactionReference();

        const tx = await Transaction.create({
            merchantId: merchant.id,
            amount,
            status: statusRaw,
            reference,
        });

        return res.status(201).json(tx);
    } catch (err) {
        console.error('Error creating transaction:', err);
        return res.status(500).json({ message: 'Server error while creating transaction' });
    }
};

// ---------- CREATE (admin) --------------------------------------------------------------

/**
 * POST /api/transactions/admin
 * Admin creates a transaction for **any** merchant by ID.
 * - reference is always generated server-side
 */
export const adminCreateTransaction = async (req: Request, res: Response) => {
    try {
        const user = (req.user as any) || {};
        if (String(user.role).toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: admin only' });
        }

        const { merchantId, amount: amountRaw, status: statusRaw } = req.body;
        const amount = Number(amountRaw);
        if (!merchantId) return res.status(400).json({ message: 'merchantId is required' });
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number' });
        }
        if (!isValidStatus(statusRaw)) {
            return res.status(400).json({ message: "Status must be one of: 'pending' | 'completed' | 'failed'" });
        }

        const merchant = await Merchant.findByPk(Number(merchantId));
        if (!merchant) return res.status(404).json({ message: 'Merchant not found' });

        const reference = generateTransactionReference();

        const tx = await Transaction.create({
            merchantId: merchant.id,
            amount,
            status: statusRaw,
            reference,
        });

        return res.status(201).json(tx);
    } catch (err) {
        console.error('Error creating transaction (admin):', err);
        return res.status(500).json({ message: 'Server error while creating transaction (admin)' });
    }
};

// ---------- LIST (merchant) -------------------------------------------------------------

/**
 * GET /api/transactions
 * Merchant sees only their own transactions.
 * Filters (optional): ?status=pending|completed|failed&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&ref=ABC
 */
export const getMerchantTransactions = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        const { limit, offset } = parseLimitOffset(req);

        const status = String(req.query.status ?? '').trim();
        const startDate = String(req.query.startDate ?? '').trim() || undefined;
        const endDate = String(req.query.endDate ?? '').trim() || undefined;
        const refLike = String(req.query.ref ?? '').trim() || undefined;

        const merchant = await Merchant.findOne({ where: { userId } });
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found for the logged-in user' });
        }

        const where: WhereOptions = {
            merchantId: merchant.id,
            ...(isValidStatus(status) ? { status } : {}),
            ...(buildDateRange(startDate, endDate) || {}),
            ...(buildReferenceLike(refLike) || {}),
        };

        const result = await Transaction.findAndCountAll({
            where,
            include: [
                {
                    model: Merchant,
                    as: 'merchant',              // ✅ IMPORTANT: matches your association alias
                    attributes: ['id', 'name'],  // use `name` (not businessName)
                },
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ count: result.count, rows: result.rows, limit, offset });
    } catch (err) {
        console.error('Error fetching merchant transactions:', err);
        return res.status(500).json({ message: 'Server error while fetching transactions' });
    }
};

// ---------- LIST (admin: all) -----------------------------------------------------------

/**
 * GET /api/transactions/admin
 * Admin sees all transactions.
 * Filters (optional): ?merchantId=12&status=pending&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&ref=ABC
 */
export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const user = (req.user as any) || {};
        if (String(user.role).toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: admin only' });
        }

        const { limit, offset } = parseLimitOffset(req);
        const merchantId = req.query.merchantId ? Number(req.query.merchantId) : undefined;
        const status = String(req.query.status ?? '').trim();
        const startDate = String(req.query.startDate ?? '').trim() || undefined;
        const endDate = String(req.query.endDate ?? '').trim() || undefined;
        const refLike = String(req.query.ref ?? '').trim() || undefined;

        const where: WhereOptions = {
            ...(merchantId ? { merchantId } : {}),
            ...(isValidStatus(status) ? { status } : {}),
            ...(buildDateRange(startDate, endDate) || {}),
            ...(buildReferenceLike(refLike) || {}),
        };

        const result = await Transaction.findAndCountAll({
            where,
            include: [
                {
                    model: Merchant,
                    as: 'merchant',              // ✅ fixed alias to prevent EagerLoadingError
                    attributes: ['id', 'name'],
                },
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ count: result.count, rows: result.rows, limit, offset });
    } catch (err) {
        console.error('Error fetching all transactions:', err);
        return res.status(500).json({ message: 'Server error while fetching all transactions' });
    }
};

// ---------- LIST (admin: by merchant) ---------------------------------------------------

/**
 * GET /api/transactions/admin/:merchantId
 * Admin: list transactions for a specific merchant (same filters as above).
 * Filters (optional): ?status=&startDate=&endDate=&ref=
 */
export const getMerchantTransactionsById = async (req: Request, res: Response) => {
    try {
        const user = (req.user as any) || {};
        if (String(user.role).toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: admin only' });
        }

        const merchantId = Number(req.params.merchantId);
        if (!Number.isFinite(merchantId)) {
            return res.status(400).json({ message: 'Invalid merchantId' });
        }

        const exists = await Merchant.findByPk(merchantId);
        if (!exists) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        const { limit, offset } = parseLimitOffset(req);
        const status = String(req.query.status ?? '').trim();
        const startDate = String(req.query.startDate ?? '').trim() || undefined;
        const endDate = String(req.query.endDate ?? '').trim() || undefined;
        const refLike = String(req.query.ref ?? '').trim() || undefined;

        const where: WhereOptions = {
            merchantId,
            ...(isValidStatus(status) ? { status } : {}),
            ...(buildDateRange(startDate, endDate) || {}),
            ...(buildReferenceLike(refLike) || {}),
        };

        const result = await Transaction.findAndCountAll({
            where,
            include: [
                {
                    model: Merchant,
                    as: 'merchant',              // ✅ fixed alias to prevent EagerLoadingError
                    attributes: ['id', 'name'],
                },
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ count: result.count, rows: result.rows, limit, offset });
    } catch (err) {
        console.error('Error fetching transactions by merchant:', err);
        return res.status(500).json({ message: 'Server error while fetching transactions by merchant' });
    }
};


/**
 * GET /api/transactions/:id
 *
 * Returns a single transaction.
 *
 * Security:
 * - Admins may retrieve any transaction.
 * - Merchants may retrieve only transactions belonging to their own Merchant record.
 * - Merchant identity is derived server-side from the authenticated JWT user.
 * - We never trust a merchantId supplied by the browser.
 * - Cross-tenant requests return 404 to avoid revealing that another merchant's
 *   transaction exists.
 */
export const getTransactionDetails = async (req: Request, res: Response) => {
    try {
        const transactionId = Number(req.params.id);

        if (!Number.isInteger(transactionId) || transactionId <= 0) {
            return res.status(400).json({
                message: 'Invalid transaction id',
            });
        }

        const user = (req.user as any) || {};
        const userId = Number(user.id);
        const role = String(user.role || '').toLowerCase();

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                message: 'Unauthorized',
            });
        }

        // Admins are intentionally allowed to inspect transactions
        // across all merchants.
        if (role === 'admin') {
            const transaction = await Transaction.findByPk(transactionId, {
                include: [
                    {
                        model: Merchant,
                        as: 'merchant',
                        attributes: ['id', 'name'],
                    },
                ],
            });

            if (!transaction) {
                return res.status(404).json({
                    message: 'Transaction not found',
                });
            }

            return res.status(200).json(transaction);
        }

        // Resolve merchant ownership from the authenticated user.
        // Do NOT accept merchantId from params, query string or request body.
        const merchant = await Merchant.findOne({
            where: { userId },
            attributes: ['id'],
        });

        if (!merchant) {
            return res.status(404).json({
                message: 'Transaction not found',
            });
        }

        // Critical tenant-isolation check:
        // both transaction id AND merchant id must match.
        const transaction = await Transaction.findOne({
            where: {
                id: transactionId,
                merchantId: merchant.id,
            },
            include: [
                {
                    model: Merchant,
                    as: 'merchant',
                    attributes: ['id', 'name'],
                },
            ],
        });

        if (!transaction) {
            return res.status(404).json({
                message: 'Transaction not found',
            });
        }

        return res.status(200).json(transaction);
    } catch (err) {
        console.error('Error fetching transaction details:', err);

        return res.status(500).json({
            message: 'Server error while fetching transaction details',
        });
    }
};