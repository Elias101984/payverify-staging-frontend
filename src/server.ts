//// src/server.ts
//// ------------------------------------------------------------------------------------
//// PayVerify API Server Bootstrap
////
//// IMPORTANT FIXES MADE:
////
//// FIX #1 — Correct association import
//// BEFORE (incorrect):
//// import associations from './models/associations';
////
//// AFTER (correct):
//// import { applyAssociations } from './models/associations';
////
//// WHY:
//// associations.ts exports a NAMED function, not a default export.
//// ------------------------------------------------------------------------------------
//import dotenv from "dotenv";



//import 'dotenv/config';

//import app from './app';

//import { mountSwagger } from './config/swagger';
//import { sequelize, testConnection } from './config/db';

//import paymentIntentRoutes  from './routes/paymentIntentRoutes';

//// ------------------------------------------------------------------------------------
//// IMPORTANT: Import models BEFORE applying associations
////
//// WHY:
//// Sequelize must register models before relationships are applied.
//// ------------------------------------------------------------------------------------
//import './models/index';

//// Correct import (FIXED)
//import { applyAssociations } from './models/associations';

//dotenv.config();

//// Swagger
//app.use('/api-docs', mountSwagger());

//app.use(
//    '/api/payment-intents',
//    paymentIntentRoutes
//);

//// Health check endpoint
//app.get('/api/health', (_req, res) => {
//    res.json({
//        ok: true,
//        service: 'PayVerify API',
//        timestamp: new Date().toISOString()
//    });
//});

//const PORT = Number(process.env.PORT) || 5000;

///**
// * Bootstraps the PayVerify server
// */
//const startServer = async (): Promise<void> => {

//    try {

//        console.log('Connecting to database...');

//        await testConnection();

//        console.log('Database connected successfully');

//        // --------------------------------------------------------------------------------
//        // Apply Sequelize associations
//        //
//        // IMPORTANT:
//        // Must be called AFTER models are initialized
//        // --------------------------------------------------------------------------------
//        applyAssociations();

//        console.log('Associations applied');

//        // --------------------------------------------------------------------------------
//        // Sync models ONLY in development
//        // Production should use migrations
//        // --------------------------------------------------------------------------------
//        if ((process.env.NODE_ENV || 'development') === 'development') {

//            await sequelize.sync();

//            console.log('Database synchronized (development mode)');
//        }

//        app.listen(PORT, '0.0.0.0', () => {

//            console.log(`
//=========================================
// PayVerify API running
// Port: ${PORT}
// Env: ${process.env.NODE_ENV || 'development'}
//=========================================
//`);
//        });

//    } catch (error) {

//        console.error('Failed to start server:', error);

//        process.exit(1);
//    }
//};

//startServer();



// =============================================================================
// PayVerify API Server Bootstrap (FINAL CLEAN VERSION)
// =============================================================================

import dotenv from "dotenv";

/**
 * Load environment variables FIRST
 * This ensures SendGrid, DB, Cloudinary, etc are available everywhere
 */
dotenv.config();

import app from "./app";

import { mountSwagger } from "./config/swagger";

import {
    sequelize,
    testConnection
} from "./config/db";

import paymentIntentRoutes
    from "./routes/paymentIntentRoutes";

import "./models/index";

import {
    applyAssociations
} from "./models/associations";

import invoiceRoutes from "./routes/invoiceRoutes";

import paymentRoutes from "./routes/PaymentRoute";

import { PaystackService } from "./services/PaystackService";

app.get("/api/test-payment", async (req, res) => {

    try {

        const paystack =
            new PaystackService();

        const result =
            await paystack.initializePayment(

                "test@email.com",
                5000,
                `TEST-${Date.now()}`,
                "http://localhost:5173/payment-success"

            );

        res.json(result);

    }
    catch (error) {

        console.error(error);

        res.status(500).json(error);

    }

});


// =============================================================================
// Payment route
// =============================================================================

app.use("/api/payments", paymentRoutes);

// =============================================================================
// Invoice route
// =============================================================================

app.use(
    "/api/invoices",
    invoiceRoutes
);




// =============================================================================
// Swagger Docs
// =============================================================================

app.use(
    "/api-docs",
    mountSwagger()
);


// =============================================================================
// PaymentIntent Routes
// =============================================================================

app.use(
    "/api/payment-intents",
    paymentIntentRoutes
);


// =============================================================================
// Health Check
// =============================================================================

app.get(
    "/api/health",
    (_req, res) => {

        res.json({

            ok: true,

            service: "PayVerify API",

            timestamp:
                new Date().toISOString()

        });

    }
);


// =============================================================================
// Server Bootstrap
// =============================================================================

const PORT =
    Number(process.env.PORT)
    || 5000;


const startServer =
    async (): Promise<void> => {

        try {

            console.log(
                "Connecting to database..."
            );

            await testConnection();

            console.log(
                "Database connected successfully"
            );


            applyAssociations();

            console.log(
                "Associations applied"
            );


            if (
                (process.env.NODE_ENV || "development")
                === "development"
            ) {

                await sequelize.sync();

                console.log(
                    "Database synchronized"
                );

            }


            app.listen(
                PORT,
                "0.0.0.0",
                () => {

                    console.log(`
=========================================
 PayVerify API running
 Port: ${PORT}
 Env: ${process.env.NODE_ENV || "development"}
=========================================
`);

                }
            );

        }
        catch (error) {

            console.error(
                "Server startup failed:",
                error
            );

            process.exit(1);

        }

    };

startServer();

