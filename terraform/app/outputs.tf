# Outputs for Hackloumi Chat AWS Infrastructure

output "vpc_id" {
  description = "ID of the VPC"
  value       = var.vpc_id
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = data.aws_ecr_repository.hackloumi_chat.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for application logs"
  value       = aws_cloudwatch_log_group.app.name
}

output "security_groups" {
  description = "Security group IDs"
  value = {
    ecs_tasks = aws_security_group.ecs_tasks.id
  }
}

output "deployment_info" {
  description = "Key deployment information"
  value = {
    region        = var.aws_region
    environment   = var.environment
    app_name      = var.app_name
    ecs_cluster   = aws_ecs_cluster.main.name
    ecs_service   = aws_ecs_service.app.name
    database      = "containerized-postgresql"
    access_type   = "direct-ecs-with-public-ip"
  }
}

output "application_access" {
  description = "How to access the application"
  value = "Application will be accessible via the public IP of the ECS task on port 3000. Use AWS CLI: aws ecs list-tasks --cluster ${aws_ecs_cluster.main.name} --service-name ${aws_ecs_service.app.name} to find the task, then describe-tasks to get the public IP."
} 