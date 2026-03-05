import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../api/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!session.value)

  async function initialize() {
    loading.value = true
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      session.value = data.session
      user.value = data.session.user
    }

    supabase.auth.onAuthStateChange((_event, _session) => {
      session.value = _session
      user.value = _session?.user || null
    })
    loading.value = false
  }

  async function login(email: string) {
    // For this task we only need the structure, but a real login would use password or magic link
    // The prompt says "Login funcionando con Supabase", so I should probably implement signInWithPassword
    // But I don't have a UI for password yet. The user said "No implementar modales ni forms" but "Login funcionando".
    // I will implement the method to be called by a form later.
    return supabase.auth.signInWithOtp({ email })
  }
  
  async function loginWithPassword(email: string, password: string) {
      return supabase.auth.signInWithPassword({ email, password })
  }

  async function logout() {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
  }

  return {
    session,
    user,
    isAuthenticated,
    loading,
    initialize,
    login,
    loginWithPassword,
    logout
  }
})
