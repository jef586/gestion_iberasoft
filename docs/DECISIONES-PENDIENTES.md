# Decisiones Pendientes — Licencias + Pagos

Este documento lista las decisiones técnicas y funcionales
que NO se cerraron aún de forma definitiva en el sub-sistema
Licencias + Pagos de Punto de Venta 2026.

Para cada decisión se presentan:
- Contexto
- Opciones posibles
- Pros / Contras
- Recomendación inicial

------------------------------------------------------------
DECISIÓN 01 — PROVEEDOR DE PAGOS INICIAL
------------------------------------------------------------

Contexto:
El sistema es agnóstico al proveedor, pero el MVP debe
implementar uno primero.

Opción A — Stripe
Pros:
- Webhooks muy sólidos
- Excelente documentación
- Idempotencia clara
- Fácil testing

Contras:
- No es el más común en Argentina
- Requiere configuración fiscal adicional

Opción B — MercadoPago
Pros:
- Muy usado en Argentina
- Menos fricción comercial
- Mejor aceptación local

Contras:
- Webhooks más frágiles
- Menor control de idempotencia
- APIs menos consistentes

Recomendación:
- Implementar primero el proveedor más conocido por ustedes
- Mantener la abstracción desde el día uno

------------------------------------------------------------
DECISIÓN 02 — FORMA DE GENERAR licenseKey
------------------------------------------------------------

Contexto:
El POS necesita una clave para validar la licencia.

Opción A — UUID simple
Pros:
- Fácil implementación
- Sin criptografía compleja

Contras:
- Fácil de copiar
- Menor resistencia a abuso

Opción B — License firmada (HMAC / RSA)
Pros:
- Difícil de falsificar
- Validable offline

Contras:
- Implementación más compleja
- Manejo de claves privadas

Recomendación:
- Empezar con firma simple (HMAC)
- Migrar a RSA si el producto escala

------------------------------------------------------------
DECISIÓN 03 — DURACIÓN DEL GRACE PERIOD
------------------------------------------------------------

Contexto:
Definir cuánto tiempo puede funcionar el POS sin renovar.

Opción A — Grace corto (3–7 días)
Pros:
- Reduce abuso
- Presiona renovación rápida

Contras:
- Riesgo de fricción con clientes
- Problemas si hay fallas de pago

Opción B — Grace largo (15–30 días)
Pros:
- Mejor experiencia de usuario
- Menos soporte

Contras:
- Mayor ventana de abuso

Recomendación:
- Grace corto en MVP
- Ajustar según feedback real

------------------------------------------------------------
DECISIÓN 04 — HEARTBEAT OBLIGATORIO O PASIVO
------------------------------------------------------------

Contexto:
El sistema puede exigir heartbeats regulares desde el POS.

Opción A — Obligatorio
Pros:
- Detección rápida de abuso
- Mejor telemetría

Contras:
- Más dependencia de red
- Mayor complejidad

Opción B — Pasivo (best-effort)
Pros:
- POS más resiliente offline
- Menos fricción técnica

Contras:
- Menos visibilidad

Recomendación:
- Pasivo en MVP
- Obligatorio en hardening

------------------------------------------------------------
DECISIÓN 05 — BLOQUEO AUTOMÁTICO VS MANUAL
------------------------------------------------------------

Contexto:
Definir si una licencia se bloquea sola o requiere acción admin.

Opción A — Automático
Pros:
- Menos trabajo manual
- Estados consistentes

Contras:
- Riesgo de falsos positivos

Opción B — Manual
Pros:
- Control total
- Menos errores críticos

Contras:
- Más carga operativa

Recomendación:
- Automático para expiración
- Manual para bloqueos por abuso

------------------------------------------------------------
DECISIÓN 06 — CUÁNDO PASAR A MULTI-TENANT
------------------------------------------------------------

Contexto:
Hoy el sistema es single-tenant.

Opción A — Antes del primer cliente grande
Pros:
- Evita migraciones complejas
- Escala rápido

Contras:
- Sobre-ingeniería temprana

Opción B — Cuando exista demanda real
Pros:
- Simplicidad
- Menos código innecesario

Contras:
- Migración futura

Recomendación:
- Opción B
- Diseñar el camino, no implementarlo

------------------------------------------------------------
DECISIÓN 07 — NIVEL DE AUDITORÍA
------------------------------------------------------------

Contexto:
Definir qué tan detallado es el audit_log.

Opción A — Solo acciones críticas
Pros:
- Menos ruido
- Más simple

Contras:
- Menos trazabilidad

Opción B — Todo cambio relevante
Pros:
- Trazabilidad total
- Mejor debugging

Contras:
- Más volumen de datos

Recomendación:
- Opción B desde el inicio

------------------------------------------------------------
REGLA FINAL
------------------------------------------------------------

Ninguna decisión pendiente:
- Bloquea el MVP
- Rompe la arquitectura
- Obliga a reescritura

Todas pueden resolverse de forma incremental.
