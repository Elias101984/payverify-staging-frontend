import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import Transaction from '../models/Transaction';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/db';

/**
 * getDashboardStats
 *
 * This controller returns dashboard statistics based on the logged-in user.
 *
 * Changes:
 *  Added support for `admin` role — admin sees global stats (all merchants combined).
 *  Merchants continue to see only their own merchant stats.
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // Extract user information from token middleware
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!userId || !userRole) {
            return res.status(401).json({ message: 'Unauthorized: user not found or no role' });
        }

        // Default stats to 0
        let total = 0;
        let pending = 0;
        let completed = 0;
        let sum = 0;

        if (userRole === 'admin') {
            /**
             *  If the logged-in user is an admin:
             *   - Fetch ALL transactions in the system
             *   - Count totals, pending, completed, and sum amounts
             */
            total = await Transaction.count();
            pending = await Transaction.count({ where: { status: 'pending' } });
            completed = await Transaction.count({ where: { status: 'completed' } });
            sum = await Transaction.sum('amount');
        } else {
            /**
             *  If the user is a merchant:
             *   - Find their associated Merchant record by userId
             *   - Then compute stats only for their merchantId
             */
            const merchant = await Merchant.findOne({ where: { userId } });

            if (!merchant) {
                return res.status(404).json({ message: 'Merchant not found for this user' });
            }

            const merchantId = merchant.id;

            total = await Transaction.count({ where: { merchantId } });
            pending = await Transaction.count({ where: { merchantId, status: 'pending' } });
            completed = await Transaction.count({ where: { merchantId, status: 'completed' } });
            sum = await Transaction.sum('amount', { where: { merchantId } });
        }

        // Respond with calculated stats
        res.json({ total, pending, completed, sum });
    } catch (err) {
        console.error('Dashboard error', err);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
};

/**
 * Merchant-scoped operational exceptions for the dashboard. Refunds, disputes
 * and cancellations remain separate records, while the UI receives one safe
 * read model for counts, filters and recent activity.
 */
export const getDashboardOperations = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.user?.id);
        const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let merchantId: number | null = null;

        if (!isAdmin) {
            const merchant = await Merchant.findOne({ where: { userId } });

            if (!merchant) {
                return res.status(404).json({ message: 'Merchant not found for this user' });
            }

            merchantId = Number(merchant.id);
        }

        const transactionScope = isAdmin
            ? ''
            : 'WHERE t."merchantId" = :merchantId';
        const orderScope = isAdmin
            ? "WHERE po.status = 'cancelled'"
            : "WHERE po.status = 'cancelled' AND po.merchant_id = :merchantId";
        const replacements = { merchantId };

        const [refunds, disputes, cancellations] = await Promise.all([
            sequelize.query(
                `
                SELECT
                    r.id, r.amount, r.reason, r.status,
                    r.processed_at AS "processedAt",
                    r.created_at AS "createdAt",
                    t.id AS "transactionId", t.reference,
                    t.amount AS "transactionAmount",
                    m.id AS "merchantId", m.name AS "merchantName"
                FROM refunds r
                JOIN transactions t ON t.id = r.transaction_id
                JOIN merchants m ON m.id = t."merchantId"
                ${transactionScope}
                ORDER BY r.created_at DESC
                LIMIT 100
                `,
                { type: QueryTypes.SELECT, replacements }
            ),
            sequelize.query(
                `
                SELECT
                    d.id, d.amount, d.reason_code AS "reasonCode", d.status,
                    d.opened_at AS "openedAt", d.closed_at AS "closedAt",
                    d.created_at AS "createdAt",
                    t.id AS "transactionId", t.reference,
                    t.amount AS "transactionAmount",
                    m.id AS "merchantId", m.name AS "merchantName"
                FROM disputes d
                JOIN transactions t ON t.id = d.transaction_id
                JOIN merchants m ON m.id = t."merchantId"
                ${transactionScope}
                ORDER BY d.opened_at DESC
                LIMIT 100
                `,
                { type: QueryTypes.SELECT, replacements }
            ),
            sequelize.query(
                `
                SELECT
                    po.id, po.po_reference AS "poReference",
                    po.total_amount AS amount, po.status,
                    po.customer_email AS "customerEmail",
                    po.customer_phone AS "customerPhone",
                    po.updated_at AS "cancelledAt",
                    po.created_at AS "createdAt",
                    m.id AS "merchantId", m.name AS "merchantName"
                FROM purchase_orders po
                JOIN merchants m ON m.id = po.merchant_id
                ${orderScope}
                ORDER BY po.updated_at DESC
                LIMIT 100
                `,
                { type: QueryTypes.SELECT, replacements }
            ),
        ]);

        const refundRows = refunds as any[];
        const disputeRows = disputes as any[];
        const cancellationRows = cancellations as any[];
        const pendingRefunds = refundRows.filter(row =>
            ['pending', 'processing'].includes(String(row.status).toLowerCase())
        ).length;
        const openDisputes = disputeRows.filter(row =>
            ['open', 'pending', 'awaiting-merchant-feedback'].includes(
                String(row.status).toLowerCase()
            )
        ).length;

        return res.json({
            summary: {
                refunds: refundRows.length,
                pendingRefunds,
                disputes: disputeRows.length,
                openDisputes,
                cancellations: cancellationRows.length,
                needsAttention: pendingRefunds + openDisputes,
            },
            refunds: refundRows,
            disputes: disputeRows,
            cancellations: cancellationRows,
        });
    } catch (err) {
        console.error('Dashboard operations error', err);
        return res.status(500).json({ message: 'Error fetching dashboard operations' });
    }
};
