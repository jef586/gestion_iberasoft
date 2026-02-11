# API — Edge Functions (Licencias + Pagos)

Este archivo define la API completa expuesta mediante Supabase
Edge Functions para el sub-sistema de Licencias + Pagos
de Punto de Venta 2026.

Alcance:
- API mínima y explícita
- Seguridad server-side
- Idempotencia obligatoria en pagos
- El POS solo consume, no decide

Todas las rutas están implementadas como Edge Functions.

------------------------------------------------------------
CONVENCIONES GENERALES
------------------------------------------------------------

- Formato: JSON
- Autenticación: Service Role (Edge Functions)
- Auditoría obligatoria en acciones sensibles
- Validaciones siempre en backend
- El frontend nunca escribe directo a tablas

Errores estándar:
- 400 VALIDATION_ERROR
- 401 UNAUTHORIZED
- 403 LICENSE_BLOCKED
- 404 NOT_FOUND
- 409 IDEMPOTENCY_CONFLICT
- 500 INTERNAL_ERROR

------------------------------------------------------------
ENDPOINT: POST /checkout/create
------------------------------------------------------------

Uso:
Crear una intención de pago para un cliente y un plan.
Proveedor de pagos agnóstico.

Request:
{
  "customerId": "uuid",
  "planId": "uuid"
}

Validaciones:
- customerId existe
- planId existe
- no hay licencia activa incompatible

Response:
{
  "checkoutUrl": "https://provider/checkout/xyz"
}

Auditoría:
- CHECKOUT_CREATED

------------------------------------------------------------
ENDPOINT: POST /payments/webhook
------------------------------------------------------------

Uso:
Recibir eventos de pago desde el proveedor.

Características:
- Endpoint idempotente
- Verificación de firma del proveedor
- Nunca confiar en el payload sin validar

Request (ejemplo genérico):
{
  "provider": "stripe",
  "eventId": "evt_123",
  "providerRef": "ch_456",
  "status": "approved",
  "amount": 10000
}

Reglas:
- (provider + eventId) debe ser único
- Si el evento ya fue procesado, se ignora

Acciones:
- Registrar pago
- Activar o renovar licencia
- Registrar auditoría

Auditoría:
- PAYMENT_RECEIVED
- PAYMENT_APPROVED / PAYMENT_REJECTED

------------------------------------------------------------
ENDPOINT: POST /license/activate
------------------------------------------------------------

Uso:
Activar una licencia en un dispositivo específico.

Request:
{
  "licenseId": "uuid",
  "deviceFingerprint": "string"
}

Validaciones:
- licencia existe
- licencia no bloqueada
- no supera maxDevices del plan

Acciones:
- Registrar device
- Invalidar activaciones previas si aplica

Response:
{
  "status": "active",
  "expiresAt": "2026-01-01T00:00:00Z"
}

Auditoría:
- LICENSE_DEVICE_ACTIVATED

------------------------------------------------------------
ENDPOINT: POST /license/validate
------------------------------------------------------------

Uso:
Validación que realiza el POS al iniciar y periódicamente.

Request:
{
  "licenseKey": "string",
  "deviceFingerprint": "string",
  "localTimestamp": "ISO-8601"
}

Validaciones:
- firma de licencia válida
- licencia existe
- estado permitido
- tolerancia de reloj aplicada

Response:
{
  "status": "active",
  "expiresAt": "ISO-8601",
  "graceUntil": "ISO-8601",
  "limits": {
    "maxDevices": 1,
    "maxInvoices": 50
  }
}

Estados posibles:
- active
- expired
- blocked
- grace

Auditoría:
- LICENSE_VALIDATED

------------------------------------------------------------
ENDPOINT: POST /telemetry/heartbeat
------------------------------------------------------------

Uso:
Registrar uso activo del POS.

Request:
{
  "licenseId": "uuid",
  "deviceFingerprint": "string"
}

Acciones:
- Actualizar last_seen_at
- Detectar inactividad prolongada

Response:
{
  "ok": true
}

Auditoría:
- HEARTBEAT_RECEIVED

------------------------------------------------------------
ENDPOINT: GET /admin/licenses
------------------------------------------------------------

Uso:
Listado administrativo de licencias.

Query params:
- status
- customerId
- expiringSoon=true

Response:
[
  {
    "licenseId": "uuid",
    "customerName": "Cliente X",
    "status": "active",
    "expiresAt": "ISO-8601"
  }
]

------------------------------------------------------------
REGLAS NO NEGOCIABLES
------------------------------------------------------------

- El POS no puede crear ni modificar licencias
- El POS no puede escribir pagos
- Ningún estado crítico se decide en el cliente
- Todo cambio de estado queda auditado

------------------------------------------------------------
ESCALADO FUTURO A MULTI-TENANT
------------------------------------------------------------

Cambios necesarios:
- Agregar tenant_id a requests internas
- Filtrar por tenant en Edge Functions
- Mantener contratos externos sin cambios

La API actual es compatible con este crecimiento.
