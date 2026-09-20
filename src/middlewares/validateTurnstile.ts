// src/middlewares/validateTurnstile.ts
import type { Request, Response, NextFunction } from 'express';

// If you're on Node <18, install node-fetch and uncomment:
// import fetch from 'node-fetch';

interface TurnstileVerifyResponse {
    success: boolean;
    challenge_ts?: string;    // timestamp
    hostname?: string;
    'error-codes'?: string[]; // e.g. ["invalid-input-response"]
    action?: string;
    cdata?: string;
}

export async function validateTurnstile(req: Request, res: Response, next: NextFunction) {
    // Local development should not be blocked by Cloudflare. Production keeps
    // the protection enabled unless explicitly configured otherwise.
    const isProduction = process.env.NODE_ENV === 'production';
    const requireTurnstile = process.env.TURNSTILE_REQUIRED === 'true' || isProduction;
    if (!requireTurnstile) return next();

    const token = req.body?.captchaToken;
    if (!token) return res.status(400).json({ message: 'Captcha token is required.' });

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return res.status(500).json({ message: 'Captcha not configured on server.' });

    try {
        const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                secret,              // your server secret
                response: token,     // token from client
                // remoteip: req.ip ?? '' // optional
            })
        });

        const data = (await resp.json()) as TurnstileVerifyResponse;

        if (!data.success) {
            // Optional: log details to help debug domain/keys
            console.warn('Turnstile verification failed', {
                hostname: data.hostname,
                errors: data['error-codes']
            });
            return res.status(400).json({ message: 'Captcha verification failed.' });
        }

        // Optionally inspect data.action / data.hostname here
        return next();
    } catch (err) {
        console.error('Turnstile verify error:', err);
        return res.status(400).json({ message: 'Unable to verify captcha.' });
    }
}
