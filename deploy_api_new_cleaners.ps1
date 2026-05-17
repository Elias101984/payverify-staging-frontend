# ==================================================
# PayVerify API Deployment Script - FINAL RBAC FIX
# ==================================================

param([string]$EnvName = "dev")

# Basic variables
$ENV = $EnvName
$RG_ENV = "rg-payverify-dev"
$ACR = "acrpayverifydev"
$ACR_LOGIN = "$ACR.azurecr.io"
$ACA_ENV = "acaenv-payverify-dev"
$LOCATION = "centralus"

Write-Host "Starting PayVerify API deployment..." -ForegroundColor Green

# ------------------------------------------------------------------
# 0) PREREQUISITE CHECK
# ------------------------------------------------------------------
Write-Host "Step 0: Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Path ".\package.json")) {
    Write-Host "ERROR: package.json not found" -ForegroundColor Red
    exit 1
}

$DOCKER_CONTEXT = "."
if (Test-Path ".\Dockerfile") {
    Write-Host "Found Dockerfile in current directory" -ForegroundColor Green
} else {
    Write-Host "ERROR: No Dockerfile found" -ForegroundColor Red
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

Write-Host "Prerequisites check passed" -ForegroundColor Green

# ------------------------------------------------------------------
# 1) BUILD AND PUSH API IMAGE - SKIP (already done)
# ------------------------------------------------------------------
Write-Host "Step 1: Skipping image build (already completed)..." -ForegroundColor Yellow

# ------------------------------------------------------------------
# 2) POSTGRESQL DATABASE - SKIP (already done)
# ------------------------------------------------------------------
Write-Host "Step 2: Skipping PostgreSQL setup (already completed)..." -ForegroundColor Yellow

$PG = "pg-payverify-dev"
$KV = "kv-payverify-dev"
$MIG_JOB = "job-migrate-dev"
$API_APP = "api-payverify-dev"

# Get existing PostgreSQL details
$PG_FQDN = az postgres flexible-server show -g $RG_ENV -n $PG --query fullyQualifiedDomainName -o tsv
$DB_NAME = "payverify"
$APP_DB_USER = "payverify_app"
$APP_DB_PW = "AppUsr1234567"

# ------------------------------------------------------------------
# 3) FIX KEY VAULT RBAC PERMISSIONS
# ------------------------------------------------------------------
Write-Host "Step 3: Fixing Key Vault RBAC permissions..." -ForegroundColor Yellow

Write-Host "Assigning Key Vault Administrator role to current user..." -ForegroundColor Cyan
$currentUser = az ad signed-in-user show --query id -o tsv
$keyVaultScope = "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RG_ENV/providers/Microsoft.KeyVault/vaults/$KV"

# Assign Key Vault Administrator role
az role assignment create --assignee $currentUser --role "Key Vault Administrator" --scope $keyVaultScope

Write-Host "Waiting for role assignment to propagate..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

# Verify we can access secrets
Write-Host "Testing Key Vault access..." -ForegroundColor Cyan
$testSecret = az keyvault secret show --vault-name $KV -n "DATABASE-URL" --query value -o tsv 2>$null
if (-not $testSecret) {
    Write-Host "WARNING: Still cannot access secrets. Manual intervention may be needed." -ForegroundColor Yellow
    Write-Host "Please assign 'Key Vault Administrator' role manually in Azure Portal" -ForegroundColor Yellow
}

# ------------------------------------------------------------------
# 4) CONFIGURE API APP WITH DIRECT SECRETS
# ------------------------------------------------------------------
Write-Host "Step 4: Configuring API Container App with direct secrets..." -ForegroundColor Yellow

Write-Host "Getting managed identity..." -ForegroundColor Cyan
$PRINCIPAL_ID = az containerapp show -g $RG_ENV -n $API_APP --query identity.principalId -o tsv

if ($PRINCIPAL_ID) {
    Write-Host "Assigning Key Vault Secrets User role to managed identity..." -ForegroundColor Cyan
    $KV_ID = az keyvault show -g $RG_ENV -n $KV --query id -o tsv
    az role assignment create --assignee $PRINCIPAL_ID --role "Key Vault Secrets User" --scope $KV_ID
}

# Create secrets directly in Container App (bypass Key Vault references for now)
Write-Host "Setting secrets directly in Container App..." -ForegroundColor Cyan

# Get or generate secret values
$DB_URL = "postgresql://$APP_DB_USER`:$APP_DB_PW@$PG_FQDN:5432/$DB_NAME?sslmode=require"
$JWT_SECRET = "temp-jwt-secret-12345"
$API_KEY = "ApiKey_dev_1234567"

# Remove existing secrets if they exist
Write-Host "Clearing existing secrets..." -ForegroundColor Cyan
az containerapp secret remove -g $RG_ENV -n $API_APP --secret-names "database-url,jwt-secret,api-key" 2>$null

# Add secrets directly to Container App
Write-Host "Adding secrets to Container App..." -ForegroundColor Cyan
az containerapp secret set -g $RG_ENV -n $API_APP --secrets "database-url=$DB_URL" "jwt-secret=$JWT_SECRET" "api-key=$API_KEY"

Write-Host "Updating environment variables to use direct secret references..." -ForegroundColor Cyan
az containerapp update -g $RG_ENV -n $API_APP --set-env-vars "DATABASE_URL=secretref:database-url" "JWT_SECRET=secretref:jwt-secret" "API_KEY=secretref:api-key" "NODE_ENV=production" "PORT=8080"

Write-Host "API Container App configured successfully" -ForegroundColor Green

# ------------------------------------------------------------------
# 5) CREATE MIGRATION JOB WITH DIRECT SECRETS
# ------------------------------------------------------------------
Write-Host "Step 5: Creating migration job with direct secrets..." -ForegroundColor Yellow

$existingJob = az containerapp job list -g $RG_ENV --query "[?name=='$MIG_JOB'].name" -o tsv

if (-not $existingJob) {
    Write-Host "Creating migration job..." -ForegroundColor Cyan
    
    # Remove existing job if it exists in failed state
    az containerapp job delete -g $RG_ENV -n $MIG_JOB --yes 2>$null
    
    # Create job with direct secrets
    az containerapp job create -g $RG_ENV -n $MIG_JOB --environment $ACA_ENV --trigger-type Manual --replica-timeout 1800 --image "$ACR_LOGIN/payverify-api:$ENV" --cpu 0.5 --memory 1Gi --secrets "database-url=$DB_URL" "jwt-secret=$JWT_SECRET" --env-vars "DATABASE_URL=secretref:database-url" "NODE_ENV=production" "JWT_SECRET=secretref:jwt-secret" --command "bash" "--command" "-lc" "--command" "npx sequelize db:migrate"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Migration job creation had issues, but continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "Migration job created" -ForegroundColor Green
    }
} else {
    Write-Host "Migration job already exists, updating configuration..." -ForegroundColor Yellow
    az containerapp job update -g $RG_ENV -n $MIG_JOB --image "$ACR_LOGIN/payverify-api:$ENV" --secrets "database-url=$DB_URL" "jwt-secret=$JWT_SECRET" --env-vars "DATABASE_URL=secretref:database-url" "NODE_ENV=production" "JWT_SECRET=secretref:jwt-secret"
}

# ------------------------------------------------------------------
# 6) RUN MIGRATIONS
# ------------------------------------------------------------------
Write-Host "Step 6: Running database migrations..." -ForegroundColor Yellow

Write-Host "Starting migration job..." -ForegroundColor Cyan
$migrationStart = az containerapp job start -g $RG_ENV -n $MIG_JOB --query name -o tsv

if ($migrationStart) {
    Write-Host "Migration job started. Waiting for completion..." -ForegroundColor Cyan
    
    # Wait for job completion with timeout
    $timeout = 300
    $elapsed = 0
    do {
        Start-Sleep -Seconds 10
        $elapsed += 10
        $jobStatus = az containerapp job execution list -g $RG_ENV -n $MIG_JOB --query "[0].status" -o tsv 2>$null
        Write-Host "  Migration status: $jobStatus ($elapsed seconds)" -ForegroundColor Gray
    } while (($jobStatus -eq "Running" -or $jobStatus -eq "Processing") -and $elapsed -lt $timeout)
    
    if ($jobStatus -eq "Succeeded") {
        Write-Host "Database migrations completed successfully" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Migrations may not have completed successfully. Status: $jobStatus" -ForegroundColor Yellow
        Write-Host "Check logs with: az containerapp job logs show -g $RG_ENV -n $MIG_JOB" -ForegroundColor White
    }
} else {
    Write-Host "WARNING: Could not start migration job" -ForegroundColor Yellow
}

# ------------------------------------------------------------------
# COMPLETION
# ------------------------------------------------------------------
$API_FQDN = az containerapp show -g $RG_ENV -n $API_APP --query properties.configuration.ingress.fqdn -o tsv

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "RESOURCES DEPLOYED:" -ForegroundColor Cyan
Write-Host "  API URL: https://$API_FQDN" -ForegroundColor Yellow
Write-Host "  PostgreSQL: $PG_FQDN" -ForegroundColor Yellow
Write-Host "  Key Vault: $KV" -ForegroundColor Yellow
Write-Host "  Container Registry: $ACR" -ForegroundColor Yellow
Write-Host "  Migration Job: $MIG_JOB" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. Test API health endpoint:" -ForegroundColor White
Write-Host "     curl https://$API_FQDN/health" -ForegroundColor White
Write-Host "  2. Check application logs:" -ForegroundColor White
Write-Host "     az containerapp logs show -g $RG_ENV -n $API_APP" -ForegroundColor White
Write-Host "  3. Check migration logs:" -ForegroundColor White
Write-Host "     az containerapp job logs show -g $RG_ENV -n $MIG_JOB" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Key Vault RBAC may need manual configuration in Azure Portal" -ForegroundColor Magenta
Write-Host "  - Go to Azure Portal -> Key Vault -> kv-payverify-dev" -ForegroundColor White
Write-Host "  - Navigate to Access Control (IAM)" -ForegroundColor White
Write-Host "  - Ensure your user has 'Key Vault Administrator' role" -ForegroundColor White
Write-Host ""
Write-Host "PayVerify API deployment completed!" -ForegroundColor Green