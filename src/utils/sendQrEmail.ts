// (same file where your current sendQrEmail lives)
// imports unchanged
import sgMail from '@sendgrid/mail';
import { Merchant } from '../models/Merchant';
import { createAuditLog } from '../services/auditService';

const sendGridApiKey = process.env.SENDGRID_API_KEY?.trim();
if (sendGridApiKey?.startsWith('SG.')) {
    sgMail.setApiKey(sendGridApiKey);
}

type EmailExtras = {
    verifyUrl?: string;
    maskedAccount?: string;
    bankName?: string;
    cacNumber?: string;
};

export const sendQrEmail = async (merchantId: number, qrUrl: string, extras: EmailExtras = {}) => {
    if (!sendGridApiKey?.startsWith('SG.')) {
        console.warn('SENDGRID_API_KEY is not configured; QR email skipped.');
        return;
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(`Merchant with ID ${merchantId} not found.`);
    if (!merchant.email) throw new Error(`Merchant with ID ${merchantId} has no email address.`);

    const maskedAccount = extras.maskedAccount ?? (merchant.account_number ? '****' + String(merchant.account_number).slice(-4) : '');
    const bankName = extras.bankName ?? merchant.bank_name ?? '';
    const cacNumber = extras.cacNumber ?? merchant.cac_number ?? '';
    const verifyUrl = extras.verifyUrl;

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #333;">Hello ${merchant.name},</h2>
      <p>Welcome to <strong>PayVerify</strong> 🎉</p>
      <p>Your merchant has been created successfully.</p>

      <table style="width:100%;max-width:520px;border-collapse:collapse;margin:18px 0;">
        <tr><td style="padding:6px 0;font-weight:700;">Business</td><td style="padding:6px 0;">${merchant.name}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">CAC</td><td style="padding:6px 0;">${cacNumber}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Bank</td><td style="padding:6px 0;">${bankName}</td></tr>
        <tr><td style="padding:6px 0;font-weight:700;">Account</td><td style="padding:6px 0;">${maskedAccount}</td></tr>
      </table>

      <p>Scan or share this QR code for fast verification:</p>
      <div style="text-align:center; margin-top: 16px;">
        <img src="${qrUrl}" alt="QR Code" style="max-width: 260px; width:100%; height:auto; border:1px solid #eee; border-radius:8px;" />
      </div>

      ${verifyUrl ? `
        <p style="margin-top:20px;">Or click the button below to view/verify details:</p>
        <p style="text-align:center;margin:16px 0 8px;">
          <a href="${verifyUrl}" style="display:inline-block;background:#2a7bff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:800;">
            View Merchant Details
          </a>
        </p>` : ''}

      <p style="margin-top: 20px;">For any questions, contact support@payverify.ng</p>
      <p style="font-size: 12px; color: #888;">Verified by PayVerify Nigeria.</p>
    </div>
  `;

    const msg = {
        to: merchant.email,
        from: process.env.SENDGRID_FROM_EMAIL!, // verified sender
        subject: 'Your PayVerify Merchant & QR Code are ready',
        html: htmlContent,
    };

    try {
        await sgMail.send(msg);
        await createAuditLog({
            action: 'EMAIL_QR_SENT',
            entity: 'Merchant',
            performedBy: 'system',
            metadata: { merchantId, email: merchant.email, qrUrl, verifyUrl, maskedAccount, bankName, cacNumber }
        });
    } catch (error: any) {
        console.error('Failed to send QR email:', error.response?.body || error.message);
        throw new Error('Failed to send QR code email');
    }
};
