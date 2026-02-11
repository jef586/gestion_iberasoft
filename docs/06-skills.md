# Skills / Playbooks — Licencias + Pagos

Este archivo define los **skills operativos** (playbooks)
necesarios para construir, mantener y auditar el sub-sistema
de Licencias + Pagos de Punto de Venta 2026.

Cada skill es accionable, testeable y auditable.

------------------------------------------------------------
SKILL: VALIDAR LICENCIA AL INICIAR EL POS
------------------------------------------------------------

Objetivo:
Garantizar que el POS solo funcione con una licencia válida.

Inputs:
- licenseKey
- deviceFingerprint
- timestamp local

Outputs:
- estado de licencia
- límites activos
- fecha de expiración

Pasos:
1. Leer licencia cacheada localmente
2. Validar firma criptográfica
3. Llamar a /license/validate
4. Aplicar estado recibido
5. Guardar resultado en cache local

Errores comunes:
- Reloj del sistema alterado
- Licencia vencida sin conexión

Mitigación:
- Tolerancia de reloj
- Uso de grace period

Checklist DoD:
- Funciona offline
- Bloquea si corresponde
- No rompe la UX

Tests mínimos:
- Licencia activa
- Licencia expirada
- Licencia bloqueada
- Sin conexión

------------------------------------------------------------
SKILL: ACTIVACIÓN DE LICENCIA POR DISPOSITIVO
------------------------------------------------------------

Objetivo:
Vincular una licencia a un dispositivo físico.

Inputs:
- licenseId
- deviceFingerprint

Outputs:
- activación registrada
- dispositivo habilitado

Pasos:
1. Validar licencia activa
2. Verificar límite de dispositivos
3. Registrar device
4. Auditar acción

Errores comunes:
- Reutilización de fingerprint
- Cambio de hardware

Mitigación:
- Revocación manual
- Fingerprint compuesto

Checklist DoD:
- Respeta maxDevices
- Registra auditoría

Tests mínimos:
- Primer dispositivo
- Segundo dispositivo (bloqueo)
- Dispositivo revocado

------------------------------------------------------------
SKILL: TRIAL / DEMO ENFORCEMENT
------------------------------------------------------------

Objetivo:
Permitir uso limitado sin pago.

Inputs:
- fecha de inicio
- límites del plan trial

Outputs:
- restricciones aplicadas

Pasos:
1. Crear licencia tipo trial
2. Definir expires_at
3. Aplicar límites
4. Mostrar advertencias

Errores comunes:
- Trial infinito
- Conversión incorrecta a pago

Mitigación:
- Validación backend
- Auditoría obligatoria

Checklist DoD:
- Trial expira
- No se renueva solo

Tests mínimos:
- Inicio de trial
- Expiración
- Conversión a pago

------------------------------------------------------------
SKILL: WEBHOOK DE PAGO IDEMPOTENTE
------------------------------------------------------------

Objetivo:
Procesar pagos sin duplicados.

Inputs:
- provider
- eventId
- status

Outputs:
- pago registrado
- licencia activada

Pasos:
1. Verificar firma
2. Chequear idempotency
3. Registrar pago
4. Activar o renovar licencia
5. Auditar

Errores comunes:
- Webhook duplicado
- Orden incorrecto de eventos

Mitigación:
- Clave idempotente
- Transacciones

Checklist DoD:
- Reintentos seguros
- No duplica licencias

Tests mínimos:
- Evento duplicado
- Evento fuera de orden

------------------------------------------------------------
SKILL: RENOVACIÓN, EXPIRACIÓN Y GRACE PERIOD
------------------------------------------------------------

Objetivo:
Controlar el ciclo de vida completo de la licencia.

Inputs:
- fecha actual
- expires_at
- grace_until

Outputs:
- estado actualizado

Pasos:
1. Verificar expiración
2. Aplicar grace period
3. Bloquear si corresponde
4. Reactivar tras pago

Errores comunes:
- Bloqueo prematuro
- Grace infinito

Mitigación:
- Backend como autoridad
- Límite fijo de grace

Checklist DoD:
- Expira correctamente
- Grace controlado

Tests mínimos:
- Expiración
- Grace
- Reactivación

------------------------------------------------------------
SKILL: AUDITORÍA OBLIGATORIA
------------------------------------------------------------

Objetivo:
Trazabilidad total de acciones sensibles.

Inputs:
- acción
- actor
- entidad

Outputs:
- registro auditado

Pasos:
1. Detectar acción sensible
2. Registrar audit_log
3. Asociar metadata

Errores comunes:
- Acciones sin log
- Metadata incompleta

Mitigación:
- Middleware de auditoría

Checklist DoD:
- Todas las acciones logueadas

Tests mínimos:
- Crear licencia
- Bloquear licencia
- Pago aprobado

------------------------------------------------------------
SKILL: BACKUP Y RESTORE
------------------------------------------------------------

Objetivo:
Evitar pérdida de datos críticos.

Alcance:
- DB del POS (local)
- DB central (Supabase)

Pasos:
1. Backup periódico DB local
2. Backup automático server
3. Restore probado

Errores comunes:
- Backups no testeados

Mitigación:
- Restore obligatorio en QA

Checklist DoD:
- Backup automatizado
- Restore validado

Tests mínimos:
- Restore completo
- Restore parcial
