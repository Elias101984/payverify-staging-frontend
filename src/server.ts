// =============================================================================
// src/server.ts
// =============================================================================
// PURPOSE:
// - Load environment variables
// - Initialize database
// - Load Sequelize models
// - Apply associations
// - Start Express server
//
// IMPORTANT:
// - No application routes are mounted here
// - No test endpoints here
// - No Swagger mounting here
// - No duplicate health route here
// =============================================================================

import dotenv from "dotenv";

dotenv.config();

import app from "./app";

import {
    sequelize,
    testConnection
} from "./config/db";

import "./models/index";

import {
    applyAssociations
} from "./models/associations";


// =============================================================================
// PORT
// =============================================================================

const PORT =
    Number(process.env.PORT) || 5000;


// =============================================================================
// START SERVER
// =============================================================================

const startServer = async (): Promise<void> => {

    try {

        console.log("Connecting to database...");

        await testConnection();

        console.log("Database connected successfully");


        // ---------------------------------------------------------------------
        // Apply Sequelize relationships
        // ---------------------------------------------------------------------

        applyAssociations();

        console.log("Associations applied");


        // ---------------------------------------------------------------------
        // Development-only sync
        //
        // Production should use migrations.
        // ---------------------------------------------------------------------

        if (
            (process.env.NODE_ENV || "development")
            === "development"
        ) {

            await sequelize.sync();

            console.log(
                "Database synchronized (development mode)"
            );
        }


        // ---------------------------------------------------------------------
        // Start HTTP server
        // ---------------------------------------------------------------------

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