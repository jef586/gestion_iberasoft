import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../api/supabase'
import type { Session, User } from '@supabase/supabase-js'

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
    loading.value = true
    try {
      return await supabase.auth.signInWithOtp({ email })
    } finally {
      loading.value = false
    }
  }
  
  async function loginWithPassword(email: string, password: string) {
    loading.value = true
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      if (result.data.session) {
        session.value = result.data.session
        user.value = result.data.session.user
      }
      return result
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string) {
    loading.value = true
    try {
      const result = await supabase.auth.signUp({ 
        email, 
        password,
      })
      // Supabase default is "confirm email", so session might be null
      if (result.data.session) {
        session.value = result.data.session
        user.value = result.data.session.user
      }
      return result
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      await supabase.auth.signOut()
      session.value = null
      user.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    session,
    user,
    isAuthenticated,
    loading,
    initialize,
    login,
    loginWithPassword,
    signUp,
    logout
  }
})
