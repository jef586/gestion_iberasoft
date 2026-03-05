<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <h3>{{ title }}</h3>
      <p class="message">{{ message }}</p>
      
      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('cancel')">Cancelar</button>
        <button 
          class="btn-confirm" 
          :class="type" 
          @click="$emit('confirm')"
          :disabled="loading"
        >
          {{ loading ? 'Procesando...' : confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  message: string
  confirmText?: string
  type?: 'danger' | 'primary' | 'warning'
  loading?: boolean
}>()

defineEmits(['cancel', 'confirm'])
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
  text-align: center;
  color: #333;
}
.message {
  margin: 1rem 0 2rem;
  color: #666;
}
.modal-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}
button {
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}
.btn-cancel {
  background: #e2e6ea;
  color: #495057;
}
.btn-confirm.primary {
  background: #007bff;
  color: white;
}
.btn-confirm.danger {
  background: #dc3545;
  color: white;
}
.btn-confirm.warning {
  background: #ffc107;
  color: #212529;
}
button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
