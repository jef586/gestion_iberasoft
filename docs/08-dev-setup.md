# Dev Setup — Licencias + Pagos

Este archivo define el entorno de desarrollo local para el sub-sistema
Licencias + Pagos de Punto de Venta 2026.

Objetivo:
- Entorno reproducible
- Sin dependencias locales
- Todo corre en Docker
- Compatible con Supabase local

------------------------------------------------------------
REQUISITOS
------------------------------------------------------------

- Docker Desktop
- Docker Compose v2+
- Node.js SOLO para tooling (opcional)
- Git

No se permite:
- DB local fuera de Docker
- Servicios externos en desarrollo

------------------------------------------------------------
ESTRUCTURA DE SERVICIOS
------------------------------------------------------------

Servicios utilizados:
- Supabase local (Postgres + Auth + Storage)
- Edge Functions
- Panel Admin (Vue 3)

------------------------------------------------------------
DOCKER COMPOSE
------------------------------------------------------------

Archivo: docker-compose.yml

version: "3.9"

services:

  supabase:
    image: supabase/supabase-local
    ports:
      - "54321:54321"
      - "54322:54322"
      - "54323:54323"
    env_file:
      - .env
    volumes:
      - ./supabase:/supabase
    restart: unless-stopped

  admin-panel:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
    command: npm run dev
    depends_on:
      - supabase

------------------------------------------------------------
VARIABLES DE ENTORNO
------------------------------------------------------------

Archivo: .env.example

SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key

PAYMENT_WEBHOOK_SECRET=changeme
PAYMENT_PROVIDER=stripe|mercadopago

------------------------------------------------------------
SUPABASE LOCAL
------------------------------------------------------------

Inicialización:

- DB: Postgres local
- Auth: habilitado
- RLS: activo
- Edge Functions: locales

Comandos útiles:

supabase start
supabase stop
supabase db reset
supabase functions serve

------------------------------------------------------------
MIGRACIONES
------------------------------------------------------------

Ubicación:
supabase/migrations/

Reglas:
- Una migración por cambio
- Nunca modificar migraciones ya aplicadas
- RLS y funciones van versionadas

Ejemplo:

supabase/migrations/
  001_init.sql
  002_rls.sql
  003_functions.sql

------------------------------------------------------------
SEED DATA
------------------------------------------------------------

Datos iniciales:
- Admin users
- Plans
- Trial plan

Ubicación:
supabase/seed.sql

El seed se ejecuta solo en local y QA.

------------------------------------------------------------
EDGE FUNCTIONS
------------------------------------------------------------

Ubicación:
supabase/functions/

Funciones principales:
- checkout-create
- payments-webhook
- license-activate
- license-validate
- telemetry-heartbeat

Todas las funciones:
- Usan Service Role
- Validan input
- Auditan acciones

------------------------------------------------------------
PANEL ADMIN (VUE)
------------------------------------------------------------

Ubicación:
frontend/

Comandos:

npm install
npm run dev
npm run build

El panel solo consume Edge Functions.

------------------------------------------------------------
FLUJO DE ARRANQUE LOCAL
------------------------------------------------------------

1) docker compose up
2) supabase start
3) aplicar migraciones
4) cargar seed
5) abrir http://localhost:5173

------------------------------------------------------------
REGLAS NO NEGOCIABLES
------------------------------------------------------------

- Nada corre fuera de Docker
- RLS siempre activo
- Migraciones versionadas
- Service Role nunca en frontend
- Secrets solo en .env

------------------------------------------------------------
ESCALADO FUTURO
------------------------------------------------------------

- Separar admin-panel en servicio independiente
- Usar entornos staging / prod
- CI ejecuta migraciones automáticamente

