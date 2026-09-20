// src/routes/analyticsRoutes.ts
// --------------------------------------------------------------------------------------
// Analytics routes: tiles, timeseries summary, fraud breakdown (+ drilldown),
// and AI Insights.
// WHAT CHANGED (and why)
// - Added /fraud-breakdown and /fraud-breakdown/transactions (drilldown).
// - Added /ai/insights that calls OpenAI if OPENAI_API_KEY is configured.
// - Kept everything behind verifyJwtMiddleware; added Swagger for all routes.
// --------------------------------------------------------------------------------------

import { Router } from 'express';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import {
    getTransactionsSummary,
    getDashboardTiles,
    getFraudBreakdown,
    getFraudBreakdownTransactions,
    getAiInsights,
} from '../controllers/analyticsController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Aggregated analytics for charts and dashboards
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AnalyticsPoint:
 *       type: object
 *       properties:
 *         bucket: { type: string, example: "2025-08-01" }
 *         count: { type: integer, example: 23 }
 *         totalAmount: { type: number, example: 125000 }
 *     AnalyticsResponse:
 *       type: object
 *       properties:
 *         series:
 *           type: array
 *           items: { $ref: '#/components/schemas/AnalyticsPoint' }
 *         meta:
 *           type: object
 *           properties:
 *             interval: { type: string, enum: [day, week, month, year], example: day }
 *             dateFrom: { type: string, example: "2025-07-08T00:00:00.000Z" }
 *             dateTo: { type: string, example: "2025-08-07T23:59:59.999Z" }
 *             role: { type: string, example: "admin" }
 *             merchantId: { type: integer, nullable: true, example: 42 }
 *     DashboardTilesFlat:
 *       type: object
 *       properties:
 *         tiles:
 *           type: object
 *           properties:
 *             gmvTotal: { type: number, example: 89001.5 }
 *             aov: { type: number, example: 17800.3 }
 *             successRate: { type: number, description: "Percent 0–100", example: 62 }
 *             pending: { type: integer, example: 5 }
 *             gmvToday: { type: number, example: 12000 }
 *             gmvMonthToDate: { type: number, example: 450000 }
 *             highValueMonthCount: { type: integer, example: 3 }
 *             fraudScore: { type: number, example: 28 }
 *         events:
 *           type: array
 *           items:
 *             type: object
 *           description: "Recent payment events (if you add a PaymentEvent model)."
 */

/**
 * @swagger
 * /api/analytics/transactions/summary:
 *   get:
 *     summary: Aggregated transaction totals over time (role-aware)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: interval
 *         schema: { type: string, enum: [day, week, month, year], default: day }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, example: "2025-07-01" }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, example: "2025-08-07" }
 *       - in: query
 *         name: merchantId
 *         schema: { type: integer, example: 12 }
 *         description: Admin only (ignored for non-admins)
 *     responses:
 *       200:
 *         description: Aggregated series for charting
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AnalyticsResponse' }
 *       401: { description: Unauthorized }
 */
router.get('/transactions/summary', verifyJwtMiddleware, getTransactionsSummary);

/**
 * @swagger
 * /api/analytics/tiles:
 *   get:
 *     summary: KPI tiles for the dashboard (role-aware)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPI tiles and (optionally) recent events
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DashboardTilesFlat' }
 *       401: { description: Unauthorized }
 */
router.get('/tiles', verifyJwtMiddleware, getDashboardTiles);

/**
 * @swagger
 * /api/analytics/fraud-breakdown:
 *   get:
 *     summary: Refund & dispute snapshot for the fraud modal
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: windowDays
 *         schema: { type: integer, default: 30, minimum: 1 }
 *       - in: query
 *         name: merchantId
 *         schema: { type: integer }
 *         description: Admin only; restrict to a merchant
 *     responses:
 *       200: { description: Breakdown data }
 */
router.get('/fraud-breakdown', verifyJwtMiddleware, getFraudBreakdown);

/**
 * @swagger
 * /api/analytics/fraud-breakdown/transactions:
 *   get:
 *     summary: Drilldown list for refunds or disputes within the window
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [refunds, disputes] }
 *       - in: query
 *         name: status
 *         schema: { type: string, example: "succeeded" }
 *         description: Optional filter; e.g. refund status or dispute status.
 *       - in: query
 *         name: windowDays
 *         schema: { type: integer, default: 30, minimum: 1 }
 *       - in: query
 *         name: merchantId
 *         schema: { type: integer }
 *         description: Admin only; restrict to a merchant
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, minimum: 1, maximum: 200 }
 *     responses:
 *       200: { description: Array of transactions/refunds/disputes }
 */
router.get(
    '/fraud-breakdown/transactions',
    verifyJwtMiddleware,
    getFraudBreakdownTransactions
);

/**
 * @swagger
 * /api/analytics/ai/insights:
 *   get:
 *     summary: AI-style insights (OpenAI-backed if configured)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: windowDays
 *         schema: { type: integer, default: 30, minimum: 1 }
 *       - in: query
 *         name: merchantId
 *         schema: { type: integer }
 *         description: Admin only; restrict to a merchant
 *     responses:
 *       200:
 *         description: Insights and suggested actions
 *       501:
 *         description: AI not configured (panel can hide gracefully)
 */
router.get('/ai/insights', verifyJwtMiddleware, getAiInsights);

export default router;
