# AWS Deployment Guide - Hackloumi Chat

## 🎯 **Overview**

This document provides a complete guide for deploying Hackloumi Chat to AWS using **Terragrunt** with a production-ready architecture that includes Application Load Balancer, auto-scaling capabilities, and proper security configurations.

## 🏗️ **Production Architecture** (Current Implementation)

Our current implementation provides a scalable, production-ready architecture:

- ✅ **Application Load Balancer**: Professional HTTP/HTTPS access with health checks
- ✅ **ECS Fargate**: Containerized application with auto-scaling capabilities
- ✅ **Containerized Database**: PostgreSQL as embedded container (with RDS option)
- ✅ **Security Groups**: Proper network isolation with ALB → ECS traffic flow
- ✅ **SSL/TLS Support**: Configurable HTTPS with certificate management
- ✅ **Terragrunt Modules**: ECR and App infrastructure properly separated
- ✅ **Cost Optimized**: ~$25-35/month for production-ready setup

## 🏗️ **Core AWS Resources** (Production Set)

### 1. **Load Balancer & Networking**

```hcl
# Application Load Balancer (Production Traffic Management)
- Application Load Balancer (ALB) with health checks
- Target Group for ECS service routing
- HTTP Listener (with HTTPS redirect when SSL enabled)
- HTTPS Listener (when SSL certificate provided)
- Security Group for ALB (ports 80/443)
```

### 2. **Container Orchestration** (Scalable)

```hcl
# ECS Fargate Service (Auto-scaling Ready)
- ECS Cluster with Container Insights
- ECS Task Definition (ARM64 Graviton2 optimized)
- ECS Service with load balancer integration
- Auto-scaling target and policies (configurable)
- Task execution role for ECR/CloudWatch access
```

### 3. **Database Options** (Flexible)

```hcl
# Option 1: Containerized PostgreSQL (Default)
- PostgreSQL 16 container as sidecar
- No additional AWS costs
- Good for development and small production workloads

# Option 2: Amazon RDS (Optional, can be enabled)
- RDS PostgreSQL with automated backups
- Multi-AZ deployment option
- Enhanced monitoring and performance insights
```

### 4. **Container Registry** (Secure)

```hcl
# ECR Repository with Lifecycle Management
- ECR Private Repository for hackloumi-chat
- Lifecycle policy (keep 30 tagged, 1 day untagged)
- Image vulnerability scanning enabled
```

### 5. **Networking** (Secure & Scalable)

```hcl
# VPC Integration (Existing or New)
- Option to use existing VPC infrastructure
- Option to create new VPC with public/private subnets
- Internet Gateway and NAT Gateway support
- VPC Endpoints for AWS services (optional)
```

### 6. **Security & IAM** (Comprehensive)

```hcl
# Production Security Setup
- ECS Task Execution Role (ECR + CloudWatch access)
- ECS Task Role (application permissions)
- RDS Enhanced Monitoring Role (if RDS enabled)
- Security Groups with proper isolation:
  - ALB Security Group (internet → ALB)
  - ECS Security Group (ALB → ECS)
  - RDS Security Group (ECS → RDS, if enabled)
```

### 7. **Monitoring & Scaling** (Production-Ready)

```hcl
# CloudWatch & Auto-scaling
- CloudWatch Log Groups for application logs
- ECS Container Insights enabled
- Auto-scaling policies:
  - CPU utilization targeting
  - Memory utilization targeting
  - Request count per target targeting
```

## 🔧 **Infrastructure as Code** (Terragrunt Implementation)

### Terragrunt Structure (Current)

```hcl
# Modular Terragrunt setup with comprehensive infrastructure
├── terraform/
│   ├── state.hcl                  # Shared state configuration
│   ├── ecr/                       # ECR repository module
│   │   ├── terragrunt.hcl         # ECR module config
│   │   ├── main.tf                # ECR provider setup
│   │   ├── variables.tf           # ECR variables
│   │   ├── outputs.tf             # ECR outputs
│   │   └── resources-ecr.tf       # Container registry
│   └── app/                       # Application module
│       ├── terragrunt.hcl         # App module config with ECR dependency
│       ├── main.tf                # App provider setup
│       ├── variables.tf           # App variables (extensive)
│       ├── outputs.tf             # App outputs (including ALB URL)
│       ├── data.tf                # Data sources
│       ├── resources-alb.tf       # Application Load Balancer
│       ├── resources-ecs.tf       # ECS cluster, tasks, service
│       ├── resources-sg.tf        # Security groups (ALB + ECS)
│       ├── resources-iam.tf       # IAM roles & policies
│       ├── resources-cloudwatch.tf # Logging
│       ├── resources-rds.tf       # RDS PostgreSQL (optional)
│       ├── resources-autoscaling.tf # Auto-scaling policies
│       └── resources-vpc.tf       # VPC creation (optional)
```

### Makefile Integration (Complete Automation)

```bash
# ☁️ Planning & Setup
make set-vars-aws        # Load variables from .env file
make plan-ecr-aws        # Plan ECR repository only
make plan-app-aws        # Plan application infrastructure only

# 🚀 Deployment
make deploy-ecr-aws      # Deploy ECR repository
make build-aws           # Build Docker image for AWS (ARM64)
make push-aws            # Push Docker image to ECR
make deploy-app-aws      # Deploy application infrastructure
make deploy-aws          # Full pipeline (ECR → build → push → app)

# 💥 Destruction
make destroy-app-aws     # Destroy application infrastructure only
make destroy-ecr-aws     # Destroy ECR repository only
```

## 💰 **Cost Estimation (Monthly)** - **Production Architecture**

| Resource                     | Type          | Quantity     | Monthly Cost   |
| ---------------------------- | ------------- | ------------ | -------------- |
| Application Load Balancer    | ALB           | 1            | ~$16           |
| ECS Fargate                  | 0.5 vCPU, 1GB | 1 task       | ~$15           |
| ECR Repository               | Storage       | <1GB         | ~$0.10         |
| CloudWatch Logs              | Ingestion     | ~500MB/month | ~$2.50         |
| Data Transfer                | Outbound      | 5GB/month    | ~$2.50         |
| **Total (Containerized DB)** |               |              | **~$36/month** |
| **+ RDS (if enabled)**       | db.t3.micro   | 1 instance   | **+$15/month** |

### Cost Scaling Options

- **Development**: ~$36/month (containerized DB)
- **Small Production**: ~$51/month (with RDS)
- **Auto-scaling**: Costs scale with actual usage

## 🌐 **Cloud-Agnostic Design**

| AWS Service    | GCP Equivalent    | Azure Equivalent    | Generic Alternative |
| -------------- | ----------------- | ------------------- | ------------------- |
| ALB            | Load Balancer     | Application Gateway | Nginx/HAProxy       |
| ECS Fargate    | Cloud Run         | Container Instances | Docker/K8s          |
| RDS PostgreSQL | Cloud SQL         | Azure Database      | PostgreSQL cluster  |
| ECR            | Artifact Registry | Container Registry  | Docker Hub          |
| CloudWatch     | Cloud Logging     | Azure Monitor       | ELK Stack           |

## 📋 **Prerequisites**

1. **AWS Account**: Active AWS account with appropriate permissions
2. **Terragrunt**: Installed on your machine ([Download](https://terragrunt.gruntwork.io/docs/getting-started/install/))
3. **AWS CLI**: Installed and configured ([Setup Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
4. **Docker**: For building container images with BuildKit support

## 🚀 **Quick Start Deployment**

### 1. Create Environment File

Create a `.env` file in the project root with your AWS configuration:

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

# Optional: SSL Configuration
# TF_VAR_enable_ssl=true
# TF_VAR_ssl_certificate_arn=arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx

# Optional: RDS Configuration
# TF_VAR_create_rds=true
# TF_VAR_database_password=your-secure-db-password

# Optional: Auto-scaling Configuration
# TF_VAR_enable_autoscaling=true
# TF_VAR_autoscaling_min_capacity=1
# TF_VAR_autoscaling_max_capacity=10
```

### 2. Deploy Infrastructure (5-8 minutes)

```bash
# Full deployment pipeline
OWNER="your.email@company.com" make deploy-aws
```

This single command will:

1. ✅ Deploy ECR repository
2. ✅ Build Docker image (ARM64 for Graviton2)
3. ✅ Push image to ECR
4. ✅ Deploy Application Load Balancer
5. ✅ Deploy ECS service with load balancer integration
6. ✅ Configure security groups and health checks

### 3. Access Your Application (Immediate)

```bash
# Get the load balancer URL (recommended method)
cd terraform/app
terragrunt output load_balancer_url

# Access your application via ALB
open $(terragrunt output -raw load_balancer_url)

# Or use the load balancer DNS name directly
echo "Application URL: $(terragrunt output -raw load_balancer_url)"
```

## 📋 **Environment Variables Reference**

### Required Variables

| Variable       | Description                       | Example                                    |
| -------------- | --------------------------------- | ------------------------------------------ |
| `OWNER`        | **REQUIRED** Resource owner email | `your.email@company.com`                   |
| `NODE_ENV`     | Node.js environment               | `production`                               |
| `DATABASE_URL` | PostgreSQL connection string      | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET`   | Secret for JWT token signing      | `your-256-bit-secret`                      |
| `VPC_ID`       | Existing AWS VPC ID               | `vpc-12345678`                             |
| `SUBNET_IDS`   | Comma-separated public subnet IDs | `subnet-abc123,subnet-def456`              |

### AWS Credentials

| Variable                | Description              | Example                                    |
| ----------------------- | ------------------------ | ------------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | AWS Access Key ID        | `AKIAIOSFODNN7EXAMPLE`                     |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key    | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_SESSION_TOKEN`     | Session token (optional) | `for temporary credentials`                |
| `AWS_REGION`            | AWS Region               | `us-east-1`                                |
| `AWS_ACCOUNT_ID`        | AWS Account ID           | `123456789012`                             |

### Optional SSL Configuration

| Variable                     | Description           | Example                                                |
| ---------------------------- | --------------------- | ------------------------------------------------------ |
| `TF_VAR_enable_ssl`          | Enable HTTPS with SSL | `true` or `false`                                      |
| `TF_VAR_ssl_certificate_arn` | ACM certificate ARN   | `arn:aws:acm:region:account:certificate/xxxxx" >> .env |

### Optional Database Configuration

| Variable                    | Description           | Example                |
| --------------------------- | --------------------- | ---------------------- |
| `TF_VAR_create_rds`         | Create RDS PostgreSQL | `true` or `false`      |
| `TF_VAR_database_password`  | RDS database password | `secure-password-here` |
| `TF_VAR_rds_instance_class` | RDS instance type     | `db.t3.micro`          |

### Optional Auto-scaling Configuration

| Variable                          | Description                | Example |
| --------------------------------- | -------------------------- | ------- |
| `TF_VAR_enable_autoscaling`       | Enable auto-scaling        | `true`  |
| `TF_VAR_autoscaling_min_capacity` | Minimum ECS tasks          | `1`     |
| `TF_VAR_autoscaling_max_capacity` | Maximum ECS tasks          | `10`    |
| `TF_VAR_autoscaling_cpu_target`   | CPU utilization target (%) | `70`    |

## 🔧 **Advanced Deployment Options**

### Individual Component Deployment

```bash
# Deploy components separately for testing
make deploy-ecr-aws      # Create ECR repository first
make build-aws           # Build Docker image (ARM64)
make push-aws            # Push to ECR
make deploy-app-aws      # Deploy application infrastructure
```

### Planning Before Deployment

```bash
# Plan individual components without applying
make plan-ecr-aws        # Plan ECR repository
make plan-app-aws        # Plan application infrastructure

# Verify environment variables are set correctly
make set-vars-aws        # Shows all configured variables
```

### SSL/HTTPS Configuration

```bash
# 1. Create ACM certificate (manual step)
aws acm request-certificate \
  --domain-name yourdomain.com \
  --validation-method DNS

# 2. Add to .env file
echo "TF_VAR_enable_ssl=true" >> .env
echo "TF_VAR_ssl_certificate_arn=arn:aws:acm:region:account:certificate/xxxxx" >> .env

# 3. Redeploy
make deploy-app-aws
```

### RDS Database Configuration

```bash
# Enable RDS PostgreSQL
echo "TF_VAR_create_rds=true" >> .env
echo "TF_VAR_database_password=your-secure-password" >> .env

# Update application to use RDS endpoint
# (Terraform will output the RDS endpoint)
make deploy-app-aws
```

### Auto-scaling Configuration

```bash
# Enable auto-scaling with custom targets
echo "TF_VAR_enable_autoscaling=true" >> .env
echo "TF_VAR_autoscaling_min_capacity=2" >> .env
echo "TF_VAR_autoscaling_max_capacity=20" >> .env
echo "TF_VAR_autoscaling_cpu_target=70" >> .env

make deploy-app-aws
```

## 🔒 **Security Considerations**

### Network Security

- **Load Balancer**: ALB handles all internet traffic
- **ECS Tasks**: Only accept traffic from ALB (no direct internet access)
- **Security Groups**: Properly isolated with least-privilege access
- **Optional RDS**: Private subnets with ECS-only access

### Application Security

- **JWT Secrets**: Configured via environment variables
- **Database**: Containerized (dev) or RDS with encryption (prod)
- **Container Security**: ARM64 Graviton2 with security best practices
- **Environment File**: `.env` is git-ignored for security

### Access Control

- **Professional URLs**: Access via ALB DNS name
- **HTTPS Support**: Optional SSL/TLS with ACM certificates
- **Health Checks**: ALB monitors application health
- **IAM Roles**: Follow principle of least privilege

## 📊 **Monitoring & Observability**

### CloudWatch Integration

```bash
# Comprehensive monitoring enabled
- ALB access logs and metrics
- ECS task health and performance
- Application logs via CloudWatch
- Auto-scaling metrics and events
- Health check status (/api/health)
```

### Access & Monitoring Commands

```bash
# Get application URL
cd terraform/app
terragrunt output load_balancer_url

# Check ALB and ECS status
aws elbv2 describe-load-balancers --names hackloumi-chat-production-alb
aws ecs describe-services --cluster hackloumi-chat-production --services hackloumi-chat-production

# View application logs
aws logs tail /ecs/hackloumi-chat-production --follow

# Check health endpoint via ALB
curl $(cd terraform/app && terragrunt output -raw load_balancer_url)/api/health
```

### Auto-scaling Monitoring

```bash
# Check auto-scaling status
aws application-autoscaling describe-scalable-targets --service-namespace ecs

# View scaling policies
aws application-autoscaling describe-scaling-policies --service-namespace ecs
```

## 🔄 **CI/CD Integration**

The Makefile commands integrate seamlessly with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup environment
        run: |
          echo "OWNER=${{ secrets.OWNER }}" >> .env
          echo "NODE_ENV=production" >> .env
          echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> .env
          echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env
          echo "VPC_ID=${{ secrets.VPC_ID }}" >> .env
          echo "SUBNET_IDS=${{ secrets.SUBNET_IDS }}" >> .env

      - name: Deploy to AWS
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCOUNT_ID: ${{ secrets.AWS_ACCOUNT_ID }}
        run: make deploy-aws
```

## 🛠️ **Troubleshooting**

### Common Issues

1. **OWNER variable not set**:

   ```bash
   # Error: Required environment variable OWNER missing
   export OWNER="your.email@company.com"
   make deploy-aws
   ```

2. **VPC/Subnet not found**: Verify your VPC_ID and SUBNET_IDS in `.env`

3. **ALB health checks failing**: Check application health endpoint

   ```bash
   # Test health endpoint locally first
   curl http://localhost:3000/api/health
   ```

4. **SSL certificate issues**: Ensure certificate is validated and in correct region

5. **Auto-scaling not working**: Check CloudWatch metrics and scaling policies

### Getting Help

```bash
# Check all available Makefile commands
make help

# Verify environment variables are loaded correctly
make set-vars-aws

# Test AWS credentials
aws sts get-caller-identity

# Check infrastructure planning
make plan-app-aws
```

### Debug Commands

```bash
# Check ALB target group health
aws elbv2 describe-target-health --target-group-arn $(cd terraform/app && terragrunt output -raw target_group_arn)

# Check ECS service events
aws ecs describe-services --cluster hackloumi-chat-production --services hackloumi-chat-production

# View ECS task logs
aws logs tail /ecs/hackloumi-chat-production --follow
```

## 📝 **Migration & Scaling Path**

### Current Production Setup Capabilities

✅ **Already Included:**

- Application Load Balancer with health checks
- Auto-scaling policies (CPU, memory, request-based)
- SSL/TLS support with certificate management
- RDS PostgreSQL option
- Comprehensive security groups
- CloudWatch monitoring and logging

### Scaling Options

```bash
# Horizontal Scaling (increase tasks)
echo "TF_VAR_ecs_desired_count=3" >> .env
echo "TF_VAR_enable_autoscaling=true" >> .env
make deploy-app-aws

# Vertical Scaling (increase resources)
echo "TF_VAR_ecs_cpu=1024" >> .env
echo "TF_VAR_ecs_memory=2048" >> .env
make deploy-app-aws

# Database Scaling (switch to RDS)
echo "TF_VAR_create_rds=true" >> .env
echo "TF_VAR_rds_instance_class=db.t3.small" >> .env
make deploy-app-aws
```

### High Availability Setup

```bash
# Multi-AZ with auto-scaling
echo "TF_VAR_enable_autoscaling=true" >> .env
echo "TF_VAR_autoscaling_min_capacity=2" >> .env
echo "TF_VAR_autoscaling_max_capacity=10" >> .env
echo "TF_VAR_create_rds=true" >> .env
make deploy-app-aws
```

## 🎯 **Architecture Benefits**

### ✅ **Production Advantages**

- **🚀 Professional Access**: Application Load Balancer with health checks
- **📈 Auto-scaling**: CPU, memory, and request-based scaling policies
- **🔒 Security**: Proper network isolation and security groups
- **📊 Monitoring**: Comprehensive CloudWatch integration
- **🔧 SSL/TLS Ready**: Easy HTTPS setup with ACM certificates
- **💾 Database Options**: Containerized or managed RDS PostgreSQL
- **☁️ Cloud Agnostic**: Easy migration between cloud providers
- **🤖 Fully Automated**: Complete Makefile automation
- **📱 Production Ready**: Suitable for real production workloads

### ⚙️ **Configuration Flexibility**

- **Cost Optimization**: Start with containerized DB, upgrade to RDS when needed
- **Performance Tuning**: Configurable CPU/memory and auto-scaling targets
- **Security Levels**: HTTP for development, HTTPS for production
- **Scaling Strategy**: Manual task count or automatic scaling policies

### 💰 **Cost Management**

- **Development**: ~$36/month (ALB + ECS + containerized DB)
- **Small Production**: ~$51/month (+ RDS)
- **Auto-scaling**: Pay only for resources you actually use
- **Predictable**: Fixed ALB cost, variable compute based on load

---

This production-ready architecture provides **professional deployment with Application Load Balancer, auto-scaling, and security best practices** while maintaining cost-effectiveness and the ability to scale components individually based on actual requirements.

## 🔄 **Destruction Commands**

```bash
# Complete cleanup (in correct order)
make destroy-app-aws     # Destroy application infrastructure first
make destroy-ecr-aws     # Destroy ECR repository (removes all images)

# Note: This will destroy ALL resources and cannot be undone
# Ensure you have backups of any important data
```
