# Repositorios ECR para las imágenes Docker

resource "aws_ecr_repository" "eventservice_api" {
  name                 = "${var.project_name}/eventservice-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "notificationservice_worker" {
  name                 = "${var.project_name}/notificationservice-worker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
