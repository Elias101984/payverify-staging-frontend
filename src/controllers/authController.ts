// src/controllers/authController.ts

import { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';

import { sequelize } from '../config/db';
import { User } from '../models/User';
import { Merchant } from '../models/Merchant';
import { issueChallenge, consumeChallenge, codeHash, constantMatch, newCode, audit, alertLogin } from '../services/authSecurityService';
import { sendMail } from '../services/emailService';

/* =========================================================================
 * Helpers
 * ========================================================================= */

const normalizeEmail = (value: unknown): string =>
    String(value ?? '')
        .trim()
        .toLowerCase();

const normalizeText = (value: unknown): string =>
    String(value ?? '').trim();

const getJwtSecret = (): Secret => {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.trim().length === 0) {
        throw new Error('JWT_SECRET is not configured');
    }

    return secret as Secret;
};

const signJWT = (
    payload: string | object | Buffer,
    expiresIn: StringValue | number = '1h'
): string => {
    const options: SignOptions = {
        expiresIn,
    };

    return jwt.sign(
        payload,
        getJwtSecret(),
        options
    );
};

/* =========================================================================
 * Email helper
 * ========================================================================= */

async function sendEmail(
    to: string,
    subject: string,
    html: string
): Promise<boolean> {
    const key =
        process.env.SENDGRID_API_KEY;

    const from =
        process.env.NOTIFY_FROM_EMAIL;

    if (!key || !from) {
        console.warn(
            'Email not sent: email provider is not configured'
        );

        return false;
    }

    try {
        sgMail.setApiKey(key);

        await sgMail.send({
            to,
            from,
            subject,
            html,
        });

        return true;
    } catch (err: any) {
        console.error(
            'Email delivery failed:',
            err?.message ||
            'Unknown email provider error'
        );

        return false;
    }
}

/* =========================================================================
 * Password reset token helper
 * ========================================================================= */

const hashToken = (
    token: string
): string =>
    crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

/* =========================================================================
 * POST /api/auth/register
 *
 * Public merchant registration.
 *
 * SECURITY:
 * - Public callers cannot choose their role.
 * - All public registrations are MERCHANT accounts.
 * - No generated CAC fallback.
 * - No fake banking information.
 * - Email is normalized before lookup/storage.
 * - Registration occurs atomically in one DB transaction.
 * ========================================================================= */

export const register = async (
    req: Request,
    res: Response
) => {
    const transaction =
        await sequelize.transaction();

    let transactionFinished = false;

    try {
        const {
            name,
            password,
            cac_number,
            tin_number,
            bvn,
            account_number,
            bank_name,
        } = req.body ?? {};

        const email =
            normalizeEmail(
                req.body?.email
            );

        const merchantName =
            normalizeText(name);

        const cacNumber =
            normalizeText(
                cac_number
            );

        const bankName =
            normalizeText(
                bank_name
            );

        const accountNumber =
            normalizeText(
                account_number
            ).replace(/\s/g, '');

        const tinNumber =
            tin_number
                ? normalizeText(
                    tin_number
                )
                : undefined;

        const bvnValue =
            bvn
                ? normalizeText(bvn)
                : undefined;

        // ---------------------------------------------------------------------
        // Required fields
        // ---------------------------------------------------------------------

        if (
            !merchantName ||
            !email ||
            !password ||
            !cacNumber ||
            !accountNumber ||
            !bankName
        ) {
            await transaction.rollback();

            transactionFinished =
                true;

            return res.status(400).json({
                message:
                    'Business name, email, password, CAC/RC number, bank name and account number are required',
            });
        }

        // ---------------------------------------------------------------------
        // Email validation
        // ---------------------------------------------------------------------

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
            !emailPattern.test(email)
        ) {
            await transaction.rollback();

            transactionFinished =
                true;

            return res.status(400).json({
                message:
                    'Please provide a valid email address',
            });
        }

        // ---------------------------------------------------------------------
        // Password validation
        // ---------------------------------------------------------------------

        if (
            typeof password !==
            'string' ||
            password.length < 8
        ) {
            await transaction.rollback();

            transactionFinished =
                true;

            return res.status(400).json({
                message:
                    'Password must be at least 8 characters',
            });
        }

        // ---------------------------------------------------------------------
        // Nigerian bank account validation
        // ---------------------------------------------------------------------

        if (
            !/^\d{10}$/.test(
                accountNumber
            )
        ) {
            await transaction.rollback();

            transactionFinished =
                true;

            return res.status(400).json({
                message:
                    'Bank account number must contain exactly 10 digits',
            });
        }

        // ---------------------------------------------------------------------
        // Reject fake/placeholder CAC values
        // ---------------------------------------------------------------------

        const normalizedCAC =
            cacNumber.toUpperCase();

        if (
            normalizedCAC ===
            'N/A' ||
            normalizedCAC ===
            'NA' ||
            normalizedCAC ===
            'NONE'
        ) {
            await transaction.rollback();

            transactionFinished =
                true;

            return res.status(400).json({
                message:
                    'A valid CAC/RC number is required',
            });
        }

        // ---------------------------------------------------------------------
        // Existing user
        // ---------------------------------------------------------------------

        const existingUser =
            await User.findOne({
                where: {
                    email,
                },
                transaction,
            });

        if (existingUser) {
            await transaction.rollback();

            transactionFinished =
                true;

            return res.status(409).json({
                message:
                    'User already exists',
            });
        }

        // ---------------------------------------------------------------------
        // Hash password
        // ---------------------------------------------------------------------

        const password_hash =
            await bcrypt.hash(
                password,
                10
            );

        // ---------------------------------------------------------------------
        // Create USER
        //
        // CRITICAL:
        // Never accept role from req.body on this public endpoint.
        // ---------------------------------------------------------------------

        const newUser =
            await User.create(
                {
                    email,
                    password_hash,

                    // Public registration
                    // always creates merchant.
                    role: 'merchant',
                },
                {
                    transaction,
                }
            );

        // ---------------------------------------------------------------------
        // Create MERCHANT
        // ---------------------------------------------------------------------

        const merchant =
            await Merchant.create(
                {
                    name:
                        merchantName,

                    cac_number:
                        cacNumber,

                    tin_number:
                        tinNumber,

                    bvn:
                        bvnValue,

                    account_number:
                        accountNumber,

                    bank_name:
                        bankName,

                    userId:
                        newUser.id,
                },
                {
                    transaction,
                }
            );

        await transaction.commit();

        transactionFinished = true;

        // Registration is NOT authentication. Email must be verified and admin must approve.
        try {
            const code = await issueChallenge(newUser.id, 'verify_email');
            await sendMail(email, 'Verify your PayVerify email',
                `<p>Your PayVerify verification code is <strong>${code}</strong>.</p><p>Expires in 10 minutes.</p>`);
        } catch (deliveryError) {
            console.error('Registration verification email failed', deliveryError);
        }
        await audit(req, 'REGISTRATION_PENDING', newUser.id, { merchantId: merchant.id });
        return res.status(201).json({ message: 'Registration received. Verify your email, then await admin approval.', requiresEmailVerification: true });
    } catch (err) {
        const failure = err as {
            name?: string;
            errors?: Array<{
                path?: string;
                type?: string;
                validatorKey?: string;
            }>;
            parent?: {
                code?: string;
                constraint?: string;
            };
        };

        console.error('Registration failed:', {
            name: failure?.name,
            fields: failure?.errors?.map(item => ({
                field: item.path,
                type: item.type,
                validator: item.validatorKey,
            })),
            databaseCode: failure?.parent?.code,
            constraint: failure?.parent?.constraint,
        });

        if (
            !transactionFinished
        ) {
            try {
                await transaction.rollback();
            } catch {
                // Avoid masking original error.
            }
        }
        if (failure?.name === 'SequelizeUniqueConstraintError') {
            const duplicateCAC =
                failure.errors?.some(item => item.path === 'cac_number') ||
                failure.parent?.constraint === 'merchants_cac_number_unique';

            return res.status(409).json({
                message: duplicateCAC
                    ? 'A business with this CAC/RC number is already registered. Please log in or contact support.'
                    : 'An account with these details already exists.',
            });
        }
        return res.status(500).json({
            message:
                'Server error during registration',
        });
    }
};

/* =========================================================================
 * POST /api/auth/login
 * ========================================================================= */

export const login = async (
    req: Request,
    res: Response
) => {
    try {
        const email =
            normalizeEmail(
                req.body?.email
            );

        const password =
            req.body?.password;

        if (
            !email ||
            !password
        ) {
            return res.status(400).json({
                message:
                    'Email and password are required',
            });
        }

        const user =
            await User.findOne({
                where: {
                    email,
                },
            });

        // Same response for unknown email and wrong password.
        if (!user) {
            void audit(req, 'LOGIN_FAILURE');
            return res.status(401).json({
                message:
                    'Invalid credentials',
            });
        }

        const validPassword =
            await bcrypt.compare(
                password,
                user.password_hash
            );

        if (!validPassword) {
            void audit(req, 'LOGIN_FAILURE', user.id);
            return res.status(401).json({
                message:
                    'Invalid credentials',
            });
        }

        const merchant =
            await Merchant.findOne({
                where: {
                    userId:
                        user.id,
                },
            });

        if (user.role === 'merchant' && !user.email_verified_at) {
            return res.status(403).json({ message: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' });
        }
        // Approved status is required for LIVE payment operations, not for viewing onboarding status.
        const merchantName =
            merchant?.name ||
            'Merchant';

        const token =
            signJWT({
                id:
                    user.id,

                email:
                    user.email,

                name:
                    merchantName,

                role:
                    user.role,
                authVersion: user.auth_version || 0,
            });

        void alertLogin(
            req,
            user.id,
            user.email,
            user.role.toLowerCase() === 'admin'
                ? 'Admin'
                : (merchant?.name || 'Merchant')
        );
        return res.json({
            message:
                'Login successful',

            token,
        });
    } catch (err) {
        console.error(
            'Login failed:',
            err instanceof Error
                ? err.message
                : 'Unknown login error'
        );

        return res.status(500).json({
            message:
                'Server error during login',
        });
    }
};

/* =========================================================================
 * GET /api/auth/me
 * ========================================================================= */

export const me = (
    req: Request,
    res: Response
) => {
    if (!req.user) {
        return res.status(401).json({
            message:
                'Unauthorized',
        });
    }

    return res.json(
        req.user
    );
};

/* =========================================================================
 * POST /api/auth/forgot-password
 *
 * Always returns the same response for existing/non-existing users.
 * ========================================================================= */

export const forgotPassword =
    async (
        req: Request,
        res: Response
    ) => {
        const email =
            normalizeEmail(
                req.body?.email
            );

        if (!email) {
            return res.status(400).json({
                message:
                    'Email is required',
            });
        }

        const genericResponse = {
            message:
                'If that email exists, a reset link has been sent.',
        };

        try {
            const user =
                await User.findOne({
                    where: {
                        email,
                    },
                });

            if (!user) {
                return res
                    .status(200)
                    .json(
                        genericResponse
                    );
            }

            const rawToken =
                crypto
                    .randomBytes(32)
                    .toString('hex');

            const resetOtp = newCode();
            user.reset_otp_hash = codeHash(user.id, 'reset_password', resetOtp);
            user.reset_otp_attempts = 0;
            user.resetTokenHash =
                hashToken(
                    rawToken
                );

            user.resetTokenExpires =
                new Date(
                    Date.now() +
                    10 *
                    60 *
                    1000
                );

            await user.save({
                validate: false,
            });

            const frontendUrl =
                process.env
                    .FRONTEND_URL ||
                'http://localhost:3000';

            const resetUrl =
                `${frontendUrl}/reset-password?token=${encodeURIComponent(
                    rawToken
                )}`;

            await sendEmail(
                email,
                'Reset your PayVerify password',
                `
                    <h2>Reset your password</h2>

                    <p>
                        We received a request to reset your PayVerify password.
                    </p>

                    <p>
                        <a href="${resetUrl}">
                            Click here to reset your password
                        </a>.
                        This link expires in 10 minutes.<br/>Your one-time code: <strong>${resetOtp}</strong>.
                    </p>

                    <p>
                        If you did not request this, you can safely ignore this email.
                    </p>
                `
            );

            return res
                .status(200)
                .json(
                    genericResponse
                );
        } catch (err) {
            console.error(
                'Password reset request failed:',
                err instanceof Error
                    ? err.message
                    : 'Unknown password reset error'
            );

            // Preserve account enumeration protection.
            return res
                .status(200)
                .json(
                    genericResponse
                );
        }
    };

/* =========================================================================
 * POST /api/auth/reset-password
 * ========================================================================= */

export const resetPassword =
    async (
        req: Request,
        res: Response
    ) => {
        const token =
            normalizeText(
                req.body?.token
            );

        const password =
            req.body?.password;
        const otp = String(req.body?.otp || '');

        if (
            !token ||
            !password
        ) {
            return res.status(400).json({
                message:
                    'Token and password are required',
            });
        }

        if (
            typeof password !==
            'string' ||
            password.length < 8
        ) {
            return res.status(400).json({
                message:
                    'Password must be at least 8 characters',
            });
        }

        try {
            const tokenHash =
                hashToken(token);

            const user =
                await User.findOne({
                    where: {
                        resetTokenHash:
                            tokenHash,
                    },
                });

            if (
                !user ||
                !user.resetTokenExpires ||
                user.resetTokenExpires.getTime() <
                Date.now()
            ) {
                return res.status(400).json({
                    message:
                        'Invalid or expired token',
                });
            }

            if (user.reset_otp_attempts !== undefined && user.reset_otp_attempts >= 5) {
                return res.status(400).json({ message: 'Reset challenge expired or invalid' });
            }
            user.reset_otp_attempts = (user.reset_otp_attempts || 0) + 1;
            if (!user.reset_otp_hash || !constantMatch(user.reset_otp_hash, codeHash(user.id, 'reset_password', otp))) {
                await user.save({ validate: false });
                return res.status(400).json({ message: 'Reset challenge expired or invalid' });
            }
            user.reset_otp_hash = null;
            user.auth_version = (user.auth_version || 0) + 1;
            // User model hook hashes the password.
            user.password =
                password;

            user.resetTokenHash =
                null;

            user.resetTokenExpires =
                null;

            await user.save();
            await audit(req, 'PASSWORD_RESET', user.id);
            void sendMail(user.email, 'PayVerify password changed', '<p>Your PayVerify password was reset. If this was not you, contact support immediately.</p>').catch(console.error);
            return res.status(200).json({
                message:
                    'Password has been reset successfully',
            });
        } catch (err) {
            console.error(
                'Password reset failed:',
                err instanceof Error
                    ? err.message
                    : 'Unknown password reset error'
            );

            return res.status(500).json({
                message:
                    'Failed to reset password',
            });
        }
    };

/* =========================================================================
 * POST /api/auth/change-password
 *
 * JWT protected by authRoutes.
 * ========================================================================= */

export const changePassword =
    async (
        req: Request,
        res: Response
    ) => {
        try {
            const authUser =
                req.user as
                | {
                    id?: number;
                }
                | undefined;

            if (!authUser?.id) {
                return res.status(401).json({
                    message:
                        'Unauthorized',
                });
            }

            const currentPassword =
                req.body
                    ?.currentPassword;

            const newPassword =
                req.body
                    ?.newPassword;

            if (
                !currentPassword ||
                !newPassword
            ) {
                return res.status(400).json({
                    message:
                        'Current and new passwords are required',
                });
            }

            if (
                typeof newPassword !==
                'string' ||
                newPassword.length < 8
            ) {
                return res.status(400).json({
                    message:
                        'New password must be at least 8 characters',
                });
            }

            const user =
                await User.findByPk(
                    authUser.id
                );

            if (!user) {
                return res.status(404).json({
                    message:
                        'User not found',
                });
            }

            const validPassword =
                await bcrypt.compare(
                    currentPassword,
                    user.password_hash
                );

            if (!validPassword) {
                return res.status(401).json({
                    message:
                        'Current password is incorrect',
                });
            }

            // User model hook hashes the new password.
            user.password =
                newPassword;

            await user.save();

            return res.status(200).json({
                message:
                    'Password changed successfully',
            });
        } catch (err) {
            console.error(
                'Password change failed:',
                err instanceof Error
                    ? err.message
                    : 'Unknown password change error'
            );

            return res.status(500).json({
                message:
                    'Failed to change password',
            });
        }
    };
export const verifyRegistrationEmail = async (
    req: Request,
    res: Response
) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const code = String(req.body?.otp || '').trim();

        if (!email || !/^\d{6}$/.test(code)) {
            return res.status(400).json({
                message: 'Enter your email and six-digit verification code.',
            });
        }

        const user = await User.findOne({ where: { email } });

        if (!user || user.email_verified_at) {
            return res.status(400).json({
                message: 'Invalid verification request. If already verified, please log in.',
            });
        }

        const merchant = await Merchant.findOne({
            where: { userId: user.id },
        });

        // Check signing configuration before consuming the code.
        getJwtSecret();

        const verified = await consumeChallenge(
            user.id,
            'verify_email',
            code
        );

        if (!verified) {
            return res.status(400).json({
                message: 'Invalid or expired verification code.',
            });
        }

        user.email_verified_at = new Date();

        await user.save({
            fields: ['email_verified_at'],
            validate: false,
            hooks: false,
        });

        const sessionUser = {
            id: user.id,
            email: user.email,
            name: merchant?.name || 'Merchant',
            role: user.role,
        };

        const token = signJWT({
            ...sessionUser,
            authVersion: user.auth_version || 0,
        });

        await audit(req, 'EMAIL_VERIFIED', user.id);
        void alertLogin(
            req,
            user.id,
            user.email,
            user.role.toLowerCase() === 'admin'
                ? 'Admin'
                : (merchant?.name || 'Merchant')
        );

        return res.json({
            message: 'Email verified successfully.',
            token,
            user: sessionUser,
        });
    } catch (error) {
        console.error(
            'Email verification failed:',
            error instanceof Error ? error.message : 'Unknown error'
        );

        return res.status(500).json({
            message: 'Unable to verify email. Please try again.',
        });
    }
};


export const resendRegistrationOtp = async (
    req: Request,
    res: Response
) => {
    try {
        const email = normalizeEmail(req.body?.email);

        const user = await User.findOne({
            where: { email },
        });

        if (user && !user.email_verified_at) {
            const code = await issueChallenge(user.id, 'verify_email');

            await sendMail(
                user.email,
                'PayVerify verification code',
                `<p>Your new code: <strong>${code}</strong>.</p>
                 <p>Expires in 10 minutes.</p>`
            );
        }

        return res.json({
            message: 'If verification is pending, a new code has been sent.',
        });
    } catch (error) {
        console.error(
            'OTP resend failed:',
            error instanceof Error ? error.message : 'Unknown error'
        );

        return res.status(503).json({
            message: 'Unable to send verification code. Please try again later.',
        });
    }
};