# ECR Repository for container images

resource "aws_ecr_repository" "hackloumi_chat" {
  name                 = "${var.app_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project     = var.app_name
    Environment = var.environment
    Owner       = "alexander.osetrov@dataart.com"
  }
}

# ECR Lifecycle Policy
resource "aws_ecr_lifecycle_policy" "hackloumi_chat" {
  repository = aws_ecr_repository.hackloumi_chat.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
} 