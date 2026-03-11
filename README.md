# Reto Técnico — Plataforma de Eventos

## Visión general

MVP de una **Plataforma de Eventos** diseñada como sistema **orientado a eventos**:

- **Backend (.NET 10)** con microservicios:
  - `EventService`: API para crear eventos y zonas, publicar eventos de dominio y exponer el listado cacheado.
  - `NotificationService`: worker que consume eventos y envía notificaciones de forma idempotente.
- **Frontend (React + TypeScript + Vite + Tailwind)**:
  - Pantalla de **Registro de Evento** con validaciones y diseño basado en **Atomic Design**.
- **Infra local**:
  - PostgreSQL, Redis, RabbitMQ.
  - `docker-compose` para levantar todo el stack.

La documentación de arquitectura (C4, decisiones, AWS/híbrido) está en `docs/architecture.md` y los diagramas en `docs/diagrams/`.

---

## Estructura del repositorio

- `docs/`
  - `architecture.md`: documento de arquitectura (visón, microservicios, flujos, resiliencia, AWS/híbrido).
  - `COMANDOS-Y-RUTAS.md`: comandos de ejecución (manual y con docker-compose) con rutas absolutas.
  - `diagrams/`: diagramas de contexto, componentes, despliegue, seguridad y flujos.
- `backend/`
  - `README.md`: documentación del backend (servicios, endpoints, ejecución, docker-compose, proyección a AWS).
  - `EventService/`: solución y código del microservicio de eventos.
  - `NotificationService/`: solución y código del microservicio de notificaciones.
  - `EventPlatform.Messaging.Contracts/`: contratos de mensajes compartidos (`EventCreatedMessage`).
- `frontend/`
  - `event-platform-web/`: proyecto React (Atomic Design) para registro de eventos.
- `docker-compose.yml`: stack completo (Postgres, Redis, RabbitMQ, EventService, NotificationService, Frontend).
- `postman/`: colección Postman para probar la API y README con guías de pruebas (Redis, RabbitMQ, E2E).
- `.github/workflows/ci.yml`: pipeline CI para build/test backend y frontend, y build de imágenes Docker.

---

## Cómo ejecutar el sistema

### Opción 1 — Modo manual (desarrollo local)

1. **Infra básica con Docker**
   - PostgreSQL `eventservice`.
   - Redis (puerto 6380).
   - RabbitMQ (5672, UI en 15672).
   - Crear BD `notificationservice` en el mismo Postgres.
2. **Backend**
   - `EventService`: restaurar, compilar, aplicar migraciones y ejecutar la API (`dotnet run`).
   - `NotificationService`: restaurar, compilar, aplicar migraciones y ejecutar el worker (`dotnet run`).
3. **Frontend**
   - Instalar dependencias (`pnpm install`).
   - Configurar `.env` si hace falta (`VITE_API_URL`; el JWT se obtiene desde la app con el botón «Obtener JWT»).
   - Ejecutar `pnpm dev` y abrir `http://localhost:5173`.
4. **Prueba E2E**
   - Obtener token con `POST /auth/token`.
   - Crear evento con `POST /events`.
   - Ver en la consola del worker el procesamiento de `EventCreatedMessage`.

Los comandos detallados de esta opción están en `docs/COMANDOS-Y-RUTAS.md`.

### Opción 2 — Con docker-compose (stack completo)

En la raíz del repositorio:

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica"
docker-compose up --build
```

Servicios levantados:

- `event-postgres`: PostgreSQL 16 (BD `eventservice`; `notificationservice` se crea con migraciones).
- `redis`: Redis 7 (cache para `GET /events`).
- `rabbitmq`: RabbitMQ 3 management (5672, 15672).
- `eventservice-api`: API .NET en `http://localhost:5151`.
- `notificationservice-worker`: worker de notificaciones.
- `event-frontend`: frontend React servido por Nginx en `http://localhost:5173`.

Para parar el stack:

```bash
docker-compose down
```

> Nota: en la máquina usada para el reto Docker presentó errores de permisos al detener contenedores (bug del engine), por lo que también se documenta y soporta la ejecución manual descrita en `docs/COMANDOS-Y-RUTAS.md`.

---

## CI/CD (visión ejecutiva)

- **CI (integrado)**:
  - `ci.yml` ejecuta en cada push/PR a `main/master`:
    - Build del backend (`EventService`).
    - Tests de dominio (`EventPlatform.EventService.Domain.Tests`).
    - Instalación y build del frontend con pnpm/Vite.
- **Imágenes Docker**:
  - En la rama principal, el pipeline construye imágenes a partir de los Dockerfiles de:
    - `backend/EventService` (API).
    - `backend/NotificationService` (worker).
    - `frontend/event-platform-web` (frontend).
  - El workflow está preparado para conectarse a ECR (usando `aws-actions/amazon-ecr-login`) y publicar imágenes, que luego se desplegarían en ECS Fargate.

---

## Referencias clave

- **Arquitectura**: `docs/architecture.md`
- **Diagramas**: `docs/diagrams/`
- **Comandos y rutas**: `docs/COMANDOS-Y-RUTAS.md`
- **Postman y pruebas**: `postman/README.md`
- **Backend**: `backend/README.md`
- **Frontend**: `frontend/event-platform-web/README.md`

