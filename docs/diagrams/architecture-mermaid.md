# Diagramas de arquitectura — Mermaid

Estos diagramas se pueden visualizar en GitHub, en [Mermaid Live](https://mermaid.live) o en cualquier visor que soporte Mermaid.  
Incluyen vistas de **contexto (C4)**, **despliegue**, **seguridad** y **resiliencia**.

---

## 1. C4 Nivel 1 — Contexto del sistema

El sistema en el mundo: actores que lo usan y sistemas externos con los que se integra.

```mermaid
flowchart LR
    subgraph Actores
        CF[Cliente final]
        OP[Organizador / Promotor]
        ADM[Administrador]
        ST[Staff puerta]
    end

    subgraph Sistema["Plataforma de Eventos"]
        PE[Gestiona eventos, venta de tickets, notificaciones]
    end

    subgraph Externos["Sistemas externos"]
        PSP[PSP Pagos]
        MSG[Servicio Mensajería]
        AF[Antifraude]
        BI[BI / CRM]
    end

    CF --> PE
    OP --> PE
    ADM --> PE
    ST --> PE
    PE --> PSP
    PE --> MSG
    PE --> AF
    PE --> BI
```

---

## 2. Vista de despliegue — MVP (Docker / Podman)

Contenedores y conexiones en el entorno local del MVP.

```mermaid
flowchart TB
    subgraph Host["Host (Docker/Podman)"]
        subgraph Red["Red interna"]
            API_E[api-event :5000]
            API_N[api-notifications :5001]
            PG_E[(postgres-events :5432)]
            PG_N[(postgres-notifications :5433)]
            MQ[rabbitmq :5672, 15672]
            RD[(redis :6379)]
        end
    end

    Cliente([Cliente]) --> API_E
    API_E --> PG_E
    API_E --> RD
    API_E --> MQ
    MQ --> API_N
    API_N --> PG_N
```

---

## 3. Límites de seguridad (trust zones)

Dónde se valida la identidad y la autorización.

```mermaid
flowchart LR
    subgraph Internet["Internet (no confiable)"]
        CW[Cliente Web]
        JWT[JWT en header]
    end

    subgraph Perimetro["Perímetro"]
        GW[API Gateway]
        V[Valida JWT, rate limit, CORS]
    end

    subgraph Interna["Red interna (confiable)"]
        ES[EventService]
        NS[NotificationService]
        DB[(BDs)]
        MQ[RabbitMQ]
    end

    CW --> JWT
    JWT --> GW
    GW --> V
    V --> ES
    V --> NS
    ES --> DB
    NS --> DB
    ES --> MQ
```

---

## 4. Componentes y microservicios (alto nivel)

```mermaid
flowchart TB
    subgraph Clientes
        Web[Cliente Web React]
        Staff[App Staff]
        Admin[Admin / Promotores]
    end

    subgraph "API Layer"
        Gateway[API Gateway]
    end

    subgraph "Microservicios"
        ES[EventService]
        NS[NotificationService]
        TS[TicketingService]
        SS[SearchService]
    end

    subgraph "Broker"
        MQ[RabbitMQ / SQS]
    end

    subgraph "Persistencia"
        DB1[(PostgreSQL Events)]
        DB2[(PostgreSQL Notifications)]
        Redis[(Redis Cache)]
    end

    Web --> Gateway
    Staff --> Gateway
    Admin --> Gateway
    Gateway --> ES
    Gateway --> TS
    Gateway --> SS
    ES --> MQ
    ES --> DB1
    ES --> Redis
    MQ --> NS
    NS --> DB2
    TS --> DB1
    SS --> DB1
```

---

## 5. Flujo síncrono — Crear evento (POST /events)

```mermaid
sequenceDiagram
    participant C as Cliente React
    participant ES as EventService
    participant DB as PostgreSQL
    participant MQ as RabbitMQ

    C->>ES: POST /events (JWT) + body
    ES->>ES: Validar JWT / rol
    ES->>DB: BEGIN TX → Insert Event + Zones
    DB-->>ES: OK
    ES->>MQ: Publish EventCreated
    MQ-->>ES: ACK
    ES->>DB: COMMIT
    ES-->>C: 201 Created
```

---

## 6. Flujo POST /events — Rama de error y resiliencia

Si la BD falla: ROLLBACK y 5xx. Si el broker falla: reintento y opcional DLQ o Outbox.

```mermaid
sequenceDiagram
    participant C as Cliente React
    participant ES as EventService
    participant DB as PostgreSQL
    participant MQ as RabbitMQ

    C->>ES: POST /events
    ES->>DB: BEGIN TX, Insert Event+Zones
    alt OK
        DB-->>ES: OK
        ES->>MQ: Publish EventCreated
        alt ACK
            MQ-->>ES: ACK
            ES->>DB: COMMIT
            ES-->>C: 201 Created
        else Fallo broker
            MQ-->>ES: Error / timeout
            Note over ES: Retry 3x; si falla: Outbox o DLQ
            ES->>DB: COMMIT
            ES-->>C: 201 Created (mensaje se reenvía después)
        end
    else Fallo BD
        DB-->>ES: Error
        ES->>DB: ROLLBACK
        ES-->>C: 500 Internal Server Error
    end
```

---

## 7. Flujo asíncrono — EventCreated → NotificationService

```mermaid
sequenceDiagram
    participant ES as EventService
    participant MQ as RabbitMQ
    participant NS as NotificationService
    participant DB as PostgreSQL Notifications

    ES->>MQ: EventCreated (messageId, eventId, ...)
    MQ->>NS: Deliver message
    NS->>DB: ¿messageId ya procesado?
    alt Ya procesado
        DB-->>NS: Sí
        NS->>MQ: ACK (skip)
    else No procesado
        DB-->>NS: No
        NS->>DB: Insert messageId procesado
        NS->>NS: Enviar notificación (email/push)
        NS->>MQ: ACK
    end
```

---

## 8. Flujo síncrono — Listar eventos (GET /events) con cache

```mermaid
sequenceDiagram
    participant C as Cliente
    participant ES as EventService
    participant Redis as Redis
    participant DB as PostgreSQL

    C->>ES: GET /events
    ES->>Redis: GET events:list
    alt Cache hit
        Redis-->>ES: Lista
        ES-->>C: 200 OK + body
    else Cache miss
        Redis-->>ES: null
        ES->>DB: SELECT events (+ zones)
        DB-->>ES: Result set
        ES->>Redis: SET events:list, TTL
        ES-->>C: 200 OK + body
    end
```

---

## 9. Contrato de mensaje (referencia)

```mermaid
classDiagram
    class EventMessage {
        +uuid messageId
        +uuid eventId
        +string name
        +datetime occurredAt
        +uuid correlationId
        +int version
    }
```

---

## 10. Seguridad — Boundaries y JWT

```mermaid
flowchart LR
    subgraph "Request"
        JWT[JWT Bearer]
    end

    subgraph "EventService"
        Auth[Validate JWT]
        Role[Check role: admin/promotor]
        POST[POST /events]
        GET[GET /events]
    end

    JWT --> Auth
    Auth --> Role
    Role --> POST
    Auth --> GET
    GET --> GET
```

- **POST /events:** requiere JWT y rol admin o promotor.
- **GET /events:** puede ser público o con JWT según política.

---

*Generado para docs/architecture.md — Plataforma de Eventos*
