# Auditoría del Sistema (Audit Logs)

Este documento describe la implementación de la auditoría obligatoria para acciones sensibles en el sistema de Licencias y Pagos.

## Objetivo
Registrar todas las acciones críticas (creación de licencias, pagos, validaciones, etc.) en la tabla `audit_logs` para trazabilidad y seguridad.

## Estructura de Datos
La tabla `audit_logs` tiene la siguiente estructura:

```sql
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL, -- Tipo de acción (ver lista abajo)
    entity text NOT NULL, -- Entidad afectada (licenses, payments, system)
    entity_id uuid,       -- ID del registro principal afectado
    actor text NOT NULL,  -- Quién realizó la acción (admin, pos, system, webhook)
    metadata jsonb,       -- Contexto adicional en formato JSON
    created_at timestamptz DEFAULT now()
);
```

## Actores Permitidos (`actor`)
- `admin`: Panel de administración (acciones manuales).
- `pos`: Punto de Venta (validaciones, activaciones).
- `system`: Procesos internos automáticos.
- `webhook`: Eventos externos (ej. Stripe).

## Acciones Auditadas (`action`)

### Checkout & Pagos
- `CHECKOUT_CREATED`: Inicio de proceso de pago.
- `PAYMENT_RECEIVED`: Recepción de webhook de pago (pendiente/otro).
- `PAYMENT_APPROVED`: Pago exitoso confirmado.
- `PAYMENT_REJECTED`: Pago rechazado.
- `PAYMENT_WEBHOOK_PROCESSED`: Registro de idempotencia para webhooks.

### Licencias
- `LICENSE_CREATED`: Creación de nueva licencia (incluye Trial).
- `LICENSE_RENEWED`: Renovación de licencia existente.
- `LICENSE_BLOCKED`: Bloqueo manual de licencia.
- `LICENSE_REACTIVATED`: Reactivación de licencia bloqueada/expirada.
- `LICENSE_VALIDATED`: Validación de licencia desde el POS.
- `LICENSE_TOKEN_ISSUED`: Emisión de token offline.

### Dispositivos
- `LICENSE_DEVICE_ACTIVATED`: Activación de un dispositivo.
- `LICENSE_DEVICE_REVOKED`: Revocación de un dispositivo (si aplica).

### Telemetría
- `HEARTBEAT_RECEIVED`: Recepción de heartbeat periódico.

## Uso del Helper de Auditoría

Se han creado helpers reutilizables para Frontend y Backend (Edge Functions) que manejan la inserción en `audit_logs` de forma segura (no rompen el flujo principal si fallan, solo loguean warning).

### Frontend (Vue/Pinia)
Archivo: `src/utils/auditLogger.ts`

```typescript
import { logAudit } from '../utils/auditLogger'

// ... dentro de una acción
await logAudit(supabase, {
  action: 'LICENSE_BLOCKED',
  entity: 'licenses',
  entityId: licenseId,
  actor: 'admin',
  metadata: { reason: 'Pago disputado' }
})
```

### Backend (Edge Functions)
Archivo: `supabase/functions/_shared/audit-logger.ts`

```typescript
import { logAudit } from "../_shared/audit-logger.ts"

// ... dentro del handler
await logAudit(supabaseClient, {
    action: 'CHECKOUT_CREATED',
    entity: 'payments',
    entityId: null,
    actor: 'admin',
    metadata: { customerId, planId }
})
```

## Supuestos y Decisiones
1. **Fallo en Auditoría**: Si falla la inserción en `audit_logs`, se registra un warning en consola pero **no se interrumpe** la operación principal (MVP friendly).
2. **Lecturas**: No se auditan lecturas generales, solo acciones de escritura sensibles y validaciones críticas (como `LICENSE_VALIDATED`).
