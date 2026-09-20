# =========================================================
# PAYVERIFY DEV INFRASTRUCTURE DEPLOYMENT
# =========================================================

# ---------------------------------------------------------
# Environment Configuration
# ---------------------------------------------------------

$resourceGroup = "payverify-centralus-dev-rg"
$location = "centralus"

# ---------------------------------------------------------
# Resolve Current Script Location
# ---------------------------------------------------------

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# ---------------------------------------------------------
# Build Absolute Paths
# ---------------------------------------------------------

$templateFile = Join-Path $scriptRoot "..\bicep\main.bicep"
$parameterFile = Join-Path $scriptRoot "..\parameters\dev.parameters.json"

Write-Host ""
Write-Host "========================================="
Write-Host " PayVerify Infrastructure Deployment"
Write-Host "========================================="
Write-Host ""

# ---------------------------------------------------------
# Display Deployment Information
# ---------------------------------------------------------

Write-Host "Resource Group:"
Write-Host $resourceGroup

Write-Host ""

Write-Host "Location:"
Write-Host $location

Write-Host ""

Write-Host "Script Root:"
Write-Host $scriptRoot

Write-Host ""

Write-Host "Template File:"
Write-Host $templateFile

Write-Host ""

Write-Host "Parameter File:"
Write-Host $parameterFile

Write-Host ""

# ---------------------------------------------------------
# Validate Files Exist
# ---------------------------------------------------------

if (!(Test-Path $templateFile))
{
    Write-Host "ERROR: Bicep template file not found!"
    exit
}

if (!(Test-Path $parameterFile))
{
    Write-Host "ERROR: Parameter file not found!"
    exit
}

# ---------------------------------------------------------
# Create Resource Group
# ---------------------------------------------------------

Write-Host ""
Write-Host "========================================="
Write-Host " Creating Resource Group"
Write-Host "========================================="
Write-Host ""

az group create `
    --name $resourceGroup `
    --location $location

# ---------------------------------------------------------
# Deploy Bicep Infrastructure
# ---------------------------------------------------------

Write-Host ""
Write-Host "========================================="
Write-Host " Deploying Bicep Infrastructure"
Write-Host "========================================="
Write-Host ""

az deployment group create `
    --resource-group $resourceGroup `
    --template-file $templateFile `
    --parameters $parameterFile

# ---------------------------------------------------------
# Deployment Complete
# ---------------------------------------------------------

Write-Host ""
Write-Host "========================================="
Write-Host " Deployment Completed"
Write-Host "========================================="
Write-Host ""

Write-Host "Verify resources in Azure Portal:"
Write-Host $resourceGroup

Write-Host ""