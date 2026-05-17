@description('Environment Name')
param environmentName string

@description('Azure Location')
param location string = resourceGroup().location

@description('App Service Name')
param appServiceName string

@description('PostgreSQL Server Name')
param postgresServerName string

@description('Key Vault Name')
param keyVaultName string

@description('Storage Account Name')
param storageAccountName string

@description('Administrator Login')
param postgresAdminLogin string

@secure()
@description('Administrator Password')
param postgresAdminPassword string

/*
|--------------------------------------------------------------------------
| App Service Plan
|--------------------------------------------------------------------------
*/
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${environmentName}-plan'
  location: location

  sku: {
    name: 'B1'
    tier: 'Basic'
  }

  kind: 'linux'

  properties: {
    reserved: true
  }
}

/*
|--------------------------------------------------------------------------
| App Service
|--------------------------------------------------------------------------
*/
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  location: location

  kind: 'app,linux'

  properties: {
    serverFarmId: appServicePlan.id

    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'

      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
      ]
    }

    httpsOnly: true
  }
}

/*
|--------------------------------------------------------------------------
| PostgreSQL Flexible Server
|--------------------------------------------------------------------------
*/
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: postgresServerName
  location: location

  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }

  properties: {
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword

    version: '16'

    storage: {
      storageSizeGB: 32
    }

    backup: {
      backupRetentionDays: 7
    }

    highAvailability: {
      mode: 'Disabled'
    }

    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

/*
|--------------------------------------------------------------------------
| Storage Account
|--------------------------------------------------------------------------
*/
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location

  sku: {
    name: 'Standard_LRS'
  }

  kind: 'StorageV2'

  properties: {
    accessTier: 'Hot'
  }
}

/*
|--------------------------------------------------------------------------
| Key Vault
|--------------------------------------------------------------------------
*/
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location

  properties: {
    tenantId: subscription().tenantId

    sku: {
      family: 'A'
      name: 'standard'
    }

    accessPolicies: []

    enabledForDeployment: true
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: true
  }
}