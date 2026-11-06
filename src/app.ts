
// =====================================================================================
// src/app.ts
// =====================================================================================
//
// PayVerify Express application configuration.
//
// SECURITY:
// - Helmet security headers
// - Strict production CORS allowlist
// - Global API rate limiting
// - Raw Paystack webhook body preservation
// - JSON body size limits
// - Minimal production health endpoint
// - Centralized 404 handling
//
// IMPORTANT:
// Paystack webhook MUST remain before express.json().
// =====================================================================================

import express, {
    NextFunction,
    Request,
    Response
} from "express";

import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

dotenv.config();

import { sequelize } from "./config/db";
import * as models from "./models";

import authRoutes from "./routes/authRoutes";
import merchantRoutes from "./routes/merchantRoutes";
import adminRoutes from "./routes/adminRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import paymentRoutes from "./routes/PaymentRoute";
import qrRoutes from "./routes/qr";
import bankRoutes from "./routes/bankRoutes";
import bankAuthRoutes from "./routes/bankAuthRoutes";
import userRoutes from "./routes/userRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import refundRoutes from "./routes/refundRoutes";
import disputeRoutes from "./routes/disputeRoutes";
import aiRoutes from "./routes/aiRoutes";
import bankMerchantRoutes from "./routes/bankMerchantRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import meRoutes from "./routes/meRoutes";

import {
    createPurchaseOrderRoutes
} from "./routes/PurchaseOrderRoutes";

import paymentIntentRoutes from "./routes/paymentIntentRoutes";
import paystackWebhookRoutes from "./routes/paystackWebhookRoutes";
import publicInvoiceRoutes from "./routes/publicInvoiceRoutes";


// =====================================================================================
// APP
// =====================================================================================

const app = express();

const isProduction =
    process.env.NODE_ENV === "production";


// =====================================================================================
// TRUST PROXY
// =====================================================================================
//
// PayVerify is deployed behind Render / Cloudflare.
//
// One trusted proxy hop allows Express rate limiting and req.ip to use
// forwarded client information correctly.
//
// Do not change this to `true` without reviewing the proxy topology.
// =====================================================================================

app.set("trust proxy", 1);


// =====================================================================================
// SECURITY HEADERS
// =====================================================================================

app.use(
    helmet({
        // PayVerify is an API.
        // CSP is primarily relevant to rendered HTML applications.
        contentSecurityPolicy: false
    })
);


// =====================================================================================
// CORS
// =====================================================================================

const allowedOrigins =
    (process.env.CORS_ORIGINS || "")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);


// Fail closed in production.
//
// Development remains convenient for localhost,
// but production requires an explicit CORS_ORIGINS configuration.

if (
    isProduction &&
    allowedOrigins.length === 0
) {

    throw new Error(
        "CORS_ORIGINS must be configured in production"
    );
}


app.use(
    cors({

        origin: (
            origin,
            callback
        ) => {

            // -------------------------------------------------------------
            // Requests without Origin include:
            // - Paystack
            // - curl/Postman
            // - server-to-server traffic
            //
            // CORS is a browser security mechanism, so these are allowed
            // through here and protected by endpoint-specific controls.
            // -------------------------------------------------------------

            if (!origin) {
                return callback(null, true);
            }


            // -------------------------------------------------------------
            // Explicitly configured origin
            // -------------------------------------------------------------

            if (
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
            }


            // -------------------------------------------------------------
            // Development convenience
            // -------------------------------------------------------------

            if (
                !isProduction &&
                (
                    origin.startsWith(
                        "http://localhost:"
                    ) ||
                    origin.startsWith(
                        "http://127.0.0.1:"
                    )
                )
            ) {

                return callback(null, true);
            }


            return callback(
                new Error(
                    "Origin not allowed by CORS policy"
                )
            );
        },

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);


// =====================================================================================
// PAYSTACK WEBHOOK
// =====================================================================================
//
// CRITICAL:
//
// This MUST be mounted BEFORE express.json().
//
// Paystack signs the original request body.
// express.raw() preserves that exact body for HMAC SHA-512 verification.
//
// Do NOT:
// - add JWT middleware here
// - add Turnstile here
// - move this below express.json()
// =====================================================================================

app.use(
    "/api/webhooks",
    express.raw({
        type: "application/json",
        limit: "256kb"
    }),
    paystackWebhookRoutes
);


// =====================================================================================
// BODY PARSING
// =====================================================================================

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: false,
        limit: "1mb"
    })
);


// =====================================================================================
// REQUEST LOGGING
// =====================================================================================

app.use(
    morgan(
        isProduction
            ? "combined"
            : "dev"
    )
);


// =====================================================================================
// GLOBAL API RATE LIMIT
// =====================================================================================
//
// This is the broad safety net.
//
// Authentication endpoints will receive tighter limits separately.
// Paystack webhook is mounted ABOVE this limiter intentionally.
// =====================================================================================

const apiLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit: 300,

        standardHeaders: "draft-7",

        legacyHeaders: false,

        message: {
            error:
                "Too many requests. Please try again later."
        }
    });


app.use(
    "/api",
    apiLimiter
);


// =====================================================================================
// PUBLIC INVOICE ROUTES
// =====================================================================================
//
// Public invoice routes rely on opaque public tokens.
// We will audit their exact data exposure separately.
// =====================================================================================

app.use(
    "/api",
    publicInvoiceRoutes
);


// =====================================================================================
// PURCHASE ORDERS
// =====================================================================================

app.use(
    "/api/purchase-orders",
    createPurchaseOrderRoutes(
        models,
        sequelize
    )
);


// =====================================================================================
// AUTH
// =====================================================================================

app.use(
    "/api/auth",
    authRoutes
);


// =====================================================================================
// MERCHANT / APPLICATION ROUTES
// =====================================================================================

app.use(
    "/api/merchants",
    merchantRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/transactions",
    transactionRoutes
);

app.use(
    "/api",
    dashboardRoutes
);

app.use(
    "/api/payments",
    paymentRoutes
);

app.use(
    "/api/qr",
    qrRoutes
);

app.use(
    "/api/users",
    userRoutes
);

// Authenticated "current user" resources (including /api/me/merchants).
// Keep this mounted before the more general dashboard routes so the
// frontend merchant selector has a stable, tenant-scoped endpoint.
app.use(
    "/api",
    meRoutes
);

app.use(
    "/api/invoices",
    invoiceRoutes
);


// =====================================================================================
// BANK ROUTES
// =====================================================================================

app.use(
    "/api/bank",
    bankAuthRoutes
);

app.use(
    "/api/bank",
    bankMerchantRoutes
);

app.use(
    "/api/banks",
    bankRoutes
);


// =====================================================================================
// ANALYTICS / AI
// =====================================================================================

app.use(
    "/api/analytics",
    analyticsRoutes
);

app.use(
    "/api/ai",
    aiRoutes
);


// =====================================================================================
// REFUNDS / DISPUTES
// =====================================================================================



app.use(
    "/api",
    refundRoutes
);

app.use(
    "/api",
    disputeRoutes
);


// =====================================================================================
// PAYMENT INTENTS
// =====================================================================================

app.use(
    "/api/payment-intents",
    paymentIntentRoutes
);


// =====================================================================================
// HEALTH
// =====================================================================================
//
// Minimal health information.
//
// Do not expose:
// - database information
// - environment variables
// - versions
// - secrets
// - infrastructure details
// =====================================================================================

app.get(
    "/healthz",
    (_req: Request, res: Response) => {

        return res.status(200).json({
            status: "ok"
        });
    }
);


// =====================================================================================
// 404
// =====================================================================================

app.use(
    (
        req: Request,
        res: Response
    ) => {

        return res.status(404).json({
            error: "Not found",
            path: req.path
        });
    }
);


// =====================================================================================
// CENTRAL ERROR HANDLER
// =====================================================================================
//
// Prevent unexpected errors from returning stack traces or implementation
// details to clients.
// =====================================================================================

app.use(
    (
        error: Error,
        _req: Request,
        res: Response,
        _next: NextFunction
    ) => {

        console.error(
            "Unhandled API error:",
            error.message
        );


        if (
            error.message ===
            "Origin not allowed by CORS policy"
        ) {

            return res.status(403).json({
                error: "Origin not allowed"
            });
        }


        return res.status(500).json({
            error: "Internal server error"
        });
    }
);


export default app;
