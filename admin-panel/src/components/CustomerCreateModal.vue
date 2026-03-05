<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Nuevo cliente</h2>
      <form @submit.prevent="handleSubmit">
        <label>
          Nombre *
          <input v-model="form.name" type="text" required placeholder="Nombre del cliente" />
        </label>
        <label>
          Email
          <input v-model="form.email" type="email" placeholder="email@ejemplo.com" />
        </label>
        
        <div class="modal-actions">
          <button type="button" @click="$emit('close')">Cancelar</button>
          <button type="submit" :disabled="loading">
            {{ loading ? 'Creando...' : 'Crear' }}
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCustomersStore } from '../stores/customersStore'

const emit = defineEmits(['close', 'created'])
const store = useCustomersStore()

const form = ref({
  name: '',
  email: ''
})

const loading = ref(false)
const error = ref<string | null>(null)

const handleSubmit = async () => {
  if (!form.value.name) return
  
  loading.value = true
  error.value = null
  
  try {
    await store.createCustomer({
      name: form.value.name,
      email: form.value.email || undefined // Send undefined if empty string
    })
    emit('created')
    emit('close')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  color: #333;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}
.error {
  color: red;
  margin-top: 1rem;
  font-size: 0.9em;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
input {
  width: 100%;
  padding: 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
