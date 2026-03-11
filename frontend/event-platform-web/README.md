# Event Platform Web (Frontend)

Frontend del MVP de la **Plataforma de Eventos**. Implementa la pantalla de **Registro de Evento** para promotores/admins, sobre:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Diseño basado en **Atomic Design** (atoms, molecules, organisms, templates)

---

## Arquitectura de componentes (Atomic Design)

La estructura principal de componentes está en `src/components/`:

- **Atoms** (`atoms/`):
  - `Button`, `Input`, `Label`, `Text`, `Spinner`.
- **Molecules** (`molecules/`):
  - `FormField` (label + input + mensaje de error).
  - `ZoneCard` (fila de zona con nombre, precio, capacidad y acción de quitar).
  - `Alert` (bloques de feedback de error/success/info).
- **Organisms** (`organisms/`):
  - `EventForm` (formulario completo de alta de evento + zonas dinámicas).
  - `GetTokenModal` (modal para obtener JWT desde la API).
  - `PageHeader` (título y descripción de la página).
  - `MainLayout` (layout con cabecera, botón «Obtener JWT» y contenido).
- **Templates** (`templates/`):
  - `DefaultTemplate` (aplica `MainLayout` y orquesta la composición de la página).
- **Pages** (`src/pages/`):
  - `RegisterEventPage` (usa el template + `PageHeader` + `EventForm`).

Validaciones implementadas en `EventForm`:

- Campos obligatorios: nombre, fecha/hora, lugar.
- Zonas:
  - Al menos una zona con datos.
  - `price >= 0`.
  - `capacity > 0`.
- Mensajes de error por campo y mensajes generales de error/success.

---

## Requisitos

- Node.js 18+
- API **EventService** corriendo en `http://localhost:5151` (por defecto).

---

## Instalación (pnpm recomendado)

```bash
cd frontend/event-platform-web
pnpm install
```

> Si prefieres npm, también funciona:
>
> ```bash
> npm install
> ```

---

## Variables de entorno

Copia `.env.example` a `.env` y ajusta:

- `VITE_API_URL`: URL base de la API. **Local:** `http://localhost:5151`. **Producción (app desplegada en el mismo ALB):** dejar vacío o no definir para que las peticiones vayan al mismo origen (el ALB).

**JWT:** No hace falta poner token en `.env`. En la cabecera de la app hay un botón **«Obtener JWT»** que abre un modal para obtener un token de la API (`POST /auth/token`). El token se guarda en el navegador (localStorage) y se usa al enviar el formulario de registro de evento.

---

## Ejecución en desarrollo

```bash
pnpm dev
```

Abre **http://localhost:5173** en el navegador:

1. Pulsa **«Obtener JWT»** en la cabecera, elige usuario/rol y obtén el token.
2. Completa el formulario de registro de evento y pulsa **Guardar**.
- Si el token es válido y la API está levantada, se creará el evento y verás un mensaje de éxito.
- Si no has obtenido token, se mostrará un aviso para que uses el botón de la cabecera.
- Si el token es inválido o expiró, la API devolverá `401` y verás un mensaje de error.

---

## Build y preview

```bash
pnpm build
pnpm preview
```

Por defecto Vite Preview expondrá el build en `http://localhost:4173`.

---

## Uso con docker-compose

Cuando se levanta el stack completo con `docker-compose` desde la raíz del repo:

- El frontend se construye con el `Dockerfile` propio y se sirve desde Nginx.
- Estará disponible en `http://localhost:5173`.
- La variable `VITE_API_URL` se apunta internamente a `http://eventservice-api:8080`, pero desde tu navegador seguirás consumiendo la API en `http://localhost:5151` a través de los puertos expuestos.

