// src/routes/meRoutes.ts
import { Router, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Merchant } from '../models/Merchant';
import verifyJwtMiddleware from '../middlewares/authMiddleware'; // ✅ your middleware

const router = Router();

/**
 * Parse positive integer with fallback.
 */
function parsePositiveInt(val: unknown, fallback: number): number {
    const n = Number(val);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * GET /me/merchants
 * Returns merchants owned by the authenticated app user.
 *
 * Query params (optional):
 *  - limit: number (default 20)
 *  - offset: number (default 0)
 *  - q: string (search in businessName, case-insensitive)
 *
 * Auth:
 *  - Requires bearer JWT; verifyJwtMiddleware must attach req.user.id
 */
router.get(
    '/me/merchants',
    verifyJwtMiddleware,
    async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id as number | undefined;
            if (!userId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const limit = parsePositiveInt(req.query.limit, 20);
            const offset = Math.max(0, Number(req.query.offset) || 0);
            const q = (req.query.q as string | undefined)?.trim();

            const where: any = { userId };
            if (q && q.length > 0) {
                where.businessName = { [Op.iLike]: `%${q}%` };
            }

            const { rows, count } = await Merchant.findAndCountAll({
                where,
                attributes: ['id', 'businessName'],
                order: [['businessName', 'ASC']],
                limit,
                offset,
            });

            return res.json({ rows, count, limit, offset });
        } catch (err) {
            console.error('GET /me/merchants error:', err);
            return res.status(500).json({ message: 'Failed to load merchants' });
        }
    }
);

export default router;

/**
 * @openapi
 * /me/merchants:
 *   get:
 *     tags: [Me]
 *     summary: List my merchants
 *     description: Returns merchants owned by the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0, default: 0 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Case-insensitive search in businessName
 *     responses:
 *       200:
 *         description: Merchant list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rows:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       businessName: { type: string }
 *                 count: { type: integer }
 *                 limit: { type: integer }
 *                 offset: { type: integer }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
