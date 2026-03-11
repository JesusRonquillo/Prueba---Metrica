FROM node:22-alpine AS build
WORKDIR /app

# Producción: VITE_API_URL vacío → peticiones relativas al mismo origen (ALB).
# Local: pasar --build-arg VITE_API_URL=http://localhost:5151 si hace falta.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS final
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=build /app/dist .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

