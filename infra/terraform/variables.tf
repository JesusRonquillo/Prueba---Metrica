variable "aws_region" {
  description = "Región AWS"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "eventplatform"
}

variable "environment" {
  description = "Entorno (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_username" {
  description = "Usuario de la base de datos RDS"
  type        = string
  default     = "eventplatform"
  sensitive   = true
}

variable "db_password" {
  description = "Contraseña de la base de datos RDS"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret para JWT (mínimo 32 caracteres)"
  type        = string
  sensitive   = true
}

variable "ecr_image_tag" {
  description = "Tag de las imágenes Docker en ECR (ej: latest, v1.0)"
  type        = string
  default     = "latest"
}

variable "frontend_api_url" {
  description = "URL de la API para el frontend (se inyecta en build)"
  type        = string
  default     = "" # Se rellenará con la URL del ALB tras el primer deploy
}
