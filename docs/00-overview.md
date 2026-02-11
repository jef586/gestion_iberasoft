# Licencias + Pagos — Punto de Venta 2026

## Qué resuelve
Sistema centralizado para:
- Controlar **licencias de uso** del POS
- Gestionar **pagos**
- Habilitar **trial / demo**
- Aplicar **bloqueos controlados**
- Permitir **offline con grace period**

El POS **no administra pagos**: solo valida licencias.

## Quiénes lo usan
- **Admins internos** (2): panel Vue
- **Clientes del POS**: el POS valida, no loguea

## Alcance

### MVP
- Trial / Demo
- Compra manual o automática
- Activación por dispositivo
- Renovación
- Grace period
- Bloqueo
- Auditoría mínima

### Futuro
- Multi-tenant
- Planes por módulo
- Métricas avanzadas
- Facturación recurrente

## Flujo de vida de licencia

Trial → Compra → Activación → Uso  
→ Renovación → Expiración  
→ Grace Period → Bloqueo → Reactivación
