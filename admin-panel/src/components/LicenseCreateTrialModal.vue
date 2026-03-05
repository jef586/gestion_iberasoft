<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Nueva Licencia Trial</h2>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Cliente *</label>
          <select v-model="form.customerId" required>
            <option value="" disabled>Seleccione un cliente</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">
              {{ c.name }} ({{ c.email || 'Sin email' }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Plan *</label>
          <select v-model="form.planId" required>
            <option value="" disabled>Seleccione un plan</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">
              {{ p.name }} ({{ p.duration_days }} días)
            </option>
          </select>
        </div>

        <div class="info-box" v-if="selectedPlan">
          <p><strong>Duración:</strong> {{ selectedPlan.duration_days }} días</p>
          <p><strong>Grace Period:</strong> {{ graceDays }} días (aprox)</p>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Creando...' : 'Crear Licencia' }}
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLicensesStore } from '../stores/licensesStore'

const emit = defineEmits(['close', 'created'])
const store = useLicensesStore()

const form = ref({
  customerId: '',
  planId: ''
})

const loading = ref(false)
const error = ref<string | null>(null)
const graceDays = import.meta.env.VITE_GRACE_DAYS || 7

const customers = computed(() => store.customers)
const plans = computed(() => store.plans)
const selectedPlan = computed(() => plans.value.find(p => p.id === form.value.planId))

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      store.fetchCustomers(),
      store.fetchPlans()
    ])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const handleSubmit = async () => {
  if (!form.value.customerId || !form.value.planId) return

  loading.value = true
  error.value = null

  try {
    await store.createTrialLicense({
      customerId: form.value.customerId,
      planId: form.value.planId
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
  width: 500px;
  max-width: 90%;
  color: #333;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.info-box {
  background: #f9f9f9;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9em;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary:disabled {
  background: #ccc;
}
.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
.error {
  color: red;
  margin-top: 1rem;
  font-size: 0.9em;
}
</style>
