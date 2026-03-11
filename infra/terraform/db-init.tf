# Tarea de una sola vez para crear la BD notificationservice desde dentro de la VPC

resource "aws_cloudwatch_log_group" "db_init" {
  name              = "/eventplatform/db-init"
  retention_in_days = 1
}

resource "aws_ecs_task_definition" "db_init" {
  family                   = "${var.project_name}-db-init"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "db-init"
      image     = "postgres:16-alpine"
      essential = true

      command = [
        "sh", "-c",
        "psql -h ${aws_db_instance.postgres.address} -p 5432 -U ${var.db_username} -d eventservice -c 'CREATE DATABASE notificationservice;'"
      ]

      environment = [
        { name = "PGPASSWORD", value = "" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.db_init.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "db-init"
        }
      }
    }
  ])
}
