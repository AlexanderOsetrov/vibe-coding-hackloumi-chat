# Hackloumi Chat - Windows PowerShell Scripts
# Usage: .\scripts.ps1 [command]
# Examples:
#   .\scripts.ps1 help
#   .\scripts.ps1 dev
#   .\scripts.ps1 deploy

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Configuration
$CONTAINER_NAME = "hackloumi-postgres"
$DB_NAME = "hackloumi_chat"
$DB_USER = "postgres"
$DB_PASSWORD = "password"
$DB_PORT = "5432"
$POSTGRES_VERSION = "16"

# Colors for output
$Blue = "`e[0;34m"
$Green = "`e[0;32m"
$Yellow = "`e[1;33m"
$Red = "`e[0;31m"
$NC = "`e[0m"

function Write-ColorOutput {
    param([string]$Color, [string]$Message)
    Write-Host "$Color$Message$NC"
}

function Test-Docker {
    try {
        docker --version | Out-Null
        docker info | Out-Null
        return $true
    }
    catch {
        Write-ColorOutput $Red "[ERROR] Docker is not installed or not running"
        return $false
    }
}

function Test-ContainerExists {
    try {
        $containers = docker ps -a --format "table {{.Names}}" 2>$null
        return $containers -contains $CONTAINER_NAME
    }
    catch {
        return $false
    }
}

function Test-ContainerRunning {
    try {
        $containers = docker ps --format "table {{.Names}}" 2>$null
        return $containers -contains $CONTAINER_NAME
    }
    catch {
        return $false
    }
}

function Show-Help {
    Write-Host "Hackloumi Chat - Available commands:"
    Write-Host ""
    Write-Host "📦 Development:"
    Write-Host "  dev                  Start development environment"
    Write-Host "  install              Install dependencies"
    Write-Host "  test                 Run tests"
    Write-Host "  test-watch           Run tests in watch mode"
    Write-Host ""
    Write-Host "🐳 Docker Deployment:"
    Write-Host "  build                Build the Docker image"
    Write-Host "  deploy               Build and deploy using docker-compose"
    Write-Host "  destroy              Stop and remove all containers"
    Write-Host "  start                Start stopped containers"
    Write-Host "  stop                 Stop the application"
    Write-Host "  restart              Restart the application"
    Write-Host "  logs                 Show application logs"
    Write-Host "  status               Check deployment status"
    Write-Host ""
    Write-Host "🗄️  Database Management:"
    Write-Host "  db-setup             Create and start PostgreSQL container"
    Write-Host "  db-start             Start existing database container"
    Write-Host "  db-stop              Stop database container"
    Write-Host "  db-restart           Restart database container"
    Write-Host "  db-status            Show database status"
    Write-Host "  db-connect           Connect to database using psql"
    Write-Host "  db-reset             Reset database (DESTRUCTIVE)"
    Write-Host ""
    Write-Host "🛠️  Utilities:"
    Write-Host "  clean                Clean up development artifacts"
    Write-Host "  shell                Get a shell inside the running container"
    Write-Host "  db-studio            Open Prisma Studio"
}

function Start-Dev {
    Write-ColorOutput $Blue "[INFO] Starting development environment..."
    if (!(Test-Docker)) { return }
    Verify-Database
    npm run dev
}

function Verify-Database {
    Write-ColorOutput $Blue "[INFO] Verifying database status..."
    
    if (!(Test-ContainerExists)) {
        Write-ColorOutput $Red "[ERROR] Database container not found!"
        Write-Host ""
        Write-Host "🚀 Quick setup:"
        Write-Host "  .\scripts.ps1 db-setup    # Create and start database"
        Write-Host ""
        Write-Host "💡 Or use integrated deployment:"
        Write-Host "  .\scripts.ps1 deploy      # Full docker-compose deployment"
        return
    }
    
    if (!(Test-ContainerRunning)) {
        Write-ColorOutput $Yellow "[WARNING] Database container exists but is not running"
        Write-ColorOutput $Blue "[INFO] Starting database container..."
        Start-Database
    } else {
        Write-ColorOutput $Green "✅ Database container is running"
    }
    
    Write-ColorOutput $Blue "[INFO] Verifying database connectivity..."
    $attempts = 10
    for ($i = 1; $i -le $attempts; $i++) {
        try {
            docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput $Green "✅ Database is ready for connections"
                break
            }
        }
        catch {
            # Continue to next attempt
        }
        
        if ($i -eq $attempts) {
            Write-ColorOutput $Red "[ERROR] Database is not responding after $attempts attempts"
            Write-Host ""
            Write-Host "🔧 Try these troubleshooting steps:"
            Write-Host "  .\scripts.ps1 db-status   # Check detailed status"
            Write-Host "  .\scripts.ps1 db-restart  # Restart database"
            Write-Host "  .\scripts.ps1 db-reset    # Reset database (DESTRUCTIVE)"
            return
        }
        
        Write-Host "Waiting for database to be ready... (attempt $i/$attempts)"
        Start-Sleep -Seconds 1
    }
    
    Write-ColorOutput $Green "✅ Database verification complete - ready for development!"
    Write-Host ""
}

function Install-Dependencies {
    Write-ColorOutput $Blue "[INFO] Installing dependencies..."
    npm install
    npx prisma generate
}

function Build-Image {
    Write-ColorOutput $Blue "[INFO] Building Docker image for local development..."
    docker build -t hackloumi-chat:latest .
}

function Deploy-App {
    Write-ColorOutput $Blue "[INFO] Deploying Hackloumi Chat..."
    Write-Host "Building and starting services..."
    docker-compose up --build -d
    Write-Host "Waiting for services to be ready..."
    Start-Sleep -Seconds 10
    Write-Host "Checking health status..."
    Show-Status
    Write-ColorOutput $Green "✅ Deployment complete!"
    Write-Host "🌐 Application available at: http://localhost:3000"
    Write-Host "🗄️  Database available at: localhost:5432"
}

function Destroy-App {
    Write-ColorOutput $Blue "[INFO] Destroying Hackloumi Chat deployment..."
    docker-compose down -v --remove-orphans
    Write-Host "Removing Docker image..."
    try {
        docker rmi hackloumi-chat:latest 2>$null
    }
    catch {
        # Image might not exist, continue
    }
    Write-ColorOutput $Green "🗑️  Deployment destroyed!"
}

function Show-Logs {
    docker-compose logs -f
}

function Show-Status {
    Write-Host "=== Deployment Status ==="
    docker-compose ps
    Write-Host ""
    Write-Host "=== Health Check ==="
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -ErrorAction SilentlyContinue
        $health | ConvertTo-Json -Depth 3
    }
    catch {
        Write-Host "Health endpoint not responding"
    }
}

function Restart-App {
    Write-ColorOutput $Blue "[INFO] Restarting application..."
    docker-compose restart
    Show-Status
}

function Stop-App {
    Write-ColorOutput $Blue "[INFO] Stopping application..."
    docker-compose stop
}

function Start-App {
    Write-ColorOutput $Blue "[INFO] Starting application..."
    docker-compose start
    Show-Status
}

function Setup-Database {
    Write-ColorOutput $Blue "[INFO] Setting up PostgreSQL database..."
    if (!(Test-Docker)) { return }
    
    if (Test-ContainerExists) {
        Write-ColorOutput $Yellow "[WARNING] Existing container found. Removing..."
        try {
            docker stop $CONTAINER_NAME 2>$null
            docker rm $CONTAINER_NAME 2>$null
        }
        catch {
            # Continue if commands fail
        }
    }
    
    Write-Host "Creating PostgreSQL container..."
    docker run --name $CONTAINER_NAME `
        -e POSTGRES_PASSWORD=$DB_PASSWORD `
        -e POSTGRES_DB=$DB_NAME `
        -p "${DB_PORT}:5432" `
        -d postgres:$POSTGRES_VERSION
        
    Write-Host "Waiting for database to be ready..."
    Start-Sleep -Seconds 5
    
    $attempts = 30
    for ($i = 1; $i -le $attempts; $i++) {
        try {
            docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME 2>$null
            if ($LASTEXITCODE -eq 0) {
                break
            }
        }
        catch {
            # Continue to next attempt
        }
        
        Write-Host "Waiting for database... (attempt $i/$attempts)"
        Start-Sleep -Seconds 2
    }
    
    Write-Host "Running database migrations..."
    npx prisma generate
    npx prisma db push
    
    Write-ColorOutput $Green "✅ Database setup completed successfully!"
    Write-Host "🔗 Database: localhost:$DB_PORT"
    Write-Host "🗄️  Name: $DB_NAME"
    Write-Host "👤 User: $DB_USER"
}

function Start-Database {
    Write-ColorOutput $Blue "[INFO] Starting PostgreSQL database..."
    if (!(Test-Docker)) { return }
    
    if (!(Test-ContainerExists)) {
        Write-ColorOutput $Red "[ERROR] Database container does not exist. Run '.\scripts.ps1 db-setup' first."
        return
    }
    
    if (Test-ContainerRunning) {
        Write-ColorOutput $Yellow "[WARNING] Database is already running"
        return
    }
    
    docker start $CONTAINER_NAME
    Write-Host "Waiting for database to be ready..."
    Start-Sleep -Seconds 3
    
    $attempts = 15
    for ($i = 1; $i -le $attempts; $i++) {
        try {
            docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME 2>$null
            if ($LASTEXITCODE -eq 0) {
                break
            }
        }
        catch {
            # Continue to next attempt
        }
        Start-Sleep -Seconds 1
    }
    
    Write-ColorOutput $Green "✅ Database started successfully!"
}

function Stop-Database {
    Write-ColorOutput $Blue "[INFO] Stopping PostgreSQL database..."
    if (!(Test-Docker)) { return }
    
    if (!(Test-ContainerExists)) {
        Write-ColorOutput $Yellow "[WARNING] Database container does not exist"
        return
    }
    
    if (!(Test-ContainerRunning)) {
        Write-ColorOutput $Yellow "[WARNING] Database is not running"
        return
    }
    
    docker stop $CONTAINER_NAME
    Write-ColorOutput $Green "✅ Database stopped successfully!"
}

function Show-DatabaseStatus {
    Write-ColorOutput $Blue "[INFO] Database status:"
    if (!(Test-Docker)) { return }
    
    if (!(Test-ContainerExists)) {
        Write-Host "❌ Container: Not created"
        Write-Host "💡 Run '.\scripts.ps1 db-setup' to create the database"
        return
    }
    
    if (Test-ContainerRunning) {
        Write-Host "✅ Container: Running"
        Write-Host "🔗 Connection: localhost:$DB_PORT"
        Write-Host "🗄️  Database: $DB_NAME"
        Write-Host "👤 User: $DB_USER"
        
        try {
            docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Database: Ready"
            } else {
                Write-Host "❌ Database: Not ready"
            }
        }
        catch {
            Write-Host "❌ Database: Not ready"
        }
    } else {
        Write-Host "❌ Container: Stopped"
        Write-Host "💡 Run '.\scripts.ps1 db-start' to start the database"
    }
}

function Connect-Database {
    Write-ColorOutput $Blue "[INFO] Connecting to database..."
    if (!(Test-Docker)) { return }
    
    if (!(Test-ContainerRunning)) {
        Write-ColorOutput $Red "[ERROR] Database is not running. Start it first with '.\scripts.ps1 db-start'."
        return
    }
    
    docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
}

function Reset-Database {
    Write-ColorOutput $Yellow "⚠️  This will delete all data in the development database!"
    $response = Read-Host "Are you sure? [y/N]"
    
    if ($response -eq "y" -or $response -eq "Y") {
        Write-ColorOutput $Blue "[INFO] Resetting database..."
        try {
            Stop-Database
        }
        catch {
            # Continue if stop fails
        }
        Setup-Database
        Write-ColorOutput $Green "✅ Database reset completed!"
    } else {
        Write-ColorOutput $Blue "[INFO] Reset cancelled"
    }
}

function Restart-Database {
    Write-ColorOutput $Blue "[INFO] Restarting database..."
    try {
        Stop-Database
    }
    catch {
        # Continue if stop fails
    }
    Start-Database
    Write-ColorOutput $Green "✅ Database restarted successfully!"
}

function Run-Tests {
    Write-ColorOutput $Blue "[INFO] Running tests..."
    npm run test:run
}

function Run-TestsWatch {
    Write-ColorOutput $Blue "[INFO] Running tests in watch mode..."
    npm run test
}

function Clean-Up {
    Write-ColorOutput $Blue "[INFO] Cleaning up..."
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
    }
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    docker system prune -f
    Write-ColorOutput $Green "✅ Cleanup complete!"
}

function Get-Shell {
    docker-compose exec app /bin/bash
}

function Open-DatabaseStudio {
    Write-ColorOutput $Blue "[INFO] Opening Prisma Studio..."
    npx prisma studio
}

# Main command dispatcher
switch ($Command.ToLower()) {
    "help" { Show-Help }
    "dev" { Start-Dev }
    "install" { Install-Dependencies }
    "build" { Build-Image }
    "deploy" { Deploy-App }
    "destroy" { Destroy-App }
    "start" { Start-App }
    "stop" { Stop-App }
    "restart" { Restart-App }
    "logs" { Show-Logs }
    "status" { Show-Status }
    "db-setup" { Setup-Database }
    "db-start" { Start-Database }
    "db-stop" { Stop-Database }
    "db-restart" { Restart-Database }
    "db-status" { Show-DatabaseStatus }
    "db-connect" { Connect-Database }
    "db-reset" { Reset-Database }
    "test" { Run-Tests }
    "test-watch" { Run-TestsWatch }
    "clean" { Clean-Up }
    "shell" { Get-Shell }
    "db-studio" { Open-DatabaseStudio }
    default {
        Write-ColorOutput $Red "[ERROR] Unknown command: $Command"
        Write-Host ""
        Show-Help
    }
} 