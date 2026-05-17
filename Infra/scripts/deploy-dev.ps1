# ============================================================
# PAYVERIFY - DEV INFRASTRUCTURE DEPLOYMENT
# ============================================================

param (
    [string]$resourceGroupName = "payverify-dev-rg",
    [string]$location = "eastus"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================="
Write-Host "PAYVERIFY DEV DEPLOYMENT"
Write-Host "==========================================="
Write-Host ""

# ============================================================
# LOGIN
# ============================================================

Write-Host "Logging into Azure..."
az login

# ============================================================
# CREATE RESOURCE GROUP
# ============================================================

Write-Host ""
Write-Host "Creating Resource Group..."

az group create `
    --name $resourceGroupName `
    --location $location

# ============================================================
# DEPLOY BICEP
# ============================================================

Write-Host ""
Write-Host "Deploying Infrastructure..."

az deployment group create `
    --resource-group $resourceGroupName `
    --template-file ../bicep/main.bicep `
    --parameters @../bicep/main.parameters.dev.json

Write-Host ""
Write-Host "==========================================="
Write-Host "DEPLOYMENT COMPLETE"
Write-Host "==========================================="