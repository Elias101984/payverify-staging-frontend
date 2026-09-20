///**
// * Sequelize Database Configuration & Connection
// *
// * Reason: Centralized DB config keeps connection logic DRY and decoupled.
// * Enables reuse across all models and services.
// */

//import { Sequelize } from 'sequelize';

//// Load DB credentials from environment variables
//const DB_NAME = process.env.DB_NAME || 'payverifydb';
//const DB_USER = process.env.DB_USER || 'postgres';
//const DB_PASS = process.env.DB_PASS || 'payverify';
//const DB_HOST = process.env.DB_HOST || 'localhost';

//export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
//    host: DB_HOST,
//    dialect: 'postgres',
//    logging: false // disable SQL logging
//});

//// Utility function to test DB connection
//export const testConnection = async () => {
//    try {
//        await sequelize.authenticate();
//        console.log(' Database connection established successfully.');
//    } catch (error) {
//        console.error(' Unable to connect to the database:', error);
//    }
//};



/**
 * Sequelize Database Configuration & Connection
 *
 * Reason: Support Azure Postgres (Flexible Server) with SSL and both URL and discrete env vars.
 * - Uses DATABASE_URL if present (preferred in Azure/containers).
 * - Falls back to DB_HOST/DB_NAME/DB_USER/DB_PASS for local/dev.
 * - Enables SSL for production (rejectUnauthorized=false unless you load CA).
 */

import { Sequelize } from 'sequelize';

// ---------------------------
// Load env configuration
// ---------------------------
// Reason: Prefer single DATABASE_URL in container secrets; fall back to discrete vars in dev.
const {
    DATABASE_URL,
    DB_NAME = 'payverifydb',
    DB_USER = 'postgres',
    DB_PASS = 'password',
    DB_HOST = 'localhost',
    NODE_ENV,
} = process.env;

// ---------------------------
// SSL options for Azure Postgres
// ---------------------------
// Reason: Azure Postgres requires SSL by default. We set require=true.
// 'rejectUnauthorized' can be set to true if you mount the CA cert into the container.
const needsSSL = DATABASE_URL ? true : NODE_ENV === 'production';

const sslOptions = needsSSL
    ? {
        ssl: {
            require: true,
            rejectUnauthorized: false, // set to true only if you add the CA certificate to the image
        },
    }
    : {};

// ---------------------------
// Create Sequelize instance
// ---------------------------
// Reason: Support both URL-style and discrete config; disable verbose SQL logging in prod.
export const sequelize = DATABASE_URL
    ? new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        logging: NODE_ENV === 'development',
        dialectOptions: sslOptions,
        pool: {
            max: 10,
            min: 0,
            idle: 10000,
            acquire: 30000,
        },
    })
    : new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST,
        dialect: 'postgres',
        logging: NODE_ENV === 'development',
        dialectOptions: sslOptions,
        pool: {
            max: 10,
            min: 0,
            idle: 10000,
            acquire: 30000,
        },
    });

// ---------------------------
// Connectivity probe
// ---------------------------
// Reason: Useful in startup logs to confirm DB connection.
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error);
    }
};
