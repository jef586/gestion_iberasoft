import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../api/supabase'

export const useDashboardStore = defineStore('dashboard', () => {
  const activeLicenses = ref(0)
  const expiringLicenses = ref(0)
  const recentPayments = ref<any[]>([])
  const loading = ref(false)

  async function fetchDashboardData() {
    loading.value = true
    try {
      // 1. Active licenses
      const { count: activeCount, error: activeError } = await supabase
        .from('licenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (activeError) throw activeError
      activeLicenses.value = activeCount || 0

      // 2. Expiring licenses (active AND expires in next 7 days)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      
      const { count: expiringCount, error: expiringError } = await supabase
        .from('licenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('expires_at', sevenDaysFromNow.toISOString())
        // Assuming we also want to filter out those that already expired? 
        // The requirement says "expires_at < now() + 7 days". 
        // Usually "expiring" implies they haven't expired yet, so maybe > now() AND < now() + 7 days.
        // However, the prompt specifically says: "expires_at < now() + 7 days" and "status = 'active'".
        // If status is active, it shouldn't be expired (assuming backend updates status).
        // I will follow the prompt strictly: expires_at < now() + 7 days AND status = 'active'.

      if (expiringError) throw expiringError
      expiringLicenses.value = expiringCount || 0

      // 3. Recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (paymentsError) throw paymentsError
      recentPayments.value = paymentsData || []

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    activeLicenses,
    expiringLicenses,
    recentPayments,
    loading,
    fetchDashboardData
  }
})
