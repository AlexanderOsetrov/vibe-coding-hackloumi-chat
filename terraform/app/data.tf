# Data sources for existing VPC infrastructure

data "aws_vpc" "existing" {
  id = var.vpc_id
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
  
  filter {
    name   = "subnet-id"
    values = var.public_subnet_ids
  }
}

# ECR Repository (created by the ecr module)
data "aws_ecr_repository" "hackloumi_chat" {
  name = "${var.app_name}-${var.environment}"
} 