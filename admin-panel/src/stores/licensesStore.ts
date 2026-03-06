import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../api/supabase'

export interface Customer {
  id: string
  name: string
  email: string | null
}

export interface Plan {
  id: string
  name: string
  duration_days: number
  limits: any
}

export interface License {
  id: string
  customer_id: string
  plan_id: string
  status: 'trial' | 'active' | 'expired' | 'blocked'
  expires_at: string
  grace_until: string | null
  signature: string | null
  created_at: string
  customer?: Customer
  plan?: Plan
}

export interface LicenseDevice {
  id: string
  license_id: string
  device_fingerprint: string
  activated_at: string
  revoked_at: string | null
}

export const useLicensesStore = defineStore('licenses', () => {
  const items = ref<License[]>([])
  const selected = ref<License | null>(null)
  const devices = ref<LicenseDevice[]>([])
  const plans = ref<Plan[]>([])
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const GRACE_DAYS = Number(import.meta.env.VITE_GRACE_DAYS || 7)

  // --- Helpers ---
  function handleError(e: any, defaultMsg: string) {
    console.error(e)
    error.value = e.message || defaultMsg
  }

  // --- Actions ---

  async function fetchLicenses() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('licenses')
        .select(`
          *,
          customer:customers(id, name, email),
          plan:plans(id, name, duration_days)
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      
      // Map data to ensure types match (Supabase returns arrays for joined tables sometimes, but here it's 1:1)
      items.value = (data as any[]).map(l => ({
        ...l,
        customer: Array.isArray(l.customer) ? l.customer[0] : l.customer,
        plan: Array.isArray(l.plan) ? l.plan[0] : l.plan
      }))
    } catch (e) {
      handleError(e, 'Error al cargar licencias')
    } finally {
      loading.value = false
    }
  }

  async function fetchPlans() {
    // Only fetch if empty to avoid redundant calls
    if (plans.value.length > 0) return

    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('plans')
        .select('*')
        .order('name')
      
      if (err) throw err
      plans.value = data as Plan[]
    } catch (e) {
      handleError(e, 'Error al cargar planes')
    } finally {
      loading.value = false
    }
  }

  async function fetchCustomers() {
    // Reuse logic or fetch simple list for selects
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('customers')
        .select('id, name, email')
        .order('name')
      
      if (err) throw err
      customers.value = data as Customer[]
    } catch (e) {
      handleError(e, 'Error al cargar clientes')
    } finally {
      loading.value = false
    }
  }

  async function fetchLicenseDevices(licenseId: string) {
    loading.value = true
    devices.value = [] // clear previous
    try {
      const { data, error: err } = await supabase
        .from('license_devices')
        .select('*')
        .eq('license_id', licenseId)
        .order('activated_at', { ascending: false })

      if (err) throw err
      devices.value = data as LicenseDevice[]
    } catch (e) {
      handleError(e, 'Error al cargar dispositivos')
    } finally {
      loading.value = false
    }
  }

  async function createTrialLicense(payload: { customerId: string; planId: string }) {
    loading.value = true
    error.value = null
    try {
      const plan = plans.value.find(p => p.id === payload.planId)
      if (!plan) throw new Error('Plan no encontrado')

      const now = new Date()
      const expiresAt = new Date(now)
      expiresAt.setDate(expiresAt.getDate() + plan.duration_days)

      const graceUntil = new Date(expiresAt)
      graceUntil.setDate(graceUntil.getDate() + GRACE_DAYS)

      // Generate a random license key
      const licenseKey = Math.random().toString(36).substring(2, 10).toUpperCase() + 
                         Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data, error: err } = await supabase
        .from('licenses')
        .insert({
          customer_id: payload.customerId,
          plan_id: payload.planId,
          status: 'trial',
          license_key: licenseKey,
          expires_at: expiresAt.toISOString(),
          grace_until: graceUntil.toISOString(),
          signature: `TRIAL-SIGNATURE-${Date.now()}` // Temporary fix for NOT NULL constraint
        })
        .select()
        .single()

      if (err) throw err
      
      // Optimistic update or refetch
      await fetchLicenses()
      return data
    } catch (e) {
      handleError(e, 'Error al crear licencia trial')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function renewLicense(licenseId: string, payload: { planId?: string }) {
    loading.value = true
    error.value = null
    try {
      const license = items.value.find(l => l.id === licenseId)
      if (!license) throw new Error('Licencia no encontrada localmente')

      // If plan changes, use new plan duration, otherwise use current plan duration
      const planId = payload.planId || license.plan_id
      const plan = plans.value.find(p => p.id === planId) || license.plan
      
      if (!plan) throw new Error('Plan no encontrado para calcular duración')

      const now = new Date()
      const currentExpires = new Date(license.expires_at)
      let newExpiresAt: Date

      // If active and not expired, add to current expiry
      if (license.status === 'active' && currentExpires > now) {
        newExpiresAt = new Date(currentExpires)
        newExpiresAt.setDate(newExpiresAt.getDate() + plan.duration_days)
      } else {
        // If expired or trial, start from now
        newExpiresAt = new Date(now)
        newExpiresAt.setDate(newExpiresAt.getDate() + plan.duration_days)
      }

      const newGraceUntil = new Date(newExpiresAt)
      newGraceUntil.setDate(newGraceUntil.getDate() + GRACE_DAYS)

      const updates: any = {
        status: 'active',
        expires_at: newExpiresAt.toISOString(),
        grace_until: newGraceUntil.toISOString()
      }

      if (payload.planId) {
        updates.plan_id = payload.planId
      }

      const { data, error: err } = await supabase
        .from('licenses')
        .update(updates)
        .eq('id', licenseId)
        .select()
        .single()

      if (err) throw err

      await fetchLicenses()
      return data
    } catch (e) {
      handleError(e, 'Error al renovar licencia')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function blockLicense(licenseId: string, reason?: string) {
    loading.value = true
    error.value = null
    try {
      // Reason could be stored in audit logs or a note field, but schema doesn't show it on licenses table directly
      // Assuming just status update for now
      const { error: err } = await supabase
        .from('licenses')
        .update({ status: 'blocked' })
        .eq('id', licenseId)

      if (err) throw err
      
      // Update local state
      const idx = items.value.findIndex(l => l.id === licenseId)
      if (idx !== -1) {
        items.value[idx].status = 'blocked'
      }
    } catch (e) {
      handleError(e, 'Error al bloquear licencia')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function reactivateLicense(licenseId: string) {
    loading.value = true
    error.value = null
    try {
      const license = items.value.find(l => l.id === licenseId)
      if (!license) throw new Error('Licencia no encontrada localmente')

      const now = new Date()
      const expiresAt = new Date(license.expires_at)
      
      let updates: any = { status: 'active' }

      // Logic: if expired, recalculate expiration from now? 
      // User prompt recommended: "volver a active y recalcular expires_at si ya venció"
      if (expiresAt < now) {
         // Need plan duration to recalculate
         const plan = plans.value.find(p => p.id === license.plan_id) || license.plan
         if (plan) {
            const newExpiresAt = new Date(now)
            newExpiresAt.setDate(newExpiresAt.getDate() + plan.duration_days)
            
            const newGraceUntil = new Date(newExpiresAt)
            newGraceUntil.setDate(newGraceUntil.getDate() + GRACE_DAYS)

            updates.expires_at = newExpiresAt.toISOString()
            updates.grace_until = newGraceUntil.toISOString()
         }
      }

      const { error: err } = await supabase
        .from('licenses')
        .update(updates)
        .eq('id', licenseId)

      if (err) throw err

      await fetchLicenses()
    } catch (e) {
      handleError(e, 'Error al reactivar licencia')
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    selected,
    devices,
    plans,
    customers,
    loading,
    error,
    fetchLicenses,
    fetchPlans,
    fetchCustomers,
    fetchLicenseDevices,
    createTrialLicense,
    renewLicense,
    blockLicense,
    reactivateLicense
  }
})
