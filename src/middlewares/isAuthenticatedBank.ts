// src/middlewares/isAuthenticatedBank.ts
// -----------------------------------------------------------------------------
// PayVerify Bank Authentication Middleware
//
// CHANGES APPLIED:
//
// 1. REMOVED GLOBAL EXPRESS MODULE AUGMENTATION
//    ---------------------------------------------------------
//    Removed:
//
//      declare module 'express-serve-static-core' { ... }
//
//    WHY:
//    Render's TypeScript build previously failed with:
//
//      TS2664: Invalid module name in augmentation,
//      module 'express-serve-static-core' cannot be found.
//
//    We now use a local BankAuthenticatedRequest interface instead.
//
//
// 2. ADDED IncomingHttpHeaders
//    ---------------------------------------------------------
//    Added:
//
//      import { IncomingHttpHeaders } from 'http';
//
//    and:
//
//      headers: IncomingHttpHeaders;
//
//    WHY:
//    Render's TypeScript build reported:
//
//      TS2339: Property 'headers' does not exist on type
//      'BankAuthenticatedRequest'.
//
//    Express Request normally provides `headers`, but the Render build was not
//    recognizing the inherited property on our custom request interface.
//    We therefore explicitly declare it.
//
//
// 3. KEPT BankAuthenticatedRequest EXTENDING Express Request
//    ---------------------------------------------------------
//    This preserves normal Express request functionality while adding:
//
//      req.bank
//
//    for authenticated bank information.
//
//
// 4. IMPROVED BEARER TOKEN VALIDATION
//    ---------------------------------------------------------
//    Instead of accepting any two-part Authorization header, we explicitly
//    require:
//
//      Authorization: Bearer <token>
//
//
// 5. NO BUSINESS LOGIC CHANGED
//    ---------------------------------------------------------
//    The middleware still:
//
//      - Reads the Authorization header
//      - Verifies the JWT
//      - Requires role === "bank"
//      - Supports bankId or id from the JWT
//      - Loads the bank from the database
//      - Requires Active bank status
//      - Attaches the bank context to req.bank
//      - Calls next()
//
// -----------------------------------------------------------------------------

import {
    Request,
    Response,
    NextFunction,
} from 'express';

import { IncomingHttpHeaders } from 'http';
import jwt from 'jsonwebtoken';
import Bank from '../models/Bank';


// =============================================================================
// BANK REQUEST CONTEXT
// =============================================================================
//
// Defines the authenticated bank information that will be attached to:
//
//     req.bank
//
// after successful authentication.
// =============================================================================

export type BankRequestContext = {
    id: number;
    contactEmail: string;
    bankName: string;
    status: 'Pending' | 'Active' | 'Rejected';
};


// =============================================================================
// BANK AUTHENTICATED REQUEST
// =============================================================================
//
// WHAT CHANGED:
//
// We use a local interface instead of globally augmenting:
//
//     express-serve-static-core
//
// WHY:
//
// Render previously failed to resolve that module augmentation.
//
// We also explicitly declare:
//
//     headers: IncomingHttpHeaders
//
// because Render's TypeScript build was not recognizing the inherited
// `headers` property on BankAuthenticatedRequest.
//
// This interface therefore provides:
//
//     req.headers
//     req.body
//     req.params
//     req.query
//     req.bank
//
// =============================================================================

export interface BankAuthenticatedRequest extends Request {

    /**
     * Authenticated bank information.
     *
     * This is populated only after the JWT has been successfully verified
     * and the corresponding bank has been loaded from the database.
     */
    bank?: BankRequestContext;


    /**
     * RENDER / TYPESCRIPT BUILD FIX
     *
     * Express Request normally inherits HTTP headers from Node's HTTP request
     * types. The Render TypeScript build was not recognizing that inherited
     * property on this custom interface.
     *
     * Explicitly declaring it fixes:
     *
     * TS2339:
     * Property 'headers' does not exist on type 'BankAuthenticatedRequest'.
     */
    headers: IncomingHttpHeaders;
}


// =============================================================================
// JWT SECRET
// =============================================================================
//
// Supports the existing bank-specific JWT secret first.
//
// Falls back to the general JWT_SECRET.
//
// The development fallback is preserved from the existing implementation.
// For production, AUTH_JWT_SECRET or JWT_SECRET should always be configured.
// =============================================================================

const JWT_SECRET =
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'dev-secret';


// =============================================================================
// BANK AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * isAuthenticatedBank
 * -----------------------------------------------------------------------------
 *
 * Authentication flow:
 *
 * 1. Reads:
 *
 *      Authorization: Bearer <jwt>
 *
 * 2. Verifies the JWT.
 *
 * 3. Requires:
 *
 *      role === "bank"
 *
 * 4. Reads the bank identifier from either:
 *
 *      bankId
 *
 *    or:
 *
 *      id
 *
 * 5. Loads the bank from the database.
 *
 * 6. Requires the bank status to be:
 *
 *      Active
 *
 * 7. Attaches the authenticated bank context to:
 *
 *      req.bank
 *
 * 8. Continues to the next middleware/controller.
 */
export async function isAuthenticatedBank(
    req: BankAuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {

    try {

        // =====================================================================
        // STEP 1: READ AUTHORIZATION HEADER
        // =====================================================================
        //
        // Expected:
        //
        // Authorization: Bearer <jwt>
        //
        // `headers` is explicitly declared on BankAuthenticatedRequest to
        // prevent the Render TypeScript build error.
        // =====================================================================

        const authHeader = req.headers.authorization || '';


        // =====================================================================
        // STEP 2: EXTRACT BEARER TOKEN
        // =====================================================================

        const [scheme, token] = authHeader.split(' ');


        // =====================================================================
        // STEP 3: VALIDATE AUTHORIZATION FORMAT
        // =====================================================================
        //
        // Reject requests that:
        //
        // - Have no Authorization header
        // - Do not use the Bearer scheme
        // - Do not contain a JWT
        //
        // =====================================================================

        if (
            scheme !== 'Bearer' ||
            !token
        ) {

            res.status(401).json({
                message: 'Missing or invalid Authorization token',
            });

            return;
        }


        // =====================================================================
        // STEP 4: VERIFY JWT
        // =====================================================================

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        ) as
            | {
                role?: string;
                bankId?: number;
                id?: number;
                email?: string;
            }
            | string;


        // =====================================================================
        // STEP 5: VALIDATE JWT PAYLOAD
        // =====================================================================
        //
        // jsonwebtoken may technically return a string payload.
        // PayVerify requires an object containing bank identity information.
        // =====================================================================

        if (typeof decoded === 'string') {

            res.status(401).json({
                message: 'Invalid token payload',
            });

            return;
        }


        // =====================================================================
        // STEP 6: REQUIRE BANK ROLE
        // =====================================================================

        if (decoded.role !== 'bank') {

            res.status(403).json({
                message: 'Forbidden: bank token required',
            });

            return;
        }


        // =====================================================================
        // STEP 7: GET BANK ID
        // =====================================================================
        //
        // Supports both existing JWT payload formats:
        //
        //     { bankId: 123 }
        //
        // and:
        //
        //     { id: 123 }
        //
        // =====================================================================

        const bankId =
            decoded.bankId ??
            decoded.id;


        if (!bankId) {

            res.status(401).json({
                message: 'Invalid bank token',
            });

            return;
        }


        // =====================================================================
        // STEP 8: LOAD BANK FROM DATABASE
        // =====================================================================

        const bank = await Bank.findByPk(bankId);


        if (!bank) {

            res.status(404).json({
                message: 'Bank not found',
            });

            return;
        }


        // =====================================================================
        // STEP 9: REQUIRE ACTIVE BANK STATUS
        // =====================================================================
        //
        // Pending or rejected banks cannot access protected bank routes.
        // =====================================================================

        if (bank.status !== 'Active') {

            res.status(403).json({
                message: `Bank status is ${bank.status}`,
            });

            return;
        }


        // =====================================================================
        // STEP 10: ATTACH AUTHENTICATED BANK TO REQUEST
        // =====================================================================
        //
        // Downstream controllers can now access:
        //
        //     req.bank.id
        //     req.bank.contactEmail
        //     req.bank.bankName
        //     req.bank.status
        //
        // =====================================================================

        req.bank = {

            id: bank.id,

            contactEmail:
                bank.contactEmail,

            bankName:
                bank.bankName,

            status:
                bank.status as
                | 'Pending'
                | 'Active'
                | 'Rejected',
        };


        // =====================================================================
        // STEP 11: CONTINUE REQUEST PIPELINE
        // =====================================================================

        next();

    } catch (err: any) {

        // =====================================================================
        // JWT / AUTHENTICATION ERROR HANDLING
        // =====================================================================

        const statusCode =

            err?.name === 'TokenExpiredError'
                ? 401

                : err?.name === 'JsonWebTokenError'
                    ? 401

                    : 500;


        const message =

            err?.name === 'TokenExpiredError'
                ? 'Token expired'

                : err?.name === 'JsonWebTokenError'
                    ? 'Invalid token'

                    : 'Failed to authenticate bank';


        // Log unexpected server-side authentication failures.
        //
        // We avoid logging the JWT itself.
        if (statusCode === 500) {

            console.error(
                'Bank authentication failed:',
                err
            );
        }


        res.status(statusCode).json({
            message,
        });

        return;
    }
}


// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default isAuthenticatedBank;