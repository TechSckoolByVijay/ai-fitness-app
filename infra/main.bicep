// Fitness Coach API — production infrastructure (Azure Container Apps +
// Postgres Flexible Server), sized for a handful of users on the cheapest
// viable tier. Deploy into the existing "fitness-app" resource group:
//
//   az deployment group create \
//     --resource-group fitness-app \
//     --template-file infra/main.bicep \
//     --parameters postgresAdminPassword=<generated> jwtSecret=<generated> \
//                  jwtRefreshSecret=<generated> aiApiKey=<key> nutritionApiKey=<key> \
//                  containerImageTag=latest
//
// Run with `az deployment group what-if` first to preview with zero risk.
//
// The container registry (fitnesscoachacr, Basic tier) is created and the
// image built/pushed to it *outside* this template (`az acr create` /
// `az acr build`) — referenced here as an existing resource so the
// Container App's system-assigned managed identity can be granted AcrPull
// on it. No registry password anywhere: the identity IS the credential.

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Base name used to derive resource names (lowercase, no spaces).')
param appName string = 'fitness-coach'

@description('Name of the existing Azure Container Registry.')
param acrName string = 'fitnesscoachacr'

@description('Image tag to deploy, e.g. "latest" or a git SHA.')
param containerImageTag string = 'latest'

@description('Postgres Flexible Server admin username.')
param postgresAdminUser string = 'fitnessadmin'

@secure()
@description('Postgres Flexible Server admin password.')
param postgresAdminPassword string

@secure()
param jwtSecret string

@secure()
param jwtRefreshSecret string

@secure()
param aiApiKey string

@secure()
param nutritionApiKey string

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

// ---------- Postgres Flexible Server (Burstable B1ms — cheapest non-free tier) ----------

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${appName}-pg'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: 'fitness_app'
}

// Small-scale, no VNet integration yet: allow Azure-internal traffic
// (Container Apps' outbound IPs aren't static on the Consumption plan)
// rather than opening the server to the whole public internet. Revisit
// with VNet integration if/when this needs tighter network isolation.
resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ---------- Container Apps environment + the API itself ----------

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${appName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${appName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${appName}-api'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: 'system'
        }
      ]
      secrets: [
        { name: 'database-url', value: 'postgresql://${postgresAdminUser}:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/fitness_app?sslmode=require' }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'jwt-refresh-secret', value: jwtRefreshSecret }
        { name: 'ai-api-key', value: aiApiKey }
        { name: 'nutrition-api-key', value: nutritionApiKey }
      ]
    }
    template: {
      // Scale to zero when idle — at 5-6 users, this is what keeps compute
      // cost near $0 on the Consumption plan instead of a flat monthly fee.
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
      containers: [
        {
          name: 'api'
          image: '${acr.properties.loginServer}/fitness-coach-api:${containerImageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PORT', value: '4000' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'MOCK_AI', value: 'false' }
            { name: 'MOCK_SPEECH', value: 'true' }
            { name: 'MOCK_NUTRITION', value: 'false' }
            { name: 'MOCK_HEALTH_DATA', value: 'true' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'JWT_REFRESH_SECRET', secretRef: 'jwt-refresh-secret' }
            { name: 'AI_API_KEY', secretRef: 'ai-api-key' }
            { name: 'AI_MODEL', value: 'gpt-4o-mini' }
            { name: 'NUTRITION_API_KEY', secretRef: 'nutrition-api-key' }
          ]
        }
      ]
    }
  }
}

var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d' // built-in "AcrPull" role

resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, apiApp.id, acrPullRoleId)
  scope: acr
  properties: {
    principalId: apiApp.identity.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalType: 'ServicePrincipal'
  }
}

output apiUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output postgresHost string = postgres.properties.fullyQualifiedDomainName
