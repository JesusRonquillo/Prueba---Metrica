# ECS Cluster, Task Definitions y Services

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  ecr_url    = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com"
  rabbitmq_host = "rabbitmq.${aws_service_discovery_private_dns_namespace.main.name}"
  rabbitmq_connection = "amqp://guest:guest@${local.rabbitmq_host}:5672"
}

# Service Discovery para que EventService y NotificationService resuelvan RabbitMQ
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "eventplatform.local"
  vpc         = module.vpc.vpc_id
  description = "Service discovery para EventPlatform"
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "eventservice" {
  name              = "/eventplatform/eventservice"
  retention_in_days = var.environment == "prod" ? 14 : 7
}

resource "aws_cloudwatch_log_group" "notificationservice" {
  name              = "/eventplatform/notificationservice"
  retention_in_days = var.environment == "prod" ? 14 : 7
}

resource "aws_cloudwatch_log_group" "rabbitmq" {
  name              = "/eventplatform/rabbitmq"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/eventplatform/frontend"
  retention_in_days = 7
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RabbitMQ - Service Discovery
resource "aws_service_discovery_service" "rabbitmq" {
  name = "rabbitmq"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# Task Definition - RabbitMQ
resource "aws_ecs_task_definition" "rabbitmq" {
  family                   = "${var.project_name}-rabbitmq"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "rabbitmq"
      image     = "rabbitmq:3-management"
      essential = true

      portMappings = [
        { containerPort = 5672, protocol = "tcp" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.rabbitmq.name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "rabbitmq"
        }
      }
    }
  ])
}

# Task Definition - EventService
resource "aws_ecs_task_definition" "eventservice" {
  family                   = "${var.project_name}-eventservice"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "eventservice-api"
      image     = "${local.ecr_url}/${aws_ecr_repository.eventservice_api.name}:${var.ecr_image_tag}"
      essential = true

      portMappings = [
        { containerPort = 8080, protocol = "tcp", appProtocol = "http" }
      ]

      environment = [
        { name = "ASPNETCORE_ENVIRONMENT", value = "Production" },
        { name = "ConnectionStrings__Redis", value = "${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379" },
        { name = "ConnectionStrings__RabbitMQ", value = local.rabbitmq_connection },
        { name = "CloudWatch__LogGroupName", value = "/eventplatform/eventservice" },
        { name = "CloudWatch__Region", value = local.region }
      ]

      secrets = [
        { name = "ConnectionStrings__EventDatabase", valueFrom = aws_secretsmanager_secret.eventservice_connection.arn },
        { name = "Jwt__Secret", valueFrom = aws_secretsmanager_secret.jwt_secret.arn }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.eventservice.name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "eventservice"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

# Task Definition - NotificationService
resource "aws_ecs_task_definition" "notificationservice" {
  family                   = "${var.project_name}-notificationservice"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "notificationservice-worker"
      image     = "${local.ecr_url}/${aws_ecr_repository.notificationservice_worker.name}:${var.ecr_image_tag}"
      essential = true

      environment = [
        { name = "DOTNET_ENVIRONMENT", value = "Production" },
        { name = "ConnectionStrings__RabbitMQ", value = local.rabbitmq_connection }
      ]

      secrets = [
        { name = "ConnectionStrings__NotificationDatabase", valueFrom = aws_secretsmanager_secret.notificationservice_connection.arn }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.notificationservice.name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "notificationservice"
        }
      }
    }
  ])
}

# Task Definition - Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${local.ecr_url}/${aws_ecr_repository.frontend.name}:${var.ecr_image_tag}"
      essential = true

      portMappings = [
        { containerPort = 80, protocol = "tcp", appProtocol = "http" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])
}

# ECS Service - RabbitMQ
resource "aws_ecs_service" "rabbitmq" {
  name            = "${var.project_name}-rabbitmq"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.rabbitmq.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  service_registries {
    registry_arn = aws_service_discovery_service.rabbitmq.arn
  }
}

# ECS Service - EventService
resource "aws_ecs_service" "eventservice" {
  name            = "${var.project_name}-eventservice"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.eventservice.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.eventservice.arn
    container_name   = "eventservice-api"
    container_port   = 8080
  }

  depends_on = [
    aws_ecs_service.rabbitmq,
    aws_lb_listener.http
  ]
}

# ECS Service - NotificationService
resource "aws_ecs_service" "notificationservice" {
  name            = "${var.project_name}-notificationservice"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.notificationservice.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  depends_on = [aws_ecs_service.rabbitmq]
}

# ECS Service - Frontend
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.http]
}
