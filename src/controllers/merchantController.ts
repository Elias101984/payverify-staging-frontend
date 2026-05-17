// src/controllers/merchantController.ts
// -----------------------------------------------------------------------------
// Merchant Controller
// -----------------------------------------------------------------------------
// Endpoints:
// - GET  /api/merchants/:id     → fetch single merchant by id
// - GET  /api/merchants         → fetch all merchants
// - GET  /api/merchants/count   → count merchants (self/all)
// - POST /api/merchants         → create merchant, generate + upload QR, email
//
// Design (per your requirements):
// - `userId` is supplied by the CLIENT in the request body (core logic).
// - TIN, BVN, and Email are REQUIRED (non-null) and validated.
// - QR token (JWT) is signed with QR_SECRET (30m). QR image uploaded to Cloudinary.
// - Email is sent via SendGrid after creation with masked account number.
//
// ENV expected:
// - QR_SECRET=...                (JWT signing for QR)
// - FRONTEND_URL=http://...      (used to build verify URL in QR)
// - SENDGRID_API_KEY=...         (email)
// - NOTIFY_FROM_EMAIL=...        (or SENDGRID_FROM_EMAIL)
// -----------------------------------------------------------------------------

import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { uploadToCloudinary } from '../utils/cloudinaryUploader';
import { sendQrEmail } from '../services/emailService';

// -----------------------------------------------------------------------------
// GET /api/merchants/:id
// Guard id so '/count' can never fall through here.
// -----------------------------------------------------------------------------
export const getMerchantById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ message: 'Invalid id' });
        }

        const merchant = await Merchant.findByPk(id);
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        return res.status(200).json(merchant);
    } catch (error) {
        console.error('Error fetching merchant by ID:', error);
        return res.status(500).json({ message: 'Failed to fetch merchant' });
    }
};

// -----------------------------------------------------------------------------
// GET /api/merchants
// (Unscoped list; add WHERE userId=... if you want to scope by user.)
// -----------------------------------------------------------------------------
export const getAllMerchants = async (_req: Request, res: Response) => {
    try {
        const merchants = await Merchant.findAll();
        return res.status(200).json(merchants);
    } catch (error) {
        console.error('Error fetching merchants:', error);
        return res.status(500).json({ message: 'Failed to fetch merchants' });
    }
};

// -----------------------------------------------------------------------------
// GET /api/merchants/count?scope=self|all
// - self (default): counts only current user's merchants (requires req.user.id)
// - all           : counts all merchants
// -----------------------------------------------------------------------------
export const getMerchantCount = async (req: Request, res: Response) => {
    try {
        const scope = String(req.query.scope || 'self').toLowerCase();
        const authUserId = Number((req as any)?.user?.id ?? (req as any)?.userId);

        if (scope !== 'all') {
            if (!authUserId) {
                return res.status(401).json({ message: 'Unauthorized: no user in request' });
            }
            const count = await Merchant.count({ where: { userId: authUserId } });
            return res.json({ count });
        }

        const count = await Merchant.count();
        return res.json({ count });
    } catch (err) {
        console.error('getMerchantCount error:', err);
        return res.status(500).json({ message: 'Failed to count merchants' });
    }
};

    // ----------------------------------------------------------------------------------
    // GET CURRENT USER'S MERCHANT
    // WHY:
    // - Resolve merchantId from userId
    // - Needed for PurchaseOrder creation
    // ----------------------------------------------------------------------------------

    export const getMyMerchant = async (req: any, res: any) => {
        try {
            const userId = req.user.id;

            const merchant = await Merchant.findOne({
                where: { userId }
            });

            if (!merchant) {
                return res.status(404).json({
                    message: "Merchant not found for this user"
                });
            }

            return res.json(merchant);

        } catch (error) {
            console.error("getMyMerchant error:", error);
            return res.status(500).json({
                message: "Failed to fetch merchant"
            });
        }
    };

// -----------------------------------------------------------------------------
// POST /api/merchants
// Creates a new merchant, generates a QR code, uploads it, stores references,
// and emails the merchant their QR + details.
// -----------------------------------------------------------------------------
export const createMerchant = async (req: Request, res: Response) => {
    const {
        name,
        userId,            // ← required from client (your core logic)
        cac_number,
        tin_number,
        bvn,
        account_number,
        bank_name,
        email,             // ← required
    } = req.body;

    // 1) Validate presence
    if (!name || !userId || !cac_number || !tin_number || !bvn || !account_number || !bank_name || !email) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // 1b) Validate format
    if (!/^\d{11}$/.test(String(bvn))) {
        return res.status(400).json({ message: 'Invalid BVN (must be 11 digits)' });
    }
    if (!/^\d{10}$/.test(String(account_number))) {
        return res.status(400).json({ message: 'Invalid account number (must be 10 digits)' });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email))) {
        return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!/^[A-Za-z0-9\-\/]{8,14}$/.test(String(tin_number))) {
        return res.status(400).json({ message: 'Invalid TIN (8–14 chars; letters/digits allowed)' });
    }

    try {
        // 2) Ensure user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found for given userId' });
        }

        // 3) Enforce unique CAC
        const existingMerchant = await Merchant.findOne({ where: { cac_number } });
        if (existingMerchant) {
            return res.status(409).json({ message: 'CAC number must be unique' });
        }

        // 4) Create merchant
        const newMerchant = await Merchant.create({
            name,
            userId,
            cac_number,
            tin_number,
            bvn,
            account_number,
            bank_name,
            email,
        });

        // 5) Build QR payload (mask account number)
        const maskedAccount = '****' + String(account_number).slice(-4);
        const payload = {
            merchantId: newMerchant.id,
            businessName: name,
            accountNumber: maskedAccount,
            bankName: bank_name,
        };

        // 6) Ensure secret
        const secret = process.env.QR_SECRET;
        if (!secret) {
            throw new Error('QR_SECRET environment variable not set');
        }

        // 7) Sign QR token (30 min)
        const token = jwt.sign(payload, secret, { expiresIn: '30m' });

        // 8) Build verify URL
        const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${token}`;

        // 9) Generate QR PNG (encodes JSON payload + token + verifyUrl)
        const qrData = { ...payload, token, verifyUrl };
        let qrBuffer: Buffer;
        try {
            qrBuffer = await QRCode.toBuffer(JSON.stringify(qrData));
            // If you prefer to encode only the URL: qrBuffer = await QRCode.toBuffer(verifyUrl);
        } catch (qrError) {
            console.error('QR code generation failed:', qrError);
            return res.status(500).json({ message: 'Failed to generate QR code' });
        }

        // 10) Upload to Cloudinary
        let qrUrl: string;
        try {
            qrUrl = await uploadToCloudinary(qrBuffer, `qr-${newMerchant.id}-${Date.now()}`);
        } catch (cloudError) {
            console.error('Cloudinary upload failed:', cloudError);
            return res.status(500).json({ message: 'Failed to upload QR code' });
        }

        // 11) Persist QR fields
        newMerchant.qrToken = token;
        newMerchant.qrUrl = qrUrl;
        newMerchant.qrGeneratedAt = new Date();
        await newMerchant.save();

        // 12) Email merchant their QR (SendGrid)
        try {
            await sendQrEmail(newMerchant.id, qrUrl, {
                verifyUrl,
                maskedAccount,
                bankName: bank_name,
                cacNumber: cac_number,
            });
        } catch (mailErr) {
            // Don’t fail the whole request if email fails
            console.error('Warning: sendQrEmail failed:', mailErr);
        }

        // 13) Respond for client redirect to /merchant-created/:id
        return res.status(201).json({
            message: 'Merchant created with QR code',
            merchant: newMerchant,
            qr: { verifyUrl, qrUrl, token },
        });
    } catch (error: any) {
        console.error('Error creating merchant:', error);

        if (error?.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'CAC number must be unique' });
        }

        return res.status(500).json({ message: error?.message || 'Failed to create merchant' });
    }

};
