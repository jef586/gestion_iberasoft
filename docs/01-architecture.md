# Arquitectura

## Componentes
- Vue 3 Admin Panel
- Supabase (DB + Auth + RLS)
- Edge Functions (API segura)
- POS Desktop (cliente)

```mermaid
graph TD
  Admin[Vue Admin Panel]
  POS[POS Desktop]
  Edge[Supabase Edge Functions]
  DB[(Postgres)]

  Admin --> Edge
  POS --> Edge
  Edge --> DB
