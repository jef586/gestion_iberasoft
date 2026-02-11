# Frontend — Panel Admin (Licencias + Pagos)

Este archivo define el frontend del panel administrativo interno
para el sub-sistema de Licencias + Pagos de Punto de Venta 2026.

Alcance:
- Uso exclusivo por 2 admins internos
- No es visible para clientes finales
- No se expone en el POS
- UI simple, funcional y segura

------------------------------------------------------------
STACK TECNOLÓGICO
------------------------------------------------------------

- Vue 3
- TypeScript
- Composition API
- Pinia (state management)
- Fetch directo a Edge Functions
- Sin lógica de negocio en el cliente

------------------------------------------------------------
OBJETIVO DEL PANEL
------------------------------------------------------------

Permitir a los administradores:
- Visualizar estado general del sistema
- Gestionar clientes
- Crear, renovar y bloquear licencias
- Ver pagos y su estado
- Auditar acciones sensibles

------------------------------------------------------------
PÁGINAS DEL PANEL
------------------------------------------------------------

DASHBOARD
- Total de licencias activas
- Licencias por vencer
- Licencias bloqueadas
- Pagos recientes
- Alertas operativas

CLIENTES
- Listado simple
- Alta de cliente
- Detalle del cliente
- Licencias asociadas

LICENCIAS
- Crear licencia (trial o pago)
- Renovar licencia
- Forzar bloqueo
- Reactivar licencia
- Ver dispositivos activados

PAGOS
- Historial de pagos
- Estado del pago
- Referencia del proveedor
- Filtro por cliente

------------------------------------------------------------
ESTRUCTURA DE STORES (PINIA)
------------------------------------------------------------

useAuthStore
- sesión admin
- logout
- refresh

useCustomersStore
- listado
- crear
- seleccionar cliente

useLicensesStore
- listado
- crear
- renovar
- bloquear
- reactivar

usePaymentsStore
- historial
- filtros
- estados

------------------------------------------------------------
COMPONENTES REUTILIZABLES
------------------------------------------------------------

- AdminTable
- AdminForm
- StatusBadge
- ConfirmModal
- EmptyState
- AuditLogList
- LoaderOverlay

------------------------------------------------------------
MANEJO DE ERRORES
------------------------------------------------------------

- Errores visibles al usuario mediante toast
- Mensajes claros y no técnicos
- Logs enviados al backend
- Nunca exponer stacktrace

------------------------------------------------------------
SEGURIDAD EN FRONTEND
------------------------------------------------------------

- El frontend nunca escribe directo en la DB
- El frontend nunca decide estados de licencias
- Toda acción pasa por Edge Functions
- Tokens manejados solo por Supabase Auth

------------------------------------------------------------
REGLAS DE IMPLEMENTACIÓN
------------------------------------------------------------

- Cero lógica crítica en el cliente
- Cero estados derivados no confiables
- Cero acceso directo a tablas
- UI siempre refleja estado del backend

------------------------------------------------------------
ESCALADO FUTURO A MULTI-TENANT
------------------------------------------------------------

Cambios necesarios:
- Contexto de tenant en stores
- Filtro visual por tenant
- Sin cambios estructurales de UI

El diseño actual lo permite sin reescritura.
