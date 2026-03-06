import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

export type AuditActor = 'admin' | 'pos' | 'system' | 'webhook'

export interface AuditLogPayload {
  action: string
  entity: string
  entityId?: string | null
  actor: AuditActor
  metadata?: Record<string, any>
}

/**
 * Helper reusable para registrar auditoría sin romper el flujo principal.
 * @param supabase Cliente de Supabase
 * @param payload Datos de la auditoría
 */
export async function logAudit(supabase: SupabaseClient, payload: AuditLogPayload) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      action: payload.action,
      entity: payload.entity,
      entity_id: payload.entityId,
      actor: payload.actor,
      metadata: payload.metadata || {},
    })

    if (error) {
      console.warn('[Audit] Failed to insert log:', error.message)
    }
  } catch (err) {
    console.warn('[Audit] Exception during logging:', err)
  }
}
