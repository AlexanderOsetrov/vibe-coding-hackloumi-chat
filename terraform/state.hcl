# Shared remote state configuration for Terragrunt
# This file is included by terragrunt.hcl files in subdirectories

remote_state {
  backend = "s3"
  
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
  
  config = {
    bucket = "${get_env("TF_VAR_app_name", "hackloumi-chat")}-terraform-state-${get_env("AWS_ACCOUNT_ID", "")}"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = get_env("TF_VAR_aws_region", "us-east-1")
    
    encrypt        = true
    dynamodb_table = "${get_env("TF_VAR_app_name", "hackloumi-chat")}-terraform-locks"
    
    s3_bucket_tags = {
      Name        = "Terraform State"
      Environment = get_env("TF_VAR_environment", "production")
      Application = get_env("TF_VAR_app_name", "hackloumi-chat")
    }
    
    dynamodb_table_tags = {
      Name        = "Terraform Locks"
      Environment = get_env("TF_VAR_environment", "production") 
      Application = get_env("TF_VAR_app_name", "hackloumi-chat")
    }
  }
} 