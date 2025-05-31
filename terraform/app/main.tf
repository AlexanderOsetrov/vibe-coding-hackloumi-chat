# Hackloumi Chat - Cloud Agnostic AWS Infrastructure
# This Terraform configuration deploys the chat application using existing VPC infrastructure

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.app_name
      Owner       = var.owner
    }
  }
} 