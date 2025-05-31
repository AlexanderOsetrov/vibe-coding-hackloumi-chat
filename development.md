# Development Guide

This comprehensive guide explains how to set up, develop, and manage the Hackloumi Chat application for local development and AWS deployment.

## Prerequisites

- **Node.js** (v18 or later)
- **Docker** (Docker Desktop or Rancher Desktop)
- **Git**
- **AWS CLI** (for AWS deployment)
- **Terragrunt** (for AWS infrastructure)

## Quick Start

1. **Install dependencies:**

   ```bash
   make install
   ```

2. **Set up the database:**

   ```bash
   make db-setup
   ```

3. **Start the development server:**

   ```bash
   make dev
   ```

   > 💡 **Smart Database Verification**: The `make dev` command automatically verifies your database is running and ready. If the database container exists but is stopped, it will be started automatically. If no database is found, you'll get helpful setup instructions.

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Available Commands

Use `make help` to see all available commands organized by category:

```bash
make help
```

### 📦 Development Commands

- `make dev` - Start development environment (with automatic database verification)
- `make install` - Install dependencies and generate Prisma client
- `make test` - Run tests
- `make test-watch` - Run tests in watch mode

### 🐳 Docker Deployment (Local)

- `make build` - Build Docker image for local development
- `make deploy` - Build and deploy using docker-compose (full stack)
- `make destroy` - Stop and remove all containers, networks, and volumes
- `make logs` - Show application logs
- `make status` - Check deployment status and health
- `make start/stop/restart` - Manage containers

### ☁️ AWS Planning & Setup

- `make set-vars-aws` - Set AWS Terraform variables (from .env or environment)
- `make plan-ecr-aws` - Plan ECR repository using Terragrunt
- `make plan-app-aws` - Plan application infrastructure using Terragrunt

### 🚀 AWS Deployment

- `make deploy-ecr-aws` - Deploy ECR repository using Terragrunt
- `make build-aws` - Build Docker image for AWS deployment (ARM64)
- `make push-aws` - Push Docker image to ECR
- `make deploy-app-aws` - Deploy application infrastructure using Terragrunt
- `make deploy-aws` - Full AWS deployment pipeline (ECR → build → push → app)

### 💥 AWS Destruction

- `make destroy-app-aws` - Destroy application infrastructure using Terragrunt
- `make destroy-ecr-aws` - Destroy ECR repository using Terragrunt

### 🗄️ Database Management

- `make db-setup` - Create and start PostgreSQL container for development
- `make db-start` - Start existing database container
- `make db-stop` - Stop database container
- `make db-restart` - Restart database container
- `make db-status` - Show database status
- `make db-connect` - Connect to database using psql
- `make db-reset` - Reset database (DESTRUCTIVE)

### 🛠️ Utilities

- `make verify-db` - Manually verify database status
- `make clean` - Clean up development artifacts
- `make shell` - Get shell inside running container
- `make db-studio` - Open Prisma Studio for database management

## Development Environments

### Local Development (Recommended for Daily Work)

For day-to-day development, use standalone database with hot reloading:

```bash
make db-setup    # Setup standalone PostgreSQL
make dev         # Start Next.js dev server with hot reload
```

**Benefits:**

- Fast hot reloading
- Easy debugging
- Minimal resource usage
- Direct file system access

### Docker Development (Production-like Testing)

For testing production-like environment locally:

```bash
make deploy      # Build and deploy everything via docker-compose
make status      # Check health
make logs        # Monitor logs
make destroy     # Clean up when done
```

**Benefits:**

- Production-like environment
- Container isolation
- Full stack testing
- Load balancer simulation

### AWS Development (Cloud Testing)

For testing on actual AWS infrastructure:

```bash
# Setup environment variables first (see AWS-DEPLOYMENT-GUIDE.md)
OWNER="your.email@company.com" make deploy-aws

# Access your application
cd terraform/app
terragrunt output load_balancer_url
```

**Benefits:**

- Real cloud environment
- Load balancer testing
- Auto-scaling validation
- Production readiness verification

## Database Setup

### Option 1: Using Make Commands (Recommended)

The easiest way to set up the database is using the integrated Makefile:

```bash
make db-setup
```

This will:

- Create a PostgreSQL Docker container
- Set up the database with proper configuration
- Generate Prisma client
- Run database migrations
- Verify database connectivity

### Option 2: Manual PostgreSQL Setup

If you prefer to use an existing PostgreSQL installation:

1. **Install PostgreSQL** on your system
2. **Create a database:**

   ```sql
   CREATE DATABASE hackloumi_chat;
   ```

3. **Create environment variables** by creating a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/hackloumi_chat?schema=public"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   ```

4. **Generate Prisma client:**

   ```bash
   npx prisma generate
   ```

5. **Run database migrations:**
   ```bash
   npx prisma db push
   ```

## Database Management

We use a PostgreSQL database running in a Docker container. The Makefile provides comprehensive database management commands with improved organization and colored output.

### Common Database Workflows

**First time setup:**

```bash
make db-setup
```

**Daily development:**

```bash
# Check if database is running
make db-status

# Start database if stopped
make db-start

# Start your app
make dev
```

**Debugging database issues:**

```bash
# Connect to database directly
make db-connect

# Check database status
make db-status

# Reset database if corrupted (DESTRUCTIVE)
make db-reset
```

**When done for the day:**

```bash
# Stop database to save resources
make db-stop
```

## AWS Deployment Setup

For AWS deployment, you'll need additional configuration. See [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md) for complete instructions.

### Required Environment Variables for AWS

Create a `.env` file with:

```bash
# Application Environment Variables
NODE_ENV=production
DATABASE_URL=postgresql://hackloumi:hackloumi@localhost:5432/hackloumi
JWT_SECRET=change-this-to-a-very-long-random-string-for-jwt-signing

# REQUIRED: Owner Information
OWNER=your.email@company.com

# AWS Infrastructure Variables (Required)
VPC_ID=vpc-xxxxxxxxx
SUBNET_IDS=subnet-xxxxxxx,subnet-yyyyyyy

# AWS Credentials
AWS_ACCESS_KEY_ID=your-aws-access-key-here
AWS_SECRET_ACCESS_KEY=your-aws-secret-key-here
AWS_SESSION_TOKEN=your-session-token-if-using-temporary-credentials
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
```

### AWS Deployment Workflow

```bash
# 1. Setup and verify variables
make set-vars-aws

# 2. Plan infrastructure (optional)
make plan-ecr-aws
make plan-app-aws

# 3. Deploy everything
OWNER="your.email@company.com" make deploy-aws

# 4. Get application URL
cd terraform/app
terragrunt output load_balancer_url
```

## Environment Variables

The application uses these environment variables:

### Local Development

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing

### AWS Deployment (Additional)

- `OWNER` - **REQUIRED** Resource owner email for tagging
- `NODE_ENV` - Node.js environment (production)
- `VPC_ID` - AWS VPC ID
- `SUBNET_IDS` - Comma-separated subnet IDs
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_REGION` - AWS region
- `AWS_ACCOUNT_ID` - AWS account ID

### Optional AWS Configuration

- `TF_VAR_enable_ssl` - Enable HTTPS with SSL
- `TF_VAR_ssl_certificate_arn` - ACM certificate ARN
- `TF_VAR_create_rds` - Create RDS PostgreSQL
- `TF_VAR_enable_autoscaling` - Enable auto-scaling

## Database Schema

The application uses Prisma ORM with the following models:

### Users Table

- `id` (String, Primary Key, CUID)
- `username` (String, Unique)
- `password` (String, Argon2 hashed)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Messages Table

- `id` (String, Primary Key, CUID)
- `content` (String)
- `senderId` (String, Foreign Key)
- `receiverId` (String, Foreign Key)
- `createdAt` (DateTime)
- Optimized indexes for chat queries

### Database Operations

**Generate Prisma client:**

```bash
npx prisma generate
```

**Push schema changes:**

```bash
npx prisma db push
```

**View database in Prisma Studio:**

```bash
make db-studio
```

## Development Server

**Start development server:**

```bash
make dev
```

**Build for production:**

```bash
npm run build
```

**Run tests:**

```bash
npm test
```

**Lint code:**

```bash
npm run lint
```

## Application Structure

```
src/
├── app/                 # Next.js app router pages
│   ├── api/            # API routes
│   │   ├── auth/       # Authentication endpoints
│   │   └── messages/   # Message handling endpoints
│   ├── chat/           # Chat pages
│   │   └── [user]/     # Dynamic chat routes
│   ├── login/          # Login page
│   └── register/       # Registration page
├── components/         # React components (future use)
├── lib/               # Utility libraries
│   ├── auth.ts        # Authentication utilities
│   └── db.ts          # Prisma client
├── generated/         # Generated Prisma client
└── test/              # Test files

terraform/
├── state.hcl          # Shared Terragrunt state configuration
├── ecr/               # ECR repository module
│   ├── terragrunt.hcl # ECR configuration
│   └── *.tf           # ECR resources
└── app/               # Application infrastructure module
    ├── terragrunt.hcl # App configuration
    └── *.tf           # App resources (ALB, ECS, Security Groups, etc.)
```

## Feature Implementation Status

### M1 Features Implemented

✅ **User registration form** (username + password ×2)  
✅ **Password hashed with Argon2**, stored in PostgreSQL  
✅ **JWT auth cookie** issued on login  
✅ **`/chat/[user]` page** with textarea & send button  
✅ **POST `/api/messages`** persists message  
✅ **GET `/api/messages?peer=`** polls for new messages (simple polling implementation)

### M2 Features Implemented

✅ **Contact management system** with invitation workflow  
✅ **Invite by username** functionality  
✅ **Accept / reject invitation** workflow  
✅ **Contacts shown in sidebar** sorted alphabetically

### M3 Features Implemented

✅ **Prisma migration adds `fts` column** (PostgreSQL _tsvector_)  
✅ **GET `/api/search?q=`** returns ranked matches from both direct and group messages  
✅ **Search bar with instant results** and navigation to both direct/group chats  
✅ **Group message search** with proper member verification

### M4 Features Implemented

✅ **WebSocket realtime messaging** with Socket.IO  
✅ **In‑memory queue** delivers messages to connected peers  
✅ **Delivery ACK** updates message status to _delivered_  
✅ **Fallback to polling** when WebSocket unsupported  
✅ **Real-time typing indicators** for both direct and group chats  
✅ **Online/offline status tracking** for contacts

### M5 Features Implemented

✅ **Groups table** (`id`, `name`, `owner_id`)  
✅ **Group creation, management, and deletion** endpoints  
✅ **Add / remove participants** with owner approval  
✅ **Broadcast fan‑out** to all members over WebSocket  
✅ **Group chat UI** with member management  
✅ **Real-time group messaging** with proper room handling

### M6 Features Implemented

✅ **Local file upload** with `/api/upload` endpoint for image storage  
✅ **Markdown parsing** for **bold** / _italic_ / `code` in both direct and group messages  
✅ **LazyImage component** with lazy‑loading and loading states for message images  
✅ **Image support** in both direct messages and group chats with real-time delivery  
✅ **Image upload UI** with preview and metadata display  
✅ **Mixed content support** (text + images in same message)

### M10 Infrastructure Implemented

✅ **Production AWS deployment** with Terragrunt and ECS Fargate  
✅ **Application Load Balancer** with health checks and SSL support  
✅ **Auto-scaling policies** for CPU, memory, and request-based scaling  
✅ **Security groups** with proper network isolation  
✅ **ECR container registry** with lifecycle policies  
✅ **CloudWatch monitoring** and logging  
✅ **Makefile automation** for complete deployment pipeline  
✅ **Cost-optimized architecture** (~$36-51/month)

## Additional Features Implemented

✅ **Comprehensive error handling** and user feedback  
✅ **TypeScript coverage** throughout the application  
✅ **Test suite** with Vitest and Testing Library  
✅ **Responsive design** with mobile-first approach  
✅ **Modern UI/UX** with sophisticated black and white design system  
✅ **Git repository management** with proper .gitignore for uploads  
✅ **Development tooling** with ESLint, Prettier, and Husky

## Known Limitations

- No S3 integration yet (using local file storage for development)
- No deep links implementation (M7)
- No reactions or profiles (M8)
- No performance harness (M9)

These will be addressed in future milestones (M7-M9).

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/messages` - Send a message
- `GET /api/messages?peer=username` - Get messages with a user
- `GET /api/health` - Health check endpoint (for load balancer)

## Security Features

- **Passwords hashed with Argon2** - Industry-standard password security
- **JWT tokens with 24-hour expiration** - Secure session management
- **HTTP-only cookies** for token storage - Prevents XSS attacks
- **Input validation and sanitization** - Server-side data validation
- **SQL injection protection** via Prisma ORM
- **Network isolation** with security groups (AWS deployment)
- **Load balancer traffic filtering** - ALB → ECS traffic flow

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (containerized or RDS)
- **Authentication**: JWT with Argon2 password hashing
- **Infrastructure**: AWS ECS Fargate, Application Load Balancer, ECR
- **IaC**: Terragrunt with Terraform
- **Testing**: Vitest 2, Testing Library React 16
- **Code Quality**: ESLint, Prettier, Husky

## Usage

### Local Development

1. Open http://localhost:3000
2. Click "Create Account" to register a new user
3. After registration, you'll be redirected to the chat page
4. Enter a username to start a chat with that user
5. The chat URL will be `/chat/[username]`

### AWS Deployment

1. Deploy using `make deploy-aws`
2. Get URL with `cd terraform/app && terragrunt output load_balancer_url`
3. Access your application via the ALB URL
4. Same functionality as local, but with production infrastructure

## Troubleshooting

### Database Connection Issues

The `make dev` command includes automatic database verification, but if you encounter issues:

1. **Check if Docker is running:**

   ```bash
   docker ps
   ```

2. **Check database status:**

   ```bash
   make db-status
   ```

3. **Restart database:**

   ```bash
   make db-restart
   ```

4. **Reset database if corrupted:**

   ```bash
   make db-reset
   ```

5. **Manual database verification:**
   ```bash
   make verify-db
   ```

### Development Server Issues

1. **Database not running**: The `make dev` command will automatically detect and help resolve database issues

2. **Clear Next.js cache:**

   ```bash
   rm -rf .next
   make dev
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   make install
   ```

### AWS Deployment Issues

1. **OWNER variable not set**:

   ```bash
   export OWNER="your.email@company.com"
   make deploy-aws
   ```

2. **AWS credentials not configured**:

   ```bash
   aws configure
   # or set environment variables in .env
   ```

3. **VPC/Subnet not found**:

   ```bash
   # Verify your VPC_ID and SUBNET_IDS in .env
   aws ec2 describe-vpcs
   aws ec2 describe-subnets
   ```

4. **Check deployment status**:
   ```bash
   make set-vars-aws  # Verify variables
   make plan-app-aws  # Check what will be created
   ```

### Environment Variable Issues

1. **Check environment file:**

   ```bash
   cat .env
   ```

2. **Verify AWS variables are loaded**:

   ```bash
   make set-vars-aws
   ```

3. **Restart development server** after changing environment variables

### Docker Context Issues (Rancher Desktop)

If you're using Rancher Desktop and get Docker connection errors:

```bash
# Switch to rancher-desktop context
docker context use rancher-desktop

# Verify it's working
docker ps
```

## Tips for Development

1. **Use make commands** - They handle error checking and provide helpful feedback
2. **Check database status first** - Run `make db-status` before starting development
3. **Use database verification** - The `make dev` command includes automatic verification
4. **Keep Docker running** - The database container needs Docker to be active
5. **Use Prisma Studio** for database inspection: `make db-studio`
6. **Test locally before AWS** - Use `make deploy` for local testing before AWS deployment
7. **Plan before applying** - Use `make plan-*-aws` commands to verify changes
8. **Check AWS costs** - Monitor your AWS usage, especially with auto-scaling enabled

## Deployment Strategies

### Development

- **Local**: `make dev` with `make db-setup`
- **Testing**: `make deploy` for full local stack
- **Debugging**: `make db-connect` and `make logs`

### Staging/Production

- **Infrastructure**: `make deploy-aws` for full AWS deployment
- **Updates**: `make build-aws && make push-aws && make deploy-app-aws`
- **Monitoring**: Use CloudWatch logs and ALB metrics
- **Scaling**: Configure auto-scaling variables in `.env`

### CI/CD Integration

The Makefile commands are designed for CI/CD integration:

```yaml
# Example GitHub Actions
- name: Deploy to AWS
  env:
    OWNER: ${{ secrets.OWNER }}
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    # ... other environment variables
  run: make deploy-aws
```

For complete CI/CD setup, see [AWS-DEPLOYMENT-GUIDE.md](./AWS-DEPLOYMENT-GUIDE.md).
