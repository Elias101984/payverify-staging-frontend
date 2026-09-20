import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Bank from '../models/Bank';

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
};

// Narrow type for what we expect to decode.
type DecodedToken = {
    role?: string;
    bankId?: number;
    id?: number;         // legacy
    sub?: string;        // e.g. "bank:123"
    email?: string;
    iat?: number;
    exp?: number;
};

/**
 * Authenticate bank via Bearer JWT.
 * - Accepts multiple historical token shapes and extracts a bankId reliably.
 * - Loads the Bank to ensure it exists and to get fresh status.
 * - Attaches a lightweight context to req.bank.
 * - Puts a normalized payload on req.user to avoid TS shape errors.
 */
export const authenticateBank = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.slice(7);

    try {
        const payload = jwt.verify(token, getJwtSecret()) as DecodedToken;

        // Resolve bankId from several possible places
        let bankId = payload.bankId;
        if (!bankId && typeof payload.id === 'number') bankId = payload.id;
        if (!bankId && typeof payload.sub === 'string' && payload.sub.startsWith('bank:')) {
            const maybe = Number(payload.sub.split(':')[1]);
            if (!Number.isNaN(maybe)) bankId = maybe;
        }

        if (!bankId) {
            return res.status(403).json({ message: 'Forbidden: invalid bank token' });
        }

        // If a role exists, require it to be 'bank'
        if (payload.role && payload.role !== 'bank') {
            return res.status(403).json({ message: 'Forbidden: wrong role' });
        }

        const bank = await Bank.findByPk(bankId);
        if (!bank) return res.status(404).json({ message: 'Bank not found' });

        // Attach a lightweight context (no external type import to avoid conflicts)
        req.bank = {
            id: bank.id,
            email: bank.contactEmail,
            status: bank.status as 'Pending' | 'Active' | 'Rejected'
        } as any;

        // Normalize the user payload so it always satisfies any optional Request.user shape
        req.user = {
            role: payload.role ?? 'bank',
            bankId,
            id: typeof payload.id === 'number' ? payload.id : undefined,
            sub: typeof payload.sub === 'string' ? payload.sub : undefined,
            email: typeof payload.email === 'string' ? payload.email : bank.contactEmail,
            iat: payload.iat,
            exp: payload.exp
        } as any;

        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

/**
 * Require the authenticated bank to be Active.
 * Call this AFTER authenticateBank in your routes.
 */
export const requireActiveBank = (req: Request, res: Response, next: NextFunction) => {
    if (!req.bank) return res.status(401).json({ message: 'Unauthorized' });
    if ((req.bank as any).status !== 'Active') {
        return res.status(403).json({ message: `Bank status is ${(req.bank as any).status}` });
    }
    next();
};
