// src/services/emailService.ts
// -----------------------------------------------------------------------------
// Purpose
// - Centralized SendGrid helpers for transactional emails.
//
// What changed & why (this update)
// - ✅ Added ADMIN_BCC support via a new low-level sender `sendMailWithBcc(...)`
//   that uses SendGrid personalizations to hide admin emails from primary
//   recipients. This lets us silently copy admins on bank registrations.
// - ✅ Added `sendConfirmationEmailWithAdminBcc(...)` which mirrors the flexible
//   overloads of your existing `sendConfirmationEmail(...)` but BCCs admins.
// - ✅ Kept all existing exports and overload signatures (non-breaking).
// - 🛡️ Kept defensive env handling + audit logs.
// - 🧹 Fixed TS2323: `sendMail` is exported exactly once (we removed any
//   redundant `export { sendMail }` footer to avoid "Cannot redeclare" errors).
// -----------------------------------------------------------------------------

import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { Merchant } from '../models/Merchant';
import { createAuditLog } from './auditService';

// ---- SendGrid configuration --------------------------------------------------
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL =
    process.env.NOTIFY_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@payverify.ng';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'PayVerify';

// NEW: Admin BCC list for silent copies (e.g., bank registration received)
const ADMIN_BCC = (process.env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

if (!SENDGRID_API_KEY) {
    // Don’t crash the server at boot; controller can still catch send failures.
    console.warn('[emailService] SENDGRID_API_KEY is not set. Emails will not be sent.');
} else {
    sgMail.setApiKey(SENDGRID_API_KEY);
}

if (!process.env.NOTIFY_FROM_EMAIL && !process.env.SENDGRID_FROM_EMAIL) {
    console.warn('[emailService] FROM email is not set (NOTIFY_FROM_EMAIL / SENDGRID_FROM_EMAIL).');
}

// ---- Types -------------------------------------------------------------------
export type EmailExtras = {
    verifyUrl?: string;
    maskedAccount?: string;
    bankName?: string;
    cacNumber?: string;
    subject?: string;
};

export type ConfirmationEmailOptions = {
    to: string;
    subject?: string;
    title?: string;
    body?: string;
    ctaUrl?: string;
    ctaLabel?: string;
};

// ---- Helpers -----------------------------------------------------------------
function maskAccount(raw?: string | null): string {
    if (!raw) return '';
    const s = String(raw);
    return s.length >= 4 ? '****' + s.slice(-4) : '****';
}

/**
 * Base sender for typical one-to-one emails.
 * NOTE: Exported exactly once to avoid TS2323 duplicate export errors.
 */
export async function sendMail(to: string, subject: string, html: string) {
    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY is not set');
    const msg: MailDataRequired = {
        to,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        html,
    };
    await sgMail.send(msg);
}

/**
 * NEW: Low-level sender that supports BCC via SendGrid personalizations.
 * - Keeps admin emails hidden from primary recipients.
 * - Internal helper; callers should prefer the higher-level wrappers.
 */
async function sendMailWithBcc(
    to: string | string[],
    subject: string,
    html: string,
    bcc?: string[]
) {
    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY is not set');

    const toArray = Array.isArray(to) ? to : [to];
    const bccArray = (bcc ?? []).filter(Boolean);

    const msg: MailDataRequired = {
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        html,
        // IMPORTANT: Use personalizations so BCCs are hidden from the "to" field.
        personalizations: [
            {
                to: toArray.map(email => ({ email })),
                ...(bccArray.length ? { bcc: bccArray.map(email => ({ email })) } : {}),
            },
        ],
    };

    await sgMail.send(msg);
}

// Build HTML for merchant QR email (unchanged)
function buildMerchantQrHtml(params: {
    businessName: string;
    cacNumber?: string;
    bankName?: string;
    maskedAccount?: string;
    qrUrl: string;
    verifyUrl?: string;
}) {
    const { businessName, cacNumber, bankName, maskedAccount, qrUrl, verifyUrl } = params;

    const verifyCta = verifyUrl
        ? `
    <p style="text-align:center;margin:16px 0 8px;">
      <a href="${verifyUrl}"
         style="display:inline-block;background:#2a7bff;color:#fff;text-decoration:none;
                padding:12px 18px;border-radius:10px;font-weight:800;">
        View / Verify Merchant
      </a>
    </p>`
        : '';

    return `
  <div style="font-family: Arial, sans-serif; padding: 20px; color:#1b1f2a;">
    <h2 style="margin:0 0 10px;">Hello ${businessName},</h2>
    <p style="margin:0 0 12px;">Welcome to <strong>PayVerify</strong> 🎉</p>
    <p style="margin:0 0 12px;">Your merchant has been created successfully. Your unique QR code is ready.</p>

    <table style="width:100%;max-width:520px;border-collapse:collapse;margin:18px 0;">
      <tr>
        <td style="padding:6px 0;font-weight:700;">Business</td>
        <td style="padding:6px 0;">${businessName}</td>
      </tr>
      ${cacNumber
            ? `
      <tr>
        <td style="padding:6px 0;font-weight:700;">CAC</td>
        <td style="padding:6px 0;">${cacNumber}</td>
      </tr>`
            : ''}
      ${bankName
            ? `
      <tr>
        <td style="padding:6px 0;font-weight:700;">Bank</td>
        <td style="padding:6px 0;">${bankName}</td>
      </tr>`
            : ''}
      ${maskedAccount
            ? `
      <tr>
        <td style="padding:6px 0;font-weight:700;">Account</td>
        <td style="padding:6px 0;">${maskedAccount}</td>
      </tr>`
            : ''}
    </table>

    <p style="margin:10px 0 6px;">Scan or share this QR code for instant verification:</p>
    <div style="text-align:center; margin-top: 10px;">
      <img src="${qrUrl}" alt="Merchant QR Code"
           style="max-width: 260px; width:100%; height:auto; border:1px solid #eee; border-radius:8px;" />
    </div>

    ${verifyCta}

    <p style="margin-top: 18px;">If you have any questions, reach us at <a href="mailto:support@payverify.ng">support@payverify.ng</a>.</p>
    <p style="font-size: 12px; color: #6b7280; margin-top:12px;">Verified by PayVerify Nigeria.</p>
  </div>
  `;
}

// Build HTML for generic confirmation emails (unchanged)
function buildConfirmationHtml(params: {
    title: string;
    body: string;
    ctaUrl?: string;
    ctaLabel?: string;
}) {
    const { title, body, ctaUrl, ctaLabel = 'Open' } = params;
    const cta = ctaUrl
        ? `
    <p style="text-align:center;margin:16px 0 8px;">
      <a href="${ctaUrl}" style="display:inline-block;background:#2a7bff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:800;">
        ${ctaLabel}
      </a>
    </p>`
        : '';
    return `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color:#333; margin: 0 0 8px;">${title}</h2>
    <p style="margin: 0 0 14px;">${body}</p>
    ${cta}
    <p style="margin-top: 16px;">If you did not request this, please ignore this email.</p>
    <p style="font-size: 12px; color: #888; margin-top: 10px;">PayVerify Nigeria</p>
  </div>
  `;
}

// -----------------------------------------------------------------------------
// QR email used after merchant creation (unchanged)
// -----------------------------------------------------------------------------
export async function sendQrEmail(
    merchantId: number,
    qrUrl: string,
    extras: EmailExtras = {}
): Promise<void> {
    // 1) Load merchant
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(`Merchant with ID ${merchantId} not found.`);
    if (!merchant.email) throw new Error(`Merchant with ID ${merchantId} has no email address.`);

    // 2) Derive fields (allow overrides from extras)
    const maskedAccount = extras.maskedAccount ?? maskAccount(merchant.account_number);
    const bankName = extras.bankName ?? merchant.bank_name ?? '';
    const cacNumber = extras.cacNumber ?? merchant.cac_number ?? '';
    const verifyUrl = extras.verifyUrl;

    // 3) Build & send
    const html = buildMerchantQrHtml({
        businessName: merchant.name,
        cacNumber,
        bankName,
        maskedAccount,
        qrUrl,
        verifyUrl,
    });

    try {
        await sendMail(merchant.email, extras.subject || 'Your PayVerify Merchant & QR Code are ready', html);

        await createAuditLog({
            action: 'EMAIL_QR_SENT',
            entity: 'Merchant',
            performedBy: 'system',
            metadata: { merchantId, email: merchant.email, qrUrl, verifyUrl, maskedAccount, bankName, cacNumber },
        });
    } catch (error: any) {
        console.error('[emailService] Failed to send QR email:', error?.response?.body || error?.message || error);
        throw new Error('Failed to send QR code email');
    }
}

// -----------------------------------------------------------------------------
// Generic confirmation email (kept with all existing overloads)
// -----------------------------------------------------------------------------
export async function sendConfirmationEmail(to: string, link?: string): Promise<void>;
export async function sendConfirmationEmail(to: string, subject: string, body?: string): Promise<void>;
export async function sendConfirmationEmail(
    to: string,
    subject: string,
    body: string | undefined,
    ctaUrl: string
): Promise<void>;
export async function sendConfirmationEmail(
    to: string,
    subject: string,
    body: string | undefined,
    ctaUrl: string,
    ctaLabel: string
): Promise<void>;
export async function sendConfirmationEmail(options: ConfirmationEmailOptions): Promise<void>;
export async function sendConfirmationEmail(
    arg1: string | ConfirmationEmailOptions,
    arg2?: string,
    arg3?: string,
    arg4?: string,
    arg5?: string
): Promise<void> {
    try {
        let to: string;
        let subject = 'Your PayVerify action is confirmed';
        let title = 'Action Confirmed';
        let body = 'Your request has been completed successfully.';
        let ctaUrl: string | undefined;
        let ctaLabel = 'Open';

        if (typeof arg1 === 'string') {
            // positional
            to = arg1;

            if (arg2 && !arg3 && /^https?:\/\//i.test(arg2)) {
                // (to, link)
                ctaUrl = arg2;
            } else if (arg2 && !/^https?:\/\//i.test(arg2)) {
                // (to, subject, body?, ctaUrl?, ctaLabel?)
                subject = arg2;
                if (arg3) body = arg3;
                if (arg4) ctaUrl = arg4;
                if (arg5) ctaLabel = arg5;
            } else if (arg2) {
                // (to, subject)
                subject = arg2;
            }
        } else {
            // options
            to = arg1.to;
            subject = arg1.subject ?? subject;
            title = arg1.title ?? title;
            body = arg1.body ?? body;
            ctaUrl = arg1.ctaUrl ?? ctaUrl;
            ctaLabel = arg1.ctaLabel ?? ctaLabel;
        }

        const html = buildConfirmationHtml({ title, body, ctaUrl, ctaLabel });
        await sendMail(to, subject, html);

        await createAuditLog({
            action: 'EMAIL_CONF_SENT',
            entity: 'System',
            performedBy: 'system',
            metadata: { to, subject, hasCta: !!ctaUrl },
        });
    } catch (error: any) {
        console.error('[emailService] Failed to send confirmation email:', error?.response?.body || error?.message || error);
        throw new Error('Failed to send confirmation email');
    }
}

// -----------------------------------------------------------------------------
// NEW: confirmation email that silently BCCs admins (mirrors overload behavior)
// -----------------------------------------------------------------------------
export async function sendConfirmationEmailWithAdminBcc(
    toOrOptions: string | ConfirmationEmailOptions,
    subject?: string,
    body?: string,
    ctaUrl?: string,
    ctaLabel?: string
): Promise<void> {
    try {
        // Resolve args using the same semantics as sendConfirmationEmail
        let to: string;
        let _subject = 'Your PayVerify action is confirmed';
        let title = 'Action Confirmed';
        let _body = 'Your request has been completed successfully.';
        let _ctaUrl: string | undefined;
        let _ctaLabel = 'Open';

        if (typeof toOrOptions === 'string') {
            to = toOrOptions;
            if (subject && !body && /^https?:\/\//i.test(subject)) {
                _ctaUrl = subject;
            } else if (subject && !/^https?:\/\//i.test(subject)) {
                _subject = subject;
                if (body) _body = body;
                if (ctaUrl) _ctaUrl = ctaUrl;
                if (ctaLabel) _ctaLabel = ctaLabel;
            } else if (subject) {
                _subject = subject;
            }
        } else {
            to = toOrOptions.to;
            _subject = toOrOptions.subject ?? _subject;
            title = toOrOptions.title ?? title;
            _body = toOrOptions.body ?? _body;
            _ctaUrl = toOrOptions.ctaUrl ?? _ctaUrl;
            _ctaLabel = toOrOptions.ctaLabel ?? _ctaLabel;
        }

        const html = buildConfirmationHtml({ title, body: _body, ctaUrl: _ctaUrl, ctaLabel: _ctaLabel });

        // Send ONE message to the bank and silently copy admins
        await sendMailWithBcc(to, _subject, html, ADMIN_BCC);

        await createAuditLog({
            action: 'EMAIL_CONF_SENT_BCC',
            entity: 'System',
            performedBy: 'system',
            metadata: { to, subject: _subject, hasCta: !!_ctaUrl, bccCount: ADMIN_BCC.length },
        });
    } catch (error: any) {
        console.error('[emailService] Failed to send confirmation email (BCC):', error?.response?.body || error?.message || error);
        throw new Error('Failed to send confirmation email (admin BCC)');
    }
}

// NOTE: Do NOT re-export `sendMail` at the bottom; it's already exported above.
// export { sendMail }; // ❌ removing this avoids TS2323 "Cannot redeclare" errors.



