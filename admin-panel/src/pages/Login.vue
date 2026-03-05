<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

const email = ref('admin@optix.com') // Default for testing
const password = ref('')
const isLoginMode = ref(true)
const authStore = useAuthStore()
const router = useRouter()
const error = ref('')
const message = ref('')

async function handleSubmit() {
  error.value = ''
  message.value = ''
  
  try {
    if (isLoginMode.value) {
      const { error: authError } = await authStore.loginWithPassword(email.value, password.value)
      if (authError) throw authError
      router.push('/dashboard')
    } else {
      const { error: signUpError, data } = await authStore.signUp(email.value, password.value)
      if (signUpError) throw signUpError
      
      if (data.session) {
        message.value = 'Account created successfully! Redirecting...'
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        message.value = 'Account created! Please check your email to confirm.'
        // Switch back to login mode
        // isLoginMode.value = true
      }
    }
  } catch (e: any) {
    error.value = e.message || 'An error occurred during authentication'
    console.error(e)
  }
}

function toggleMode() {
  isLoginMode.value = !isLoginMode.value
  error.value = ''
  message.value = ''
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h1>{{ isLoginMode ? 'Admin Login' : 'Create Admin Account' }}</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" type="email" v-model="email" required placeholder="admin@example.com" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input id="password" type="password" v-model="password" required placeholder="••••••" minlength="6" />
        </div>
        
        <button type="submit" :disabled="authStore.loading" class="primary-btn">
          {{ authStore.loading ? 'Processing...' : (isLoginMode ? 'Login' : 'Sign Up') }}
        </button>
        
        <div class="toggle-mode">
          <button type="button" @click="toggleMode" class="link-btn">
            {{ isLoginMode ? 'Need an account? Sign Up' : 'Already have an account? Login' }}
          </button>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="message" class="success-msg">{{ message }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}

.login-card {
  background: white;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

h1 {
  margin-bottom: 2rem;
  color: #333;
}

.form-group {
  text-align: left;
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #646cff;
}

.primary-btn {
  width: 100%;
  padding: 0.75rem;
  background-color: #646cff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1rem;
}

.primary-btn:hover:not(:disabled) {
  background-color: #535bf2;
}

.primary-btn:disabled {
  background-color: #a5a9fa;
  cursor: not-allowed;
}

.toggle-mode {
  margin-top: 1rem;
}

.link-btn {
  background: none;
  border: none;
  color: #646cff;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
  padding: 0;
  width: auto;
}

.error-msg {
  color: #ef4444;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.success-msg {
  color: #10b981;
  margin-top: 1rem;
  font-size: 0.9rem;
}
</style>
