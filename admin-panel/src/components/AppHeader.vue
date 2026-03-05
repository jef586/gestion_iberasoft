<script setup lang="ts">
import { useAuthStore } from '../stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <header class="header">
    <div class="title">Admin Panel</div>
    <div class="user-info">
      <span v-if="authStore.user">{{ authStore.user.email }}</span>
      <button @click="logout">Logout</button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
}
.title {
  font-size: 1.2rem;
  font-weight: bold;
}
.user-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
