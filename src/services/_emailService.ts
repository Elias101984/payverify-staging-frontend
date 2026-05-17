// =============================================================================
// emailService.ts (PAYVERIFY ELITE — RESEND VERSION)
// =============================================================================
// PURPOSE:
// - Send beautiful transactional emails via Resend
// - Used for invoice payment confirmations
// - Mobile responsive fintech-grade design
//
// FIXES IN THIS VERSION:
// ✅ sendPaymentFailedEmail properly exported (TS2305 FIX)
// ✅ removed illegal nested export
// ✅ added shared HTML helpers
// ✅ hardened env checks
// =============================================================================

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// =============================================================================
// Helper — format naira safely
// =============================================================================
function formatNaira(amount: number): string {
    try {
        return `₦${Number(amount || 0).toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    } catch {
        return `₦${Number(amount || 0).toFixed(2)}`;
    }
}

// =============================================================================
// Shared sender (safe guard)
// =============================================================================
async function safeSendEmail(payload: {
    to: string;
    subject: string;
    html: string;
}) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("[emailService] RESEND_API_KEY missing — email skipped");
        return;
    }

    if (!process.env.EMAIL_FROM) {
        console.warn("[emailService] EMAIL_FROM missing — email skipped");
        return;
    }

    await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
    });
}

// =============================================================================
// ✅ SUCCESS EMAIL (ELITE TEMPLATE)
// =============================================================================
export async function sendInvoicePaidEmail(
    to: string,
    invoiceId: number,
    amount: number,
    payUrl?: string
) {
    try {
        if (!to) return;

        const formattedAmount = formatNaira(amount);

        const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Payment Received</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#05060a;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center" style="padding:24px;">

<table width="560" cellpadding="0" cellspacing="0" role="presentation"
style="
  width:100%;
  max-width:560px;
  background:linear-gradient(180deg,#06070a 0%,#0b2e75 100%);
  border-radius:18px;
  border:1px solid rgba(255,255,255,0.12);
  box-shadow:0 20px 55px rgba(0,0,0,0.6);
  overflow:hidden;
">

<tr>
<td style="
  padding:22px 24px;
  background:linear-gradient(90deg,#0066ff,#00c2ff);
  color:white;
  font-weight:800;
  font-size:20px;
">
  PayVerify
</td>
</tr>

<tr>
<td style="padding:28px 24px; color:#e9f2ff;">

<h2 style="margin:0 0 12px 0;">
  ✅ Payment Successful
</h2>

<p style="margin:0 0 22px 0; opacity:0.85;">
  Your payment has been securely processed.
</p>

<div style="
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.14);
  border-radius:12px;
  padding:18px;
  margin-bottom:22px;
">

  <div style="margin-bottom:8px;">
    <strong>Invoice:</strong> #${invoiceId}
  </div>

  <div style="margin-bottom:8px;">
    <strong>Amount Paid:</strong>
    <span style="color:#4ade80; font-weight:700;">
      ${formattedAmount}
    </span>
  </div>

  <div>
    <strong>Status:</strong>
    <span style="
      background:#16a34a;
      color:white;
      padding:4px 10px;
      border-radius:999px;
      font-size:12px;
      margin-left:6px;
    ">
      PAID
    </span>
  </div>

</div>

${payUrl
                ? `
<div style="text-align:center; margin:26px 0;">
  <a href="${payUrl}"
     style="
       display:inline-block;
       padding:12px 22px;
       background:#0066ff;
       color:white;
       text-decoration:none;
       border-radius:10px;
       font-weight:600;
     ">
     View Invoice
  </a>
</div>
`
                : ""
            }

<p style="opacity:0.75; font-size:13px;">
  If you did not authorize this payment, please contact support immediately.
</p>

</td>
</tr>

<tr>
<td style="
  padding:16px 24px;
  font-size:12px;
  opacity:0.6;
  color:#cfe3ff;
  border-top:1px solid rgba(255,255,255,0.08);
">
  © ${new Date().getFullYear()} PayVerify. Secure payment infrastructure.
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>
`;

        await safeSendEmail({
            to,
            subject: `Payment received — Invoice #${invoiceId}`,
            html,
        });
    } catch (err) {
        console.error("sendInvoicePaidEmail error:", err);
    }
}

// =============================================================================
// ❌ FAILURE EMAIL (TS2305 FIX — PROPERLY EXPORTED)
// =============================================================================
export async function sendPaymentFailedEmail(
    to: string,
    invoiceId: number,
    amount: number
) {
    try {
        if (!to) return;

        const html = `
      <div style="font-family:Inter,Arial,sans-serif">
        <h2 style="color:#d9534f;">⚠️ Payment Failed</h2>
        <p>We could not complete your payment.</p>
        <p><strong>Invoice:</strong> #${invoiceId}</p>
        <p><strong>Amount:</strong> ${formatNaira(amount)}</p>
        <p>Please retry your payment.</p>
      </div>
    `;

        await safeSendEmail({
            to,
            subject: `Payment Failed — Invoice #${invoiceId}`,
            html,
        });
    } catch (err) {
        console.error("Failed to send failure email:", err);
    }
}