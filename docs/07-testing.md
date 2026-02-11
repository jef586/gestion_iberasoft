# Testing — Licencias + Pagos

Este archivo define la estrategia de testing del sub-sistema
Licencias + Pagos de Punto de Venta 2026.

Objetivo:
- Garantizar seguridad
- Garantizar consistencia de estados
- Prevenir uso indebido
- Evitar regresiones críticas

El sistema de licencias se considera **CRÍTICO**.
Los tests no son opcionales.

------------------------------------------------------------
NIVELES DE TESTING
------------------------------------------------------------

1) Unit Tests
2) Integration Tests
3) End-to-End Tests
4) Tests de escenarios críticos

------------------------------------------------------------
UNIT TESTS
------------------------------------------------------------

Alcance:
- Lógica de licencias
- Firmas y validaciones
- Cálculo de expiración
- Grace period

Casos mínimos:
- Firma válida / inválida
- Licencia activa
- Licencia expirada
- Licencia bloqueada
- Cálculo correcto de grace_until

Requisitos:
- No depender de red
- No depender de Supabase real
- Ejecutables localmente

------------------------------------------------------------
INTEGRATION TESTS (DB + RLS)
------------------------------------------------------------

Alcance:
- Policies RLS
- Acceso solo admins
- Edge Functions con DB real
- Idempotencia de pagos

Casos mínimos:
- Usuario no admin no accede
- Admin accede a todas las tablas
- Webhook duplicado no duplica pago
- Webhook fuera de orden no rompe estado
- Activación respeta maxDevices

Requisitos:
- Supabase local
- DB limpia por test
- Transacciones aisladas

------------------------------------------------------------
END-TO-END TESTS (ADMIN PANEL)
------------------------------------------------------------

Alcance:
- Flujo completo desde UI
- Estado real reflejado
- Manejo de errores visible

Casos mínimos:
- Crear cliente
- Crear licencia trial
- Bloquear licencia
- Renovar licencia
- Visualizar pagos

Requisitos:
- Vue + Edge Functions levantados
- Datos seed controlados
- Reset entre escenarios

------------------------------------------------------------
TESTS CRÍTICOS DE NEGOCIO
------------------------------------------------------------

WEBHOOK DUPLICADO
- Enviar mismo evento 2+ veces
- Resultado esperado:
  - Un solo pago
  - Una sola activación
  - Sin errores

PAGO FALLIDO
- Evento rejected
- Licencia no se activa
- Estado consistente

EXPIRACIÓN
- Fecha actual > expires_at
- Licencia pasa a expired
- POS recibe bloqueo

GRACE PERIOD
- Fecha > expires_at
- Fecha < grace_until
- POS sigue funcionando
- Advertencia visible

OFFLINE
- POS sin conexión
- Licencia dentro de grace
- POS operativo
- Heartbeat diferido

------------------------------------------------------------
MANIPULACIÓN DEL RELOJ DEL SISTEMA
------------------------------------------------------------

Riesgo:
- Usuario adelanta o atrasa reloj

Mitigación:
- Backend envía timestamp oficial
- Tolerancia máxima de desvío
- Cache con expiración corta

Tests mínimos:
- Reloj adelantado
- Reloj atrasado
- Desvío fuera de tolerancia

------------------------------------------------------------
AUTOMATIZACIÓN
------------------------------------------------------------

- Unit + Integration en CI
- E2E en rama principal
- Tests críticos bloquean deploy

------------------------------------------------------------
CRITERIOS DE ACEPTACIÓN (DoD)
------------------------------------------------
 Ningún flujo crítico sin test
- Webhooks idempotentes probados
- RLS validado
- Offline validado
- Expiración validada

------------------------------------------------------------
REGLAS NO NEGOCIABLES
------------------------------------------------------------

- Sin tests no hay deploy
- Fallo en licencias = bloqueo del release
- Los tests definen el comportamiento esperado