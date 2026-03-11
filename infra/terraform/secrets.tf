# Secrets Manager - connection strings y JWT
# Nota: RDS devuelve el endpoint tras crearse; usamos data para las referencias en Task Definition

resource "aws_secretsmanager_secret" "eventservice_connection" {
  name = "${var.project_name}/eventservice/connection-string"
}

resource "aws_secretsmanager_secret_version" "eventservice_connection" {
  secret_id = aws_secretsmanager_secret.eventservice_connection.id
  secret_string = "Host=${aws_db_instance.postgres.address};Port=5432;Database=eventservice;Username=${var.db_username};Password=${var.db_password};Include Error Detail=true;"
}

resource "aws_secretsmanager_secret" "notificationservice_connection" {
  name = "${var.project_name}/notificationservice/connection-string"
}

resource "aws_secretsmanager_secret_version" "notificationservice_connection" {
  secret_id = aws_secretsmanager_secret.notificationservice_connection.id
  secret_string = "Host=${aws_db_instance.postgres.address};Port=5432;Database=notificationservice;Username=${var.db_username};Password=${var.db_password};Include Error Detail=true;"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}
