# NavFlow Northflank Deployment Script
# This script helps deploy NavFlow to Northflank using the CLI

param(
    [Parameter(HelpMessage = "Northflank Project ID")]
    [string]$ProjectId = "navflow",
    
    [Parameter(HelpMessage = "GitHub repository URL (required for deployment)")]
    [string]$GitHubRepo,
    
    [Parameter(HelpMessage = "GitHub branch to deploy")]
    [string]$Branch = "main",
    
    [Parameter(HelpMessage = "Skip database creation")]
    [switch]$SkipDatabase
)

function Write-Status {
    param([string]$Message)
    Write-Host "`n✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "`n✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "`n→ $Message" -ForegroundColor Cyan
}

# Check if northflank CLI is installed
Write-Info "Checking Northflank CLI installation..."
$northflankCheck = northflank --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Northflank CLI not found. Please install it first."
    exit 1
}
Write-Status "Northflank CLI detected: $northflankCheck"

# Set project context
Write-Info "Setting Northflank project context to: $ProjectId"
northflank context use project --id $ProjectId 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to set project context"
    exit 1
}
Write-Status "Project context set"

# Create PostgreSQL Database (Optional)
if (-not $SkipDatabase) {
    Write-Info "Creating PostgreSQL database addon..."
    
    $postgresConfig = @{
        type = "postgres"
        name = "postgres"
        billing = @{ 
            plan = "free"
        }
    } | ConvertTo-Json
    
    Write-Host $postgresConfig
    Write-Error-Custom "Database creation via CLI requires specific schema validation."
    Write-Info "Please create the PostgreSQL addon manually via:"
    Write-Info "1. Visit https://app.northflank.com"
    Write-Info "2. Select NavFlow project"
    Write-Info "3. Click '+ Add' → 'Addon' → 'PostgreSQL'"
    Write-Info "4. Save the CONNECTION_STRING for the next steps"
    
    $continue = Read-Host "Press Enter once PostgreSQL addon is created..."
}

# Prompt for required information
Write-Info "Gathering deployment information..."

if ([string]::IsNullOrEmpty($GitHubRepo)) {
    $GitHubRepo = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/username/NavFlow)"
}

Write-Status "Repository: $GitHubRepo"
Write-Status "Branch: $Branch"

# Display manual deployment steps
Write-Info "`n╔════════════════════════════════════════════════════════════╗"
Write-Info "║  DEPLOYMENT GUIDE - Perform These Steps Manually          ║"
Write-Info "╚════════════════════════════════════════════════════════════╝"

Write-Host @"

📋 STEP 1: Create Backend Service
1. Visit: https://app.northflank.com
2. Select NavFlow project
3. Click '+ Add' → 'Service' → 'Combined Service'
4. Build Configuration:
   - Source: GitHub
   - Repository: $GitHubRepo
   - Branch: $Branch
   - Dockerfile: Dockerfile
   - Build context: .
5. Deployment Configuration:
   - Name: navflow-backend
   - Port: 8000
   - Instances: 1
6. Environment Variables:
   DEBUG=False
   SECRET_KEY=po@&s%gbz#o_0j!pm1t1l6dw(w7*4=kqbrq5u5)62o@-@%fn^g
   ALLOWED_HOSTS=*
   CORS_ALLOWED_ORIGINS=https://navflow-frontend.northflank.app,http://localhost:3000
   DATABASE_URL=[PostgreSQL addon connection string]

📋 STEP 2: Create Frontend Service (After backend is deployed)
1. In same project, click '+ Add' → 'Service' → 'Combined Service'
2. Build Configuration:
   - Source: GitHub
   - Repository: $GitHubRepo
   - Branch: $Branch
   - Dockerfile: Dockerfile.frontend
   - Build context: .
3. Deployment Configuration:
   - Name: navflow-frontend
   - Port: 3000
   - Instances: 1
4. Environment Variables:
   NEXT_PUBLIC_API_URL=[backend service URL - shown after backend deploys]
   NODE_ENV=production

✅ After deployment:
   - Frontend: https://navflow-frontend.northflank.app
   - Backend: https://navflow-backend.northflank.app
   - API Docs: https://navflow-backend.northflank.app/api/docs/

"@

Write-Status "Deployment guide prepared!"
Write-Info "For more details, see: NORTHFLANK_DEPLOYMENT.md"
