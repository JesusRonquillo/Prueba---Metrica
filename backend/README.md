# Backend — Plataforma de Eventos

## Visión

Backend del MVP de la **Plataforma de Eventos**, diseñado como arquitectura **orientada a eventos** con dos microservicios:

- `EventService`: API HTTP para gestionar eventos y zonas, publicar eventos de dominio y exponer el listado cacheado.
- `NotificationService`: worker que consume eventos desde el broker y ejecuta acciones de notificación con idempotencia.

La arquitectura completa (C4, flujos, decisiones) está detallada en `docs/architecture.md` y los diagramas en `docs/diagrams/`.

---

## Servicios incluidos

- **EventService**
  - API .NET 10 minimal API.
  - Endpoints:
    - `POST /auth/token`: genera JWT de demo con role (Admin/Promotor).
    - `POST /events`: crea evento + zonas en una transacción y publica `EventCreatedMessage` vía MassTransit.
    - `GET /events`: devuelve listado de eventos con cache Redis (`X-Cache: HIT/MISS`).
    - `GET /events/{id}`: devuelve detalle de un evento (404 si no existe).
    - `GET /health`: health checks de Postgres y Redis.
  - Persistencia: PostgreSQL (`eventservice`).
  - Mensajería: RabbitMQ (`EventCreatedMessage`).
  - Cache: Redis para `GET /events`.
  - Seguridad: JWT (`AdminOrPromotor` para `POST /events`), CORS para `http://localhost:5173`.

- **NotificationService**
  - Worker .NET 10 con MassTransit.
  - Consumidor `EventCreatedConsumer`:
    - Consume mensajes `EventCreatedMessage` desde la cola.
    - Garantiza idempotencia guardando `messageId` en BD; si ya existe, ignora el mensaje.
    - Simula el envío de notificación (log).
  - Persistencia: PostgreSQL (`notificationservice`).
  - Mensajería: RabbitMQ.

---

## Dependencias de infraestructura (local)

- **PostgreSQL**: BD `eventservice` y `notificationservice`.
- **Redis**: cache para `GET /events`.
- **RabbitMQ**: broker de eventos entre servicios.

Puedes levantar estos servicios de dos formas:

- **Modo manual**: comandos `docker run` + `dotnet run` (documentado en `docs/COMANDOS-Y-RUTAS.md`).
- **Con docker-compose**: un solo comando para todo el stack.

---

## Ejecución local (manual, sin docker-compose)

Ver sección detallada en `docs/COMANDOS-Y-RUTAS.md`, pero el flujo resumido es:

1. **Infra básica con Docker**
   - Postgres (BD `eventservice`).
   - Redis (puerto 6380 en host).
   - RabbitMQ (5672 y UI en 15672).
   - Crear BD `notificationservice` en el mismo Postgres.

2. **EventService**
   - Restaurar, compilar y aplicar migraciones (`dotnet ef` Infrastructure + Api como startup).
   - Ejecutar la API (`dotnet run` sobre `EventPlatform.EventService.Api`).

3. **NotificationService**
   - Restaurar, compilar y aplicar migraciones (`dotnet ef database update` con Worker como startup).
   - Ejecutar el worker (`dotnet run` sobre `EventPlatform.NotificationService.Worker`).

4. **Prueba funcional**
   - Obtener un token con `POST http://localhost:5151/auth/token` (role `Admin`).
   - Crear un evento con `POST http://localhost:5151/events` usando el JWT.
   - Ver en la consola del worker que se procesó el mensaje (`Processed EventCreated MessageId=...`).

Todos los comandos concretos están ya listados y probados en `docs/COMANDOS-Y-RUTAS.md`.

Para **pruebas con Postman** y guía de pruebas (Redis, RabbitMQ, flujo E2E), ver la carpeta **`postman/`** en la raíz del repositorio (colección importable + README).

---

## Ejecución con docker-compose

En la raíz del repositorio:

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica"
docker-compose up --build
```

Servicios levantados:

- `postgres`: PostgreSQL 16 (BD `eventservice`; la BD `notificationservice` se crea al aplicar migraciones).
- `redis`: Redis 7 (puerto host `6380`).
- `rabbitmq`: RabbitMQ 3 management (5672, 15672).
- `eventservice-api`: API .NET (`http://localhost:5151`).
- `notificationservice-worker`: worker que consume eventos.

Variables de entorno importantes en `docker-compose.yml`:

- `ConnectionStrings__EventDatabase`: host `postgres` (no `localhost`).
- `ConnectionStrings__NotificationDatabase`: host `postgres`.
- `ConnectionStrings__Redis`: `redis:6379`.
- `ConnectionStrings__RabbitMQ`: `amqp://guest:guest@rabbitmq:5672` (usada por MassTransit vía `ConnectionStrings:RabbitMQ`).

Desde fuera de los contenedores (tu navegador / Postman) sigues usando `http://localhost:5151` para la API.

---

## CloudWatch Logs (opcional)

El **EventService API** usa Serilog con un sink opcional hacia AWS CloudWatch Logs. Para activarlo, define:

- `CloudWatch:LogGroupName`: nombre del Log Group (ej. `/eventplatform/eventservice`)
- `CloudWatch:Region` o `AWS_REGION`: región AWS (ej. `eu-west-1`)

En local no es necesario; los logs se escriben en consola. En ECS Fargate, con el Task Role adecuado, los logs se envían automáticamente a CloudWatch si estas variables están configuradas.

---

## Proyección a AWS (resumen)

Sin cambiar el código de dominio ni de aplicación, el diseño actual permite:

- **ECS Fargate** para `EventService` y `NotificationService` (contenedores derivados de estos Dockerfiles).
- **RDS PostgreSQL** para `eventservice` y `notificationservice` (dos BD separadas).
- **ElastiCache Redis** para cache de `GET /events`.
- **SQS/SNS** o **Amazon MQ** como evolución del broker (en vez de RabbitMQ gestionado).
- **CloudWatch Logs** vía Serilog (ver sección anterior).
- **Secrets Manager** para connection strings y JWT (documentado en `docs/DEPLOY-AWS.md`).
- **ALB** delante de `EventService` usando el endpoint `/health` para health checks.
- **API Gateway** opcional delante del ALB.

**Guía completa de despliegue:** `docs/DEPLOY-AWS.md` (ECR, ECS, RDS, ElastiCache, Secrets Manager, CloudWatch, ALB).

Los detalles arquitectónicos (componentes, flujos, decisiones) están en `docs/architecture.md` (sección 10 e inferiores).

---

## Tests y CI/CD

- **Tests de dominio**:
  - Proyecto `EventPlatform.EventService.Domain.Tests` (xUnit) validando:
    - Reglas de negocio de `Event` (nombre/lugar obligatorios, trimming, timestamps, agregación de zonas).
    - Reglas de `Zone` (capacidad > 0, precio ≥ 0, actualización consistente).
- **Pipeline CI (GitHub Actions)**:
  - Workflow `.github/workflows/ci.yml` que:
    - Restaura y compila el backend (`EventService`).
    - Ejecuta los tests de dominio.
    - Construye el frontend (pnpm + Vite).
    - (En main) construye y publica imágenes Docker para EventService, NotificationService y frontend (pensado para enlazar con ECR/ECS).

