# Roadmap — Licencias + Pagos

Este archivo define el roadmap técnico y funcional del sub-sistema
Licencias + Pagos de Punto de Venta 2026.

Objetivo:
- Entregar valor rápido (MVP)
- Endurecer seguridad progresivamente
- Mantener camino claro de crecimiento
- Evitar reescrituras futuras

------------------------------------------------------------
FASE 0 — DEFINICIÓN Y BASE
------------------------------------------------------------

Objetivo:
Dejar definidos contratos, modelo y reglas no negociables.

Incluye:
- Modelo de datos (02-database.md)
- Auth + RLS (03-rls.md)
- API contracts (04-api.md)
- Frontend admin (05-frontend.md)
- Skills y testing base

Resultado:
- Arquitectura cerrada
- Decisiones explícitas
- Riesgos conocidos

------------------------------------------------------------
FASE 1 — MVP LICENCIAS
------------------------------------------------------------

Objetivo:
Sistema de licencias funcional sin pagos automáticos.

Incluye:
- Customers
- Plans
- Licenses
- Trial / Demo
- Activación por dispositivo
- Validación desde el POS
- Grace period
- Bloqueo manual
- Auditoría básica

No incluye:
- Pagos automáticos
- Multi-tenant
- Métricas avanzadas

Resultado:
- POS usable en demo y producción controlada

------------------------------------------------------------
FASE 2 — PAGOS AUTOMATIZADOS
------------------------------------------------------------

Objetivo:
Activar y renovar licencias vía pagos reales.

Incluye:
- Integración con proveedor de pagos
- Checkout
- Webhook idempotente
- Activación automática
- Renovación automática
- Manejo de pagos fallidos

Resultado:
- Licencias se activan sin intervención manual

------------------------------------------------------------
FASE 3 — HARDENING DE SEGURIDAD
------------------------------------------------------------

Objetivo:
Reducir al mínimo el abuso y la manipulación.

Incluye:
- Firma fuerte de licencias
- Validación anti-tamper
- Tolerancia de reloj robusta
- Detección de abuso de dispositivos
- Alertas internas

Resultado:
- Sistema resistente a manipulación básica

------------------------------------------------------------
FASE 4 — TELEMETRÍA Y CONTROL
------------------------------------------------------------

Objetivo:
Tener visibilidad real del uso del sistema.

Incluye:
- Heartbeats confiables
- Detección de inactividad
- Métricas mínimas de uso
- Alertas de licencias anómalas

Resultado:
- Decisiones basadas en datos

------------------------------------------------------------
FASE 5 — PREPARACIÓN MULTI-TENANT
------------------------------------------------------------

Objetivo:
Preparar el sistema para escalar sin reescribir.

Incluye:
- tenant_id en tablas
- RLS por tenant
- Admins por tenant
- UI preparada para contexto de tenant

No incluye:
- Implementación completa multi-tenant
- Facturación por tenant

Resultado:
- Base sólida para crecimiento futuro

------------------------------------------------------------
PRINCIPIOS DEL ROADMAP
------------------------------------------------------------

- Seguridad antes que features
- Backend como autoridad
- POS como cliente liviano
- Todo cambio auditable
- Nada se reescribe, se extiende

------------------------------------------------------------
CRITERIO DE AVANCE ENTRE FASES
------------------------------------------------------------

Una fase se considera completa solo si:
- Tests críticos pasan
- Documentación actualizada
- Flujos validados manualmente
- Riesgos conocidos mitigados

------------------------------------------------------------
RIESGOS CONTROLADOS
------------------------------------------------------------

- Abuso de trial
- Manipulación del reloj
- Duplicación de pagos
- Uso offline extendido

Todos los riesgos tienen mitigación definida
en los skills y tests.
