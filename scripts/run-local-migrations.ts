/**
 * PayVerify guarded local migration runner.
 * Preview by default. Never accepts DATABASE_URL or remote hosts.
 * Apply only to a dedicated local disposable database, with explicit opt-in.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const allowed = new Set(['--apply', '--preview']);
if (process.argv.slice(2).some(arg => !allowed.has(arg))) {
    throw new Error('Supported arguments: --preview (default), --apply');
}
if (process.env.DATABASE_URL?.trim()) {
    throw new Error('Refusing DATABASE_URL: use explicit local DB_HOST/DB_NAME settings.');
}
const host = process.env.DB_HOST || '127.0.0.1';
const db = process.env.DB_NAME || '';
const port = Number(process.env.DB_PORT || 5432);
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD ?? process.env.DB_PASS;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`Refusing non-local database host: ${host}`);
}
if (!/^pv_refund_[a-z0-9_]*disposable$/.test(db) && db !== 'payverify_release_e2e') {
    throw new Error(`Refusing database outside disposable allowlist: ${db}`);
}
if (process.env.DB_SSL === 'true') {
    throw new Error('Refusing SSL/remote-style database configuration.');
}
if (!password) throw new Error('DB_PASS or DB_PASSWORD is required');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT');
if (APPLY && process.env.PAYVERIFY_ALLOW_LOCAL_MIGRATIONS !== 'YES') {
    throw new Error('Apply requires PAYVERIFY_ALLOW_LOCAL_MIGRATIONS=YES');
}
const dir = path.resolve(process.cwd(), 'scripts', 'migrations');
const files = fs.readdirSync(dir)
    .filter(name => /^\d{8}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
if (!files.length) throw new Error('No versioned migration SQL files found');
const client = new Client({ host, port, database: db, user, password, ssl: false });

async function main() {
    console.log(`PayVerify local migration ${APPLY ? 'APPLY' : 'PREVIEW'}: ${host}:${port}/${db}`);
    console.log(`Excluded rollback/test SQL files: ${fs.readdirSync(dir).filter(f => f.endsWith('.sql') && !files.includes(f)).join(', ') || '(none)'}`);
    for (const name of files) console.log(`  ${name}`);
    if (!APPLY) {
        console.log('Preview only: no database connection or writes.');
        return;
    }
    await client.connect();
    try {
        const info = await client.query('SELECT current_database() AS db, inet_server_addr()::text AS addr');
        if (info.rows[0].db !== db || !['127.0.0.1', '::1'].includes(info.rows[0].addr)) {
            throw new Error('Connected database or server address did not pass local safety checks');
        }
        await client.query('SELECT pg_advisory_lock($1)', [20261104]);
        try {
            await client.query(`CREATE TABLE IF NOT EXISTS public.payverify_local_migration_history (
                filename text PRIMARY KEY,
                sha256 text NOT NULL,
                applied_at timestamptz NOT NULL DEFAULT now()
            )`);
            const history = await client.query('SELECT filename, sha256 FROM public.payverify_local_migration_history');
            const applied = new Map<string, string>(history.rows.map(r => [r.filename, r.sha256]));
            for (const name of files) {
                const sql = fs.readFileSync(path.join(dir, name), 'utf8');
                const hash = crypto.createHash('sha256').update(sql).digest('hex');
                if (applied.has(name)) {
                    if (applied.get(name) !== hash) throw new Error(`Checksum mismatch for applied migration: ${name}`);
                    console.log(`SKIP ${name} (already applied)`);
                    continue;
                }
                console.log(`APPLY ${name}`);
                // Existing SQL files contain their own BEGIN/COMMIT; don't nest a transaction.
                // Mark the migration after SQL succeeds. A crash between those steps must be
                // resolved manually using schema inspection, never by blind retry.
                await client.query(sql);
                await client.query('INSERT INTO public.payverify_local_migration_history(filename, sha256) VALUES($1,$2)', [name, hash]);
                console.log(`PASS ${name}`);
            }
        } finally {
            await client.query('SELECT pg_advisory_unlock($1)', [20261104]);
        }
    } finally {
        await client.end();
    }
}
main().catch(err => { console.error('BLOCKED:', err instanceof Error ? err.message : String(err)); process.exitCode = 1; });
