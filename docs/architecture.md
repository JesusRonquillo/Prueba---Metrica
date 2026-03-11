# Arquitectura de la Plataforma de Eventos

**Versión:** 1.1  
**Rol:** Líder Técnico — Diseño de alto nivel  
**Stack principal:** .NET, React, mensajería asíncrona, AWS/Híbrido  
**Notación:** Diagramas inspirados en C4 Model (Context, Deployment) y diagramas de secuencia para flujos.

---

## 1. Visión y principios

La plataforma se diseña como un **sistema de microservicios orientado a eventos**, con comunicación **síncrona** para consultas y comandos que requieren respuesta inmediata, y **asíncrona** para notificaciones, auditoría y desacoplamiento entre dominios.

**Principios aplicados:**
- **Ownership de datos:** cada microservicio es dueño de su persistencia; no hay BD compartida entre servicios.
- **Event-driven:** los cambios de dominio se publican como eventos; otros servicios reaccionan sin acoplamiento directo.
- **Resiliencia:** fallos parciales no derrumban el sistema; reintentos, circuit breaker y colas de dead-letter.
- **Escalabilidad horizontal:** APIs y consumidores escalables de forma independiente según carga.

---

## 2. Diagramas (resumen y referencias)

Todos los diagramas están en `docs/diagrams/`. Se usan vistas inspiradas en **C4** (Context, despliegue) y diagramas de **secuencia** para flujos y resiliencia.

| Diagrama | Archivo | Descripción |
|----------|---------|-------------|
| **C4 Contexto** | [c4-context.png](diagrams/c4-context.png) | Sistema en el mundo: actores (cliente, promotor, admin, staff) y sistemas externos (PSP, mensajería, BI). |
| **Componentes** | [architecture-components.png](diagrams/architecture-components.png) | Capas: clientes, microservicios, broker, persistencia. |
| **Despliegue MVP** | [deployment-mvp.png](diagrams/deployment-mvp.png) | Contenedores Docker/Podman: api-event, api-notifications, BDs, RabbitMQ, Redis y sus conexiones. |
| **Límites de seguridad** | [security-boundaries.png](diagrams/security-boundaries.png) | Trust zones: Internet → API Gateway (validación JWT) → red interna. |
| **Flujo POST /events** | [flow-post-events.png](diagrams/flow-post-events.png) | Secuencia correcta: transacción, publicación, 201. |
| **Flujo errores POST** | [flow-post-events-errors.png](diagrams/flow-post-events-errors.png) | Rama de error: fallo BD → ROLLBACK; fallo broker → reintento / DLQ. |
| **Consumidor Notification** | [flow-notification-consumer.png](diagrams/flow-notification-consumer.png) | Idempotencia por messageId. |

El **diagrama de contexto (C4)** define el límite del sistema, actores y sistemas externos. La **vista de despliegue** detalla contenedores y puertos del MVP. El **diagrama de límites de seguridad** muestra las trust zones y dónde se valida el JWT. El **flujo de errores** documenta ROLLBACK ante fallo de BD y manejo ante fallo del broker (reintento / DLQ).

---

## 3. Diagrama de componentes (alto nivel)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CAPA DE CLIENTES                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  Cliente Web (React)  │  App Staff (Check-in)  │  Admin / Promotores  │  Sistemas externos │
└───────────┬───────────┴──────────────┬─────────┴──────────────┬───────┴─────────┬─────────┘
            │                          │                         │                 │
            │ HTTPS / JWT              │                         │                 │ API / Webhooks
            ▼                          ▼                         ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (opcional en MVP)                               │
│                    Enrutamiento, rate limit, validación JWT centralizada                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CAPA DE MICROSERVICIOS                                       │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┤
│ EventService │ Notification │  Ticketing   │   Search     │   Payment    │   Auth       │
│   (MVP)      │   Service    │   Service    │   Service    │   Service    │   Service    │
│              │   (MVP)      │  (evolución) │  (evolución) │  (evolución) │  (evolución) │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ PostgreSQL   │ PostgreSQL   │ PostgreSQL   │ Elasticsearch│ PostgreSQL  │ PostgreSQL   │
│ o SQL Server │ o SQL Server │ + Redis      │ o OpenSearch │ (transacc.) │ (usuarios)   │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘
       │              │              │              │              │              │
       │              │              │              │              │              │
       └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         BROKER DE MENSAJERÍA (Event Bus)                                  │
│                    RabbitMQ │ Amazon SQS/SNS │ Azure Service Bus                          │
│                    Colas: event-created, order-placed, payment-completed, ...             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
┌─────────────┐              ┌─────────────┐              ┌─────────────┐
│ Redis       │              │ ElastiCache│              │ (Otros      │
│ Cache       │              │ (AWS)      │              │  consumers) │
└─────────────┘              └─────────────┘              └─────────────┘
```

---

## 4. Listado de microservicios

| Microservicio | Responsabilidad | Comunicación entrante | Comunicación saliente | Persistencia |
|---------------|-----------------|------------------------|------------------------|--------------|
| **EventService** | CRUD eventos y zonas; publicar eventos de dominio (EventCreated, etc.). | HTTP (POST/GET events) | Publica a broker (EventCreated) | **PostgreSQL** o SQL Server. Transaccional, relaciones Event–Zone. |
| **NotificationService** | Consumir eventos y enviar notificaciones (email, SMS, push). Idempotencia por messageId. | Consume cola (EventCreated, …) | SMTP, SMS gateway, push (MailKit, etc.) | **PostgreSQL** o SQL Server. Mensajes procesados (idempotencia), plantillas, logs. |
| **TicketingService** *(evolución)* | Reserva/venta de tickets, control de capacidad, evitar sobreventa. | HTTP + eventos (EventPublished) | Publica OrderPlaced, PaymentRequested | **PostgreSQL** + **Redis** (inventario, locks). |
| **SearchService** *(evolución)* | Búsqueda avanzada, filtros, respuesta rápida. | HTTP (GET /search) | Consume EventCreated/Updated para indexar | **Elasticsearch** o OpenSearch. Índice de eventos. |
| **PaymentService** *(evolución)* | Orquestar PSP, reembolsos, compensaciones. | Consume PaymentRequested; HTTP callbacks PSP | Publica PaymentCompleted/Failed | **PostgreSQL**. Transacciones, idempotencia. |
| **AuthService** *(evolución)* | Identidad, JWT, OIDC/OAuth 2.0, roles (cliente, promotor, admin, staff). | HTTP (login, token, refresh) | — | **PostgreSQL**. Usuarios, roles, sesiones. |

**MVP:** solo **EventService** y **NotificationService** con broker (p. ej. RabbitMQ) y Redis para cache en GET /events.

---

## 5. Flujos: HTTP síncrono y eventos asíncronos

### 5.1 Flujo síncrono — Crear evento (Admin)

```
[Cliente React] --POST /events (JWT)--> [EventService]
                                              │
                                              ├--> Transacción: insert Event + Zones
                                              ├--> Publicar EventCreated (cola)
                                              └--> 201 Created
```

El cliente espera la respuesta HTTP; la notificación a otros sistemas es asíncrona.

### 5.2 Flujo síncrono — Listar eventos

```
[Cliente React] --GET /events--> [EventService]
                                      │
                                      ├--> ¿Cache Redis? --> Sí --> 200 + body
                                      └--> No --> Query BD --> Guardar en Redis --> 200 + body
```

### 5.3 Flujo asíncrono — Evento creado → Notificación

```
[EventService] --EventCreated--> [Broker: RabbitMQ/SQS]
                                        │
                                        ▼
[NotificationService] <-- consume cola
        │
        ├--> ¿messageId ya procesado? --> Sí --> ACK (no reprocesar)
        └--> No --> Persistir messageId --> Enviar email/notificación --> ACK
```

Otros flujos futuros (ticketing, pagos, búsqueda) siguen el mismo patrón: comando/consulta por HTTP, efectos secundarios y notificaciones por eventos.

---

## 6. Contrato de mensajes (obligatorio)

Todo evento publicado debe cumplir al menos esta estructura:

```json
{
  "messageId": "uuid",
  "eventId": "uuid",
  "name": "string",
  "occurredAt": "ISO-8601",
  "correlationId": "uuid",
  "version": 1
}
```

- **messageId:** id único del mensaje (idempotencia en consumidores).
- **eventId:** identificador del agregado/entidad de dominio (ej. id del evento).
- **name:** tipo de evento (ej. `EventCreated`).
- **occurredAt:** timestamp del hecho en formato ISO-8601.
- **correlationId:** correlación de la operación entre servicios (trazabilidad).
- **version:** versión del contrato para evolución futura.

Los consumidores (p. ej. NotificationService) deben **evitar procesar dos veces el mismo messageId** (tabla de mensajes procesados o equivalente).

---

## 7. Seguridad: JWT, OIDC, OAuth 2.0 y boundaries

| Aspecto | Diseño |
|---------|--------|
| **Autenticación** | **JWT** en el header `Authorization: Bearer <token>`. En evolución: **OIDC** con un IdP (Auth0, Keycloak, Cognito) para login y emisión de tokens. |
| **Autorización** | Claims en el JWT: `sub`, `role` (cliente, promotor, admin, staff). Middleware en cada API valida rol y recurso. **Boundaries:** EventService solo acepta admin/promotor para POST /events; GET /events puede ser anónimo o autenticado. |
| **OAuth 2.0** | Flujo recomendado para clientes externos (BI, CRM): **Client Credentials** para machine-to-machine; **Authorization Code** para aplicaciones con usuario. |
| **API Gateway** | Punto único de entrada; validación de JWT y rate limiting; los microservicios pueden validar de nuevo el token o confiar en el gateway según nivel de confianza. |
| **Secrets** | Cadenas de conexión y claves en **AWS Secrets Manager** o **Parameter Store**; en local, variables de entorno o docker-compose sin commitear secretos. |

En el **MVP** es aceptable un JWT fijo o un endpoint de login simple que emita un JWT para demostrar el flujo; la sustentación del diseño debe indicar la evolución hacia OIDC/OAuth 2.0.

---

## 8. Persistencia: SQL y NoSQL por servicio

| Servicio | Motor | Justificación |
|----------|--------|----------------|
| **EventService** | **PostgreSQL** o SQL Server | Datos transaccionales con relaciones (Event, Zone). Consistencia fuerte, JOINs, migraciones con EF. |
| **NotificationService** | **PostgreSQL** o SQL Server | Tabla de messageIds procesados (idempotencia), plantillas, logs. Consultas acotadas y transacciones. |
| **TicketingService** *(evolución)* | **PostgreSQL** + **Redis** | PostgreSQL: órdenes, tickets. Redis: inventario por zona, decrementos atómicos, locks para alta concurrencia y evitar sobreventa. |
| **SearchService** *(evolución)* | **Elasticsearch** / OpenSearch | Búsqueda full-text, filtros complejos, agregaciones. Escalabilidad del índice independiente del resto. |
| **PaymentService** *(evolución)* | **PostgreSQL** | Transacciones financieras, auditoría, idempotencia por idempotency-key. |
| **AuthService** *(evolución)* | **PostgreSQL** | Usuarios, roles, sesiones; consistencia y relaciones. |
| **Cache** | **Redis** / ElastiCache | GET /events y cualquier dato de lectura frecuente; TTL para invalidación. |

En el MVP solo se implementan EventService y NotificationService con SQL (PostgreSQL o SQL Server) y Redis para cache del listado de eventos.

---

## 9. Resiliencia y alta concurrencia

| Patrón | Uso |
|--------|-----|
| **Reintentos con backoff** | Llamadas a PSP, envío de email (Polly: RetryPolicy). |
| **Circuit breaker** | Evitar saturar servicios externos (PSP, SMTP); abrir circuito tras N fallos. |
| **Colas y consumidores** | RabbitMQ/SQS: desacoplar productor y consumidor; reprocesar en caso de fallo. |
| **Dead-letter queue (DLQ)** | Mensajes que fallan después de N reintentos; análisis posterior sin bloquear la cola. |
| **Idempotencia** | NotificationService (y futuros consumidores) identifican mensajes por messageId y no procesan duplicados. |
| **Cache (Redis)** | Reducir carga en BD en GET /events y respuestas rápidas en picos. |
| **Transacciones acotadas** | EventService: una transacción por “crear evento + zonas”; después publicar evento. No transacciones distribuidas entre servicios. |
| **Reservas con TTL** *(evolución)* | En ticketing: reserva temporal en Redis con expiración para liberar asientos si no hay pago. |

---

## 10. Infraestructura: AWS o híbrido

| Componente | En local (MVP) | En AWS / híbrido |
|------------|----------------|------------------|
| APIs | Contenedores (Docker/Podman) | ECS Fargate, Lambda (si aplica), o EC2. |
| Broker | RabbitMQ en contenedor | Amazon SQS/SNS o Amazon MQ (RabbitMQ managed). |
| BD SQL | PostgreSQL en contenedor | RDS (PostgreSQL o SQL Server). |
| Cache | Redis en contenedor | ElastiCache (Redis). |
| Búsqueda | — | OpenSearch o Elasticsearch (managed). |
| Archivos (tickets, etc.) | — | S3. |
| Secrets | Env / docker-compose | **Secrets Manager**, Parameter Store. |
| Observabilidad | Logs en consola | **CloudWatch Logs** (Serilog sink en EventService), X-Ray, métricas custom. |
| Health checks | Endpoint `/health` local | ALB Target Group → `/health` en ECS. |

El **MVP** se entrega con **docker-compose** (o podman-compose) para ejecución local; el diagrama y esta sección documentan la proyección a AWS/híbrido. La guía de despliegue en AWS está en `docs/DEPLOY-AWS.md`.

---

## 11. Alcance del MVP vs evolución

**In scope MVP:**
- EventService: POST /events (evento + zonas en una transacción), GET /events (con Redis), publicación EventCreated.
- NotificationService: consumidor de EventCreated con idempotencia por messageId.
- Contrato de mensaje con messageId, eventId, name, occurredAt, correlationId, version.
- Frontend React: pantalla “Registrar Evento” con validación y JWT (puede ser fijo).
- Docker Compose: api-event, api-notifications, BD(s), RabbitMQ, Redis.

**Fuera de scope en MVP (evolución):**
- TicketingService, SearchService, PaymentService, AuthService completo.
- API Gateway, OIDC/OAuth 2.0 completo, despliegue en AWS.

---

## 12. Decisiones arquitectónicas y trade-offs

Se documentan las decisiones clave y alternativas consideradas para que el diseño sea auditable y reproducible.

| Decisión | Opciones consideradas | Elección | Justificación |
|----------|------------------------|----------|----------------|
| **Broker de mensajería** | RabbitMQ vs SQS/SNS vs Azure Service Bus | **RabbitMQ** en MVP; **SQS/SNS** en AWS | RabbitMQ: estándar local, buen soporte en .NET (MassTransit). SQS/SNS en producción AWS: gestionado, sin operar servidores. |
| **BD por microservicio** | BD compartida vs BD por servicio | **BD por servicio** | Evita acoplamiento de esquema; cada equipo puede evolucionar su modelo; fallo de una BD no tumba otras. |
| **Persistencia EventService** | PostgreSQL vs SQL Server vs MongoDB | **PostgreSQL** (o SQL Server según org) | Datos transaccionales con relaciones Event–Zone; EF Core con migraciones; consistencia fuerte. MongoDB descartado para este caso por necesidad de JOINs y transacciones. |
| **Cache GET /events** | Sin cache vs Redis vs in-memory | **Redis** | Compartido entre instancias del API; TTL para invalidación; en AWS ElastiCache. In-memory no escala con múltiples réplicas. |
| **Publicación tras COMMIT** | Publicar dentro de la TX vs después del COMMIT | **Después del COMMIT** | Evita publicar eventos de transacciones que luego hacen ROLLBACK. Si el broker falla, se puede usar Outbox o job de reenvío. |
| **Idempotencia en consumidor** | Sin idempotencia vs por messageId | **Por messageId** | Garantiza que reintentos o réplicas no generen notificaciones duplicadas. Tabla de mensajes procesados con clave messageId. |
| **Validación JWT** | Solo en Gateway vs en cada API vs ambos | **En cada API** en MVP; **Gateway + opcional en API** en evolución | MVP: sin Gateway, cada API valida. Con Gateway: validación centralizada y APIs pueden confiar en headers inyectados para reducir latencia. |
| **Manejo de fallo al publicar** | Fallar el request vs guardar y reenviar después | **Retry acotado + 201 si BD OK** (opcional: Outbox) | Prioridad: no perder el evento en BD. Si el broker no está, se responde 201 y el mensaje se reenvía vía Outbox o job; alternativa es 503 si se exige publicación inmediata. |

Estas decisiones pueden evolucionar; en un contexto formal se podrían registrar como ADRs (Architecture Decision Records) con fecha y estado.

---

## 13. Sustentación breve

Se elige **microservicios + event-driven** para poder escalar equipos y dominios por servicio (eventos, notificaciones, ticketing, pagos), y para soportar picos de demanda (preventas, lanzamientos) sin acoplar todos los flujos en una sola aplicación. La **mensajería asíncrona** permite que notificaciones, auditoría y futuros procesos (indexación, BI) se ejecuten sin impactar la latencia del comando “crear evento”.  

Cada servicio tiene **su propia persistencia** para evitar acoplamiento por esquema y permitir elegir SQL o NoSQL según el caso (transaccional vs búsqueda vs cache). **JWT y estándares OIDC/OAuth 2.0** unifican la identidad y la autorización entre frontend, API Gateway y microservicios. La infraestructura en **AWS (o híbrido)** permite crecer con servicios gestionados (RDS, SQS, ElastiCache, Lambda) sin asumir toda la operación desde el día uno.  

Este diseño cumple los requisitos de alta demanda, consistencia por servicio, auditabilidad mediante eventos y correlationId, disponibilidad mediante reintentos y circuit breaker, y evolución mediante nuevos servicios y nuevos consumidores de los mismos eventos.

---

*Documento de arquitectura — Plataforma de Eventos — Líder Técnico .NET*
