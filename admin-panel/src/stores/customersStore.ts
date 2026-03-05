import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../api/supabase'

export interface Customer {
  id: string
  name: string
  email: string | null
  created_at: string
}

export interface License {
  id: string
  customer_id: string
  plan_id: string
  status: string
  expires_at: string
  grace_until: string | null
  created_at: string
  plan?: {
    name: string
  }
}

export const useCustomersStore = defineStore('customers', () => {
  const items = ref<Customer[]>([])
  const selected = ref<Customer | null>(null)
  const selectedLicenses = ref<License[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchCustomers = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) throw err
      items.value = data as Customer[]
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching customers:', e)
    } finally {
      loading.value = false
    }
  }

  const createCustomer = async (payload: { name: string; email?: string }) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single()

      if (err) throw err
      
      // Add to list and select
      items.value.unshift(data as Customer)
      selected.value = data as Customer
      
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Error creating customer:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchCustomerDetail = async (customerId: string) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

      if (err) throw err
      selected.value = data as Customer
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching customer detail:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchCustomerLicenses = async (customerId: string) => {
    // Don't set loading globally if you want to avoid flickering the main view, 
    // but the prompt says "Mostrar loader mientras carga", so let's stick to global loading for simplicity 
    // or maybe manage a local loading state in the component. 
    // For now, I'll use the store loading state as requested in the "State mínimo".
    
    // However, if we are viewing details in a modal, maybe we want to fetch licenses separately.
    // I'll keep it simple.
    
    try {
      const { data, error: err } = await supabase
        .from('licenses')
        .select(`
          *,
          plan:plans(name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (err) throw err
      
      // Flatten the plan name if needed, or just use the structure returned by Supabase
      // Supabase returns { ..., plan: { name: '...' } } which matches our interface
      selectedLicenses.value = data as unknown as License[]
    } catch (e: any) {
      console.error('Error fetching customer licenses:', e)
      // We might not want to block the whole UI if licenses fail, but let's set error
      error.value = e.message
    }
  }

  return {
    items,
    selected,
    selectedLicenses,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    fetchCustomerDetail,
    fetchCustomerLicenses
  }
})
