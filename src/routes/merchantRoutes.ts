// src/routes/merchantRoutes.ts
import express from 'express';
import {
    getAllMerchants,
    getMerchantById,
    getMerchantCount,   // ✅ new export
    createMerchant,
} from '../controllers/merchantController';
import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Merchants
 *     description: Merchant management endpoints
 */

/**
 * @swagger
 * /api/merchants:
 *   get:
 *     summary: Get all merchants
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of merchants
 */
router.get('/', verifyJwtMiddleware, authorizeRoles(['admin']), getAllMerchants);

/**
 * @swagger
 * /api/merchants/count:
 *   get:
 *     summary: Count merchants
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [self, all]
 *         description: self = only current user’s merchants (default), all = all merchants
 *     responses:
 *       200:
 *         description: Count object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 */
router.get('/count', verifyJwtMiddleware, getMerchantCount); // ✅ keep BEFORE '/:id'

/**
 * @swagger
 * /api/merchants/{id}:
 *   get:
 *     summary: Get merchant by ID
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Merchant found
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Merchant not found
 */
router.get('/:id', verifyJwtMiddleware, authorizeRoles(['admin']), getMerchantById);

/**
 * @swagger
 * /api/merchants:
 *   post:
 *     summary: Create a new merchant
 *     tags: [Merchants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - userId
 *               - cac_number
 *               - tin_number
 *               - bvn
 *               - account_number
 *               - bank_name
 *               - email
 *     responses:
 *       201:
 *         description: Merchant created (+ QR + email)
 *       400:
 *         description: Missing/invalid fields
 *       409:
 *         description: Duplicate CAC number
 */
router.post('/', verifyJwtMiddleware, authorizeRoles(['admin']), createMerchant);

export default router;
