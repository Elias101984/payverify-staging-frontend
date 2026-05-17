# ==================================================
# PayVerify API Deployment Script - CLEAN VERSION
# ==================================================

param(
    [string]$EnvName = "dev"
)

# Set variables
$ENV = $EnvName
$RG_ENV = "rg-payverify-" + $ENV
$ACR = "scrapyverify-" + $ENV
$ACR_LOGIN = $ACR + ".azurecr.io"

Write-Host "Starting PayVerify API deployment..." -ForegroundColor Green

# ------------------------------------------------------------------
# 0) PREREQUISITE CHECK
# ------------------------------------------------------------------
Write-Host "Step 0: Checking prerequisites..." -ForegroundColor Yellow

# Check if we're in the right directory by looking for package.json and src folder
if (-not (Test-Path ".\package.json")) {
    Write-Host "ERROR: 'package.json' not found. Please run from the project root directory." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".\src")) {
    Write-Host "ERROR: 'src' folder not found. This is required for the API source code." -ForegroundColor Red
    exit 1
}

# Check Azure login
try {
    $sub = az account show --query id -o tsv 2>$null
    if (-not $sub) {
        Write-Host "Please run 'az login' first!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Please run 'az login' first!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Prerequisites check passed" -ForegroundColor Green

# ------------------------------------------------------------------
# 1) BUILD AND PUSH API IMAGE
# ------------------------------------------------------------------
Write-Host "Step 1: Building and pushing API image..." -ForegroundColor Yellow

az acr login -n $ACR
docker build -t $ACR_LOGIN/payverify-api:$ENV ./api

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}

docker push $ACR_LOGIN/payverify-api:$ENV

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: API image pushed" -ForegroundColor Green

# ------------------------------------------------------------------
# 2) CREATE POSTGRESQL DATABASE
# ------------------------------------------------------------------
Write-Host "Step 2: Creating PostgreSQL database..." -ForegroundColor Yellow

$PG = "pg-payverify-" + $ENV
$KV = "kv-payverify-" + $ENV
$MIG_JOB = "job-migrate-" + $ENV

$existingPG = az postgres flexible-server list -g $RG_ENV --query "[?name=='$PG'].name" -o tsv

if ($existingPG) {
    Write-Host "PostgreSQL already exists, skipping creation..." -ForegroundColor Yellow
    $PG_FQDN = az postgres flexible-server show -g $RG_ENV -n $PG --query fullyQualifiedDomainName -o tsv
} else {
    $PG_ADMIN = "pgadmin" + $ENV
    $PG_ADMIN_PW = "PgAdm!" + (Get-Random -Minimum 1000000 -Maximum 9999999)
    $APP_DB_USER = "payverify_app"
    $APP_DB_PW = "AppUsr!" + (Get-Random -Minimum 1000000 -Maximum 9999999)
    $DB_NAME = "payverify"

    Write-Host "Creating PostgreSQL server..."
    az postgres flexible-server create -g $RG_ENV -n $PG -l eastus --admin-user $PG_ADMIN --admin-password $PG_ADMIN_PW --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 14 --backup-retention 7

    Start-Sleep -Seconds 30
    $PG_FQDN = az postgres flexible-server show -g $RG_ENV -n $PG --query fullyQualifiedDomainName -o tsv

    Write-Host "Setting up database..."
    $env:PGPASSWORD = $PG_ADMIN_PW
    
    # Create database
    $createDbCommand = "host=" + $PG_FQDN + " dbname=postgres user=" + $PG_ADMIN + " sslmode=require"
    psql $createDbCommand -c "CREATE DATABASE $DB_NAME;" 2>$null
    
    # Create SQL file with individual commands
    $sqlFile = "setup_db.sql"
    
    # Write SQL commands one by one
    WriteSQLCommand "CREATE USER $APP_DB_USER WITH PASSWORD '$APP_DB_PW';" $sqlFile
    WriteSQLCommand "GRANT CONNECT ON DATABASE $DB_NAME TO $APP_DB_USER;" $sqlFile
    WriteSQLCommand "GRANT USAGE ON SCHEMA public TO $APP_DB_USER;" $sqlFile
    WriteSQLCommand "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $APP_DB_USER;" $sqlFile
    WriteSQLCommand "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $APP_DB_USER;" $sqlFile
    WriteSQLCommand "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $APP_DB_USER;" $sqlFile
    WriteSQLCommand "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $APP_DB_USER;" $sqlFile

    $executeSqlCommand = "host=" + $PG_FQDN + " dbname=" + $DB_NAME + " user=" + $PG_ADMIN + " sslmode=require"
    psql $executeSqlCommand -f $sqlFile 2>$null
    Remove-Item $sqlFile -ErrorAction SilentlyContinue

    Write-Host "SUCCESS: PostgreSQL created: $PG_FQDN" -ForegroundColor Green
}

# ------------------------------------------------------------------
# 3) CREATE KEY VAULT AND SECRETS
# ------------------------------------------------------------------
Write-Host "Step 3: Creating Key Vault and secrets..." -ForegroundColor Yellow

$existingKV = az keyvault list -g $RG_ENV --query "[?name=='$KV'].name" -o tsv

if ($existingKV) {
    Write-Host "Key Vault already exists, skipping creation..." -ForegroundColor Yellow
} else {
    az keyvault create -g $RG_ENV -n $KV -l eastus --enable-rbac-authorization true
    Write-Host "SUCCESS: Key Vault created" -ForegroundColor Green
}

Write-Host "Storing secrets in Key Vault..."

if (-not $existingPG) {
    $DB_URL = "postgresql://" + $APP_DB_USER + ":" + $APP_DB_PW + "@" + $PG_FQDN + ":5432/" + $DB_NAME + "?sslmode=require"
    az keyvault secret set --vault-name $KV -n "DATABASE-URL" --value $DB_URL | Out-Null
}

# Generate random secrets
$random = 1..64 | ForEach-Object { Get-Random -Maximum 256 }
$JWT_SECRET = [Convert]::ToBase64String($random)
$API_KEY = "ApiKey_" + $ENV + "_" + (Get-Random -Minimum 1000000 -Maximum 9999999)

az keyvault secret set --vault-name $KV -n "JWT-SECRET" --value $JWT_SECRET | Out-Null
az keyvault secret set --vault-name $KV -n "API-KEY" --value $API_KEY | Out-Null

Write-Host "SUCCESS: Secrets stored" -ForegroundColor Green

# ------------------------------------------------------------------
# 4) CONFIGURE EXISTING API APP
# ------------------------------------------------------------------
Write-Host "Step 4: Configuring API Container App..." -ForegroundColor Yellow

$API_APP = "api-payverify-" + $ENV

Write-Host "Enabling managed identity..."
az containerapp identity assign -g $RG_ENV -n $API_APP --system-assigned
Start-Sleep -Seconds 15

$PRINCIPAL_ID = az containerapp show -g $RG_ENV -n $API_APP --query identity.principalId -o tsv
$KV_ID = az keyvault show -g $RG_ENV -n $KV --query id -o tsv
az role assignment create --assignee $PRINCIPAL_ID --role "Key Vault Secrets User" --scope $KV_ID | Out-Null

$DBURI = az keyvault secret show --vault-name $KV -n DATABASE-URL --query id -o tsv
$JWTURI = az keyvault secret show --vault-name $KV -n JWT-SECRET --query id -o tsv
$APIKEYURI = az keyvault secret show --vault-name $KV -n API-KEY --query id -o tsv

Write-Host "Configuring secrets..."
az containerapp secret set -g $RG_ENV -n $API_APP --secrets "database-url=keyvaultref:$DBURI,identityref:system" "jwt-secret=keyvaultref:$JWTURI,identityref:system" "api-key=keyvaultref:$APIKEYURI,identityref:system"

Write-Host "Updating environment variables..."
az containerapp update -g $RG_ENV -n $API_APP --set-env-vars "DATABASE_URL=secretref:database-url" "JWT_SECRET=secretref:jwt-secret" "API_KEY=secretref:api-key" "NODE_ENV=production" "PORT=8080"

Write-Host "SUCCESS: API Container App configured" -ForegroundColor Green

# ------------------------------------------------------------------
# 5) CREATE MIGRATION JOB
# ------------------------------------------------------------------
Write-Host "Step 5: Creating migration job..." -ForegroundColor Yellow

$existingJob = az containerapp job list -g $RG_ENV --query "[?name=='$MIG_JOB'].name" -o tsv

if ($existingJob) {
    Write-Host "Migration job already exists, skipping..." -ForegroundColor Yellow
} else {
    $jobCommand = "az containerapp job create -g " + $RG_ENV + " -n " + $MIG_JOB + " --environment acsenv-payverify-" + $ENV + " --trigger-type Manual --image " + $ACR_LOGIN + "/payverify-api:" + $ENV + " --cpu 0.5 --memory 1Gi --replica-timeout 1800 --env-vars DATABASE_URL=secretref:database-url NODE_ENV=production JWT_SECRET=secretref:jwt-secret --secrets database-url=keyvaultref:" + $DBURI + ",identityref:system jwt-secret=keyvaultref:" + $JWTURI + ",identityref:system --command bash,-lc,npx sequelize db:migrate"
    Invoke-Expression $jobCommand
    Write-Host "SUCCESS: Migration job created" -ForegroundColor Green
}

# ------------------------------------------------------------------
# COMPLETION
# ------------------------------------------------------------------
$API_FQDN = az containerapp show -g $RG_ENV -n $API_APP --query properties.configuration.ingress.fqdn -o tsv

Write-Host ""
$equalsLine = "=================================================="
Write-Host $equalsLine -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host $equalsLine -ForegroundColor Green
Write-Host ""
Write-Host "API URL: https://$API_FQDN" -ForegroundColor Yellow
Write-Host "PostgreSQL: $PG_FQDN" -ForegroundColor Yellow
Write-Host "Key Vault: $KV" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Run migrations: az containerapp job start -g $RG_ENV -n $MIG_JOB" -ForegroundColor White
Write-Host "2. Test API: curl https://$API_FQDN/health" -ForegroundColor White
Write-Host "3. Check logs: az containerapp logs show -g $RG_ENV -n $API_APP" -ForegroundColor White
Write-Host ""
Write-Host "Done! Your PayVerify API is deployed." -ForegroundColor Green

# Helper function to write SQL commands
function WriteSQLCommand {
    param(
        [string]$Command,
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        Add-Content -Path $FilePath -Value $Command -Encoding utf8
    } else {
        Out-File -FilePath $FilePath -InputObject $Command -Encoding utf8
    }
}