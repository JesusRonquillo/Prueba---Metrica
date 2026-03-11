# Comandos del proyecto — Rutas incluidas

Base del repositorio (ajusta si cambias de carpeta):

```bash
REPO="/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica"
cd "$REPO"
```

---

## 1. Herramientas .NET

```bash
export PATH="$PATH:$HOME/.dotnet/tools"
```

(Para que funcione `dotnet-ef` en cualquier terminal.)

---

## 2. Docker (servicios base sueltos)

```bash
# PostgreSQL (EventService)
docker run -d --name event-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=eventservice \
  -p 5432:5432 \
  postgres:16

# Redis (puerto 6380 si 6379 está ocupado)
docker run -d --name redis -p 6380:6379 redis:7-alpine

# RabbitMQ con management (15672)
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

Crear BD para NotificationService (mismo servidor PostgreSQL):

```bash
docker exec -it event-postgres psql -U postgres -c "CREATE DATABASE notificationservice;"
```

---

## 3. EventService

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica/backend/EventService"

# Restaurar y compilar
dotnet restore
dotnet build

# Migraciones (solo la primera vez)
dotnet ef migrations add InitialCreate \
  --project src/EventPlatform.EventService.Infrastructure/EventPlatform.EventService.Infrastructure.csproj \
  --startup-project src/EventPlatform.EventService.Api/EventPlatform.EventService.Api.csproj

dotnet ef database update \
  --project src/EventPlatform.EventService.Infrastructure/EventPlatform.EventService.Infrastructure.csproj \
  --startup-project src/EventPlatform.EventService.Api/EventPlatform.EventService.Api.csproj

# Ejecutar API
dotnet run --project src/EventPlatform.EventService.Api/EventPlatform.EventService.Api.csproj
```

---

## 4. NotificationService

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica/backend/NotificationService"

# Restaurar y compilar
dotnet restore
dotnet build

# Migraciones (solo la primera vez)
dotnet ef database update \
  --project src/EventPlatform.NotificationService.Infrastructure/EventPlatform.NotificationService.Infrastructure.csproj \
  --startup-project src/EventPlatform.NotificationService.Worker/EventPlatform.NotificationService.Worker.csproj

# Ejecutar Worker (consumidor)
dotnet run --project src/EventPlatform.NotificationService.Worker/EventPlatform.NotificationService.Worker.csproj
```

---

## 5. Prueba E2E (orden recomendado)

**Terminal 1 – RabbitMQ** (si no está ya en marcha):

```bash
docker start rabbitmq
# o: docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

**Terminal 2 – EventService:**

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica/backend/EventService"
dotnet run --project src/EventPlatform.EventService.Api/EventPlatform.EventService.Api.csproj
```

**Terminal 3 – NotificationService:**

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica/backend/NotificationService"
dotnet run --project src/EventPlatform.NotificationService.Worker/EventPlatform.NotificationService.Worker.csproj
```

Luego en Postman (o curl):

1. **Token:**  
   `POST http://localhost:5151/auth/token`  
   Body: `{"userName":"demo","role":"Admin"}`

2. **Crear evento:**  
   `POST http://localhost:5151/events`  
   Header: `Authorization: Bearer <token>`  
   Body: `{"name":"Evento E2E","date":"2026-04-20T20:00:00Z","location":"Lima","zones":[{"name":"General","price":50,"capacity":100}]}`

3. En la Terminal 3 deberías ver: `Processed EventCreated MessageId=...`

---

## 6. Frontend (Registrar Evento — punto E)

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica/frontend/event-platform-web"
pnpm install
cp .env.example .env
# Editar .env: VITE_API_URL=http://localhost:5151 y VITE_JWT_TOKEN=<token de POST /auth/token>
pnpm dev
```

Abre **http://localhost:5173**. La API EventService debe tener CORS habilitado para `http://localhost:5173` (ya está en el código). Para que el formulario pueda crear eventos, pon en `.env` un token JWT obtenido con:

`POST http://localhost:5151/auth/token` → body: `{"userName":"demo","role":"Admin"}` → copia el `token` en `VITE_JWT_TOKEN` y reinicia `npm run dev`.

---

## 7. docker-compose (todo el stack)

```bash
cd "/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica"

# Construir imágenes y levantar todo
docker compose up --build

# Parar y eliminar contenedores (manteniendo datos de Postgres en volumen)
docker compose down
```

Servicios que se levantan:

- `postgres` (BD `eventservice`, puedes crear `notificationservice` con migraciones).
- `redis` (cache para GET /events).
- `rabbitmq` (broker de mensajes).
- `eventservice-api` (API .NET en `http://localhost:5151`).
- `notificationservice-worker` (worker que consume eventos).
- `frontend` (React build en `http://localhost:5173`).

> Nota: dentro de los contenedores se usan los hosts de servicio (`postgres`, `redis`, `rabbitmq`, `eventservice-api`), pero hacia fuera sigues usando `localhost` en los puertos expuestos.

---

## 8. Rutas de proyectos (referencia)

| Proyecto | Ruta absoluta |
|----------|----------------|
| Repo | `/home/jesus-ronquillo/Escritorio/Reto Tecnico metrica` |
| EventService solución | `.../backend/EventService/EventPlatform.EventService.slnx` |
| EventService Api | `.../backend/EventService/src/EventPlatform.EventService.Api/` |
| EventService Infrastructure | `.../backend/EventService/src/EventPlatform.EventService.Infrastructure/` |
| Contracts | `.../backend/EventPlatform.Messaging.Contracts/` |
| NotificationService solución | `.../backend/NotificationService/EventPlatform.NotificationService.slnx` |
| NotificationService Worker | `.../backend/NotificationService/src/EventPlatform.NotificationService.Worker/` |
| NotificationService Infrastructure | `.../backend/NotificationService/src/EventPlatform.NotificationService.Infrastructure/` |
| Frontend (event-platform-web) | `.../frontend/event-platform-web/` |

---

## 9. Si la referencia a Contracts falla al compilar

Desde **EventService** la referencia al contrato es relativa al `.csproj` de la Api:

- Api está en: `backend/EventService/src/EventPlatform.EventService.Api/`
- Contracts está en: `backend/EventPlatform.Messaging.Contracts/`
- Relativa desde Api: `..\..\..\EventPlatform.Messaging.Contracts\EventPlatform.Messaging.Contracts.csproj`

Si en tu máquina la estructura es otra, edita:

- **EventService Api:**  
  `backend/EventService/src/EventPlatform.EventService.Api/EventPlatform.EventService.Api.csproj`  
  Línea `ProjectReference`: ajusta la ruta para que apunte a `EventPlatform.Messaging.Contracts.csproj`.

- **NotificationService Infrastructure:**  
  `backend/NotificationService/src/EventPlatform.NotificationService.Infrastructure/EventPlatform.NotificationService.Infrastructure.csproj`  
  Igual: la referencia a Contracts debe apuntar a `backend/EventPlatform.Messaging.Contracts/EventPlatform.Messaging.Contracts.csproj` (relativa: `..\..\..\EventPlatform.Messaging.Contracts\EventPlatform.Messaging.Contracts.csproj`).

---

## 10. Postman – baseUrl

En la colección, variable `baseUrl`:

- Local: `http://localhost:5151`

(5151 es el puerto por defecto en `launchSettings.json` del EventService.)
