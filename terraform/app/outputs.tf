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

# Load Balancer outputs
output "load_balancer_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_url" {
  description = "URL to access the application"
  value       = var.enable_ssl ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "security_groups" {
  description = "Security group IDs"
  value = {
    ecs_tasks = aws_security_group.ecs_tasks.id
    alb       = aws_security_group.alb.id
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
    access_type   = "application-load-balancer"
    ssl_enabled   = var.enable_ssl
  }
}

output "application_access" {
  description = "How to access the application"
  value = "Application is accessible via the Application Load Balancer at: ${var.enable_ssl ? "https://" : "http://"}${aws_lb.main.dns_name}"
} 