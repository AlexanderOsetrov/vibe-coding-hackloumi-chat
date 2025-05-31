# Variables for Hackloumi Chat AWS Infrastructure

# Infrastructure variables
variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "ID of the existing VPC to use"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for ECS tasks with direct internet access"
  type        = list(string)
}

# Application variables
variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "hackloumi-chat"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, production)"
  type        = string
  default     = "production"
}

variable "owner" {
  description = "Owner of the resources (email address)"
  type        = string
}

variable "node_env" {
  description = "Node.js environment (development, production, etc.)"
  type        = string
  default     = "production"
}

variable "database_url" {
  description = "Database connection URL for the application"
  type        = string
  default     = "postgresql://hackloumi:hackloumi@localhost:5432/hackloumi"
  sensitive   = true
}

# ECS variables
variable "ecs_cpu" {
  description = "CPU units for ECS task (256, 512, 1024, etc.)"
  type        = string
  default     = "512"
}

variable "ecs_memory" {
  description = "Memory for ECS task in MB"
  type        = string
  default     = "1024"
}

variable "ecs_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
  default     = 1
}

# Container variables
variable "container_image" {
  description = "Docker image for the application"
  type        = string
  default     = "hackloumi-chat:latest"
}

# Security variables
variable "jwt_secret" {
  description = "JWT secret for token signing"
  type        = string
  sensitive   = true
}

# SSL/TLS variables
variable "enable_ssl" {
  description = "Whether to enable SSL/TLS for the load balancer"
  type        = bool
  default     = false
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS listener (required if enable_ssl is true)"
  type        = string
  default     = ""
}