# Hackloumi Chat - Infrastructure Makefile
.PHONY: help build deploy destroy logs status test clean dev db-setup db-start db-stop db-status db-connect db-reset set-vars-aws plan-ecr-aws plan-app-aws build-aws push-aws deploy-ecr-aws deploy-app-aws deploy-aws destroy-ecr-aws destroy-app-aws

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

# AWS environment loading pattern - handles both local (.env) and CI/CD environments
# Check if running in CI or if environment variables are already set
AWS_ENV_SETUP = if [ "$$CI" = "true" ] || [ -n "$$AWS_ACCESS_KEY_ID" ]; then \
		echo "$(BLUE)[INFO]$(NC) Using environment variables (CI/CD mode)..."; \
		export TF_VAR_node_env="$$NODE_ENV"; \
		export TF_VAR_database_url="$$DATABASE_URL"; \
		export TF_VAR_jwt_secret="$$JWT_SECRET"; \
		export TF_VAR_vpc_id="$$VPC_ID"; \
		export TF_VAR_public_subnet_ids="[\"$$(echo $$SUBNET_IDS | sed 's/,/","/g')\"]"; \
		export TF_VAR_aws_region="$$AWS_REGION"; \
		export TF_VAR_owner="$$OWNER"; \
	else \
		echo "$(BLUE)[INFO]$(NC) Loading from .env file (local development)..."; \
		set -a && . ./.env && set +a; \
		export TF_VAR_node_env="$$NODE_ENV"; \
		export TF_VAR_database_url="$$DATABASE_URL"; \
		export TF_VAR_jwt_secret="$$JWT_SECRET"; \
		export TF_VAR_vpc_id="$$VPC_ID"; \
		export TF_VAR_public_subnet_ids="[\"$$(echo $$SUBNET_IDS | sed 's/,/","/g')\"]"; \
		export TF_VAR_aws_region="$$AWS_REGION"; \
		export TF_VAR_owner="$$OWNER"; \
		export AWS_ACCESS_KEY_ID="$$AWS_ACCESS_KEY_ID"; \
		export AWS_SECRET_ACCESS_KEY="$$AWS_SECRET_ACCESS_KEY"; \
		export AWS_SESSION_TOKEN="$$AWS_SESSION_TOKEN"; \
		export AWS_REGION="$$AWS_REGION"; \
		export AWS_ACCOUNT_ID="$$AWS_ACCOUNT_ID"; \
	fi

# AWS environment validation - checks for required variables regardless of source
AWS_ENV_CHECK = if [ "$$CI" = "true" ] || [ -n "$$AWS_ACCESS_KEY_ID" ]; then \
		echo "$(GREEN)✅ CI/CD environment detected - using environment variables$(NC)"; \
		if [ -z "$$NODE_ENV" ] || [ -z "$$AWS_ACCESS_KEY_ID" ] || [ -z "$$AWS_REGION" ] || [ -z "$$OWNER" ]; then \
			echo "$(RED)[ERROR]$(NC) Required environment variables missing in CI/CD!"; \
			echo ""; \
			echo "📋 Required environment variables:"; \
			echo "  NODE_ENV (current: $$NODE_ENV)"; \
			echo "  DATABASE_URL (current: $$DATABASE_URL)"; \
			echo "  JWT_SECRET (current: *****)"; \
			echo "  VPC_ID (current: $$VPC_ID)"; \
			echo "  SUBNET_IDS (current: $$SUBNET_IDS)"; \
			echo "  AWS_ACCESS_KEY_ID (current: $$AWS_ACCESS_KEY_ID)"; \
			echo "  AWS_SECRET_ACCESS_KEY (current: *****)"; \
			echo "  AWS_REGION (current: $$AWS_REGION)"; \
			echo "  AWS_ACCOUNT_ID (current: $$AWS_ACCOUNT_ID)"; \
			echo "  OWNER (current: $$OWNER)"; \
			echo ""; \
			exit 1; \
		fi; \
	else \
		echo "$(BLUE)[INFO]$(NC) Local development - checking .env file..."; \
		if [ ! -f .env ]; then \
			echo "$(RED)[ERROR]$(NC) .env file not found!"; \
			echo ""; \
			echo "📋 Create a .env file with the following variables:"; \
			echo "  NODE_ENV=production"; \
			echo "  DATABASE_URL=postgresql://hackloumi:hackloumi@localhost:5432/hackloumi"; \
			echo "  JWT_SECRET=your-jwt-secret-here"; \
			echo "  VPC_ID=vpc-xxxxxxxxx"; \
			echo "  SUBNET_IDS=subnet-xxxxxxx,subnet-yyyyyyy"; \
			echo "  AWS_ACCESS_KEY_ID=your-aws-access-key"; \
			echo "  AWS_SECRET_ACCESS_KEY=your-aws-secret-key"; \
			echo "  AWS_SESSION_TOKEN=your-aws-session-token-if-using-temporary-credentials"; \
			echo "  AWS_REGION=us-east-1"; \
			echo "  AWS_ACCOUNT_ID=123456789012"; \
			echo "  OWNER=your.email@company.com"; \
			echo ""; \
			exit 1; \
		fi; \
	fi

# Default target
help: ## Show this help message
	@echo "Hackloumi Chat - Available commands:"
	@echo ""
	@echo "📦 Development:"
	@grep -E '^(dev|install|test|test-watch):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🐳 Docker Deployment:"
	@grep -E '^(build|deploy|destroy|start|stop|restart|logs|status):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "☁️  AWS Planning & Setup:"
	@grep -E '^(set-vars-aws|plan-ecr-aws|plan-app-aws):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🚀 AWS Deployment:"
	@grep -E '^(deploy-ecr-aws|build-aws|push-aws|deploy-app-aws|deploy-aws):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "💥 AWS Destruction:"
	@grep -E '^(destroy-ecr-aws|destroy-app-aws):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🗄️  Database Management:"
	@grep -E '^(db-setup|db-start|db-stop|db-restart|db-status|db-connect|db-reset):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "🛠️  Utilities:"
	@grep -E '^(clean|shell|db-studio|verify-db):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

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
build: ## Build the Docker image for local development
	@echo "$(BLUE)[INFO]$(NC) Building Docker image for local development..."
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

# AWS Deployment commands
set-vars-aws: ## Set AWS Terraform variables (from .env locally or environment variables in CI/CD)
	@echo "$(BLUE)[INFO]$(NC) Setting AWS Terraform variables..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	echo "$(GREEN)✅ Terraform variables set successfully!$(NC)" && \
	echo "" && \
	echo "🔧 Set variables:" && \
	echo "  TF_VAR_node_env=$$NODE_ENV" && \
	echo "  TF_VAR_database_url=$$DATABASE_URL" && \
	echo "  TF_VAR_jwt_secret=****" && \
	echo "  TF_VAR_vpc_id=$$VPC_ID" && \
	echo "  TF_VAR_public_subnet_ids=[\"$$(echo $$SUBNET_IDS | sed 's/,/","/g')\"]" && \
	echo "  TF_VAR_aws_region=$$AWS_REGION" && \
	echo "  TF_VAR_owner=$$OWNER" && \
	if [ "$$CI" != "true" ] && [ -z "$$AWS_ACCESS_KEY_ID" ]; then \
		echo "  AWS_ACCESS_KEY_ID=****" && \
		echo "  AWS_SECRET_ACCESS_KEY=****" && \
		echo "  AWS_SESSION_TOKEN=****" && \
		echo "  AWS_REGION=$$AWS_REGION" && \
		echo "  AWS_ACCOUNT_ID=****"; \
	fi && \
	echo "" && \
	echo "🚀 Now you can run Terragrunt commands:" && \
	echo "  cd terraform/ecr && terragrunt plan" && \
	echo "  cd terraform/app && terragrunt plan"

plan-ecr-aws: ## Plan ECR repository using Terragrunt
	@echo "$(BLUE)[INFO]$(NC) Planning ECR repository with Terragrunt..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	cd terraform/ecr && terragrunt plan && \
	echo "$(GREEN)✅ ECR repository planning completed$(NC)"

plan-app-aws: ## Plan application infrastructure using Terragrunt
	@echo "$(BLUE)[INFO]$(NC) Planning application infrastructure with Terragrunt..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	cd terraform/app && terragrunt plan && \
	echo "$(GREEN)✅ Application infrastructure planning completed$(NC)"

build-aws: ## Build Docker image for AWS deployment (ARM64)
	@echo "$(BLUE)[INFO]$(NC) Building Docker image for AWS deployment (ARM64)..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	ECR_REPOSITORY=$$(cd terraform/ecr && terragrunt output -raw ecr_repository_url 2>/dev/null || echo "") && \
	if [ -z "$$ECR_REPOSITORY" ]; then \
		echo "$(RED)[ERROR]$(NC) ECR repository not found!"; \
		echo "  Run 'make deploy-ecr-aws' first to create ECR repository"; \
		exit 1; \
	fi && \
	echo "$(GREEN)✅ Found ECR repository: $$ECR_REPOSITORY$(NC)" && \
	echo "$(BLUE)[INFO]$(NC) Building ARM64 Docker image for AWS..." && \
	docker buildx build --platform linux/arm64 -t hackloumi-chat:latest . --load && \
	docker tag hackloumi-chat:latest $$ECR_REPOSITORY:latest && \
	echo "$(GREEN)✅ Docker image built and tagged successfully$(NC)" && \
	echo "  Local tag: hackloumi-chat:latest" && \
	echo "  ECR tag: $$ECR_REPOSITORY:latest"

push-aws: ## Push Docker image to ECR
	@echo "$(BLUE)[INFO]$(NC) Pushing Docker image to ECR..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	ECR_REPOSITORY=$$(cd terraform/ecr && terragrunt output -raw ecr_repository_url 2>/dev/null || echo "") && \
	if [ -z "$$ECR_REPOSITORY" ]; then \
		echo "$(RED)[ERROR]$(NC) ECR repository not found!"; \
		echo "  Run 'make build-aws' first"; \
		exit 1; \
	fi && \
	AWS_REGION=$$(echo "$$ECR_REPOSITORY" | cut -d'.' -f4) && \
	if [ -z "$$AWS_REGION" ]; then AWS_REGION="us-west-2"; fi && \
	echo "$(GREEN)✅ Found ECR repository: $$ECR_REPOSITORY$(NC)" && \
	echo "$(BLUE)[INFO]$(NC) Using region: $$AWS_REGION$(NC)" && \
	echo "$(BLUE)[INFO]$(NC) Logging into ECR..." && \
	aws ecr get-login-password --region $$AWS_REGION | docker login --username AWS --password-stdin $$ECR_REPOSITORY && \
	echo "$(BLUE)[INFO]$(NC) Pushing images to ECR..." && \
	docker push $$ECR_REPOSITORY:latest && \
	echo "$(GREEN)✅ Images pushed successfully to ECR$(NC)"

deploy-ecr-aws: ## Deploy ECR repository using Terragrunt
	@echo "$(BLUE)[INFO]$(NC) Deploying ECR repository to AWS..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	cd terraform/ecr && \
	echo "$(BLUE)[INFO]$(NC) Applying ECR infrastructure with Terragrunt..." && \
	terragrunt apply -auto-approve && \
	echo "$(GREEN)✅ ECR repository deployed successfully!$(NC)"

deploy-app-aws: ## Deploy application infrastructure using Terragrunt
	@echo "$(BLUE)[INFO]$(NC) Deploying application infrastructure to AWS..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	ECR_REPOSITORY=$$(cd terraform/ecr && terragrunt output -raw ecr_repository_url 2>/dev/null || echo "") && \
	export TF_VAR_container_image="$$ECR_REPOSITORY:latest" && \
	cd terraform/app && \
	echo "$(BLUE)[INFO]$(NC) Applying application infrastructure with Terragrunt..." && \
	terragrunt apply -auto-approve && \
	echo "$(GREEN)✅ Application infrastructure deployed successfully!$(NC)" && \
	echo "" && \
	echo "🚀 Application deployed to AWS!" && \
	echo "💡 To get the application URL:" && \
	echo "  aws ecs list-tasks --cluster $$(terragrunt output -raw ecs_cluster_name)" && \
	echo "  aws ecs describe-tasks --cluster <cluster> --tasks <task-arn>"

deploy-aws: deploy-ecr-aws build-aws push-aws deploy-app-aws ## Full AWS deployment pipeline (ECR → build → push → app)
	@echo "$(GREEN)✅ Complete AWS deployment pipeline finished!$(NC)"
	@echo ""
	@echo "🎉 Hackloumi Chat successfully deployed to AWS!"
	@echo ""
	@echo "📋 Deployment Summary:"
	@echo "  ✅ ECR repository created"
	@echo "  ✅ Docker image built and pushed"
	@echo "  ✅ Application infrastructure deployed"
	@echo ""
	@echo "🔗 Next steps:"
	@echo "  1. Get the application public IP using AWS CLI"
	@echo "  2. Access your app at http://<public-ip>:3000"

destroy-ecr-aws: ## Destroy ECR repository using Terragrunt
	@echo "$(YELLOW)⚠️  Destroying the ECR repository and all images!$(NC)"
	@echo "$(BLUE)[INFO]$(NC) Destroying ECR repository..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	cd terraform/ecr && terragrunt destroy -auto-approve && \
	echo "$(GREEN)✅ ECR repository destroyed successfully$(NC)"

destroy-app-aws: ## Destroy application infrastructure using Terragrunt
	@echo "$(YELLOW)⚠️  Destroying the application infrastructure!$(NC)"
	@echo "$(YELLOW)   - ECS cluster and tasks$(NC)"
	@echo "$(YELLOW)   - Security groups and IAM roles$(NC)"
	@echo "$(YELLOW)   - CloudWatch logs$(NC)"
	@echo "$(BLUE)[INFO]$(NC) Destroying application infrastructure..."
	@$(AWS_ENV_CHECK) && \
	$(AWS_ENV_SETUP) && \
	cd terraform/app && terragrunt destroy -auto-approve && \
	echo "$(GREEN)✅ Application infrastructure destroyed successfully$(NC)" 