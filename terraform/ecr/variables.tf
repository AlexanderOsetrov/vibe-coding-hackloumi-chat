# Variables for ECR Repository

variable "aws_region" {
  description = "AWS region where ECR repository will be created"
  type        = string
  default     = "us-east-1"
}

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