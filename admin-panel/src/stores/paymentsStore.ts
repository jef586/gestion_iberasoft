import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../api/supabase'

export interface Payment {
  id: string
  provider: string
  provider_ref: string
  status: 'pending' | 'approved' | 'rejected'
  amount: number
  currency: string
  created_at: string
  customer_id: string
  plan_id: string
  license_id?: string
  metadata?: any
}

export interface PaymentFilters {
  status?: string
  customerId?: string
  provider?: string
}

export const usePaymentsStore = defineStore('payments', () => {
  const items = ref<Payment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<PaymentFilters>({})

  async function fetchPayments() {
    loading.value = true
    error.value = null
    try {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (filters.value.status && filters.value.status !== 'all') {
        query = query.eq('status', filters.value.status)
      }
      if (filters.value.customerId && filters.value.customerId !== 'all') {
        query = query.eq('customer_id', filters.value.customerId)
      }
      if (filters.value.provider && filters.value.provider !== 'all') {
        query = query.eq('provider', filters.value.provider)
      }

      const { data, error: err } = await query

      if (err) throw err
      items.value = data as Payment[]
    } catch (e: any) {
      console.error('Error fetching payments:', e)
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters: PaymentFilters) {
    filters.value = { ...filters.value, ...newFilters }
    fetchPayments()
  }

  function clearFilters() {
    filters.value = {}
    fetchPayments()
  }

  return {
    items,
    loading,
    error,
    filters,
    fetchPayments,
    setFilters,
    clearFilters
  }
})
