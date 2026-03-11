# Documentación — Plataforma de Eventos

## Diagramas finales

### 1. Diagrama de negocio

Actores, capacidades de la plataforma y valor que entrega.

![Diagrama de negocio](diagrama-negocio.png)

- **Actores:** Administrador, Promotor (crean y publican eventos), Usuario/Asistente (consulta listado y recibe notificaciones).
- **Plataforma:** Crear eventos y zonas, publicar y listar eventos, notificar a asistentes.
- **Valor:** Gestión de eventos, visibilidad y listado, avisos al publicar.

---

### 2. Diagrama de arquitectura general

Componentes del sistema y cómo se relacionan (sin detalle de infraestructura).

![Arquitectura general](diagrama-arquitectura-general.png)

- **Clientes:** Aplicación web React.
- **Plataforma:** EventService API (HTTP/JWT, eventos, cache), NotificationService Worker (consumidor de cola).
- **Persistencia y mensajería:** PostgreSQL, Redis, RabbitMQ.

---

### 3. Diagrama de arquitectura específica

Despliegue en AWS: servicios utilizados y flujo de tráfico.

![Arquitectura específica AWS](diagrama-arquitectura-especifica.png)

- **Internet → ALB:** Punto de entrada.
- **ECS Fargate:** Frontend (Nginx), EventService, NotificationService, RabbitMQ.
- **Datos:** RDS PostgreSQL, ElastiCache Redis.
- **Otros:** ECR (imágenes), Secrets Manager (secretos).

---

## Guía de despliegue

- [Deploy en AWS](DEPLOY-AWS.md): Terraform, ECR, ECS, pasos para subir imágenes y desplegar.
