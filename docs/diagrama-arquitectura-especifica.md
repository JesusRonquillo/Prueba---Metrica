# Diagrama de arquitectura específica — Plataforma de Eventos

Despliegue en AWS: servicios utilizados y flujo de tráfico.

![Arquitectura específica AWS](diagrama-arquitectura-especifica.png)

- **ALB:** Punto de entrada; enruta / y rutas estáticas al Frontend y /events, /auth, /health al EventService.
- **ECS Fargate:** Contenedores para Frontend (Nginx), EventService API, NotificationService worker y RabbitMQ (Service Discovery).
- **RDS:** PostgreSQL para EventService y NotificationService (bases eventservice y notificationservice).
- **ElastiCache:** Redis para cache de GET /events.
- **ECR:** Repositorios de imágenes Docker.
- **Secrets Manager:** Cadenas de conexión a RDS y secreto JWT.
