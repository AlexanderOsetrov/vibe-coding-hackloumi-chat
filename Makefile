# Hackloumi Chat - Infrastructure Makefile
.PHONY: help build deploy destroy logs status test clean dev db-setup db-start db-stop db-status db-connect db-reset db-restart

# Configuration
CONTAINER_NAME := hackloumi-postgres
DB_NAME := hackloumi_chat
DB_USER := postgres
DB_PASSWORD := password
DB_PORT := 5432
POSTGRES_VERSION := 16

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

# Default target
help: ## Show this help message
	@echo "Hackloumi Chat - Available commands:"
	@echo ""
	@echo "📦 Development:"
	@grep -E '^(dev|install|test|test-watch):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🐳 Docker Deployment:"
	@grep -E '^(build|deploy|destroy|start|stop|restart|logs|status):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🗄️  Database Management:"
	@grep -E '^(db-setup|db-start|db-stop|db-restart|db-status|db-connect|db-reset):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🛠️  Utilities:"
	@grep -E '^(clean|shell|db-studio|verify-db):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Helper functions
check-docker:
	@command -v docker >/dev/null 2>&1 || (echo "$(RED)[ERROR]$(NC) Docker is not installed" && exit 1)
	@docker info >/dev/null 2>&1 || (echo "$(RED)[ERROR]$(NC) Docker daemon is not running" && exit 1)

container-exists:
	@docker ps -a --format "table {{.Names}}" | grep -q "^$(CONTAINER_NAME)$$"

container-running:
	@docker ps --format "table {{.Names}}" | grep -q "^$(CONTAINER_NAME)$$"

# Development commands
dev: check-docker verify-db ## Start development environment
	@echo "$(BLUE)[INFO]$(NC) Starting development environment..."
	npm run dev

verify-db: ## Verify database is running and ready for development
	@echo "$(BLUE)[INFO]$(NC) Verifying database status..."
	@if ! make container-exists 2>/dev/null; then \
		echo "$(RED)[ERROR]$(NC) Database container not found!"; \
		echo ""; \
		echo "🚀 Quick setup:"; \
		echo "  make db-setup    # Create and start database"; \
		echo ""; \
		echo "💡 Or use integrated deployment:"; \
		echo "  make deploy      # Full docker-compose deployment"; \
		exit 1; \
	fi
	@if ! make container-running 2>/dev/null; then \
		echo "$(YELLOW)[WARNING]$(NC) Database container exists but is not running"; \
		echo "$(BLUE)[INFO]$(NC) Starting database container..."; \
		make db-start; \
	else \
		echo "$(GREEN)✅ Database container is running$(NC)"; \
	fi
	@echo "$(BLUE)[INFO]$(NC) Verifying database connectivity..."
	@for i in $$(seq 1 10); do \
		if docker exec $(CONTAINER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; then \
			echo "$(GREEN)✅ Database is ready for connections$(NC)"; \
			break; \
		fi; \
		if [ $$i -eq 10 ]; then \
			echo "$(RED)[ERROR]$(NC) Database is not responding after 10 attempts"; \
			echo ""; \
			echo "🔧 Try these troubleshooting steps:"; \
			echo "  make db-status   # Check detailed status"; \
			echo "  make db-restart  # Restart database"; \
			echo "  make db-reset    # Reset database (DESTRUCTIVE)"; \
			exit 1; \
		fi; \
		echo "Waiting for database to be ready... (attempt $$i/10)"; \
		sleep 1; \
	done
	@echo "$(GREEN)✅ Database verification complete - ready for development!$(NC)"
	@echo ""

install: ## Install dependencies
	@echo "$(BLUE)[INFO]$(NC) Installing dependencies..."
	npm install
	npx prisma generate

# Build commands
build: ## Build the Docker image
	@echo "$(BLUE)[INFO]$(NC) Building Docker image..."
	docker build -t hackloumi-chat:latest .

# Docker Deployment commands (all-in-one containers)
deploy: build ## Build and deploy the application using docker-compose
	@echo "$(BLUE)[INFO]$(NC) Deploying Hackloumi Chat..."
	@echo "Building and starting services..."
	docker-compose up --build -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Checking health status..."
	@make status
	@echo "$(GREEN)✅ Deployment complete!$(NC)"
	@echo "🌐 Application available at: http://localhost:3000"
	@echo "🗄️  Database available at: localhost:5432"

destroy: ## Stop and remove all containers, networks, and volumes
	@echo "$(BLUE)[INFO]$(NC) Destroying Hackloumi Chat deployment..."
	docker-compose down -v --remove-orphans
	@echo "Removing Docker image..."
	docker rmi hackloumi-chat:latest || true
	@echo "$(GREEN)🗑️  Deployment destroyed!$(NC)"

# Operations commands
logs: ## Show application logs
	docker-compose logs -f

status: ## Check deployment status and health
	@echo "=== Deployment Status ==="
	@docker-compose ps
	@echo ""
	@echo "=== Health Check ==="
	@curl -s http://localhost:3000/api/health | jq . || echo "Health endpoint not responding"

restart: ## Restart the application
	@echo "$(BLUE)[INFO]$(NC) Restarting application..."
	docker-compose restart
	@make status

stop: ## Stop the application without removing containers
	@echo "$(BLUE)[INFO]$(NC) Stopping application..."
	docker-compose stop

start: ## Start stopped containers
	@echo "$(BLUE)[INFO]$(NC) Starting application..."
	docker-compose start
	@make status

# Database Management commands (standalone PostgreSQL for development)
db-setup: check-docker ## Create and start PostgreSQL container for development
	@echo "$(BLUE)[INFO]$(NC) Setting up PostgreSQL database..."
	@if make container-exists 2>/dev/null; then \
		echo "$(YELLOW)[WARNING]$(NC) Existing container found. Removing..."; \
		docker stop $(CONTAINER_NAME) 2>/dev/null || true; \
		docker rm $(CONTAINER_NAME) 2>/dev/null || true; \
	fi
	@echo "Creating PostgreSQL container..."
	@docker run --name $(CONTAINER_NAME) \
		-e POSTGRES_PASSWORD=$(DB_PASSWORD) \
		-e POSTGRES_DB=$(DB_NAME) \
		-p $(DB_PORT):5432 \
		-d postgres:$(POSTGRES_VERSION)
	@echo "Waiting for database to be ready..."
	@sleep 5
	@for i in $$(seq 1 30); do \
		if docker exec $(CONTAINER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; then \
			break; \
		fi; \
		echo "Waiting for database... (attempt $$i/30)"; \
		sleep 2; \
	done
	@echo "Running database migrations..."
	@npx prisma generate
	@npx prisma db push
	@echo "$(GREEN)✅ Database setup completed successfully!$(NC)"
	@echo "🔗 Database: localhost:$(DB_PORT)"
	@echo "🗄️  Name: $(DB_NAME)"
	@echo "👤 User: $(DB_USER)"

db-start: check-docker ## Start existing database container
	@echo "$(BLUE)[INFO]$(NC) Starting PostgreSQL database..."
	@if ! make container-exists 2>/dev/null; then \
		echo "$(RED)[ERROR]$(NC) Database container does not exist. Run 'make db-setup' first."; \
		exit 1; \
	fi
	@if make container-running 2>/dev/null; then \
		echo "$(YELLOW)[WARNING]$(NC) Database is already running"; \
		exit 0; \
	fi
	@docker start $(CONTAINER_NAME)
	@echo "Waiting for database to be ready..."
	@sleep 3
	@for i in $$(seq 1 15); do \
		if docker exec $(CONTAINER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; then \
			break; \
		fi; \
		sleep 1; \
	done
	@echo "$(GREEN)✅ Database started successfully!$(NC)"

db-stop: check-docker ## Stop database container
	@echo "$(BLUE)[INFO]$(NC) Stopping PostgreSQL database..."
	@if ! make container-exists 2>/dev/null; then \
		echo "$(YELLOW)[WARNING]$(NC) Database container does not exist"; \
		exit 0; \
	fi
	@if ! make container-running 2>/dev/null; then \
		echo "$(YELLOW)[WARNING]$(NC) Database is not running"; \
		exit 0; \
	fi
	@docker stop $(CONTAINER_NAME)
	@echo "$(GREEN)✅ Database stopped successfully!$(NC)"

db-status: check-docker ## Show database status
	@echo "$(BLUE)[INFO]$(NC) Database status:"
	@if ! make container-exists 2>/dev/null; then \
		echo "❌ Container: Not created"; \
		echo "💡 Run 'make db-setup' to create the database"; \
		exit 0; \
	fi
	@if make container-running 2>/dev/null; then \
		echo "✅ Container: Running"; \
		echo "🔗 Connection: localhost:$(DB_PORT)"; \
		echo "🗄️  Database: $(DB_NAME)"; \
		echo "👤 User: $(DB_USER)"; \
		if docker exec $(CONTAINER_NAME) pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; then \
			echo "✅ Database: Ready"; \
		else \
			echo "❌ Database: Not ready"; \
		fi; \
	else \
		echo "❌ Container: Stopped"; \
		echo "💡 Run 'make db-start' to start the database"; \
	fi

db-connect: check-docker ## Connect to database using psql
	@echo "$(BLUE)[INFO]$(NC) Connecting to database..."
	@if ! make container-running 2>/dev/null; then \
		echo "$(RED)[ERROR]$(NC) Database is not running. Start it first with 'make db-start'."; \
		exit 1; \
	fi
	@docker exec -it $(CONTAINER_NAME) psql -U $(DB_USER) -d $(DB_NAME)

db-reset: check-docker ## Reset database (DESTRUCTIVE - for development DB)
	@echo "$(YELLOW)⚠️  This will delete all data in the development database!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		echo "$(BLUE)[INFO]$(NC) Resetting database..."; \
		make db-stop || true; \
		make db-setup; \
		echo "$(GREEN)✅ Database reset completed!$(NC)"; \
	else \
		echo ""; \
		echo "$(BLUE)[INFO]$(NC) Reset cancelled"; \
	fi

db-restart: check-docker ## Restart database container
	@echo "$(BLUE)[INFO]$(NC) Restarting database..."
	@make db-stop || true
	@make db-start
	@echo "$(GREEN)✅ Database restarted successfully!$(NC)"

# Testing commands
test: ## Run tests
	@echo "$(BLUE)[INFO]$(NC) Running tests..."
	npm run test:run

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)[INFO]$(NC) Running tests in watch mode..."
	npm run test

# Utility commands
clean: ## Clean up development artifacts
	@echo "$(BLUE)[INFO]$(NC) Cleaning up..."
	rm -rf .next/
	rm -rf node_modules/
	docker system prune -f
	@echo "$(GREEN)✅ Cleanup complete!$(NC)"

shell: ## Get a shell inside the running container
	docker-compose exec app /bin/bash

db-studio: ## Open Prisma Studio for database management
	@echo "$(BLUE)[INFO]$(NC) Opening Prisma Studio..."
	npx prisma studio

# Production-ready commands (for future AWS deployment)
deploy-aws: ## Deploy to AWS (placeholder for future implementation)
	@echo "$(YELLOW)[WARNING]$(NC) AWS deployment not yet implemented"
	@echo "This will use Terraform to provision infrastructure"

destroy-aws: ## Destroy AWS deployment (placeholder for future implementation)
	@echo "$(YELLOW)[WARNING]$(NC) AWS destruction not yet implemented"
	@echo "This will use Terraform to destroy infrastructure" 