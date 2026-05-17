// src/controllers/authController.ts

import { Request, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken'; // ✅ typed import so sign() overload resolves correctly
import type { StringValue } from 'ms'; // ✅ lets us pass '1h' | '7d' etc. to expiresIn
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { sequelize } from '../config/db';
import { User } from '../models/User';
import { Merchant } from '../models/Merchant';

/* =========================================================================
 * JWT configuration
 * - CHANGED: typed JWT_SECRET as `Secret` so TS picks the correct overload.
 * - CHANGED: wrapped jwt.sign in `signJWT` with typed `expiresIn` (StringValue|number).
 * ========================================================================= */
const JWT_SECRET: Secret = (process.env.JWT_SECRET ?? 'defaultsecret') as Secret;

const signJWT = (
    payload: string | object | Buffer,
    expiresIn: StringValue | number = '1h'
) => {
    const options: SignOptions = { expiresIn };
    return jwt.sign(payload, JWT_SECRET, options);
};

/* =========================================================================
 * SendGrid helper (safe no-op if not configured)
 * - CHANGED: email sending returns boolean and never throws up the stack.
 * ========================================================================= */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const key = process.env.SENDGRID_API_KEY;
    const from = process.env.NOTIFY_FROM_EMAIL;
    if (!key || !from) {
        console.warn('Email not sent: SENDGRID_API_KEY or NOTIFY_FROM_EMAIL missing');
        return false;
    }
    try {
        sgMail.setApiKey(key);
        await sgMail.send({ to, from, subject, html });
        return true;
    } catch (e: any) {
        console.error('SendGrid error:', e?.response?.body || e?.message || e);
        return false;
    }
}

/* =========================================================================
 * Reset token hashing (store only a hash in DB)
 * ========================================================================= */
const hashToken = (token: string) =>
    crypto.createHash('sha256').update(token).digest('hex');

/* =========================================================================
 * POST /api/auth/register
 * Registers USER + MERCHANT in a transaction.
 * - Why hash here? This path is simple, so we hash immediately with bcryptjs.
 * - Returns a JWT (1h) including merchant name for convenience in the UI.
 * - Sends a welcome email if SendGrid is configured (non-blocking).
 * ========================================================================= */
export const register = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            name,
            email,
            password,
            role,
            cac_number,
            tin_number,
            bvn,
            account_number,
            bank_name,
        } = req.body;

        if (!name || !email || !password || !cac_number || !account_number || !bank_name) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ where: { email }, transaction });
        if (existingUser) {
            await transaction.rollback();
            return res.status(409).json({ message: 'User already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        // 1) Create user
        const newUser = await User.create(
            { email, password_hash, role: role || 'merchant' },
            { transaction }
        );

        // 2) Create merchant
        //const merchant = await Merchant.create(
        //    {
        //        name,
        //        cac_number,
        //        tin_number,
        //        bvn,
        //        account_number,
        //        bank_name,
        //        userId: newUser.id,
        //    },
        //    { transaction }
        //);

        // Generate a UNIQUE CAC for dev/testing ONLY
        //const generatedCAC = `CAC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        //const merchant = await Merchant.create(
        //    {
        //        name,
        //        cac_number: cac_number || generatedCAC, // ✅ fallback if missing
        //        tin_number,
        //        bvn,
        //        account_number,
        //        bank_name,
        //        userId: newUser.id,
        //    },
        //    { transaction }
        //);

        // ======================================================
        // FIX: Ensure CAC is NEVER "N/A" or duplicate
        // ======================================================

        // Treat invalid CAC values ("N/A", empty, null)
        const isInvalidCAC =
            !cac_number ||
            cac_number === "N/A" ||
            cac_number.trim() === "";

        // Generate fallback ONLY if invalid
        const finalCAC = isInvalidCAC
            ? `CAC-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            : cac_number;

        const merchant = await Merchant.create(
            {
                name,
                cac_number: finalCAC, // ✅ ALWAYS SAFE + UNIQUE
                tin_number,
                bvn,
                account_number,
                bank_name,
                userId: newUser.id,
            },
            { transaction }
        );

        await transaction.commit();

        // 3) Issue JWT
        const token = signJWT({
            id: newUser.id,
            email: newUser.email,
            name: merchant.name,
            role: newUser.role,
        });

        // Optional: welcome email (does not block success)
        void sendEmail(
            email,
            'Welcome to PayVerify 🎉',
            `
        <h1>Welcome to PayVerify!</h1>
        <p>Your account has been created successfully.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">Log in</a> to get started.</p>
        <p>— The PayVerify Team</p>
      `
        );

        return res.status(201).json({
            message: 'User and merchant registered successfully',
            token,
        });
    } catch (err) {
        console.error('Registration error, rolling back:', err);
        await transaction.rollback();
        return res.status(500).json({ message: 'Server error during registration' });
    }
};

/* =========================================================================
 * POST /api/auth/login
 * Verifies credentials and returns a JWT with merchant name.
 * ========================================================================= */
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

        const merchant = await Merchant.findOne({ where: { userId: user.id } });
        const merchantName = merchant?.name || 'Merchant';

        const token = signJWT({
            id: user.id,
            email: user.email,
            name: merchantName,
            role: user.role,
        });

        return res.json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error during login' });
    }
};

/* =========================================================================
 * GET /api/auth/me
 * Returns the decoded JWT payload (set by verifyJwtMiddleware).
 * ========================================================================= */
export const me = (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    return res.json(req.user);
};

/* =========================================================================
 * NEW: POST /api/auth/forgot-password
 * - Always returns 200 to avoid email enumeration.
 * - If the user exists, generates a token (RAW), stores SHA-256 hash + 1h expiry,
 *   and emails a link to /reset-password?token=RAW.
 * ========================================================================= */
export const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const user = await User.findOne({ where: { email } });

        // Generic response either way
        const generic = { message: 'If that email exists, a reset link has been sent.' };
        if (!user) return res.status(200).json(generic);

        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetTokenHash = hashToken(rawToken);
        user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
        await user.save({ validate: false });

        const base = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${base}/reset-password?token=${rawToken}`;

        await sendEmail(
            email,
            'Reset your PayVerify password',
            `
        <h2>Reset your password</h2>
        <p>We received a request to reset your PayVerify password.</p>
        <p><a href="${resetUrl}">Click here to reset</a>. This link expires in 1 hour.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `
        );

        return res.status(200).json(generic);
    } catch (err) {
        console.error('forgotPassword error:', err);
        // Still hide existence of accounts
        return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    }
};

/* =========================================================================
 * NEW: POST /api/auth/reset-password
 * Body: { token, password }
 * - Validates token by hashing and comparing, and checks expiry.
 * - Sets new password via model hook: assign user.password, then save().
 * - Clears token fields to enforce one-time use.
 * ========================================================================= */
export const resetPassword = async (req: Request, res: Response) => {
    const { token, password } = req.body || {};
    if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
    }
    if (String(password).length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    try {
        const tokenHash = hashToken(token);
        const user = await User.findOne({ where: { resetTokenHash: tokenHash } });

        if (!user || !user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.password = password; // model hook (beforeValidate) will hash into password_hash
        user.resetTokenHash = null;
        user.resetTokenExpires = null;

        await user.save();

        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('resetPassword error:', err);
        return res.status(500).json({ message: 'Failed to reset password' });
    }
};

/* =========================================================================
 * NEW: POST /api/auth/change-password   (JWT-protected)
 * Body: { currentPassword, newPassword }
 * - Validates current password, then sets new one via the model hook.
 * ========================================================================= */
export const changePassword = async (req: Request, res: Response) => {
    try {
        const authUser = req.user as { id?: number } | undefined;
        if (!authUser?.id) return res.status(401).json({ message: 'Unauthorized' });

        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        if (String(newPassword).length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }

        const user = await User.findByPk(authUser.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const ok = await bcrypt.compare(currentPassword, user.password_hash);
        if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

        user.password = newPassword; // hashed by model hook
        await user.save();

        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('changePassword error:', err);
        return res.status(500).json({ message: 'Failed to change password' });
    }
};
