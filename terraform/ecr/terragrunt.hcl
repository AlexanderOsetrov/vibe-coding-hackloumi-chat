# Terragrunt configuration for ECR Repository module

# Include the shared remote state configuration
include "root" {
  path = find_in_parent_folders("state.hcl")
}

# Terraform module configuration
terraform {
  source = "."
}

# Input variables for the ECR module
inputs = {
  aws_region  = get_env("TF_VAR_aws_region", "us-east-1")
  app_name    = get_env("TF_VAR_app_name", "hackloumi-chat")
  environment = get_env("TF_VAR_environment", "production")
}

# Generate provider configuration
generate "provider" {
  path      = "provider_override.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project = var.app_name
      Owner   = "alexander.osetrov@dataart.com"
    }
  }
}
EOF
} 