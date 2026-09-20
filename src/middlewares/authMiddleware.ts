// src/middlewares/authMiddleware.ts
// ------------------------------------------------------------------------------------
// PayVerify JWT Authentication Middleware
//
// FIXES APPLIED:
//
// 1. Exports verifyJwtMiddleware as a named export.
// 2. Exports verifyJwtMiddleware as the default export.
// 3. Exports authenticate as a backward-compatible alias.
// 4. Explicitly types `headers` using Node's IncomingHttpHeaders.
//
// WHY FOR #4:
// The Render/Linux TypeScript build reported:
//
//   Property 'headers' does not exist on type 'AuthenticatedRequest'
//
// Although AuthenticatedRequest extends Express Request and the local build
// succeeds, explicitly declaring the inherited Node HTTP headers removes the
// production build ambiguity.
//
// ------------------------------------------------------------------------------------

import {
    Request,
    Response,
    NextFunction,
} from 'express';

import { IncomingHttpHeaders } from 'http';
import jwt from 'jsonwebtoken';


// ------------------------------------------------------------------------------------
// Extend Express Request to include:
// - user: decoded JWT payload
// - headers: explicitly declared for Render/Linux TypeScript build compatibility
// ------------------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
    user?: any;

    // -------------------------------------------------------------------------
    // RENDER BUILD FIX
    //
    // Express Request normally inherits this property, but the Render
    // TypeScript build was not recognizing it on the custom request interface.
    // Declaring it explicitly ensures req.headers.authorization is available.
    // -------------------------------------------------------------------------
    headers: IncomingHttpHeaders;
}


/**
 * JWT verification middleware
 *
 * Validates the JWT token and attaches the decoded payload to req.user.
 */
export const verifyJwtMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {

    try {

        // ---------------------------------------------------------------------
        // Read Authorization header
        //
        // Expected format:
        //
        // Authorization: Bearer <jwt>
        // ---------------------------------------------------------------------

        const authHeader = req.headers.authorization;


        if (!authHeader) {

            res.status(401).json({
                message: 'Missing Authorization header',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Validate Bearer authentication format
        // ---------------------------------------------------------------------

        const [scheme, token] = authHeader.split(' ');


        if (
            scheme !== 'Bearer' ||
            !token
        ) {

            res.status(401).json({
                message: 'Missing or invalid JWT token',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Get JWT secret
        // ---------------------------------------------------------------------

        const secret = process.env.JWT_SECRET;


        if (!secret) {

            console.error(
                'JWT authentication failed: JWT_SECRET is not configured'
            );

            res.status(500).json({
                message: 'Authentication configuration error',
            });

            return;
        }


        // ---------------------------------------------------------------------
        // Verify JWT
        // ---------------------------------------------------------------------

        const decoded = jwt.verify(
            token,
            secret
        );


        // ---------------------------------------------------------------------
        // Attach decoded JWT payload to the request
        // ---------------------------------------------------------------------

        req.user = decoded;


        // Continue request pipeline
        next();

    } catch (error) {

        console.error(
            'JWT authentication failed:',
            error
        );


        res.status(401).json({
            message: 'Invalid or expired token',
        });

        return;
    }
};


// ------------------------------------------------------------------------------------
// Backward compatibility alias
//
// Supports existing imports:
//
// import { authenticate } from '../middlewares/authMiddleware';
//
// ------------------------------------------------------------------------------------

export const authenticate = verifyJwtMiddleware;


// ------------------------------------------------------------------------------------
// Default export support
//
// Supports existing imports:
//
// import verifyJwtMiddleware from '../middlewares/authMiddleware';
//
// ------------------------------------------------------------------------------------

export default verifyJwtMiddleware;