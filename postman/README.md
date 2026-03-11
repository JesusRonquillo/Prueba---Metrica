# Postman y pruebas del proyecto

Carpeta para pruebas manuales de la API (Postman/Insomnia) y guías E2E.

## Colección Postman

- **`EventPlatform-API.postman_collection.json`**: colección para EventService (auth, health, POST/GET events, GET /events/:id).

### Uso

1. Importa la colección en [Postman](https://www.postman.com/) o Insomnia.
2. Variables de colección:
   - `baseUrl`: por defecto `http://localhost:5151`. Cámbialo si la API está en otra URL (p. ej. ALB en AWS).
   - `token`: se rellena automáticamente al ejecutar **Obtener token JWT** (el script de Tests guarda el token).
   - `eventId`: se rellena al ejecutar **Crear evento** (para usar después en GET /events/:id).
3. Orden recomendado: **Obtener token JWT** → **Crear evento** o **Listar eventos**; luego **Detalle evento** si quieres ver un evento por ID.

---

## Pruebas locales

### Redis (cache en GET /events)

- **GET /events** usa Redis (clave `events:list`, TTL 60 s). Primera llamada → header `X-Cache: MISS`; segunda llamada antes de 60 s → `X-Cache: HIT`.
- **GET /health** incluye estado de Redis.

### RabbitMQ (EventCreated)

- **POST /events** (con JWT) publica el mensaje `EventCreated` en RabbitMQ.
- Con RabbitMQ Management (puerto 15672): ver Exchanges/Queues para comprobar mensajes.
- Con **NotificationService** corriendo: en sus logs verás "Processed EventCreated MessageId=...". El consumidor es idempotente por `messageId`.

### Flujo E2E (EventService + NotificationService)

1. Levantar: PostgreSQL (BD `eventservice` y `notificationservice`), Redis, RabbitMQ, EventService API, NotificationService Worker.
2. **POST /auth/token** → obtener token.
3. **POST /events** con ese token → 201 y un `id`.
4. En el Worker: log "Processed EventCreated...".
5. Idempotencia: el mismo mensaje (mismo `messageId`) no se procesa dos veces; en BD `notificationservice`, tabla `processed_messages`, se guarda cada `MessageId` procesado.

Para comandos de levantamiento y migraciones, ver **docs/COMANDOS-Y-RUTAS.md** y **backend/README.md**.
