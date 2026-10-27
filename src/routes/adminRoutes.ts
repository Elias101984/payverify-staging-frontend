import axios from 'axios';
import { Router, Request, Response } from 'express';
import { QueryTypes } from 'sequelize';

import { verifyJwtMiddleware } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';
import { Merchant } from '../models/Merchant';
import { User } from '../models/User';
import { sequelize } from '../config/db';
import { audit } from '../services/authSecurityService';
import { sendMail } from '../services/emailService';

const router = Router();

function normalizeBank(value: unknown): string {
    const name = String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const gtBankAliases = [
        'gtbank',
        'gtb',
        'guarantytrust',
        'guarantytrustbank',
        'guarantytrustbankplc',
        'guarantytrustbanklimited',
    ];

    return gtBankAliases.includes(name) ? 'gtbank' : name;
}

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin endpoints
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Admin dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
    '/dashboard',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    (req: Request, res: Response) => {
        res.json({
            message: 'Welcome to the admin dashboard',
            user: req.user,
        });
    }
);

// Existing merchant approval endpoints.
router.get(
    '/merchant-approvals',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    async (_req, res) => {
        try {
            const merchants = await Merchant.findAll({
                where: { status: 'pending' },
                attributes: [
                    'id',
                    'name',
                    'userId',
                    'cac_number',
                    'bank_name',
                    'account_number',
                    'status',
                    'paystack_subaccount_code',
                ],
                order: [['createdAt', 'DESC']],
            });

            return res.json(
                merchants.map(merchant => ({
                    ...merchant.toJSON(),
                    account_number:
                        '****' + String(merchant.account_number || '').slice(-4),
                }))
            );
        } catch {
            return res.status(500).json({
                message: 'Failed to load approvals',
            });
        }
    }
);

router.post(
    '/merchant-approvals/:id/decision',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    async (req, res) => {
        const decision = String(req.body?.decision || '').toLowerCase();
        const reason = String(req.body?.reason || '').trim();

        if (
            !['approved', 'rejected'].includes(decision) ||
            (decision === 'rejected' && !reason)
        ) {
            return res.status(400).json({
                message: 'Decision or rejection reason invalid',
            });
        }

        try {
            const merchantId = Number(req.params.id);
            const adminId = Number((req.user as any).id);

            const result = await sequelize.transaction(async transaction => {
                const merchant = await Merchant.findByPk(merchantId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                if (!merchant || merchant.status !== 'pending') {
                    return null;
                }

                const user = await User.findByPk(merchant.userId, {
                    transaction,
                });

                if (!user?.email_verified_at) {
                    throw new Error('Email not verified');
                }

                if (
                    decision === 'approved' &&
                    !merchant.paystack_subaccount_code
                ) {
                    throw new Error('Paystack subaccount not configured');
                }

                merchant.status = decision as 'approved' | 'rejected';
                await merchant.save({ transaction });

                await sequelize.query(
                    `INSERT INTO merchant_approval_events
                        (merchant_id, admin_user_id, decision, reason)
                     VALUES
                        (:merchantId, :adminId, :decision, :reason)`,
                    {
                        transaction,
                        replacements: {
                            merchantId,
                            adminId,
                            decision,
                            reason: reason || null,
                        },
                    }
                );

                return {
                    email: user.email,
                    name: merchant.name,
                };
            });

            if (!result) {
                return res.status(409).json({
                    message: 'Merchant not pending or not found',
                });
            }

            await audit(
                req,
                'MERCHANT_' + decision.toUpperCase(),
                adminId,
                { merchantId }
            );

            const safeName = result.name.replace(/[&<>"']/g, '');
            const safeReason = reason.replace(/[&<>"']/g, '');

            void sendMail(
                result.email,
                'PayVerify merchant application update',
                `<p>Your PayVerify application for ${safeName} is ${decision}.</p>
                 <p>${safeReason}</p>`
            ).catch(() => {
                console.error('Merchant application email delivery failed.');
            });

            return res.json({
                message: `Merchant ${decision}`,
            });
        } catch (error: any) {
            return res.status(400).json({
                message: error?.message || 'Approval failed',
            });
        }
    }
);

// Verify and link an existing Paystack subaccount to a merchant.
// Fee settings are preserved.
router.put(
    '/merchants/:id/settlement',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    async (req: Request, res: Response) => {
        const merchantId = Number(req.params.id);
        const adminId = Number((req.user as any)?.id);
        const code = String(req.body?.subaccountCode || '').trim();

        if (
            !Number.isSafeInteger(merchantId) ||
            merchantId <= 0 ||
            !/^ACCT_[a-zA-Z0-9]+$/.test(code)
        ) {
            return res.status(400).json({
                message: 'Valid merchant ID and subaccount code required.',
            });
        }

        if (!Number.isSafeInteger(adminId) || adminId <= 0) {
            return res.status(401).json({
                message: 'Valid administrator session required.',
            });
        }

        const secret = process.env.PAYSTACK_SECRET_KEY;

        if (!secret) {
            return res.status(503).json({
                message: 'Paystack is not configured.',
            });
        }

        let sub: {
            id: number;
            subaccount_code: string;
            active: boolean;
            account_number: string;
            settlement_bank: string;
        };

        try {
            const response = await axios.get(
                `https://api.paystack.co/subaccount/${encodeURIComponent(code)}`,
                {
                    headers: {
                        Authorization: `Bearer ${secret}`,
                    },
                    timeout: 15000,
                }
            );

            sub = response.data?.data;

            if (
                response.data?.status !== true ||
                !sub ||
                sub.subaccount_code !== code ||
                !Number.isSafeInteger(sub.id) ||
                sub.id <= 0 ||
                sub.active !== true ||
                !String(sub.account_number || '').trim() ||
                !String(sub.settlement_bank || '').trim()
            ) {
                return res.status(400).json({
                    message:
                        'Paystack did not return an active, valid subaccount.',
                });
            }
        } catch {
            return res.status(502).json({
                message:
                    'Paystack could not verify this code. Check the code and key mode, then retry.',
            });
        }

        try {
            const result = await sequelize.transaction(async transaction => {
                const merchant = await Merchant.findByPk(merchantId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                if (!merchant) {
                    return 'not_found' as const;
                }

                const merchantAccount =
                    String(merchant.account_number || '').trim();

                const subaccountAccount =
                    String(sub.account_number || '').trim();

                const merchantBank = normalizeBank(merchant.bank_name);
                const subaccountBank = normalizeBank(sub.settlement_bank);

                if (
                    !merchantAccount ||
                    !merchantBank ||
                    merchantAccount !== subaccountAccount ||
                    merchantBank !== subaccountBank
                ) {
                    return 'bank_mismatch' as const;
                }

                const previousCode =
                    merchant.paystack_subaccount_code || null;

                await merchant.update(
                    {
                        paystack_subaccount_code: code,
                        paystack_subaccount_id: sub.id,
                    },
                    { transaction }
                );

                // Save the audit event atomically with the merchant update.
                await sequelize.query(
                    `INSERT INTO auth_security_events
                        (
                            user_id,
                            event_type,
                            ip_address,
                            user_agent,
                            details,
                            created_at
                        )
                     VALUES
                        (
                            :adminId,
                            :eventType,
                            :ipAddress,
                            :userAgent,
                            CAST(:details AS jsonb),
                            NOW()
                        )`,
                    {
                        transaction,
                        replacements: {
                            adminId,
                            eventType: 'MERCHANT_SETTLEMENT_UPDATED',
                            ipAddress: req.ip || null,
                            userAgent: req.get('user-agent') || null,
                            details: JSON.stringify({
                                merchantId,
                                previousCode,
                                subaccountCode: code,
                                subaccountId: sub.id,
                            }),
                        },
                    }
                );

                return 'saved' as const;
            });

            if (result === 'not_found') {
                return res.status(404).json({
                    message: 'Merchant not found.',
                });
            }

            if (result === 'bank_mismatch') {
                return res.status(409).json({
                    message:
                        'Subaccount bank details do not match this merchant. Nothing was changed.',
                });
            }

            return res.json({
                message: 'Settlement subaccount verified and saved.',
                subaccountCode: code,
            });
        } catch {
            console.error(
                'Settlement settings could not be saved with their audit event.'
            );

            return res.status(500).json({
                message:
                    'Unable to save settlement settings. No changes were committed.',
            });
        }
    }
);

router.get(
    '/security-events',
    verifyJwtMiddleware,
    authorizeRoles(['admin']),
    async (req, res) => {
        const limit = Math.min(
            100,
            Math.max(1, Math.floor(Number(req.query.limit) || 50))
        );

        try {
            const events = await sequelize.query(
                `SELECT
                    id,
                    user_id,
                    event_type,
                    ip_address,
                    user_agent,
                    details,
                    created_at
                 FROM auth_security_events
                 ORDER BY created_at DESC
                 LIMIT :limit`,
                {
                    type: QueryTypes.SELECT,
                    replacements: { limit },
                }
            );

            return res.json(events);
        } catch {
            return res.status(500).json({
                message: 'Failed to load security events.',
            });
        }
    }
);

export default router;