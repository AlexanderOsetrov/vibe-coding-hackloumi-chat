# AWS Deployment Guide - Hackloumi Chat

## 🎯 **Overview**

This document provides a complete guide for deploying Hackloumi Chat to AWS using **Terragrunt** with a simplified, cost-effective architecture that remains cloud-agnostic and reuses existing VPC infrastructure.

## 🏗️ **Simplified Architecture** (Current Implementation)

This simplified approach eliminates complex components while maintaining production readiness for development/demo use:

- ✅ **Direct ECS Access**: No load balancer required
- ✅ **Containerized Database**: PostgreSQL as sidecar container
- ✅ **Public Subnets Only**: Simplified networking
- ✅ **Terragrunt Modules**: ECR and App infrastructure separated
- ✅ **Cost Optimized**: ~$15/month vs $50+/month

## 🏗️ **Core AWS Resources** (Minimal Set)

### 1. **Container Orchestration** (Cloud-Agnostic)

```hcl
# ECS Fargate Service (can be replaced with GCP Cloud Run / Azure Container Instances)
- ECS Cluster (Fargate mode)
- ECS Task Definition (with containerized PostgreSQL)
- ECS Service with 1 task for demo/dev use
- Task execution role for ECR/CloudWatch access
- ECS tasks run in public subnets with direct internet access
```

### 2. **Database** (Containerized - Cloud-Agnostic)

```hcl
# Containerized PostgreSQL (can run on any cloud container service)
- PostgreSQL 16 container as sidecar
- No managed database service required
- Data persists within container lifecycle
- Connection: postgresql://hackloumi:hackloumi@localhost:5432/hackloumi
```

### 3. **Container Registry** (Cloud-Agnostic)

```hcl
# ECR Repository (can be replaced with GCP Artifact Registry / Azure ACR)
- ECR Private Repository for hackloumi-chat
- Lifecycle policy to manage image retention
```

### 4. **Networking** (Simplified - Reusing Your Infrastructure)

```hcl
# Using your existing VPC and public subnets only
- Your existing VPC ID
- Your existing public subnets (for ECS tasks with direct access)
- Internet Gateway (assuming already exists)
- Security group allowing port 3000 access from internet
```

### 5. **Security & IAM** (Minimal)

```hcl
# Essential IAM roles only
- ECS Task Execution Role (ECR + CloudWatch access)
- ECS Task Role (basic application permissions)
- Security Group (ECS direct access on port 3000)
```

### 6. **Monitoring** (Basic)

```hcl
# CloudWatch Logs (can be replaced with any logging service)
- CloudWatch Log Group for application logs
- ECS Container Insights enabled
```

## 🔧 **Infrastructure as Code** (Terragrunt Implementation)

### Terragrunt Structure (Current)

```hcl
# Modular Terragrunt setup with separate ECR and App modules
├── terraform/
│   ├── state.hcl                  # Shared state configuration
│   ├── ecr/                       # ECR repository module
│   │   ├── terragrunt.hcl         # ECR module config
│   │   ├── main.tf                # ECR resources
│   │   ├── variables.tf           # ECR variables
│   │   ├── outputs.tf             # ECR outputs
│   │   └── resources-ecr.tf       # Container registry
│   └── app/                       # Application module
│       ├── terragrunt.hcl         # App module config with ECR dependency
│       ├── main.tf                # App resources
│       ├── variables.tf           # App variables
│       ├── outputs.tf             # App outputs
│       ├── resources-ecs.tf       # ECS cluster, tasks, service
│       ├── resources-cloudwatch.tf # Logging
│       ├── resources-sg.tf        # Security groups
│       └── resources-iam.tf       # IAM roles & policies
```

### Makefile Integration (Complete Automation)

```bash
# ☁️ Planning & Setup
make set-vars-aws        # Load variables from .env file
make plan-ecr-aws        # Plan ECR repository only
make plan-app-aws        # Plan application infrastructure only

# 🚀 Deployment
make deploy-ecr-aws      # Deploy ECR repository
make build-aws           # Build Docker image for AWS
make push-aws            # Push Docker image to ECR
make deploy-app-aws      # Deploy application infrastructure
make deploy-aws          # Full pipeline (ECR → build → push → app)

# 💥 Destruction
make destroy-ecr-aws     # Destroy ECR repository only
make destroy-app-aws     # Destroy application infrastructure only
```

## 💰 **Cost Estimation (Monthly)** - **Simplified Architecture**

| Resource        | Type          | Quantity     | Monthly Cost      |
| --------------- | ------------- | ------------ | ----------------- |
| ECS Fargate     | 0.5 vCPU, 1GB | 1 task       | ~$15              |
| ECR Repository  | Storage       | <1GB         | ~$0.10            |
| CloudWatch Logs | Ingestion     | ~100MB/month | ~$0.50            |
| Data Transfer   | Outbound      | 1GB/month    | ~$0.50            |
| **Total**       |               |              | **~$15-16/month** |

**Cost Savings vs Original Plan:**

- ❌ No RDS PostgreSQL: **-$15/month**
- ❌ No Application Load Balancer: **-$20/month**
- ❌ No SSL Certificate management: **-$0/month**
- ✅ **Total Savings: ~$35/month (70% reduction)**

## 🌐 **Cloud-Agnostic Equivalents**

| AWS Service     | GCP Equivalent    | Azure Equivalent    | Generic Alternative |
| --------------- | ----------------- | ------------------- | ------------------- |
| ECS Fargate     | Cloud Run         | Container Instances | Docker/K8s          |
| ECR             | Artifact Registry | Container Registry  | Docker Hub          |
| CloudWatch Logs | Cloud Logging     | Azure Monitor       | ELK Stack           |
| IAM Roles       | Service Accounts  | Managed Identity    | RBAC                |

## 📋 **Prerequisites**

1. **AWS Account**: Active AWS account with appropriate permissions
2. **Terragrunt**: Installed on your machine ([Download](https://terragrunt.gruntwork.io/docs/getting-started/install/))
3. **AWS CLI**: Installed and configured ([Setup Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
4. **Docker**: For building container images

## 🚀 **Quick Start Deployment**

### 1. Create Environment File

Create a `.env` file in the project root with your AWS configuration:

```bash
# Application Environment Variables
NODE_ENV=production
DATABASE_URL=postgresql://hackloumi:hackloumi@localhost:5432/hackloumi
JWT_SECRET=change-this-to-a-very-long-random-string-for-jwt-signing

# AWS Infrastructure Variables
VPC_ID=vpc-xxxxxxxxx
SUBNET_IDS=subnet-xxxxxxx,subnet-yyyyyyy

# AWS Credentials
ACCESS_KEY=your-aws-access-key-here
SECRET_KEY=your-aws-secret-key-here
AWS_ACCOUNT_ID=123456789012
```

### 2. Deploy Infrastructure (5 minutes)

```bash
# Full deployment pipeline
make deploy-aws
```

This single command will:

1. ✅ Deploy ECR repository
2. ✅ Build Docker image
3. ✅ Push image to ECR
4. ✅ Deploy application infrastructure
5. ✅ Start ECS service

### 3. Access Your Application (2 minutes)

```bash
# Get the public IP of your ECS task
aws ecs list-tasks --cluster hackloumi-chat-production
aws ecs describe-tasks --cluster hackloumi-chat-production --tasks <task-arn>

# Access your application
open http://<public-ip>:3000
```

## 📋 **Environment Variables Reference**

| Variable         | Description                       | Example                                    |
| ---------------- | --------------------------------- | ------------------------------------------ |
| `NODE_ENV`       | Node.js environment               | `production`                               |
| `DATABASE_URL`   | PostgreSQL connection string      | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET`     | Secret for JWT token signing      | `your-256-bit-secret`                      |
| `VPC_ID`         | Existing AWS VPC ID               | `vpc-12345678`                             |
| `SUBNET_IDS`     | Comma-separated public subnet IDs | `subnet-abc123,subnet-def456`              |
| `ACCESS_KEY`     | AWS Access Key ID                 | `AKIAIOSFODNN7EXAMPLE`                     |
| `SECRET_KEY`     | AWS Secret Access Key             | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_ACCOUNT_ID` | AWS Account ID                    | `123456789012`                             |

## 🔧 **Advanced Deployment Options**

### Individual Component Deployment

```bash
# Deploy components separately
make deploy-ecr-aws      # Create ECR repository first
make build-aws           # Build Docker image
make push-aws            # Push to ECR
make deploy-app-aws      # Deploy application infrastructure
```

### Planning Before Deployment

```bash
# Plan individual components
make plan-ecr-aws        # Plan ECR repository
make plan-app-aws        # Plan application infrastructure
```

### Destruction Commands

```bash
# Destroy components (auto-accept, no confirmation)
make destroy-app-aws     # Destroy application first
make destroy-ecr-aws     # Destroy ECR repository
```

## 🔒 **Security Considerations**

### Network Security

- ECS tasks in public subnets with controlled access
- Security group allows port 3000 from internet only
- No unnecessary network complexity

### Application Security

- JWT secrets configured via environment variables
- Database credentials are containerized (development use)
- Container runs with standard security practices
- 🔒 `.env` file is git-ignored for security

### Access Control

- Direct public IP access (suitable for demo/development)
- No domain/SSL complexity (can be added later if needed)
- IAM roles follow principle of least privilege

## 📊 **Monitoring & Observability**

### CloudWatch Integration

```bash
# Essential metrics monitored
- ECS task health and restarts
- Application logs via CloudWatch
- Container resource utilization
- Health check endpoint status (/api/health)
```

### Access Methods

```bash
# Get application public IP
aws ecs list-tasks --cluster hackloumi-chat-production
aws ecs describe-tasks --cluster hackloumi-chat-production --tasks <task-arn>

# View application logs
aws logs tail /ecs/hackloumi-chat-production --follow

# Check health endpoint
curl http://<public-ip>:3000/api/health
```

## 🔄 **CI/CD Integration**

The Makefile commands can be easily integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Deploy to AWS
  run: |
    echo "${{ secrets.ENV_FILE }}" > .env
    make deploy-aws
```

## 🛠️ **Troubleshooting**

### Common Issues

1. **VPC/Subnet not found**: Verify your VPC_ID and SUBNET_IDS in `.env`
2. **Permission denied**: Ensure AWS credentials have sufficient permissions
3. **Variables not set**: Run `make set-vars-aws` to verify variable loading
4. **ECR login failed**: Check AWS region extraction from ECR URL
5. **ECS task won't start**: Check CloudWatch logs for container errors

### Getting Help

```bash
# Check all available Makefile commands
make help

# Verify .env file format
cat .env

# Test AWS credentials
aws sts get-caller-identity

# Check Terragrunt version
terragrunt --version
```

### Debug Commands

```bash
# Set variables and check output
make set-vars-aws

# Plan without applying
make plan-ecr-aws
make plan-app-aws

# Check ECS service status
aws ecs describe-services --cluster hackloumi-chat-production --services hackloumi-chat-production
```

## 📝 **Migration & Scaling Path**

### Current Simplified Setup → Production

1. **Add Load Balancer**: Implement ALB when scaling beyond 1 task
2. **Add Managed Database**: Migrate to RDS when data persistence is critical
3. **Add SSL/TLS**: Implement certificates when using custom domain
4. **Add Auto-scaling**: Configure based on actual usage patterns

### Development → Production Considerations

- **Data Persistence**: Containerized DB suitable for development/demos
- **High Availability**: Single task sufficient for development/testing
- **Scaling**: Can easily add ALB + RDS when needed
- **Cost**: Start small, scale based on actual requirements

## 🎯 **Architecture Benefits**

### ✅ **Advantages**

- **💰 Cost Effective**: ~$15/month vs $50+/month
- **🚀 Fast Deployment**: 5-minute infrastructure setup with `make deploy-aws`
- **🔧 Simple Management**: Minimal moving parts, modular Terragrunt structure
- **☁️ Cloud Agnostic**: Easy migration between cloud providers
- **📱 Demo Ready**: Perfect for development and demonstrations
- **🤖 Automated**: Complete Makefile automation for all operations

### ⚠️ **Trade-offs**

- **🔄 Single Point**: One task (can be scaled easily)
- **💾 Data Persistence**: Container-based DB (good for development)
- **🌐 No Load Balancer**: Direct access (can be added when needed)
- **🔒 No SSL**: HTTP access (can be added when using custom domain)

---

This simplified architecture provides a **cost-effective, cloud-agnostic deployment** perfect for development, demos, and initial production workloads while maintaining the ability to scale up components as needed. The complete Makefile automation makes deployment and management effortless.
