/**
 * Create or refresh one local merchant account without deleting data.
 *
 * This is deliberately separate from the old historical seed.ts file. It is
 * intended for a developer database only and must be explicitly enabled.
 * It creates the account needed to exercise login and the dashboard; orders,
 * invoices, and payment records should be created through the application so
 * their normal services are exercised.
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const trim = (value: unknown): string => String(value ?? '').trim();

const required = (name: string): string => {
    const value = trim(process.env[name]);
    if (!value) {
        throw new Error(`Set ${name} before running the local seed.`);
    }
    return value;
};

const quote = (identifier: string): string =>
    `"${identifier.replace(/"/g, '""')}"`;

const connectionString = trim(process.env.DATABASE_URL);
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
            password: process.env.DB_PASSWORD || process.env.DB_PASS,
            ssl: process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : undefined,
        }
);

const run = async (): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('The local seed is disabled when NODE_ENV=production.');
    }

    if (process.env.ALLOW_LOCAL_SEED !== 'true') {
        throw new Error(
            'Local seed is disabled. Set ALLOW_LOCAL_SEED=true for this one-time command.'
        );
    }

    const email = required('SEED_MERCHANT_EMAIL').toLowerCase();
    const password = required('SEED_MERCHANT_PASSWORD');
    const merchantName = trim(process.env.SEED_MERCHANT_NAME) || 'PayVerify Local Demo';
    const cacNumber = trim(process.env.SEED_MERCHANT_CAC) || 'PAYVERIFY-LOCAL-001';
    const accountNumber = trim(process.env.SEED_MERCHANT_ACCOUNT) || '0123456789';
    const bankName = trim(process.env.SEED_MERCHANT_BANK) || 'GTBank';
    const tinNumber = trim(process.env.SEED_MERCHANT_TIN) || null;
    const bvn = trim(process.env.SEED_MERCHANT_BVN) || null;

    await client.connect();
    try {
        const columnsResult = await client.query<{
            table_name: string;
            column_name: string;
        }>(`
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name IN ('users', 'merchants')
        `);

        const columns = new Map<string, Set<string>>();
        for (const row of columnsResult.rows) {
            const tableColumns = columns.get(row.table_name) || new Set<string>();
            tableColumns.add(row.column_name);
            columns.set(row.table_name, tableColumns);
        }

        const userColumns = columns.get('users') || new Set<string>();
        const merchantColumns = columns.get('merchants') || new Set<string>();

        for (const [table, requiredColumns] of [
            ['users', ['email', 'role', 'password_hash']],
            ['merchants', ['name', 'cac_number', 'account_number', 'bank_name']],
        ] as const) {
            const tableColumns = columns.get(table) || new Set<string>();
            const missing = requiredColumns.filter(column => !tableColumns.has(column));
            if (missing.length > 0) {
                throw new Error(
                    `${table} is missing required columns: ${missing.join(', ')}. Run npm run migrate:local first.`
                );
            }
        }

        const userCreated = userColumns.has('createdAt') ? 'createdAt' : 'created_at';
        const userUpdated = userColumns.has('updatedAt') ? 'updatedAt' : 'updated_at';
        if (!userColumns.has(userCreated) || !userColumns.has(userUpdated)) {
            throw new Error('users is missing timestamp columns; check the initial schema.');
        }

        const merchantUser = merchantColumns.has('userId')
            ? 'userId'
            : merchantColumns.has('user_id')
                ? 'user_id'
                : null;
        if (!merchantUser) {
            throw new Error('merchants is missing its user relationship column; check the initial schema.');
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await client.query('BEGIN');

        const userResult = await client.query<{ id: number }>(
            `
                INSERT INTO users
                    (${quote('email')}, ${quote('role')}, ${quote('password_hash')}, ${quote(userCreated)}, ${quote(userUpdated)})
                VALUES ($1, 'merchant', $2, NOW(), NOW())
                ON CONFLICT (${quote('email')}) DO UPDATE SET
                    ${quote('role')} = 'merchant',
                    ${quote('password_hash')} = EXCLUDED.${quote('password_hash')},
                    ${quote(userUpdated)} = NOW()
                RETURNING id
            `,
            [email, passwordHash]
        );

        const userId = userResult.rows[0]?.id;
        if (!userId) {
            throw new Error('The local seed could not resolve the merchant user id.');
        }

        const merchantFields: Array<[string, unknown]> = [
            ['name', merchantName],
            [merchantUser, userId],
            ['cac_number', cacNumber],
            ['tin_number', tinNumber],
            ['bvn', bvn],
            ['account_number', accountNumber],
            ['bank_name', bankName],
        ];

        if (merchantColumns.has('email')) merchantFields.push(['email', email]);
        if (merchantColumns.has('status')) merchantFields.push(['status', 'approved']);

        // Some historical databases contain both timestamp naming styles.
        // Populate every style that exists so the seed works with either one.
        for (const timestamp of ['created_at', 'updated_at', 'createdAt', 'updatedAt']) {
            if (merchantColumns.has(timestamp)) merchantFields.push([timestamp, undefined]);
        }

        const merchantColumnNames = merchantFields.map(([column]) => quote(column));

        // Build values separately so timestamp expressions do not consume
        // parameter positions.
        const valueExpressions: string[] = [];
        const parameters: unknown[] = [];
        for (const [, value] of merchantFields) {
            if (value === undefined) {
                valueExpressions.push('NOW()');
            } else {
                parameters.push(value);
                valueExpressions.push(`$${parameters.length}`);
            }
        }

        const updateColumns = ['name', merchantUser, 'tin_number', 'bvn', 'account_number', 'bank_name']
            .filter(column => merchantColumns.has(column));
        if (merchantColumns.has('email')) updateColumns.push('email');
        if (merchantColumns.has('status')) updateColumns.push('status');
        if (merchantColumns.has('updated_at')) updateColumns.push('updated_at');
        if (merchantColumns.has('updatedAt')) updateColumns.push('updatedAt');

        await client.query(
            `
                INSERT INTO merchants (${merchantColumnNames.join(', ')})
                VALUES (${valueExpressions.join(', ')})
                ON CONFLICT (${quote('cac_number')}) DO UPDATE SET
                    ${updateColumns.map(column => `${quote(column)} = EXCLUDED.${quote(column)}`).join(', ')}
            `,
            parameters
        );

        await client.query('COMMIT');
        console.log(`Local merchant seed ready: ${email}`);
        console.log('Use the password supplied through SEED_MERCHANT_PASSWORD to log in.');
    } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
    } finally {
        await client.end();
    }
};

run().catch(error => {
    console.error('Local seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
