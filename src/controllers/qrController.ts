import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { Request, Response } from 'express';
import { Merchant } from '../models/Merchant';
import { uploadToCloudinary } from '../utils/cloudinaryUploader';
import { UserJwtPayload } from '../types/express';

// ✅ NEW: SendGrid email integration
import sgMail from '@sendgrid/mail';
const sendGridApiKey = process.env.SENDGRID_API_KEY?.trim();
if (sendGridApiKey?.startsWith('SG.')) {
    sgMail.setApiKey(sendGridApiKey);
}

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

        const { description, amount } = req.body;

        const payload = {
            merchantId: merchant.id,
            businessName: merchant.name,
            accountNumber: '****' + merchant.account_number.slice(-4),
            bankName: merchant.bank_name,
            description,
            amount
        };

        const token = jwt.sign(payload, process.env.QR_SECRET!, { expiresIn: '30m' });

        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verifyUrl = `${frontendBase}/verify/${token}`;

        const qrData = { ...payload, token, verifyUrl };
        const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrData));
        const qrUrl = await uploadToCloudinary(qrBuffer, `qr-${merchant.id}-${Date.now()}`);

        merchant.qrUrl = qrUrl;
        merchant.qrToken = token;
        merchant.qrGeneratedAt = new Date();
        await merchant.save();

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

        merchant.qrToken = null;
        merchant.qrUrl = null;
        merchant.qrGeneratedAt = null;
        await merchant.save();

        await generateQRCode(req, res); // Reuse logic
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
 * - parseInt() only accepts a string.
 * - We normalize the route parameter to a single string before parsing it.
 * - We also validate the parsed ID before querying the database.
 *
 * This fixes:
 * TS2345: Argument of type 'string | string[]'
 * is not assignable to parameter of type 'string'.
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

        // Convert the normalized route parameter to a numeric merchant ID.
        const merchantId = parseInt(merchantIdParam, 10);

        // Reject an invalid merchant ID before querying the database.
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

/**
 * ✅ NEW: POST /qr/email
 * ------------------------------------------------------------------------------
 * Sends QR code to the merchant's registered email using SendGrid.
 * Added because the frontend MerchantCreatedPage needs this to complete AC3.
 */
export const emailQRCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { merchantId } = req.body;

        if (!merchantId) {
            res.status(400).json({ message: 'Merchant ID is required' });
            return;
        }

        const merchant = await Merchant.findByPk(merchantId);
        //const email = merchant.email;


        if (!merchant || !merchant.qrUrl || !merchant.email) {
            res.status(404).json({ message: 'Merchant or QR or email not found' });
            return;
        }

        const msg = {
            to: merchant.email,
            from: process.env.NOTIFY_FROM_EMAIL!,
            subject: 'Your PayVerify Merchant QR Code',
            html: `
                <p>Hello <strong>${merchant.name}</strong>,</p>
                <p>Your QR code has been successfully generated. You can use it to verify payments or transactions.</p>
                <p><img src="${merchant.qrUrl}" alt="QR Code" style="max-width: 300px;" /></p>
                <p>Thank you for using <strong>PayVerify</strong>.</p>
            `,
        };

        await sgMail.send(msg);
        res.status(200).json({ message: 'QR code emailed successfully' });
    } catch (err) {
        console.error('Email sending failed:', err);
        res.status(500).json({ message: 'Failed to send QR code email' });
    }
};
