# Diagrama de negocio — Plataforma de Eventos

Vista de negocio: actores, capacidades y valor que ofrece la plataforma.

![Diagrama de negocio](diagrama-negocio.png)

| Elemento | Descripción |
|----------|-------------|
| **Administrador / Promotor** | Crean eventos, definen zonas (nombre, precio, capacidad) y los publican. |
| **Usuario / Asistente** | Consulta el listado de eventos publicados y recibe notificaciones cuando se crea uno. |
| **Plataforma** | Gestiona eventos, expone listado (con cache) y envía notificaciones de forma asíncrona e idempotente. |
