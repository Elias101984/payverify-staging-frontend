import crypto from 'crypto';
import { QueryTypes } from 'sequelize';
import type { Request } from 'express';
import { sequelize } from '../config/db';
import { sendMail } from './emailService';

import { readFile } from 'fs/promises';
import path from 'path';


export const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
export function codeHash(userId: number, purpose: string, code: string) {
 const secret = process.env.AUTH_OTP_SECRET;
 if (!secret || secret.length < 32) throw new Error('AUTH_OTP_SECRET must be configured (at least 32 characters)');
 return crypto.createHmac('sha256', secret).update(`${userId}:${purpose}:${code}`).digest('hex');
}
export function constantMatch(a: string, b: string) {
 if (!/^[0-9a-f]{64}$/.test(a) || !/^[0-9a-f]{64}$/.test(b)) return false;
 return crypto.timingSafeEqual(Buffer.from(a,'hex'), Buffer.from(b,'hex'));
}
export async function issueChallenge(userId: number, purpose: string) {
 const code = newCode();
 await sequelize.query('DELETE FROM auth_challenges WHERE user_id = :userId AND purpose = :purpose', {replacements:{userId,purpose}});
 await sequelize.query(`INSERT INTO auth_challenges(user_id,purpose,code_hash,expires_at)
 VALUES(:userId,:purpose,:hash,now() + interval '10 minutes')`,
 {replacements:{userId,purpose,hash:codeHash(userId,purpose,code)}});
 return code;
}
export async function consumeChallenge(userId: number, purpose: string, code: string) {
 if (!/^\d{6}$/.test(code)) return false;
 return sequelize.transaction(async transaction => {
  const rows = await sequelize.query<any>(`SELECT * FROM auth_challenges WHERE user_id=:userId AND purpose=:purpose
  AND consumed_at IS NULL FOR UPDATE`,{replacements:{userId,purpose},type:QueryTypes.SELECT,transaction});
  const row = rows[0];
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= 5) return false;
  await sequelize.query('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=:id',{replacements:{id:row.id},transaction});
  if (!constantMatch(row.code_hash,codeHash(userId,purpose,code))) return false;
  await sequelize.query('UPDATE auth_challenges SET consumed_at=now() WHERE id=:id',{replacements:{id:row.id},transaction});
  return true;
 });
}
export async function audit(req: Request, type: string, userId?: number, details: Record<string,unknown> = {}) {
 try {
  await sequelize.query(`INSERT INTO auth_security_events(user_id,event_type,ip_address,user_agent,details)
  VALUES(:userId,:type,:ip,:agent,CAST(:details AS jsonb))`,{replacements:{userId:userId||null,type,ip:String(req.ip||'').slice(0,64),agent:String(req.headers['user-agent']||'').slice(0,512),details:JSON.stringify(details)}});
 } catch(e) { console.error('Security audit persistence failed',e); }
}
export async function alertLogin(
    req: Request,
    userId: number,
    email: string,
    displayName = 'PayVerify user'
) {
    await audit(req, 'LOGIN_SUCCESS', userId);

    try {
        const name = escapeHtml(displayName);
        const ip = escapeHtml(String(req.ip || 'Unknown'));
        const device = escapeHtml(
            String(req.headers['user-agent'] || 'Unknown')
        );

        const when = new Date().toLocaleString('en-GB', {
            timeZone: 'Africa/Lagos',
            dateStyle: 'full',
            timeStyle: 'short',
        });

        const frontendUrl = String(
            process.env.FRONTEND_URL || ''
        ).replace(/\/+$/, '');

        const resetUrl = /^https?:\/\//i.test(frontendUrl)
            ? `${frontendUrl}/forgot-password`
            : '';

        const attachments: Array<{
            filename: string;
            content: Buffer;
            contentId: string;
        }> = [];

        try {
            const logo = await readFile(
                path.join(__dirname, '../assets/payverify-logo.png')
            );

            attachments.push({
                filename: 'payverify-logo.png',
                content: logo,
                contentId: 'payverify-logo',
            });
        } catch {
            console.warn(
                '[emailService] Login alert logo unavailable; using text branding.'
            );
        }

        const branding = attachments.length
            ? `<img src="cid:payverify-logo" alt="PayVerify"
                 width="170"
                 style="display:block;max-width:170px;height:auto;margin:0 auto;">`
            : `<span style="font-size:30px;font-weight:800;color:#173b78;">
                 PayVerify
               </span>`;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PayVerify login alert</title>
</head>
<body style="margin:0;padding:0;background:#eef3fa;font-family:Arial,sans-serif;color:#17243b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
           style="background:#eef3fa;">
        <tr>
            <td align="center" style="padding:32px 12px;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0"
                       style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;">

                    <tr>
                        <td align="center"
                            style="padding:28px;background:#ffffff;border-bottom:1px solid #e7edf5;">
                            ${branding}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:30px;background:#102547;color:#ffffff;">
                            <p style="margin:0 0 10px;font-size:12px;letter-spacing:2px;color:#a9caff;">
                                ACCOUNT SECURITY
                            </p>
                            <h1 style="margin:0;font-size:27px;line-height:1.3;">
                                A new sign-in to your account
                            </h1>
                            <p style="margin:12px 0 0;color:#d7e5fb;line-height:1.6;">
                                Your account security matters to us.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:30px;">
                            <h2 style="margin:0 0 14px;font-size:22px;">
                                Hello ${name},
                            </h2>
                            <p style="margin:0 0 24px;line-height:1.7;color:#526079;">
                                We noticed a successful sign-in to your PayVerify
                                account. Here are the details:
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                                   style="background:#f4f7fc;border:1px solid #e2eaf5;border-radius:12px;">
                                <tr>
                                    <td style="padding:16px;">
                                        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                                            ACCOUNT
                                        </p>
                                        <p style="margin:0;font-weight:bold;">${name}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px;border-top:1px solid #e2eaf5;">
                                        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                                            DATE & TIME
                                        </p>
                                        <p style="margin:0;line-height:1.5;">
                                            ${escapeHtml(when)} (West Africa Time)
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px;border-top:1px solid #e2eaf5;">
                                        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                                            IP ADDRESS
                                        </p>
                                        <p style="margin:0;">${ip}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px;border-top:1px solid #e2eaf5;">
                                        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
                                            DEVICE / BROWSER
                                        </p>
                                        <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-word;">
                                            ${device}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:24px 0 14px;line-height:1.7;color:#526079;">
                                <strong style="color:#17243b;">Was this you?</strong>
                                You’re all set—no action is needed.
                            </p>

                            <div style="padding:18px;background:#fff6e8;border-left:4px solid #f0ab36;">
                                <strong>Don’t recognize this sign-in?</strong>
                                <p style="margin:8px 0 0;line-height:1.7;color:#66543a;">
                                    Reset your password immediately and contact
                                    our support team.
                                </p>
                            </div>

                            ${resetUrl ? `
                            <table role="presentation" cellspacing="0" cellpadding="0"
                                   style="margin:24px 0;">
                                <tr>
                                    <td style="background:#2463eb;border-radius:8px;">
                                        <a href="${escapeHtml(resetUrl)}"
                                           style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:bold;">
                                            Reset my password
                                        </a>
                                    </td>
                                </tr>
                            </table>` : ''}

                            <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.7;">
                                PayVerify will never ask you to share your
                                password or verification code.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center"
                            style="padding:24px;background:#f4f7fc;border-top:1px solid #e2eaf5;">
                            <p style="margin:0 0 10px;font-weight:bold;">
                                Need a hand? Contact PayVerify Support
                            </p>
                            <p style="margin:0;line-height:1.9;font-size:14px;">
                                <a href="mailto:hello@payverify.ng"
                                   style="color:#2463eb;text-decoration:none;">
                                    hello@payverify.ng
                                </a>
                                <br>
                                <a href="tel:+2348180302024"
                                   style="color:#2463eb;text-decoration:none;">
                                    +234-8180302024
                                </a>
                            </p>
                            <p style="margin:18px 0 0;font-size:12px;color:#64748b;">
                                © ${new Date().getFullYear()} PayVerify
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        await sendMail(
            email,
            'PayVerify security alert: new sign-in',
            html,
            attachments
        );
    } catch (error) {
        console.error(
            'Login alert email failed:',
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
}
function escapeHtml(v:string) {return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
