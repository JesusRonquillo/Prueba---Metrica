# Diagrama de arquitectura general — Plataforma de Eventos

Componentes del sistema y sus relaciones (vista lógica).

![Arquitectura general](diagrama-arquitectura-general.png)

- **Cliente Web React:** Interfaz de usuario; llama a la API con JWT para crear eventos y consulta el listado.
- **EventService API:** Recibe HTTP, valida JWT, persiste en PostgreSQL, usa Redis para cache de GET /events y publica EventCreated en RabbitMQ.
- **NotificationService Worker:** Consume la cola, comprueba idempotencia por messageId y persiste en PostgreSQL.
- **PostgreSQL, Redis, RabbitMQ:** Persistencia y mensajería compartidas entre los servicios del MVP.
