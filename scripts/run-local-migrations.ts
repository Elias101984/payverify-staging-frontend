import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const migrationDirectory = path.resolve(process.cwd(), 'scripts', 'migrations');
const connectionString = String(process.env.DATABASE_URL || '').trim();
// The application accepts both names for local PostgreSQL passwords. Keep
// the migration runner consistent so a valid DB_PASS is not treated as an
// undefined password by node-postgres.
const databasePassword = process.env.DB_PASSWORD ?? process.env.DB_PASS;

if (!connectionString && !databasePassword) {
    throw new Error(
        'Database password is missing. Set DATABASE_URL, DB_PASSWORD, or DB_PASS in the root .env file.'
    );
}

const client = new Client(
    connectionString
        ? {
            connectionString,
            ssl: process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : undefined,
        }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT || 5432),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: databasePassword,
            ssl: process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : undefined,
        }
);

const run = async () => {
    const files = fs.readdirSync(migrationDirectory)
        .filter(file => file.endsWith('.sql'))
        .sort();

    await client.connect();

    try {
        for (const file of files) {
            const sql = fs.readFileSync(path.join(migrationDirectory, file), 'utf8');
            process.stdout.write(`Applying ${file}... `);
            await client.query(sql);
            console.log('done');
        }
    } finally {
        await client.end();
    }
};

run().catch(error => {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
