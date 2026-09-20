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

@secure()
@description('PostgreSQL Admin Password')
param postgresAdminPassword string

/*
|--------------------------------------------------------------------------
| App Service Plan
|--------------------------------------------------------------------------
*/
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${environmentName}-plan'
  location: location

  /*
  |--------------------------------------------------------------------------
  | Use FREE tier initially because new Azure subscriptions
  | commonly have zero VM quota.
  |--------------------------------------------------------------------------
  */
  sku: {
    name: 'F1'
    tier: 'Free'
  }

  kind: 'linux'

  properties: {
    reserved: true
  }
}

/*
|--------------------------------------------------------------------------
| Backend API App Service
|--------------------------------------------------------------------------
*/
resource backendApi 'Microsoft.Web/sites@2023-01-01' = {
  name: appServiceName
  location: location

  kind: 'app,linux'

  properties: {
    serverFarmId: appServicePlan.id

    httpsOnly: true

    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
    }
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
    administratorLogin: 'payverifyadmin'

    /*
    |--------------------------------------------------------------------------
    | Secure parameterized password
    |--------------------------------------------------------------------------
    */
    administratorLoginPassword: postgresAdminPassword

    version: '15'

    storage: {
      storageSizeGB: 32
    }

    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
  }
}

/*
|--------------------------------------------------------------------------
| Azure Key Vault
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