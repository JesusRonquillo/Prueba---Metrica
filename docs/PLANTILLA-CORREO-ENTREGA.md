Asunto: Entrega Reto Técnico — Plataforma de Eventos

Estimados,

Adjunto la entrega del reto técnico correspondiente a la **Plataforma de Eventos (MVP)**.

**Repositorio:** [enlace al repositorio GitHub]

---

**A) Diagrama de arquitectura**

La documentación de arquitectura se encuentra en la carpeta **`docs/`** del repositorio:

- **`docs/README.md`**: Índice con los tres diagramas y las explicaciones.
- **Diagramas (imágenes en `docs/`):**
  - **Diagrama de negocio** (`diagrama-negocio.png`): Actores (Administrador, Promotor, Usuario), capacidades de la plataforma y valor entregado.
  - **Diagrama de arquitectura general** (`diagrama-arquitectura-general.png`): Componentes y servicios (API EventService, NotificationService, PostgreSQL, Redis, RabbitMQ), listado de microservicios y relaciones.
  - **Diagrama de arquitectura específica** (`diagrama-arquitectura-especifica.png`): Despliegue en AWS (ALB, ECS Fargate, RDS, ElastiCache, ECR, Secrets Manager) y flujo de tráfico.

Incluye:
- **Componentes/servicios:** APIs (EventService), Broker (RabbitMQ), BDs (PostgreSQL por servicio), Redis (cache).
- **Microservicios:** EventService (API HTTP), NotificationService (worker consumidor).
- **Flujos:** HTTP síncrono (POST/GET /events, JWT) y eventos asíncronos (EventCreated → NotificationService vía RabbitMQ).
- **Seguridad:** JWT, roles Admin/Promotor para POST /events, boundaries documentados en los diagramas.
- **Sustentación:** Breve justificación en las descripciones de cada diagrama en `docs/README.md` y en el README raíz.

Guía de despliegue en AWS (Terraform, ECR, ECS): **`docs/DEPLOY-AWS.md`**.

---

**B) Código fuente Backend y Frontend**

- **README con instrucciones de ejecución:**
  - **Raíz:** `README.md` — visión general, estructura del repo, ejecución con docker-compose y modo manual.
  - **Backend:** `backend/README.md` — servicios, endpoints, ejecución local (manual y con docker-compose), migraciones EF y pruebas.
  - **Frontend:** `frontend/event-platform-web/README.md` — instalación, variables de entorno y ejecución.

- **Modelo de datos e inicialización:**
  - Se utiliza **Entity Framework Core** con migraciones. Las instrucciones de migración y actualización de BD están en `backend/README.md` (aplicar migraciones con `dotnet ef database update` desde cada proyecto). No se incluye seed de datos iniciales; el modelo se crea al ejecutar las migraciones al arrancar los servicios.

- **Dockerfile y Docker Compose:**
  - **Dockerfiles:** `backend/EventService/Dockerfile`, `backend/NotificationService/Dockerfile`, `frontend/event-platform-web/Dockerfile`.
  - **Docker Compose:** `docker-compose.yml` en la raíz (PostgreSQL, Redis, RabbitMQ, EventService, NotificationService, Frontend). Instrucciones en el README raíz (`docker-compose up --build`).

Además se incluye carpeta **`postman/`** con colección y README para pruebas de la API, e **`infra/terraform/`** para despliegue en AWS.

Quedo atento a cualquier comentario o ajuste.

Saludos cordiales,

[Tu nombre]
