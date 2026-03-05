<template>
  <div class="page-container">
    <div class="page-header">
      <h1>Planes</h1>
      <button class="btn-primary" @click="openCreateModal">
        + Nuevo Plan
      </button>
    </div>

    <div class="table-container">
      <div v-if="loading && items.length === 0" class="loading-state">
        Cargando planes...
      </div>
      
      <div v-else-if="error" class="error-state">
        {{ error }}
      </div>

      <table v-else class="plans-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Duración (días)</th>
            <th>Límites (JSON)</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plan in items" :key="plan.id">
            <td><strong>{{ plan.name }}</strong></td>
            <td>{{ plan.duration_days }}</td>
            <td>
              <pre class="json-preview">{{ JSON.stringify(plan.limits, null, 2) }}</pre>
            </td>
            <td class="actions-cell">
              <button class="btn-icon" title="Editar" @click="openEditModal(plan)">
                ✏️
              </button>
              <button class="btn-icon danger" title="Eliminar" @click="confirmDelete(plan)">
                🗑️
              </button>
            </td>
          </tr>
          <tr v-if="items.length === 0">
            <td colspan="4" class="empty-state">No hay planes configurados.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h2>{{ isEditing ? 'Editar Plan' : 'Nuevo Plan' }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="form.name" type="text" required placeholder="Ej: Básico Mensual" />
          </div>
          
          <div class="form-group">
            <label>Duración (días) *</label>
            <input v-model.number="form.duration_days" type="number" min="1" required />
          </div>

          <div class="form-group">
            <label>Límites (JSON) *</label>
            <textarea 
              v-model="form.limitsStr" 
              rows="5" 
              placeholder='{"maxDevices": 1}'
              :class="{ 'invalid': jsonError }"
            ></textarea>
            <small v-if="jsonError" class="error-text">JSON inválido</small>
            <small v-else class="hint-text">JSON válido</small>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="loading || !!jsonError">
              {{ loading ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
          <p v-if="modalError" class="error-text center">{{ modalError }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePlansStore, Plan } from '../stores/plansStore'

const store = usePlansStore()
const items = computed(() => store.items)
const loading = computed(() => store.loading)
const error = computed(() => store.error)

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const modalError = ref<string | null>(null)

const form = ref({
  name: '',
  duration_days: 30,
  limitsStr: '{}'
})

// Validación reactiva del JSON
const jsonError = computed(() => {
  if (!form.value.limitsStr) return null
  try {
    JSON.parse(form.value.limitsStr)
    return null
  } catch (e) {
    return 'Formato JSON inválido'
  }
})

onMounted(() => {
  store.fetchPlans()
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  form.value = { name: '', duration_days: 30, limitsStr: '{\n  "maxDevices": 1\n}' }
  modalError.value = null
  showModal.value = true
}

function openEditModal(plan: Plan) {
  isEditing.value = true
  editingId.value = plan.id
  form.value = {
    name: plan.name,
    duration_days: plan.duration_days,
    limitsStr: JSON.stringify(plan.limits, null, 2)
  }
  modalError.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleSubmit() {
  if (jsonError.value) return

  loading.value = true // Force UI update
  modalError.value = null

  const payload = {
    name: form.value.name,
    duration_days: form.value.duration_days,
    limits: JSON.parse(form.value.limitsStr)
  }

  try {
    if (isEditing.value && editingId.value) {
      await store.updatePlan(editingId.value, payload)
    } else {
      await store.createPlan(payload)
    }
    closeModal()
  } catch (e: any) {
    modalError.value = e.message || 'Error al guardar'
  } finally {
    // store.loading is managed by store, but we can reset local states if needed
  }
}

async function confirmDelete(plan: Plan) {
  if (!confirm(`¿Eliminar plan "${plan.name}"? Esto fallará si hay licencias usándolo.`)) return
  
  try {
    await store.deletePlan(plan.id)
  } catch (e) {
    alert('No se pudo eliminar: ' + store.error)
  }
}
</script>

<style scoped>
.page-container {
  padding: 2rem;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.page-header h1 {
  font-size: 1.8rem;
  color: #333;
  margin: 0;
}
.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
.btn-primary:hover {
  background: #0056b3;
}
.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  overflow: hidden;
}
.plans-table {
  width: 100%;
  border-collapse: collapse;
}
.plans-table th, .plans-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}
.plans-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}
.json-preview {
  font-family: monospace;
  font-size: 0.85em;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  margin: 0;
  white-space: pre-wrap;
  max-width: 300px;
  max-height: 100px;
  overflow-y: auto;
}
.actions-cell {
  white-space: nowrap;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  margin-right: 0.5rem;
}
.btn-icon.danger { color: #dc3545; }

/* Modal Styles */
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
input, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}
textarea {
  font-family: monospace;
  resize: vertical;
}
textarea.invalid {
  border-color: #dc3545;
  background-color: #fff8f8;
}
.error-text {
  color: #dc3545;
  font-size: 0.85em;
  margin-top: 0.25rem;
  display: block;
}
.hint-text {
  color: #28a745;
  font-size: 0.85em;
  margin-top: 0.25rem;
  display: block;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
.loading-state, .error-state, .empty-state {
  padding: 3rem;
  text-align: center;
  color: #6c757d;
}
.error-state { color: #dc3545; }
.center { text-align: center; }
</style>
