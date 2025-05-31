# Outputs for ECR Repository

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.hackloumi_chat.repository_url
}

output "ecr_repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.hackloumi_chat.name
} 