<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Renovar Licencia</h2>
      
      <div v-if="license" class="current-info">
        <p><strong>Licencia:</strong> {{ license.id }}</p>
        <p><strong>Plan Actual:</strong> {{ license.plan?.name }}</p>
        <p><strong>Expira:</strong> {{ formatDate(license.expires_at) }}</p>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Nuevo Plan (Opcional)</label>
          <select v-model="form.planId">
            <option value="">Mantener plan actual</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">
              {{ p.name }} ({{ p.duration_days }} días)
            </option>
          </select>
          <small class="hint">Si se cambia, se usará la duración del nuevo plan.</small>
        </div>

        <div class="confirmation-box">
          <label>
            <input type="checkbox" v-model="confirmed" required />
            Confirmo la renovación de esta licencia.
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="$emit('close')">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="loading || !confirmed">
            {{ loading ? 'Renovando...' : 'Renovar' }}
          </button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLicensesStore, License } from '../stores/licensesStore'

const props = defineProps<{
  licenseId: string
  initialLicense?: License
}>()

const emit = defineEmits(['close', 'renewed'])
const store = useLicensesStore()

const form = ref({
  planId: ''
})
const confirmed = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const plans = computed(() => store.plans)
const license = computed(() => {
  return props.initialLicense || store.items.find(l => l.id === props.licenseId)
})

onMounted(async () => {
  if (store.plans.length === 0) {
    await store.fetchPlans()
  }
})

const handleSubmit = async () => {
  if (!confirmed.value) return

  loading.value = true
  error.value = null

  try {
    await store.renewLicense(props.licenseId, {
      planId: form.value.planId || undefined
    })
    emit('renewed')
    emit('close')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
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
.current-info {
  background: #f0f8ff;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  font-size: 0.9em;
}
.current-info p {
  margin: 0.25rem 0;
}
.form-group {
  margin-bottom: 1.5rem;
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
.hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8em;
  color: #666;
}
.confirmation-box {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 4px;
}
.confirmation-box label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  cursor: pointer;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.btn-primary {
  background: #28a745;
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
