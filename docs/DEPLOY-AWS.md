# Despliegue en AWS — Plataforma de Eventos

## Opción rápida: Terraform

Para automatizar todo el despliegue, usa Terraform (recomendado):

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edita terraform.tfvars: db_password, jwt_secret
terraform init
terraform apply -var-file=terraform.tfvars
```

Luego construye y sube las imágenes Docker, crea la BD `notificationservice` y reinicia los servicios ECS. **Guía completa:** `infra/terraform/README.md`.

---

## ¿Dónde desplegamos?

Desplegamos en **AWS**, usando:

| Dónde | Servicio | Qué va ahí |
|-------|----------|------------|
| **Contenedores** | ECS Fargate | EventService API, NotificationService Worker, frontend React |
| **Imágenes Docker** | ECR | Registro privado de imágenes |
| **Base de datos** | RDS PostgreSQL | BD `eventservice` y `notificationservice` |
| **Cache** | ElastiCache Redis | Cache para GET /events |
| **Mensajería** | Amazon MQ (RabbitMQ) o SQS/SNS | Cola de eventos |
| **Tráfico HTTP** | ALB (Application Load Balancer) | Delante de EventService |
| **Secrets** | Secrets Manager | Connection strings, JWT |
| **Logs** | CloudWatch Logs | Logs de la aplicación |
| **Región** | (tu elección) | P. ej. `eu-west-1`, `us-east-1` |

---

## Pasos a pasos (checklist)

### Paso 1 — Prerrequisitos
- [ ] Tener cuenta AWS
- [ ] Instalar [AWS CLI](https://aws.amazon.com/cli/) y configurar: `aws configure`
- [ ] Instalar Docker
- [ ] Decidir la región (ej. `eu-west-1`)

### Paso 2 — Crear repositorios ECR
```bash
REGION=eu-west-1  # cambia si usas otra región
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

aws ecr create-repository --repository-name eventplatform/eventservice-api --region $REGION
aws ecr create-repository --repository-name eventplatform/notificationservice-worker --region $REGION
aws ecr create-repository --repository-name eventplatform/frontend --region $REGION
```

### Paso 3 — Autenticarse contra ECR y subir imágenes
```bash
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# Desde la raíz del proyecto
docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/eventservice-api:latest -f backend/EventService/Dockerfile .
docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/notificationservice-worker:latest -f backend/NotificationService/Dockerfile .
docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/frontend:latest -f frontend/event-platform-web/Dockerfile frontend/event-platform-web
# El frontend se construye con VITE_API_URL vacío por defecto → en producción usa el mismo ALB (rutas relativas).

docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/eventservice-api:latest
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/notificationservice-worker:latest
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/frontend:latest
```

### Push de todo a producción (los 3 servicios)

Desde la **raíz del repo**, copia y pega este bloque para construir, subir y desplegar EventService, NotificationService y Frontend:

```bash
REGION=eu-west-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

# 1) Login en ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# 2) Construir las 3 imágenes
docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/eventservice-api:latest -f backend/EventService/Dockerfile .
docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/notificationservice-worker:latest -f backend/NotificationService/Dockerfile .
docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/frontend:latest -f frontend/event-platform-web/Dockerfile frontend/event-platform-web

# 3) Subir las 3 imágenes
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/eventservice-api:latest
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/notificationservice-worker:latest
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/frontend:latest

# 4) Reiniciar los 3 servicios en ECS
aws ecs update-service --cluster eventplatform-dev --service eventplatform-eventservice --force-new-deployment --region $REGION
aws ecs update-service --cluster eventplatform-dev --service eventplatform-notificationservice --force-new-deployment --region $REGION
aws ecs update-service --cluster eventplatform-dev --service eventplatform-frontend --force-new-deployment --region $REGION
```

En unos minutos la app estará actualizada. URL: `terraform -chdir=infra/terraform output api_url` (o la que tengas del ALB).

### Actualizar solo EventService (tras cambios en el código)

Si solo modificaste la API de eventos y ya tienes la infra con Terraform:

**Bloque único (copia y pega todo desde la raíz del repo):**

```bash
REGION=eu-west-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/eventplatform/eventservice-api:latest"

# 1) Login en ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# 2) Construir imagen
docker build -t $ECR_URI -f backend/EventService/Dockerfile .

# 3) Subir imagen (push)
docker push $ECR_URI

# 4) Reiniciar el servicio en ECS
aws ecs update-service --cluster eventplatform-dev --service eventplatform-eventservice --force-new-deployment --region $REGION
```

Opción con Terraform (URI desde output):

```bash
ECR_URI=$(terraform -chdir=infra/terraform output -raw ecr_eventservice)
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin "${ECR_URI%%/*}"
docker build -t "$ECR_URI" -f backend/EventService/Dockerfile .
docker push "$ECR_URI"
aws ecs update-service --cluster eventplatform-dev --service eventplatform-eventservice --force-new-deployment --region eu-west-1
```

Opción B sin Terraform (sustituye ACCOUNT y REGION):

```bash
REGION=eu-west-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

docker build -t $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/eventservice-api:latest -f backend/EventService/Dockerfile .
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/eventplatform/eventservice-api:latest
aws ecs update-service --cluster eventplatform-dev --service eventplatform-eventservice --force-new-deployment --region $REGION
```

### Paso 4 — Crear VPC y subnets (o usar default)
- [ ] Opción A: usar la VPC por defecto
- [ ] Opción B: crear VPC, subnets públicas/privadas y NAT Gateway (consola o Terraform)

### Paso 5 — Crear RDS PostgreSQL
- [ ] Crear instancia RDS PostgreSQL 16
- [ ] Crear BD `eventservice` y `notificationservice` (o usar un RDS con ambas)
- [ ] Anotar endpoint y credenciales

### Paso 6 — Crear ElastiCache Redis
- [ ] Crear cluster ElastiCache (Redis)
- [ ] Anotar el endpoint

### Paso 7 — Crear Amazon MQ (RabbitMQ) o SQS/SNS
- [ ] Opción A: Amazon MQ con RabbitMQ (mantiene compatibilidad actual)
- [ ] Opción B: migrar a SQS/SNS (requiere cambios en MassTransit)

### Paso 8 — Crear secrets en Secrets Manager
```bash
aws secretsmanager create-secret --name eventplatform/eventservice/connection-string \
  --secret-string 'Host=TU-RDS.amazonaws.com;Port=5432;Database=eventservice;Username=xxx;Password=xxx' --region $REGION

aws secretsmanager create-secret --name eventplatform/notificationservice/connection-string \
  --secret-string 'Host=TU-RDS.amazonaws.com;Port=5432;Database=notificationservice;Username=xxx;Password=xxx' --region $REGION

aws secretsmanager create-secret --name eventplatform/jwt-secret \
  --secret-string 'tu-secret-jwt-minimo-32-caracteres' --region $REGION
```

### Paso 9 — Crear cluster ECS y Task Definitions
- [ ] Crear cluster ECS
- [ ] Crear Task Definition para EventService (imagen ECR, variables, secrets, puerto 8080)
- [ ] Crear Task Definition para NotificationService (imagen ECR, variables, secrets)
- [ ] Crear Task Definition para frontend (imagen ECR, puerto 80)
- [ ] Crear IAM Role para la tarea (permisos ECR, Secrets Manager, CloudWatch Logs)

### Paso 10 — Crear ALB y Target Group
- [ ] Crear Application Load Balancer
- [ ] Crear Target Group apuntando al puerto 8080 de EventService
- [ ] Configurar health check: path `/health`, intervalo 30 s
- [ ] Añadir listener (HTTP 80 o HTTPS 443)

### Paso 11 — Crear servicios ECS
- [ ] Crear servicio ECS para EventService (con ALB)
- [ ] Crear servicio ECS para NotificationService (sin ALB, worker)
- [ ] Crear servicio ECS para frontend (con ALB o detrás del mismo ALB vía reglas)

### Paso 12 — Configurar variables de entorno
En las Task Definitions, añadir:

**EventService:**
- `ConnectionStrings__EventDatabase` (desde Secrets Manager)
- `ConnectionStrings__Redis` (endpoint ElastiCache)
- `ConnectionStrings__RabbitMQ` (amqp://...)
- `Jwt__Secret` (desde Secrets Manager)
- `CloudWatch__LogGroupName=/eventplatform/eventservice`
- `CloudWatch__Region` o `AWS_REGION`

**NotificationService:**
- `ConnectionStrings__NotificationDatabase` (desde Secrets Manager)
- `ConnectionStrings__RabbitMQ` (amqp://...)

### Paso 13 — Verificar
- [ ] Abrir la URL del ALB en el navegador
- [ ] Probar `GET /events` y `POST /auth/token` → `POST /events`
- [ ] Revisar logs en CloudWatch

---

## Secrets Manager (referencia)

Almacena las cadenas de conexión y claves sensibles:

```bash
# Connection string EventService
aws secretsmanager create-secret \
  --name eventplatform/eventservice/connection-string \
  --secret-string 'Host=xxx.rds.amazonaws.com;Port=5432;Database=eventservice;Username=eventservice;Password=xxx'

# Connection string NotificationService
aws secretsmanager create-secret \
  --name eventplatform/notificationservice/connection-string \
  --secret-string 'Host=xxx.rds.amazonaws.com;Port=5432;Database=notificationservice;Username=notificationservice;Password=xxx'

# JWT Secret
aws secretsmanager create-secret \
  --name eventplatform/jwt-secret \
  --secret-string 'tu-secret-jwt-minimo-32-caracteres'
```

En la **Task Definition** de ECS, referencia estos secrets mediante `secrets`:

```json
{
  "secrets": [
    {
      "name": "ConnectionStrings__EventDatabase",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:eventplatform/eventservice/connection-string"
    },
    {
      "name": "Jwt__Secret",
      "valueFrom": "arn:aws:secretsmanager:region:account:secret:eventplatform/jwt-secret"
    }
  ]
}
```

---

## CloudWatch Logs (referencia)

El **EventService API** está configurado con Serilog y sink opcional hacia CloudWatch. Se activa cuando se definen:

- `CloudWatch:LogGroupName`: nombre del Log Group (p. ej. `/eventplatform/eventservice`)
- `CloudWatch:Region` o `AWS_REGION`: región (p. ej. `eu-west-1`)

**Variables de entorno en ECS para EventService:**

```
CloudWatch__LogGroupName=/eventplatform/eventservice
CloudWatch__Region=eu-west-1
```

O vía `AWS_REGION` (ya presente en Fargate).

El Task Role debe tener permisos para CloudWatch Logs:

```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
    "logs:DescribeLogStreams"
  ],
  "Resource": "arn:aws:logs:*:*:log-group:/eventplatform/*"
}
```

---

## Health Check del ALB (referencia)

El endpoint `/health` del EventService expone el resultado de los health checks de Postgres y Redis. Usarlo en el **Target Group** del ALB:

- **Path**: `/health`
- **Interval**: 30 s
- **Timeout**: 5 s
- **Healthy threshold**: 2
- **Unhealthy threshold**: 3

---

## Imágenes Docker y ECR (referencia)

### Construir y subir imágenes

```bash
# Autenticarse contra ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.eu-west-1.amazonaws.com

# Crear repositorios (si no existen)
aws ecr create-repository --repository-name eventplatform/eventservice-api
aws ecr create-repository --repository-name eventplatform/notificationservice-worker
aws ecr create-repository --repository-name eventplatform/frontend

# Construir y etiquetar (desde la raíz del proyecto)
# Frontend: se construye sin VITE_API_URL (por defecto) para que en producción use el mismo origen (ALB).
docker build -t <account>.dkr.ecr.eu-west-1.amazonaws.com/eventplatform/eventservice-api:latest -f backend/EventService/Dockerfile .
docker build -t <account>.dkr.ecr.eu-west-1.amazonaws.com/eventplatform/notificationservice-worker:latest -f backend/NotificationService/Dockerfile .
docker build -t <account>.dkr.ecr.eu-west-1.amazonaws.com/eventplatform/frontend:latest -f frontend/event-platform-web/Dockerfile frontend/event-platform-web

# Push
docker push <account>.dkr.ecr.eu-west-1.amazonaws.com/eventplatform/eventservice-api:latest
docker push <account>.dkr.ecr.eu-west-1.amazonaws.com/eventplatform/notificationservice-worker:latest
docker push <account>.dkr.ecr.eu-west-1.amazonaws.com/eventplatform/frontend:latest
```

---

## CI/CD (GitHub Actions)

El pipeline `.github/workflows/ci.yml` ya compila y construye imágenes. Para integrar con AWS:

1. Añadir un job de **deploy** (solo en `main`) que:
   - autentique contra ECR
   - construya y suba imágenes
   - actualice el servicio ECS vía `aws ecs update-service`

2. Usar **OIDC** o **Access Keys** como secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) para GitHub Actions.

---

## Infraestructura como código (Terraform)

Se puede crear un módulo `infra/terraform/` con:

- VPC, subnets, NAT
- RDS (PostgreSQL), ElastiCache (Redis)
- ECR repos
- ECS cluster, task definitions, services
- ALB, target group, listener
- Secrets Manager (referencias)
- CloudWatch Log Groups

Ejemplo de estructura sugerida:

```
infra/terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── vpc.tf
├── rds.tf
├── elasticache.tf
├── ecs.tf
├── alb.tf
└── secrets.tf
```

---

## Resumen de variables de entorno para ECS

### EventService API

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `ConnectionStrings__EventDatabase` | Secrets Manager | Postgres eventservice |
| `ConnectionStrings__Redis` | env / Parameter Store | ElastiCache endpoint |
| `ConnectionStrings__RabbitMQ` | env / Parameter Store | Amazon MQ o broker |
| `Jwt__Secret` | Secrets Manager | Clave JWT |
| `CloudWatch__LogGroupName` | env | Activa sink CloudWatch |
| `CloudWatch__Region` / `AWS_REGION` | env | Región AWS |

### NotificationService Worker

| Variable | Origen | Descripción |
|----------|--------|-------------|
| `ConnectionStrings__NotificationDatabase` | Secrets Manager | Postgres notificationservice |
| `ConnectionStrings__RabbitMQ` | env / Parameter Store | Broker |

---

*Documento de despliegue AWS — Plataforma de Eventos MVP*
