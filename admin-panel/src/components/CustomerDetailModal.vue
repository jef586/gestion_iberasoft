<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Detalle cliente</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <div v-if="loading">Cargando datos...</div>
      <div v-else-if="customer">
        <div class="customer-info">
          <p><strong>ID:</strong> {{ customer.id }}</p>
          <p><strong>Nombre:</strong> {{ customer.name }}</p>
          <p><strong>Email:</strong> {{ customer.email || 'N/A' }}</p>
          <p><strong>Alta:</strong> {{ new Date(customer.created_at).toLocaleString() }}</p>
        </div>
        
        <h3>Licencias Asociadas</h3>
        <div class="table-responsive">
          <table class="licenses-table" v-if="licenses.length">
            <thead>
              <tr>
                <th>Status</th>
                <th>Plan</th>
                <th>Expira</th>
                <th>Gracia</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lic in licenses" :key="lic.id">
                <td>{{ lic.status }}</td>
                <td>{{ lic.plan?.name || 'N/A' }}</td>
                <td>{{ new Date(lic.expires_at).toLocaleDateString() }}</td>
                <td>{{ lic.grace_until ? new Date(lic.grace_until).toLocaleDateString() : '-' }}</td>
                <td>{{ new Date(lic.created_at).toLocaleDateString() }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else>No hay licencias asociadas.</p>
        </div>
      </div>
      <div v-else>
        <p>No se encontró el cliente.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useCustomersStore } from '../stores/customersStore'

const props = defineProps<{
  customerId: string
}>()

const emit = defineEmits(['close'])
const store = useCustomersStore()

const loading = ref(true)

const customer = computed(() => store.selected)
const licenses = computed(() => store.selectedLicenses)

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      store.fetchCustomerDetail(props.customerId),
      store.fetchCustomerLicenses(props.customerId)
    ])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
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
  width: 800px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  color: #333;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}
.customer-info {
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #eee;
}
.customer-info p {
  margin: 0.5rem 0;
}
.licenses-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.licenses-table th, .licenses-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}
.licenses-table th {
  background-color: #f2f2f2;
  font-weight: 600;
}
.table-responsive {
  overflow-x: auto;
}
</style>
