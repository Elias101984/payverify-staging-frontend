////// src/middlewares/authMiddleware.ts
////import { Request, Response, NextFunction } from 'express';
////import { verifyToken } from '../utils/jwtUtils';
////import { UserJwtPayload } from '../types/express';

/////**
//// * Type guard: checks that an unknown value matches UserJwtPayload.
//// * This avoids unsafe casting and TS2352 errors.
//// */
////function isUserJwtPayload(v: unknown): v is UserJwtPayload {
////    if (!v || typeof v !== 'object') return false;
////    const o = v as Record<string, unknown>;
////    return (
////        typeof o.id === 'number' &&
////        typeof o.email === 'string' &&
////        typeof o.role === 'string'
////        // name is optional; no check
////    );
////}

/////**
//// * JWT authentication middleware.
//// * - Verifies "Authorization: Bearer <token>"
//// * - Validates payload shape via type guard
//// * - Attaches a typed `req.user`
//// */
////export const verifyJwtMiddleware = (
////    req: Request,
////    res: Response,
////    next: NextFunction
////): void => {
////    const authHeader = req.headers.authorization;

////    if (!authHeader?.startsWith('Bearer ')) {
////        res.status(401).json({ message: 'No token provided' });
////        return;
////    }

////    // Extract raw token
////    const token = authHeader.slice(7).trim();

////    try {
////        const decoded = verifyToken(token); // whatever your jwtUtils returns

////        if (!isUserJwtPayload(decoded)) {
////            // If your token uses different field names, map them here before failing.
////            res.status(401).json({ message: 'Invalid token payload' });
////            return;
////        }

////        // Normalize/attach (keeps only the fields we care about)
////        req.user = {
////            id: decoded.id,
////            email: decoded.email,
////            role: decoded.role,
////            name: decoded.name, // optional
////        };

////        next();
////    } catch (err) {
////        console.error('JWT verification failed:', err);
////        res.status(401).json({ message: 'Invalid or expired token' });
////    }
////};

/////**
//// * Optional: admin-only guard.
//// * Usage: router.get('/admin', verifyJwtMiddleware, requireAdmin, handler)
//// */
////export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
////    const role = req.user?.role?.toLowerCase();
////    if (role !== 'admin') {
////        res.status(403).json({ message: 'Forbidden: admin only' });
////        return;
////    }
////    next();
////};

/////**
//// * Optional: generic role guard.
//// * Usage: router.get('/something', verifyJwtMiddleware, requireRoles('manager','admin'), handler)
//// */
////export const requireRoles =
////    (...roles: string[]) =>
////        (req: Request, res: Response, next: NextFunction): void => {
////            const role = req.user?.role?.toLowerCase();
////            if (!role || !roles.map((r) => r.toLowerCase()).includes(role)) {
////                res.status(403).json({ message: 'Forbidden: insufficient role' });
////                return;
////            }
////            next();
////        };

////export default verifyJwtMiddleware;


//// src/middleware/authMiddleware.ts
//// ------------------------------------------------------------------------------------
//// PayVerify JWT Authentication Middleware
////
//// PURPOSE:
//// This middleware verifies JWT tokens and attaches a strongly-typed `req.user`
//// object for downstream controllers and services.
////
//// ------------------------------------------------------------------------------------
//// WHAT CHANGED AND WHY
//// ------------------------------------------------------------------------------------
////
//// CHANGE #1 — Renamed export to `authenticate`
//// BEFORE:
////    export const verifyJwtMiddleware = ...
////
//// AFTER:
////    export const authenticate = ...
////
//// WHY:
//// Your routes import:
////
////    import { authenticate } from '../middleware/authMiddleware';
////
//// So the export MUST match that exact name.
////
//// This fixes TS2307 and TS2551 issues.
////
//// ------------------------------------------------------------------------------------
////
//// CHANGE #2 — Removed default export
//// BEFORE:
////    export default verifyJwtMiddleware;
////
//// WHY REMOVED:
//// Your routes use NAMED imports, not default imports.
//// Having both can cause confusion and incorrect imports.
////
//// ------------------------------------------------------------------------------------
////
//// CHANGE #3 — Improved type safety using a type guard
////
//// Ensures decoded JWT payload is valid before attaching to req.user.
////
//// Prevents runtime crashes and TS unsafe casting errors.
////
//// ------------------------------------------------------------------------------------

//import { Request, Response, NextFunction } from 'express';

//import { verifyToken } from '../utils/jwtUtils';

//import { UserJwtPayload } from '../types/express';


//// ------------------------------------------------------------------------------------
//// Type Guard
////
//// Ensures decoded JWT payload matches expected structure.
////
//// This prevents runtime errors and unsafe casting.
//// ------------------------------------------------------------------------------------
//function isUserJwtPayload(payload: unknown): payload is UserJwtPayload {

//    if (!payload || typeof payload !== 'object') {
//        return false;
//    }

//    const obj = payload as Record<string, unknown>;

//    return (
//        typeof obj.id === 'number' &&
//        typeof obj.email === 'string' &&
//        typeof obj.role === 'string'
//    );
//}


//// ------------------------------------------------------------------------------------
//// Main Authentication Middleware
////
//// Verifies JWT token and attaches req.user
////
//// Used by protected routes:
////
//// Example:
////
//// router.get(
////    '/secure-endpoint',
////    authenticate,
////    controller.secureHandler
//// );
////
//// ------------------------------------------------------------------------------------
//export const authenticate = (

//    req: Request,
//    res: Response,
//    next: NextFunction

//): void => {

//    try {

//        const authHeader = req.headers.authorization;

//        // --------------------------------------------------------------------------------
//        // Validate Authorization header exists and is Bearer token
//        // --------------------------------------------------------------------------------
//        if (!authHeader || !authHeader.startsWith('Bearer ')) {

//            res.status(401).json({
//                message: 'Unauthorized: Missing Bearer token'
//            });

//            return;
//        }

//        // Extract token
//        const token = authHeader.substring(7).trim();

//        // Verify token
//        const decoded = verifyToken(token);

//        // --------------------------------------------------------------------------------
//        // Validate payload structure using type guard
//        // --------------------------------------------------------------------------------
//        if (!isUserJwtPayload(decoded)) {

//            res.status(401).json({
//                message: 'Unauthorized: Invalid token payload'
//            });

//            return;
//        }

//        // --------------------------------------------------------------------------------
//        // Attach user to request
//        //
//        // Controllers can now safely use:
//        //
//        // req.user.id
//        // req.user.email
//        // req.user.role
//        // --------------------------------------------------------------------------------
//        req.user = {
//            id: decoded.id,
//            email: decoded.email,
//            role: decoded.role,
//            name: decoded.name
//        };

//        // Continue request pipeline
//        next();

//    }
//    catch (error) {

//        console.error('JWT Authentication Error:', error);

//        res.status(401).json({
//            message: 'Unauthorized: Invalid or expired token'
//        });

//        return;
//    }
//};


//// ------------------------------------------------------------------------------------
//// Optional: Admin-only authorization middleware
////
//// Usage:
////
//// router.delete(
////     '/admin-only',
////     authenticate,
////     requireAdmin,
////     controller.deleteSomething
//// );
//// ------------------------------------------------------------------------------------
//export const requireAdmin = (

//    req: Request,
//    res: Response,
//    next: NextFunction

//): void => {

//    if (!req.user || req.user.role.toLowerCase() !== 'admin') {

//        res.status(403).json({
//            message: 'Forbidden: Admin access required'
//        });

//        return;
//    }

//    next();
//};


//// ------------------------------------------------------------------------------------
//// Optional: Role-based authorization middleware
////
//// Usage:
////
//// router.get(
////    '/manager',
////    authenticate,
////    requireRoles('manager', 'admin'),
////    controller.handler
//// );
//// ------------------------------------------------------------------------------------
//export const requireRoles = (...roles: string[]) => {

//    return (

//        req: Request,
//        res: Response,
//        next: NextFunction

//    ): void => {

//        const userRole = req.user?.role?.toLowerCase();

//        if (!userRole || !roles.map(r => r.toLowerCase()).includes(userRole)) {

//            res.status(403).json({
//                message: 'Forbidden: Insufficient permissions'
//            });

//            return;
//        }

//        next();
//    };
//};



// src/middlewares/authMiddleware.ts
// ------------------------------------------------------------------------------------
// PayVerify JWT Authentication Middleware
//
// FIXES APPLIED:
//
// This file now exports:
//
// 1. verifyJwtMiddleware (named export)
// 2. verifyJwtMiddleware (default export)
// 3. authenticate alias (for backward compatibility)
//
// WHY:
// Your codebase uses BOTH:
//
// import { verifyJwtMiddleware } from ...
// import verifyJwtMiddleware from ...
//
// Supporting both prevents breaking existing routes.
//
// ------------------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ------------------------------------------------------------------------------------
// Extend Express Request to include user payload
// ------------------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
    user?: any;
}

/**
 * JWT verification middleware
 *
 * Validates JWT token and attaches decoded payload to req.user
 */
export const verifyJwtMiddleware = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {

            res.status(401).json({
                message: 'Missing Authorization header'
            });

            return;
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {

            res.status(401).json({
                message: 'Missing JWT token'
            });

            return;
        }

        const secret = process.env.JWT_SECRET;

        if (!secret) {

            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, secret);

        req.user = decoded;

        next();

    }
    catch (error) {

        res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
};

// ------------------------------------------------------------------------------------
// Backward compatibility alias
//
// Some files import:
//
// import { authenticate }
//
// This ensures nothing breaks.
// ------------------------------------------------------------------------------------

export const authenticate = verifyJwtMiddleware;

// ------------------------------------------------------------------------------------
// Default export support
//
// Some files import:
//
// import verifyJwtMiddleware from ...
//
// This fixes TS1192 error.
// ------------------------------------------------------------------------------------

export default verifyJwtMiddleware;

