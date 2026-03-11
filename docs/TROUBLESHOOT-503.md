# Cómo diagnosticar 503 en el ALB

El **503** suele significar que el Application Load Balancer no tiene **targets sanos** en el target group que atiende la petición.

---

## 1. Comprobar estado de los servicios ECS

```bash
REGION=eu-west-1
CLUSTER=eventplatform-dev

# Servicios y número de tareas
aws ecs describe-services --cluster $CLUSTER --services eventplatform-eventservice eventplatform-frontend --region $REGION \
  --query 'services[*].{name:serviceName,running:runningCount,desired:desiredCount,pending:pendingCount}' --output table

# Tareas en ejecución (si runningCount es 0, no hay contenedor levantado)
aws ecs list-tasks --cluster $CLUSTER --region $REGION --desired-status RUNNING --output table
```

Si **runningCount** es 0 o las tareas aparecen como STOPPED, revisa en la consola ECS → Cluster → pestaña **Tasks** (incluye las paradas) el motivo de parada (Failed, Image pull error, etc.).

---

## 2. Comprobar salud en los Target Groups

```bash
REGION=eu-west-1

# ARN de los target groups (ajusta el nombre si tu project_name es distinto)
TG_EVENT=$(aws elbv2 describe-target-groups --names eventplatform-dev-eventservice --region $REGION --query 'TargetGroups[0].TargetGroupArn' --output text)
TG_FRONT=$(aws elbv2 describe-target-groups --names eventplatform-dev-frontend --region $REGION --query 'TargetGroups[0].TargetGroupArn' --output text)

# Estado de los targets (EventService = API)
aws elbv2 describe-target-health --target-group-arn $TG_EVENT --region $REGION --output table

# Estado de los targets (Frontend)
aws elbv2 describe-target-health --target-group-arn $TG_FRONT --region $REGION --output table
```

Si ves **Unhealthy** o **No targets**, el health check está fallando o no hay tareas registradas.

---

## 3. Causas habituales y qué hacer

| Causa | Qué ver |
|-------|--------|
| **Tareas no arrancan** | ECS → Cluster → Tasks (Stopped) → ver "Stopped reason". Suele ser: imagen no encontrada en ECR, secret/ENV mal configurado, falta de memoria. |
| **Health check falla (EventService)** | El ALB llama a `GET http://<task-ip>:8080/health`. Debe responder 200. Revisa logs del contenedor en CloudWatch: `/eventplatform/eventservice`. |
| **Health check falla (Frontend)** | El ALB llama a `GET http://<task-ip>:80/`. Nginx debe responder 200 en `/`. Si la app SPA devuelve 404 en alguna ruta, el health en `/` suele estar bien; si Nginx no escucha en 80, falla. |
| **Security group** | El security group del ALB debe permitir tráfico **de salida** hacia el SG de las tareas ECS en los puertos 8080 (EventService) y 80 (Frontend). Las tareas deben estar en el SG que permite **entrada** desde el SG del ALB en 8080 y 80. |

---

## 4. Revisar logs en CloudWatch

En AWS Console → CloudWatch → Log groups:

- **/eventplatform/eventservice** → ver si la API arranca y si hay excepciones (BD, Redis, RabbitMQ).
- **/eventplatform/frontend** → ver si Nginx arranca.

Si EventService no puede conectar a RDS, Redis o RabbitMQ, puede arrancar pero `/health` devuelve 503 o 500 y el ALB marca el target como unhealthy.

---

## 5. Forzar nuevo despliegue

Si las imágenes o la configuración han cambiado:

```bash
REGION=eu-west-1
CLUSTER=eventplatform-dev

aws ecs update-service --cluster $CLUSTER --service eventplatform-eventservice --force-new-deployment --region $REGION
aws ecs update-service --cluster $CLUSTER --service eventplatform-frontend --force-new-deployment --region $REGION
```

Luego espera 2–3 minutos y vuelve a comprobar los target groups (paso 2).

---

## 6. Probar solo la API (bypass del frontend)

Desde tu máquina:

```bash
curl -v http://<TU_ALB_DNS>/health
```

Si **/health** responde 200 pero la raíz **/** da 503, el problema está en el target group del **frontend** (tareas no sanas o health check en `/` fallando).  
Si **/health** también da 503, el problema está en el target group de **EventService**.
