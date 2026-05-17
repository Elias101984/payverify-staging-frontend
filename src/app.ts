// =====================================================================================
// src/app.ts
// =====================================================================================
//
// PURPOSE:
// Main Express application bootstrap file.
//
// RESPONSIBILITIES:
// • Initialize Express
// • Load middleware (CORS, JSON, logging)
// • Mount all application routes
// • Inject Sequelize models into modular route factories
// • Provide health check endpoint
//
// DESIGN PRINCIPLES:
// • Dependency Injection (models + sequelize passed into routes)
// • Modular route architecture
// • Clean separation of concerns
// • Production-grade structure used in fintech systems like PayVerify
//
// =====================================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import invoiceRoutes from "./routes/invoiceRoutes";
// =====================================================================================
// LOAD ENVIRONMENT VARIABLES
// =====================================================================================

dotenv.config();

// =====================================================================================
// IMPORT DATABASE + MODELS
// =====================================================================================
//
// We inject these into route factories so routes can use services safely
//

import { sequelize } from './config/db';
import * as models from './models';

// =====================================================================================
// IMPORT ROUTES
// =====================================================================================

import authRoutes from './routes/authRoutes';
import merchantRoutes from './routes/merchantRoutes';
import adminRoutes from './routes/adminRoutes';
import transactionRoutes from './routes/transactionRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import paymentRoutes from './routes/PaymentRoute';
import qrRoutes from './routes/qr';
import bankRoutes from './routes/bankRoutes';
import bankAuthRoutes from './routes/bankAuthRoutes';
import userRoutes from './routes/userRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import refundRoutes from './routes/refundRoutes';
import disputeRoutes from './routes/disputeRoutes';
import aiRoutes from './routes/aiRoutes';
import bankMerchantRoutes from './routes/bankMerchantRoutes';

// IMPORTANT: PurchaseOrder routes are a FACTORY function
// NOT a default export
import { createPurchaseOrderRoutes } from './routes/PurchaseOrderRoutes';

import paymentIntentRoutes from "./routes/paymentIntentRoutes";



import paystackWebhookRoutes
    from "./routes/paystackWebhookRoutes";

import publicInvoiceRoutes from "./routes/publicInvoiceRoutes";






// =====================================================================================
// CREATE EXPRESS APP
// =====================================================================================

const app = express();

// =====================================================================================
// TRUST PROXY (Required for Azure, Cloudflare, Load Balancers)
// =====================================================================================

app.set('trust proxy', 1);

// =====================================================================================
// CORS CONFIGURATION
// =====================================================================================
//
// Allows frontend (React / Next.js) to call backend
//

const allowedOrigins =
    process.env.CORS_ORIGINS
        ?.split(',')
        .map(o => o.trim())
        .filter(Boolean) || [];

app.use(
    cors({
        origin: allowedOrigins.length ? allowedOrigins : true,
        credentials: true,
    })
);

// =====================================================================================
// BODY PARSER
// =====================================================================================
//
// Parses incoming JSON requests
//

/**
 * ============================================================
 * 🔥 PAYSTACK WEBHOOK (RAW BODY REQUIRED)
 * ============================================================
 * MUST come BEFORE express.json()
 * Otherwise signature verification will fail
 */
app.use(
    "/api/webhooks/paystack",
    express.raw({ type: "application/json" }),
    paystackWebhookRoutes
);

/**
 * ============================================================
 * NORMAL JSON PARSER (FOR ALL OTHER ROUTES)
 * ============================================================
 */
app.use(express.json({ limit: '1mb' }));

//app.use("/api/public", publicInvoiceRoutes);

app.use("/api", publicInvoiceRoutes);

// =====================================================================================
// REQUEST LOGGER
// =====================================================================================
//
// Dev: shows clean logs
// Prod: shows full Apache-style logs
//

app.use(
    morgan(
        process.env.NODE_ENV === 'production'
            ? 'combined'
            : 'dev'
    )
);

// =====================================================================================
// PURCHASE ORDER ROUTES (Dependency Injection Pattern)
// =====================================================================================
//
// WHY this pattern?
//
// Because PurchaseOrder routes require:
// • models
// • sequelize
//
// So we pass them into the route factory.
//
// This is the correct enterprise-grade architecture.
//
// Endpoint base:
//
// POST   /api/purchase-orders
// GET    /api/purchase-orders
// GET    /api/purchase-orders/:id
// PUT    /api/purchase-orders/:id
// DELETE /api/purchase-orders/:id
//

app.use(
    '/api/purchase-orders',
    createPurchaseOrderRoutes(models, sequelize)
);

// =====================================================================================
// CORE API ROUTES
// =====================================================================================

app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/users', userRoutes);
app.use("/api/invoices", invoiceRoutes);
// =====================================================================================
// BANK ROUTES
// =====================================================================================

app.use('/api/bank', bankAuthRoutes);
app.use('/api/bank', bankMerchantRoutes);
app.use('/api/banks', bankRoutes);

// =====================================================================================
// ANALYTICS / AI / REFUND / DISPUTE ROUTES
// =====================================================================================

app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', refundRoutes);
app.use('/api', disputeRoutes);
app.use("/api/payment-intents", paymentIntentRoutes);



//app.use('/api/payment-intents', createPaymentIntentRoutes(models));

// =====================================================================================
// HEALTH CHECK ROUTE
// =====================================================================================
//
// Used by:
//
// Azure
// Kubernetes
// Load Balancers
//

app.get('/healthz', (_req, res) => {
    res.json({
        status: 'OK',
        service: 'PayVerify API',
        timestamp: new Date(),
    });
});

// =====================================================================================
// EXPORT APP
// =====================================================================================
//
// server.ts will import this file and start listening on a port
//

app.use(
    "/api/webhooks",
    paystackWebhookRoutes
);

export default app;
