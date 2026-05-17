<# 
Clone local Postgres DB -> Azure PostgreSQL Flexible Server

WHAT'S NEW / CHANGED (and why)
- Use ${var} in the DATABASE_URL: avoids PowerShell parsing errors around ":" (e.g., user:password).
- Use libpq connection strings for psql/pg_restore: guarantees sslmode=require is honored by the client.
- Single Conn() helper: builds proper SSL-enabled connection strings and reduces duplication.
- Safer verify query: shows if a table exists and its row count without failing if missing.
- Clearer, strict error handling and tool checks.

REQUIREMENTS
- PostgreSQL client tools installed and on PATH: psql, pg_dump, pg_restore
- Your Azure PG firewall allows your public IP
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

### ---------- EDIT THESE 6 VALUES ----------
# Local (source)
$LocalHost     = "localhost"
$LocalDb       = "payverifydb"
$LocalUser     = "postgres"
$LocalPassword = "payverify00"             # <-- your local postgres password

# Azure (destination)
$AzureHost     = "pg-payverify-dev.postgres.database.azure.com"
$AzureDb       = "payverifydb"
$AzureUser     = "pgadmindev"
$AzurePassword = "Azurepayverify123$"   # <-- set this
### ----------------------------------------

# Tables to verify (add/remove if needed)
$VerifyTables = @("merchants","users","transactions")

# Timestamped dump file
$stamp    = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpFile = "payverify_local_$stamp.dump"

# ---- Helper: ensure required CLI tools exist ----
function Require-Cli($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required tool '$name' not found on PATH. Install PostgreSQL client tools (psql/pg_dump/pg_restore) and retry."
  }
}
Require-Cli "psql"
Require-Cli "pg_dump"
Require-Cli "pg_restore"

# ---- Helper: build libpq connection string with SSL (recommended for Azure PG) ----
function Conn([string]$dbName) {
  if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "postgres" } # used for CREATE DATABASE step
  return "host=$AzureHost port=5432 user=$AzureUser password=$AzurePassword dbname=$dbName sslmode=require"
}

Write-Host "=== 1) DUMP local DB: $LocalDb @ $LocalHost ===" -ForegroundColor Cyan
$env:PGPASSWORD = $LocalPassword
pg_dump -h $LocalHost -U $LocalUser -d $LocalDb -Fc -f $dumpFile
Write-Host "Dump written: $(Resolve-Path $dumpFile)`n" -ForegroundColor Green

Write-Host "=== 2) Ensure Azure DB '$AzureDb' exists (create if missing) ===" -ForegroundColor Cyan
try {
  # Using Conn('') connects to default 'postgres' DB with SSL, so CREATE DATABASE works reliably.
  psql "$(Conn '')" -v ON_ERROR_STOP=1 -c "CREATE DATABASE $AzureDb WITH OWNER $AzureUser ENCODING 'UTF8';" | Out-Null
  Write-Host "Created database '$AzureDb'." -ForegroundColor Green
} catch {
  Write-Host "Database '$AzureDb' likely exists; continuing…" -ForegroundColor Yellow
}

Write-Host "=== 3) RESTORE dump into Azure ($AzureDb) ===" -ForegroundColor Cyan
# --clean/--if-exists: drop objects before recreating; --no-owner/--no-privileges: avoid role mismatch issues
pg_restore --verbose --clean --if-exists --no-owner --no-privileges `
  -d "$(Conn $AzureDb)" $dumpFile
Write-Host "`nRestore complete." -ForegroundColor Green

Write-Host "=== 4) VERIFY row counts in Azure ===" -ForegroundColor Cyan
# Build a single query that won’t error if a table is missing.
$sql = ($VerifyTables | ForEach-Object {
@"
SELECT '$($_)' AS table,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema='public' AND table_name='$($_)'
       )
       THEN 1 ELSE 0 END AS exists_flag,
       (SELECT COUNT(*) FROM public.$($_))::bigint
         FILTER (WHERE EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema='public' AND table_name='$($_)'
         )) AS row_count
"@
}) -join " UNION ALL "

psql "$(Conn $AzureDb)" -c "$sql;"

Write-Host "`n=== Suggested DATABASE_URL for your API (Azure Container App) ===" -ForegroundColor Cyan
# Use ${} around var names to avoid PowerShell parsing issues with ":" and "@" in URLs.
Add-Type -AssemblyName System.Web
$encodedPw   = [System.Web.HttpUtility]::UrlEncode($AzurePassword)
$databaseUrl = "postgres://${AzureUser}:${encodedPw}@${AzureHost}:5432/${AzureDb}?sslmode=require"
Write-Host $databaseUrl -ForegroundColor Yellow

Write-Host "`nNext:" -ForegroundColor Cyan
Write-Host "1) In Container App (api-payverify-dev) -> Secrets, set DATABASE_URL to the value above."
Write-Host "2) Redeploy/update the app so the API picks it up."
Write-Host "3) Hit /api/health and try a few Swagger calls (auth where required)." -ForegroundColor Gray
