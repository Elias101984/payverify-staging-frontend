import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import { uploadToCloudinary } from '../utils/cloudinaryUploader';
import { UserJwtPayload } from '../types/express';

/**
 * POST /qr/generate
 * ------------------------------------------------------------------------------
 * Generates a secure QR code for a merchant based on the authenticated user.
 * Signs merchant and transaction data into a JWT, embeds it into a QR code,
 * uploads to Cloudinary, and responds with QR details and merchant info.
 */
export const generateQRCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as UserJwtPayload;

        if (!user?.id) {
            res.status(401).json({ message: 'Unauthorized user' });
            return;
        }

        const merchant = await Merchant.findOne({ where: { userId: user.id } });
        if (!merchant) {
            res.status(404).json({ message: 'Merchant not found' });
            return;
        }

        // Destructure incoming payload
        const { description, amount } = req.body;

        // Generate token payload
        const payload = {
            merchantId: merchant.id,
            businessName: merchant.name,
            accountNumber: '****' + merchant.account_number.slice(-4),
            bankName: merchant.bank_name,
            description,
            amount
        };

        // Sign payload into JWT
        const token = jwt.sign(payload, process.env.QR_SECRET!, { expiresIn: '30m' });

        // Construct verification URL
        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verifyUrl = `${frontendBase}/verify/${token}`;

        // Generate QR code image from token payload
        const qrData = { ...payload, token, verifyUrl };
        const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrData));
        const qrUrl = await uploadToCloudinary(qrBuffer, `qr-${merchant.id}-${Date.now()}`);

        // Update merchant with QR info
        merchant.qrUrl = qrUrl;
        merchant.qrToken = token;
        merchant.qrGeneratedAt = new Date();
        await merchant.save();

        // Respond with everything needed for frontend display
        res.status(201).json({
            qrUrl,
            verifyUrl,
            token,
            businessName: merchant.name,
            accountNumber: merchant.account_number,
            bankName: merchant.bank_name,
            amount,
            description
        });
    } catch (err) {
        console.error('QR generation failed', err);
        res.status(500).json({ message: 'QR generation failed' });
    }
};

/**
 * POST /qr/regenerate
 * ------------------------------------------------------------------------------
 * Clears a merchant's old QR data and regenerates a new one.
 */
export const regenerateQRCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user as UserJwtPayload;

        if (!user?.id) {
            res.status(401).json({ message: 'Unauthorized user' });
            return;
        }

        const merchant = await Merchant.findOne({ where: { userId: user.id } });
        if (!merchant) {
            res.status(404).json({ message: 'Merchant not found' });
            return;
        }

        // Reset existing QR metadata
        merchant.qrToken = null;
        merchant.qrUrl = null;
        merchant.qrGeneratedAt = null;
        await merchant.save();

        // Generate fresh QR
        await generateQRCode(req, res);
    } catch (err) {
        console.error('QR regeneration failed', err);
        res.status(500).json({ message: 'QR regeneration failed' });
    }
};

/**
 * POST /qr/validate
 * ------------------------------------------------------------------------------
 * Verifies a scanned QR code token for validity and expiration.
 */
export const validateQRCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ message: 'Token is required' });
            return;
        }

        const decoded = jwt.verify(token, process.env.QR_SECRET!) as object;
        res.status(200).json({ valid: true, data: decoded });
    } catch (err) {
        console.error('QR validation error', err);
        res.status(401).json({ valid: false, message: 'Invalid or expired token' });
    }
};

/**
 * GET /qr/download/:merchantId
 * ------------------------------------------------------------------------------
 * Redirects the client to the QR image hosted on Cloudinary.
 *
 * TYPESCRIPT / RENDER BUILD FIX:
 * - Express may type req.params.merchantId as string | string[].
 * - parseInt() requires a single string.
 * - Normalize the route parameter before parsing.
 *
 * This resolves the Render production TypeScript compilation error.
 */
export const downloadQRCode = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        // Normalize merchantId from string | string[] to a single string.
        const merchantIdParam = Array.isArray(req.params.merchantId)
            ? req.params.merchantId[0]
            : req.params.merchantId;

        // Convert the route parameter to a numeric merchant ID.
        const merchantId = parseInt(merchantIdParam, 10);

        // Validate the ID before querying Sequelize.
        if (Number.isNaN(merchantId)) {
            res.status(400).json({
                message: 'Invalid merchant ID',
            });
            return;
        }

        const merchant = await Merchant.findByPk(merchantId);

        if (!merchant || !merchant.qrUrl) {
            res.status(404).json({
                message: 'QR not found',
            });
            return;
        }

        res.redirect(merchant.qrUrl);

    } catch (err) {
        console.error('QR download failed', err);

        res.status(500).json({
            message: 'QR download failed',
        });
    }
};