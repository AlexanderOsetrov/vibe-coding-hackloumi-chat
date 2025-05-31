# Terragrunt configuration for Application module

# Include the shared remote state configuration
include "root" {
  path = find_in_parent_folders("state.hcl")
}

# Terraform module configuration
terraform {
  source = "."
}

# Dependencies - ECR repository must exist before deploying the app
dependency "ecr" {
  config_path = "../ecr"
  
  # Mock outputs for validate and plan commands when ECR doesn't exist yet
  mock_outputs_allowed_terraform_commands = ["validate", "plan"]
  mock_outputs = {
    ecr_repository_url  = "123456789012.dkr.ecr.us-east-1.amazonaws.com/hackloumi-chat-production"
    ecr_repository_name = "hackloumi-chat-production"
  }
}

# Input variables for the app module
inputs = {
  # Infrastructure variables
  aws_region        = get_env("TF_VAR_aws_region", "us-east-1")
  vpc_id           = get_env("TF_VAR_vpc_id")
  public_subnet_ids = jsondecode(get_env("TF_VAR_public_subnet_ids", "[]"))
  
  # Application variables
  app_name    = get_env("TF_VAR_app_name", "hackloumi-chat")
  environment = get_env("TF_VAR_environment", "production")
  owner       = get_env("TF_VAR_owner")
  node_env    = get_env("TF_VAR_node_env", "production")
  
  # Container configuration
  container_image = get_env("TF_VAR_container_image", dependency.ecr.outputs.ecr_repository_url)
  
  # ECS configuration
  ecs_cpu           = get_env("TF_VAR_ecs_cpu", "512")
  ecs_memory        = get_env("TF_VAR_ecs_memory", "1024") 
  ecs_desired_count = tonumber(get_env("TF_VAR_ecs_desired_count", "1"))
  
  # Security variables
  database_url = get_env("TF_VAR_database_url", "postgresql://hackloumi:hackloumi@localhost:5432/hackloumi")
  jwt_secret   = get_env("TF_VAR_jwt_secret")
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
      Owner   = var.owner
    }
  }
}
EOF
} 