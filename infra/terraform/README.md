# Terraform — EventPlatform AWS

Despliegue de la infraestructura AWS para la Plataforma de Eventos: ECS Fargate, RDS, ElastiCache, RabbitMQ, ALB, ECR, Secrets Manager.

## Requisitos

- [Terraform](https://www.terraform.io/) >= 1.5
- AWS CLI configurado (`aws configure`)
- Variables sensibles: `db_password`, `jwt_secret`

## Uso

### 1. Inicializar

```bash
cd infra/terraform
terraform init
```

### 2. Variables

Copia el ejemplo y edita:

```bash
cp terraform.tfvars.example terraform.tfvars
# Edita terraform.tfvars con db_password y jwt_secret
```

O pasa las variables por línea de comandos:

```bash
terraform plan -var="db_password=TU_PASSWORD" -var="jwt_secret=TU_JWT_SECRET_32_CARACTERES"
```

### 3. Plan y Apply

```bash
terraform plan -var="db_password=..." -var="jwt_secret=..."
terraform apply -var="db_password=..." -var="jwt_secret=..."
```

### 4. Crear BD notificationservice

Tras el primer `apply`, RDS estará creado. Si usas RDS en subnets privadas, necesitas conectarte desde una máquina en la VPC (o usa RDS Query Editor en la consola). Si está en público (solo dev), ejecuta:

```bash
# Obtén el comando del output
terraform output -raw create_notificationservice_db
```

### 5. Construir y subir imágenes Docker

```bash
# Desde la raíz del proyecto
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=eu-west-1  # o tu región

aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

docker build -t $(terraform -chdir=infra/terraform output -raw ecr_eventservice) -f backend/EventService/Dockerfile .
docker build -t $(terraform -chdir=infra/terraform output -raw ecr_notificationservice) -f backend/NotificationService/Dockerfile .
docker build -t $(terraform -chdir=infra/terraform output -raw ecr_frontend) -f frontend/event-platform-web/Dockerfile frontend/event-platform-web

docker push $(terraform -chdir=infra/terraform output -raw ecr_eventservice)
docker push $(terraform -chdir=infra/terraform output -raw ecr_notificationservice)
docker push $(terraform -chdir=infra/terraform output -raw ecr_frontend)
```

### 6. Reiniciar servicios ECS (para que cojan las imágenes)

```bash
aws ecs update-service --cluster eventplatform-dev --service eventplatform-eventservice --force-new-deployment
aws ecs update-service --cluster eventplatform-dev --service eventplatform-notificationservice --force-new-deployment
aws ecs update-service --cluster eventplatform-dev --service eventplatform-frontend --force-new-deployment
```

### 7. URL de la aplicación

```bash
terraform output api_url
# http://eventplatform-alb-xxx.eu-west-1.elb.amazonaws.com
```

- Frontend: `http://<alb_dns>/`
- API: `http://<alb_dns>/events`, `http://<alb_dns>/health`, `http://<alb_dns>/auth/token`

**Nota:** El frontend debe estar construido con `VITE_API_URL` apuntando al mismo ALB (o vacío para rutas relativas) para que las llamadas a la API funcionen.

## Estructura

| Archivo        | Descripción                      |
|----------------|----------------------------------|
| `main.tf`      | Provider AWS                     |
| `variables.tf` | Variables                        |
| `vpc.tf`       | VPC, subnets, NAT                |
| `security-groups.tf` | Security groups           |
| `ecr.tf`       | Repositorios ECR                 |
| `rds.tf`       | RDS PostgreSQL                   |
| `elasticache.tf` | ElastiCache Redis             |
| `iam.tf`       | Roles ECS                        |
| `secrets.tf`   | Secrets Manager                  |
| `ecs.tf`       | Cluster, tasks, services         |
| `alb.tf`       | ALB, target groups, listener     |
| `outputs.tf`   | Salidas                          |
