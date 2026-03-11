output "alb_dns_name" {
  description = "DNS del ALB - URL base de la aplicación"
  value       = aws_lb.main.dns_name
}

output "api_url" {
  description = "URL de la API (EventService)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_eventservice" {
  description = "URI de la imagen EventService para docker push"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/${aws_ecr_repository.eventservice_api.name}:${var.ecr_image_tag}"
}

output "ecr_notificationservice" {
  description = "URI de la imagen NotificationService para docker push"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/${aws_ecr_repository.notificationservice_worker.name}:${var.ecr_image_tag}"
}

output "ecr_frontend" {
  description = "URI de la imagen Frontend para docker push"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/${aws_ecr_repository.frontend.name}:${var.ecr_image_tag}"
}

output "rds_endpoint" {
  description = "Endpoint de RDS PostgreSQL"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "create_notificationservice_db" {
  description = "Comando para crear la BD notificationservice (ejecutar tras el primer apply)"
  value       = "PGPASSWORD='<db_password>' psql -h ${aws_db_instance.postgres.address} -U ${var.db_username} -d eventservice -c \"CREATE DATABASE notificationservice;\""
  sensitive   = true
}

output "run_db_init_task" {
  description = "Comando para crear la BD desde ECS (cuando RDS no es accesible desde fuera)"
  value       = <<-EOT
    Sustituye TU_PASSWORD y ejecuta (en una sola linea):

    aws ecs run-task --cluster ${aws_ecs_cluster.main.name} --task-definition ${aws_ecs_task_definition.db_init.family} --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[${join(",", module.vpc.private_subnets)}],securityGroups=[${aws_security_group.ecs_tasks.id}],assignPublicIp=DISABLED}" --overrides '{"containerOverrides":[{"name":"db-init","environment":[{"name":"PGPASSWORD","value":"TU_PASSWORD"}]}]}' --region ${data.aws_region.current.name}
  EOT
}
