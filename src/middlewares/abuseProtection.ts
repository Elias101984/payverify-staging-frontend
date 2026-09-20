import {
    NextFunction,
    Request,
    Response
} from "express";

import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";


// =============================================================================
// HONEYPOT
// =============================================================================

export function honeypotGuard(
    req: Request,
    res: Response,
    next: NextFunction
): void {

    const bait = String(
        req.body?.companyWebsite ||
        req.body?.hp ||
        ""
    ).trim();

    if (bait.length > 0) {
        setTimeout(
            () => res.status(204).end(),
            300
        );

        return;
    }

    next();
}


// =============================================================================
// REGISTRATION SPEED LIMITER
// =============================================================================

export const registerSpeedLimiter =
    slowDown({
        windowMs: 15 * 60 * 1000,

        delayAfter: 5,

        delayMs: () => 500,

        validate: {
            delayMs: false
        }
    });


// =============================================================================
// REGISTRATION HARD LIMIT
// =============================================================================

export const registerHardLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        standardHeaders: "draft-7",

        legacyHeaders: false,

        message: {
            message:
                "Too many registration attempts. Please try again later."
        }
    });


// =============================================================================
// LOGIN LIMITER
// =============================================================================
//
// Prevents password brute-force attacks.
//
// This is intentionally stricter than the global API limiter.
// =============================================================================

export const loginLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        standardHeaders: "draft-7",

        legacyHeaders: false,

        skipSuccessfulRequests: true,

        message: {
            message:
                "Too many login attempts. Please try again later."
        }
    });


// =============================================================================
// FORGOT PASSWORD LIMITER
// =============================================================================
//
// Protects:
// - email infrastructure
// - users from reset-email flooding
// - database from automated abuse
// =============================================================================

export const forgotPasswordLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 5,

        standardHeaders: "draft-7",

        legacyHeaders: false,

        message: {
            message:
                "Too many password reset requests. Please try again later."
        }
    });


// =============================================================================
// RESET PASSWORD LIMITER
// =============================================================================
//
// Makes automated reset-token guessing impractical.
// =============================================================================

export const resetPasswordLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        standardHeaders: "draft-7",

        legacyHeaders: false,

        message: {
            message:
                "Too many password reset attempts. Please try again later."
        }
    });


// =============================================================================
// AUTHENTICATED PASSWORD CHANGE LIMITER
// =============================================================================

export const changePasswordLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 10,

        standardHeaders: "draft-7",

        legacyHeaders: false,

        message: {
            message:
                "Too many password change attempts. Please try again later."
        }
    });