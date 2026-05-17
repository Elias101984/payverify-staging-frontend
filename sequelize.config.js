// sequelize.config.js

// Load environment variables from a .env file into process.env
// This is useful for local development (so you don’t hardcode secrets)
require('dotenv').config();

// Check if a single DATABASE_URL environment variable is provided
// (common in production: postgres://user:pass@host:5432/dbname)
const url = process.env.DATABASE_URL;

// Build a "base" configuration object that Sequelize CLI will use.
// This allows the same code to support both styles of configuration:
//   1) Full connection string (DATABASE_URL)
//   2) Separate pieces (DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, etc.)
const base = url
  ? {
      // If DATABASE_URL exists, tell Sequelize to use it
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      dialectOptions: {
        // Enforce SSL (required by Azure Postgres and many cloud providers)
        ssl: { require: true, rejectUnauthorized: false }
      }
    }
  : {
      // Otherwise, fall back to discrete environment variables
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'payverify', // default if none provided
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      dialect: 'postgres',
      dialectOptions: {
        // If PGSSLMODE=require, turn on SSL with relaxed certificate validation
        ssl: process.env.PGSSLMODE === 'require'
          ? { require: true, rejectUnauthorized: false }
          : undefined
      }
    };

// Export the config object under the three environments Sequelize CLI expects:
// - development
// - test
// - production
// All three point to the same "base" setup so you don't duplicate logic.
module.exports = {
  development: base,
  test: base,
  production: base,
};
