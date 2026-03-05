import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../api/supabase'

export interface Plan {
  id: string
  name: string
  duration_days: number
  limits: any
  created_at: string
}

export interface CreatePlanPayload {
  name: string
  duration_days: number
  limits: any
}

export const usePlansStore = defineStore('plans', () => {
  const items = ref<Plan[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // --- Helpers ---
  function handleError(e: any, defaultMsg: string) {
    console.error(e)
    error.value = e.message || defaultMsg
  }

  // --- Actions ---

  async function fetchPlans() {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('plans')
        .select('*')
        .order('name')
      
      if (err) throw err
      items.value = data as Plan[]
    } catch (e) {
      handleError(e, 'Error al cargar planes')
    } finally {
      loading.value = false
    }
  }

  async function createPlan(payload: CreatePlanPayload) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('plans')
        .insert(payload)
        .select()
        .single()

      if (err) throw err
      
      // Update local state
      items.value.push(data)
      // Re-sort locally or re-fetch? Re-fetch is safer for order but push is faster
      items.value.sort((a, b) => a.name.localeCompare(b.name))
      
      return data
    } catch (e) {
      handleError(e, 'Error al crear plan')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePlan(id: string, payload: Partial<CreatePlanPayload>) {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('plans')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      
      const idx = items.value.findIndex(p => p.id === id)
      if (idx !== -1) {
        items.value[idx] = data
      }
      
      return data
    } catch (e) {
      handleError(e, 'Error al actualizar plan')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePlan(id: string) {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase
        .from('plans')
        .delete()
        .eq('id', id)

      if (err) throw err
      
      items.value = items.value.filter(p => p.id !== id)
    } catch (e) {
      handleError(e, 'Error al eliminar plan (puede estar en uso)')
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    error,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan
  }
})
