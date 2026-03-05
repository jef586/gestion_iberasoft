<template>
  <div class="page-container">
    <!-- Section A: Header -->
    <div class="page-header">
      <h1>Licencias</h1>
      <button class="btn-primary" @click="openCreateModal">
        + Nueva Licencia Trial
      </button>
    </div>

    <!-- Section B: Table -->
    <div class="table-container">
      <div v-if="store.loading && !store.items.length" class="loading-state">
        Cargando licencias...
      </div>
      
      <div v-else-if="store.error" class="error-state">
        {{ store.error }}
      </div>

      <table v-else class="licenses-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Plan</th>
            <th>Estado</th>
            <th>Expira</th>
            <th>Gracia Hasta</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="license in store.items" :key="license.id">
            <td>
              <div class="customer-info">
                <span class="name">{{ license.customer?.name || 'Desconocido' }}</span>
                <span class="email">{{ license.customer?.email }}</span>
              </div>
            </td>
            <td>
              <span class="plan-badge">{{ license.plan?.name || 'N/A' }}</span>
            </td>
            <td>
              <span :class="['status-badge', license.status]">
                {{ translateStatus(license.status) }}
              </span>
            </td>
            <td>
              {{ formatDate(license.expires_at) }}
            </td>
            <td>
              {{ license.grace_until ? formatDate(license.grace_until) : '-' }}
            </td>
            <td class="actions-cell">
              <button class="btn-icon" title="Ver Detalle" @click="openDetailModal(license)">
                👁️
              </button>
              <button class="btn-icon" title="Renovar" @click="openRenewModal(license)">
                🔄
              </button>
              
              <button 
                v-if="license.status !== 'blocked'"
                class="btn-icon danger" 
                title="Bloquear" 
                @click="confirmBlock(license)"
              >
                🚫
              </button>
              <button 
                v-else
                class="btn-icon success" 
                title="Reactivar" 
                @click="confirmReactivate(license)"
              >
                ✅
              </button>
            </td>
          </tr>
          <tr v-if="store.items.length === 0">
            <td colspan="6" class="empty-state">No hay licencias registradas.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modals -->
    <LicenseCreateTrialModal 
      v-if="showCreateModal" 
      @close="showCreateModal = false"
      @created="handleCreated"
    />

    <LicenseDetailModal 
      v-if="showDetailModal && selectedLicense" 
      :license-id="selectedLicense.id"
      :initial-license="selectedLicense"
      @close="closeDetailModal"
    />

    <LicenseRenewModal 
      v-if="showRenewModal && selectedLicense" 
      :license-id="selectedLicense.id"
      :initial-license="selectedLicense"
      @close="closeRenewModal"
      @renewed="handleRenewed"
    />

    <ConfirmModal 
      v-if="showConfirmModal"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmActionText"
      :type="confirmType"
      :loading="actionLoading"
      @cancel="closeConfirmModal"
      @confirm="executeConfirmAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLicensesStore, License } from '../stores/licensesStore'
import LicenseCreateTrialModal from '../components/LicenseCreateTrialModal.vue'
import LicenseDetailModal from '../components/LicenseDetailModal.vue'
import LicenseRenewModal from '../components/LicenseRenewModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const store = useLicensesStore()

// Modal States
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const showRenewModal = ref(false)
const showConfirmModal = ref(false)

const selectedLicense = ref<License | null>(null)

// Confirm Modal State
const confirmTitle = ref('')
const confirmMessage = ref('')
const confirmActionText = ref('')
const confirmType = ref<'danger' | 'primary' | 'warning'>('primary')
const actionLoading = ref(false)
const pendingAction = ref<(() => Promise<void>) | null>(null)

onMounted(() => {
  store.fetchLicenses()
})

// Actions
const openCreateModal = () => {
  showCreateModal.value = true
}

const handleCreated = () => {
  // Ideally show a toast
  console.log('Licencia creada')
}

const openDetailModal = (license: License) => {
  selectedLicense.value = license
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedLicense.value = null
}

const openRenewModal = (license: License) => {
  selectedLicense.value = license
  showRenewModal.value = true
}

const closeRenewModal = () => {
  showRenewModal.value = false
  selectedLicense.value = null
}

const handleRenewed = () => {
  console.log('Licencia renovada')
}

// Block / Reactivate Logic
const confirmBlock = (license: License) => {
  selectedLicense.value = license
  confirmTitle.value = 'Bloquear Licencia'
  confirmMessage.value = `¿Estás seguro de que deseas bloquear la licencia de ${license.customer?.name}? El cliente perderá acceso inmediatamente.`
  confirmActionText.value = 'Bloquear'
  confirmType.value = 'danger'
  
  pendingAction.value = async () => {
    await store.blockLicense(license.id)
  }
  
  showConfirmModal.value = true
}

const confirmReactivate = (license: License) => {
  selectedLicense.value = license
  confirmTitle.value = 'Reactivar Licencia'
  confirmMessage.value = `¿Deseas reactivar la licencia de ${license.customer?.name}?`
  confirmActionText.value = 'Reactivar'
  confirmType.value = 'primary' // or success if available
  
  pendingAction.value = async () => {
    await store.reactivateLicense(license.id)
  }
  
  showConfirmModal.value = true
}

const executeConfirmAction = async () => {
  if (!pendingAction.value) return
  
  actionLoading.value = true
  try {
    await pendingAction.value()
    closeConfirmModal()
  } catch (e) {
    console.error(e)
    // keep modal open to show error? or close and show toast?
    // for MVP simple close
    closeConfirmModal() 
  } finally {
    actionLoading.value = false
  }
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  pendingAction.value = null
  // Don't clear selectedLicense yet if used by action, but here we passed ID to closure
  selectedLicense.value = null
}

// Helpers
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

const translateStatus = (status: string) => {
  const map: Record<string, string> = {
    trial: 'Prueba',
    active: 'Activa',
    expired: 'Vencida',
    blocked: 'Bloqueada'
  }
  return map[status] || status
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
  transition: background 0.2s;
}
.btn-primary:hover {
  background: #0056b3;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  overflow: hidden;
}

.licenses-table {
  width: 100%;
  border-collapse: collapse;
}

.licenses-table th,
.licenses-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.licenses-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.customer-info {
  display: flex;
  flex-direction: column;
}
.customer-info .name {
  font-weight: 500;
  color: #212529;
}
.customer-info .email {
  font-size: 0.85em;
  color: #6c757d;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
}
.status-badge.trial { background: #fff3cd; color: #856404; }
.status-badge.active { background: #d4edda; color: #155724; }
.status-badge.expired { background: #f8d7da; color: #721c24; }
.status-badge.blocked { background: #343a40; color: white; }

.plan-badge {
  background: #e9ecef;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9em;
  color: #495057;
}

.actions-cell {
  white-space: nowrap;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  margin-right: 0.5rem;
  transition: transform 0.1s;
}
.btn-icon:hover {
  transform: scale(1.1);
}
.btn-icon.danger {
  color: #dc3545;
}
.btn-icon.success {
  color: #28a745;
}

.loading-state, .error-state, .empty-state {
  padding: 3rem;
  text-align: center;
  color: #6c757d;
}
.error-state {
  color: #dc3545;
}
</style>
