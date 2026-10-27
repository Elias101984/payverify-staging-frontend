// src/routes/authRoutes.ts

import { Router } from 'express';

import {
    login,
    me,
    register,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyRegistrationEmail,
    resendRegistrationOtp,
} from '../controllers/authController';

import {
    verifyJwtMiddleware,
} from '../middlewares/authMiddleware';

import {
    validateTurnstile,
} from '../middlewares/validateTurnstile';

import {
    honeypotGuard,
    registerSpeedLimiter,
    registerHardLimiter,
    loginLimiter,
    forgotPasswordLimiter,
    resetPasswordLimiter,
    changePasswordLimiter,
} from '../middlewares/abuseProtection';


const router = Router();


/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new merchant and user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - cac_number
 *               - account_number
 *               - bank_name
 *               - captchaToken
 *             properties:
 *               name:
 *                 type: string
 *                 description: Merchant name
 *               email:
 *                 type: string
 *                 description: User email
 *               password:
 *                 type: string
 *                 description: User password
 *               cac_number:
 *                 type: string
 *                 description: CAC number
 *               account_number:
 *                 type: string
 *                 description: Bank account number
 *               bank_name:
 *                 type: string
 *                 description: Bank name
 *               tin_number:
 *                 type: string
 *                 description: Optional TIN
 *               bvn:
 *                 type: string
 *                 description: Optional BVN
 *               qr_code:
 *                 type: string
 *                 description: Optional QR code
 *               captchaToken:
 *                 type: string
 *                 description: Cloudflare Turnstile token
 *               companyWebsite:
 *                 type: string
 *                 description: Honeypot field. Legitimate clients should leave this empty.
 *     responses:
 *       201:
 *         description: User and merchant registered successfully
 *       400:
 *         description: Missing required fields or invalid captcha
 *       409:
 *         description: User already exists
 *       429:
 *         description: Too many registration attempts
 *       500:
 *         description: Server error
 */
router.post(
    '/register',

    // Silently reject obvious automated form submissions.
    honeypotGuard,

    // Gradually slow repeated registration attempts.
    registerSpeedLimiter,

    // Hard cap registration attempts from an IP.
    registerHardLimiter,

    // Cloudflare bot/human verification.
    validateTurnstile,

    register
);


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and get JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - captchaToken
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               captchaToken:
 *                 type: string
 *                 description: Cloudflare Turnstile token
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing email/password or invalid captcha
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Server error
 */
router.post(
    '/login',

    // Protect against credential stuffing and brute-force attacks.
    loginLimiter,

    // Require Cloudflare Turnstile verification.
    validateTurnstile,

    login
);


/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/me',
    verifyJwtMiddleware,
    me
);


/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     description: Always returns a generic response to reduce account enumeration risk.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: If that email exists, a reset link has been sent.
 *       400:
 *         description: Email is required
 *       429:
 *         description: Too many password reset requests
 */
router.post(
    '/forgot-password',

    // Prevent reset-email flooding.
    forgotPasswordLimiter,

    forgotPassword
);


/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a one-time token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *       400:
 *         description: Invalid or expired token, weak password, or missing fields
 *       429:
 *         description: Too many password reset attempts
 *       500:
 *         description: Server error
 */
router.post(
    '/reset-password',

    // Reduce automated reset-token guessing attempts.
    resetPasswordLimiter,

    resetPassword
);


/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for the logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Missing fields or weak password
 *       401:
 *         description: Unauthorized or incorrect current password
 *       429:
 *         description: Too many password change attempts
 *       500:
 *         description: Server error
 */
router.post(
    '/change-password',

    // Authentication must happen before the controller.
    verifyJwtMiddleware,

    // Protect authenticated endpoint from repeated password guessing.
    changePasswordLimiter,

    changePassword
);


router.post('/verify-email', resetPasswordLimiter, verifyRegistrationEmail);
router.post('/resend-email-otp', forgotPasswordLimiter, resendRegistrationOtp);
export default router;