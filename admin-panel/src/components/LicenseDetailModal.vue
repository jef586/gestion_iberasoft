<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Detalle de Licencia</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div v-if="loading" class="loading">Cargando...</div>
      
      <div v-else-if="license" class="license-info">
        <div class="info-grid">
          <div class="field">
            <label>ID:</label>
            <span>{{ license.id }}</span>
          </div>
          <div class="field">
            <label>Cliente:</label>
            <span>{{ license.customer?.name || license.customer_id }}</span>
          </div>
          <div class="field">
            <label>Plan:</label>
            <span>{{ license.plan?.name || license.plan_id }}</span>
          </div>
          <div class="field">
            <label>Estado:</label>
            <span :class="['status-badge', license.status]">{{ license.status }}</span>
          </div>
          <div class="field">
            <label>Expira:</label>
            <span>{{ formatDate(license.expires_at) }}</span>
          </div>
          <div class="field">
            <label>Gracia hasta:</label>
            <span>{{ license.grace_until ? formatDate(license.grace_until) : '-' }}</span>
          </div>
          <div class="field">
            <label>Firma:</label>
            <span class="signature">{{ license.signature || 'Sin firma (MVP)' }}</span>
          </div>
        </div>

        <h3>Dispositivos Activados</h3>
        <div class="table-container">
          <table v-if="devices.length > 0">
            <thead>
              <tr>
                <th>Fingerprint</th>
                <th>Activado</th>
                <th>Revocado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dev in devices" :key="dev.id">
                <td :title="dev.device_fingerprint">{{ truncate(dev.device_fingerprint, 20) }}</td>
                <td>{{ formatDate(dev.activated_at) }}</td>
                <td>{{ dev.revoked_at ? formatDate(dev.revoked_at) : '-' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="empty-text">No hay dispositivos activados.</p>
        </div>
      </div>
      
      <div v-else class="error">
        No se pudo cargar la información de la licencia.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useLicensesStore, License } from '../stores/licensesStore'

const props = defineProps<{
  licenseId: string
  initialLicense?: License // Optional pass-through to avoid fetch delay
}>()

const emit = defineEmits(['close'])
const store = useLicensesStore()

const loading = ref(true)
const license = ref<License | null>(null)
const devices = computed(() => store.devices)

onMounted(async () => {
  loading.value = true
  try {
    // If we passed the license object, use it first
    if (props.initialLicense) {
      license.value = props.initialLicense
    } else {
      // Find in store if not passed
      const found = store.items.find(l => l.id === props.licenseId)
      if (found) license.value = found
    }

    // Always fetch devices fresh
    await store.fetchLicenseDevices(props.licenseId)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

function truncate(str: string, n: number) {
  return (str.length > n) ? str.slice(0, n-1) + '...' : str;
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
  width: 700px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  color: #333;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}
.field label {
  font-weight: bold;
  display: block;
  font-size: 0.9em;
  color: #666;
}
.signature {
  font-family: monospace;
  word-break: break-all;
  font-size: 0.8em;
}
.status-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: bold;
  text-transform: uppercase;
}
.status-badge.active { background: #d4edda; color: #155724; }
.status-badge.trial { background: #fff3cd; color: #856404; }
.status-badge.expired { background: #f8d7da; color: #721c24; }
.status-badge.blocked { background: #343a40; color: white; }

.table-container {
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}
th {
  background: #f9f9f9;
  font-weight: 600;
}
.empty-text {
  padding: 1rem;
  text-align: center;
  color: #666;
}
</style>
