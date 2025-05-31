#!/bin/bash

# ⚠️  DEPRECATED: This script has been superseded by the Makefile
# 
# 🚀 USE THESE COMMANDS INSTEAD:
#   make db-setup   # Replaces: ./scripts/db.sh setup
#   make db-start   # Replaces: ./scripts/db.sh start  
#   make db-stop    # Replaces: ./scripts/db.sh stop
#   make db-status  # Replaces: ./scripts/db.sh status
#   make db-connect # Replaces: ./scripts/db.sh connect
#   make db-reset   # Replaces: ./scripts/db.sh reset
#   make help       # See all available commands
#
# 📋 The Makefile provides:
#   - Better organization and categorized help
#   - Colored output for improved readability  
#   - Integration with deployment commands
#   - Consistent interface across all operations
#   - Enhanced error handling and status reporting
#
# This script will be removed in a future version.

echo "⚠️  DEPRECATION WARNING"
echo "This script has been moved to the Makefile for better integration."
echo ""
echo "Please use 'make help' to see available database commands."
echo "Example: make db-setup, make db-start, make db-status"
echo ""
echo "Continuing with legacy script execution..."
echo ""

# Database management script for Hackloumi Chat
# Manages PostgreSQL container using Docker/Rancher Desktop

set -e

# Configuration
CONTAINER_NAME="hackloumi-postgres"
DB_NAME="hackloumi_chat"
DB_USER="postgres"
DB_PASSWORD="password"
DB_PORT="5432"
POSTGRES_VERSION="16"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker Desktop or Rancher Desktop"
        exit 1
    fi
}

# Check if container exists
container_exists() {
    docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Check if container is running
container_running() {
    docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"
}

# Setup database (create and start container, run migrations)
setup_db() {
    log_info "Setting up PostgreSQL database..."
    
    check_docker
    
    # Switch to rancher-desktop context if available
    if docker context ls | grep -q "rancher-desktop"; then
        log_info "Switching to rancher-desktop context..."
        docker context use rancher-desktop
    fi
    
    # Stop and remove existing container if it exists
    if container_exists; then
        log_warning "Existing container found. Removing..."
        docker stop $CONTAINER_NAME 2>/dev/null || true
        docker rm $CONTAINER_NAME 2>/dev/null || true
    fi
    
    # Create and start new container
    log_info "Creating PostgreSQL container..."
    docker run --name $CONTAINER_NAME \
        -e POSTGRES_PASSWORD=$DB_PASSWORD \
        -e POSTGRES_DB=$DB_NAME \
        -p $DB_PORT:5432 \
        -d postgres:$POSTGRES_VERSION
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 5
    
    # Test connection
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME &> /dev/null; then
            break
        fi
        log_info "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Database failed to start within expected time"
        exit 1
    fi
    
    # Run Prisma migrations
    log_info "Running database migrations..."
    npx prisma generate
    npx prisma db push
    
    log_success "Database setup completed successfully!"
    log_info "Database is running on localhost:$DB_PORT"
    log_info "Database name: $DB_NAME"
    log_info "Username: $DB_USER"
    log_info "Password: $DB_PASSWORD"
}

# Start existing database container
start_db() {
    log_info "Starting PostgreSQL database..."
    
    check_docker
    
    if ! container_exists; then
        log_error "Database container does not exist. Run 'setup' first."
        exit 1
    fi
    
    if container_running; then
        log_warning "Database is already running"
        return 0
    fi
    
    docker start $CONTAINER_NAME
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 3
    
    local max_attempts=15
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME &> /dev/null; then
            break
        fi
        sleep 1
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Database failed to start"
        exit 1
    fi
    
    log_success "Database started successfully!"
}

# Stop database container
stop_db() {
    log_info "Stopping PostgreSQL database..."
    
    check_docker
    
    if ! container_exists; then
        log_warning "Database container does not exist"
        return 0
    fi
    
    if ! container_running; then
        log_warning "Database is not running"
        return 0
    fi
    
    docker stop $CONTAINER_NAME
    log_success "Database stopped successfully!"
}

# Show database status
status_db() {
    log_info "Database status:"
    
    check_docker
    
    if ! container_exists; then
        echo "❌ Container: Not created"
        echo "💡 Run './scripts/db.sh setup' to create the database"
        return 0
    fi
    
    if container_running; then
        echo "✅ Container: Running"
        echo "🔗 Connection: localhost:$DB_PORT"
        echo "🗄️  Database: $DB_NAME"
        echo "👤 User: $DB_USER"
        
        # Test database connection
        if docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME &> /dev/null; then
            echo "✅ Database: Ready"
        else
            echo "❌ Database: Not ready"
        fi
    else
        echo "❌ Container: Stopped"
        echo "💡 Run './scripts/db.sh start' to start the database"
    fi
}

# Connect to database (psql)
connect_db() {
    log_info "Connecting to database..."
    
    check_docker
    
    if ! container_running; then
        log_error "Database is not running. Start it first with 'start' command."
        exit 1
    fi
    
    docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
}

# Reset database (drop and recreate)
reset_db() {
    log_warning "This will delete all data in the database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Reset cancelled"
        return 0
    fi
    
    log_info "Resetting database..."
    stop_db
    setup_db
    log_success "Database reset completed!"
}

# Show help
show_help() {
    echo "Database management script for Hackloumi Chat"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  setup     Create and start PostgreSQL container, run migrations"
    echo "  start     Start existing database container"
    echo "  stop      Stop database container"
    echo "  status    Show database status"
    echo "  connect   Connect to database using psql"
    echo "  reset     Reset database (delete all data and recreate)"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # First time setup"
    echo "  $0 start     # Start database"
    echo "  $0 status    # Check if database is running"
    echo "  $0 connect   # Open psql session"
}

# Main script logic
case "${1:-}" in
    setup)
        setup_db
        ;;
    start)
        start_db
        ;;
    stop)
        stop_db
        ;;
    status)
        status_db
        ;;
    connect)
        connect_db
        ;;
    reset)
        reset_db
        ;;
    help|--help|-h)
        show_help
        ;;
    "")
        log_error "No command specified"
        show_help
        exit 1
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac 