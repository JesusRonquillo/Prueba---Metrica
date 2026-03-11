# Revisión vs. Reto Técnico — Checklist de cumplimiento

Referencia: enunciado del reto (Contexto, Objetivo, Stack, MVP, Entregables).

---

## 1. Objetivo del reto (diseño y MVP)

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Diseño microservicios + eventos con Broker | ✅ | EventService, NotificationService, RabbitMQ (y Terraform con Service Discovery). |
| Comunicación async y sync según caso de uso | ✅ | Sync: POST/GET /events. Async: EventCreated → NotificationService. |
| Motores BD SQL/NoSQL por microservicio | ✅ | PostgreSQL por servicio; Redis para cache. |
| Autenticación/autorización JWT (OIDC/OAuth evolución) | ✅ | JWT en header; endpoint /auth/token; política AdminOrPromotor para POST /events. |
| Arquitectura en nube AWS o híbrido | ✅ | Terraform: ECS Fargate, RDS, ElastiCache, ECR, ALB, Secrets Manager, CloudWatch. docs/DEPLOY-AWS.md. |
| Patrones de resiliencia y alta concurrencia | ✅ | Reintentos (MassTransit), idempotencia por messageId, cache Redis, transacción acotada en POST /events. |
| MVP: 1 API .NET + BD SQL/NoSQL + pantalla React “registrar evento” | ✅ | EventService + NotificationService, PostgreSQL + Redis, frontend “Registrar Evento”. |
| Arquitectura limpia y DDD, event-driven, frontend básico | ✅ | Capas Domain/Application/Infrastructure; eventos de dominio; React con formulario y validación. |

---

## 2. Stack requerido

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Diagramas: Draw IO / Mermaid / Excalidraw | ✅ | docs/diagrams/ (Mermaid). architecture.md referencia diagramas; existe architecture-mermaid.md. |
| Docker Desktop o Podman | ✅ | docker-compose.yml en raíz. |
| .NET 9 o 10 | ✅ | .NET 10. |
| EF, MassTransit (y librerías de apoyo) | ✅ | EF Core, MassTransit.RabbitMQ. MediatR/FluentValidation/Polly/MailKit: sugeridas “etc.”, no obligatorias. |
| Comunicación async: RabbitMQ / SQS / SNS | ✅ | RabbitMQ (local y en ECS vía contenedor). |
| Persistencia SQL: SQL Server o PostgreSQL | ✅ | PostgreSQL. |
| Persistencia temporal: Redis / ElastiCache | ✅ | Redis local; ElastiCache en Terraform. |
| Frontend: React 18+ (TypeScript recomendado) | ✅ | React + TypeScript + Vite. |
| Estilos: Tailwind / CSS / Styled Components | ✅ | Tailwind CSS. |
| Infra local: docker-compose (api-event, api-notifications, db(s), rabbitmq) | ✅ | docker-compose: eventservice-api, notificationservice-worker, postgres, redis, rabbitmq (+ frontend). |
| Infra AWS (Lambda, SQS, Fargate, RDS, S3, etc.) | ✅ | ECS Fargate, RDS, ElastiCache, ECR, ALB, Secrets Manager, CloudWatch. No Lambda/SQS en MVP (broker = RabbitMQ en ECS). |

---

## 3. MVP — API EventService

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Registrar eventos y zonas | ✅ | POST /events con evento + zonas en una transacción. |
| Publicar eventos y notificar de forma asíncrona | ✅ | EventCreated publicado a RabbitMQ tras commit. |
| Modelo: Event (id, nombre, fecha, lugar, estado) | ✅ | Dominio y persistencia. |
| Modelo: Zone (id, eventId, nombre, precio, capacidad) | ✅ | Dominio y persistencia. |
| POST /events: crea evento + zonas en una transacción | ✅ | Transacción EF; después publicar. |
| POST /events: publica mensaje EventCreated en cola | ✅ | MassTransit Publish. |
| GET /events: listar eventos | ✅ | Implementado. |
| GET /events: cache con Redis | ✅ | X-Cache: HIT/MISS. |
| GET /events/{id} (opcional) | ✅ | Implementado: devuelve detalle del evento o 404. |

---

## 4. MVP — API NotificationService

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Consumir EventCreated | ✅ | EventCreatedConsumer con MassTransit. |
| Idempotencia: no procesar mismo messageId dos veces | ✅ | Tabla de messageIds procesados (BD notificationservice). |

---

## 5. Requisitos de mensajería (obligatorio)

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Mensaje con messageId, eventId, name, occurredAt, correlationId, version | ✅ | EventCreatedMessage y contrato en EventPlatform.Messaging.Contracts. |
| Idempotencia en consumidor (NotificationService) | ✅ | Por messageId en BD. |

---

## 6. Requisitos de persistencia (obligatorio)

| Requisito | Estado | Notas |
|-----------|--------|-------|
| API persiste en su BD | ✅ | EventService → eventservice; NotificationService → notificationservice. |
| Uso de ORM (p. ej. EF) para persistencia | ✅ | EF Core + migraciones. |

---

## 7. Frontend (React) — pantalla “Registrar Evento”

| Requisito | Estado | Notas |
|-----------|--------|-------|
| Pantalla “Registrar Evento” | ✅ | RegisterEventPage. |
| Formulario: nombre evento, fecha, lugar | ✅ | Campos en el formulario. |
| Zonas: lista editable (nombre, precio, capacidad) | ✅ | Zonas editables en el formulario. |
| Botón “Guardar” | ✅ | Envía POST /events. |
| Consumir POST /events con JWT (puede ser fijo para demo) | ✅ | Token desde /auth/token o fijo; Authorization Bearer. |
| Validación: campos obligatorios, capacidad > 0, precio ≥ 0 | ✅ | Validación en frontend (y reglas en dominio backend). |
| Manejo de loading / error | ✅ | Estados de carga y error en la UI. |

---

## 8. Entregables finales

### A) Diagrama de arquitectura

| Entregable | Estado | Ubicación |
|------------|--------|-----------|
| docs/architecture.md (o drawio / imágenes en docs/diagrams/) | ✅ | docs/architecture.md con visión, microservicios, flujos, seguridad, persistencia, AWS. |
| Componentes/servicios: APIs, Broker, DB(s) | ✅ | architecture.md y diagramas referenciados. |
| Listado de microservicios | ✅ | Sección 4 de architecture.md. |
| Flujos HTTP sync + eventos async | ✅ | Sección 5 y diagramas de flujo. |
| Notas de seguridad: JWT, roles, boundaries | ✅ | Sección 7. |
| Breve sustentación | ✅ | Sección 13. |
| Imágenes en docs/diagrams/ | ⚠️ | architecture.md referencia .png (c4-context, deployment-mvp, etc.); en repo está docs/diagrams/architecture-mermaid.md. Si hace falta, exportar Mermaid a PNG o añadir drawio. |

### B) Código y operación

| Entregable | Estado | Ubicación |
|------------|--------|-----------|
| README con instrucciones de ejecución | ✅ | README.md (raíz), backend/README.md, frontend/event-platform-web/README.md. |
| Scripts/modelo de BD; si EF, instrucciones de migración | ✅ | Migraciones EF; COMANDOS-Y-RUTAS.md y backend README. |
| Dockerfile por API | ✅ | backend/EventService/Dockerfile, backend/NotificationService/Dockerfile. |
| Docker Compose (o Podman Compose) | ✅ | docker-compose.yml en raíz. |
| Repositorio GitHub / GitLab / Bitbucket | ⚪ | A cargo del postulante. |

---

## 9. Extras implementados (fuera del mínimo)

| Elemento | Descripción |
|----------|-------------|
| Tests de dominio | EventPlatform.EventService.Domain.Tests (reglas Event/Zone). |
| Test de integración | EventsEndpointIntegrationTests (POST /events con WebApplicationFactory). |
| CI (GitHub Actions) | Build, tests, build frontend; build y push de imágenes Docker (ECR). |
| Health check | GET /health (Postgres + Redis). |
| CloudWatch Logs | Serilog con sink opcional a AWS CloudWatch. |
| Despliegue AWS | Terraform (VPC, ECS, RDS, ElastiCache, ALB, ECR, Secrets Manager, etc.) y docs/DEPLOY-AWS.md. |
| Tarea ECS para crear BD | db-init para crear `notificationservice` cuando RDS no es accesible desde fuera. |

---

## Resumen

- **Obligatorios del reto:** cubiertos (APIs, mensajería, persistencia, frontend, docker-compose, Dockerfiles, architecture.md, READMEs).
- **Opcional no implementado:** GET /events/{id}.
- **Revisar si el revisor exige diagramas en imagen:** tener en docs/diagrams/ los PNG o un drawio exportado; hoy está el detalle en architecture.md y architecture-mermaid.md.

Si quieres, el siguiente paso puede ser añadir GET /events/{id} o generar/exportar los diagramas a PNG/drawio para cerrar el 100% del entregable A.
