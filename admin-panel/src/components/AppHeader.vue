<script setup lang="ts">
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function logout() {
  await authStore.logout()
  router.push('/login')
}

function copyUserId() {
  if (authStore.user?.id) {
    navigator.clipboard.writeText(authStore.user.id)
    alert('User ID copiado al portapapeles: ' + authStore.user.id)
  }
}
</script>

<template>
  <header class="header">
    <div class="title">Admin Panel</div>
    <div class="user-info" v-if="authStore.user">
      <div class="user-details">
        <span class="email">{{ authStore.user.email }}</span>
        <button class="copy-id-btn" @click="copyUserId" title="Copiar ID de usuario">
          ID: {{ authStore.user.id.slice(0, 8) }}...
        </button>
      </div>
      <button class="logout-btn" @click="logout">Logout</button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}
.user-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.875rem;
}
.email {
  font-weight: 500;
  color: #374151;
}
.copy-id-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
  text-decoration: underline;
}
.copy-id-btn:hover {
  color: #4f46e5;
}
.logout-btn {
  padding: 0.5rem 1rem;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.logout-btn:hover {
  background-color: #e5e7eb;
  color: #111827;
}
</style>
