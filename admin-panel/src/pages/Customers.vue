<template>
  <div class="customers-page">
    <div class="header">
      <h1>Clientes</h1>
      <button class="primary-btn" @click="showCreateModal = true">Nuevo cliente</button>
    </div>

    <div v-if="store.loading && !store.items.length" class="loading">
      Cargando clientes...
    </div>

    <div v-else-if="store.error" class="error">
      {{ store.error }}
    </div>

    <div class="table-container" v-else>
      <table class="customers-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Alta</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in store.items" :key="customer.id">
            <td>{{ customer.name }}</td>
            <td>{{ customer.email || '-' }}</td>
            <td>{{ new Date(customer.created_at).toLocaleDateString() }}</td>
            <td>
              <button class="btn-sm" @click="openDetail(customer.id)">Ver</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="store.items.length === 0" class="empty-state">No hay clientes registrados.</p>
    </div>

    <CustomerCreateModal 
      v-if="showCreateModal" 
      @close="showCreateModal = false" 
      @created="handleCreated"
    />

    <CustomerDetailModal 
      v-if="selectedCustomerId" 
      :customerId="selectedCustomerId" 
      @close="selectedCustomerId = null" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCustomersStore } from '../stores/customersStore'
import CustomerCreateModal from '../components/CustomerCreateModal.vue'
import CustomerDetailModal from '../components/CustomerDetailModal.vue'

const store = useCustomersStore()
const showCreateModal = ref(false)
const selectedCustomerId = ref<string | null>(null)

onMounted(() => {
  store.fetchCustomers()
})

const openDetail = (id: string) => {
  selectedCustomerId.value = id
}

const handleCreated = () => {
  // Store's createCustomer adds the item locally, but we can refetch to be safe/consistent
  // The user requirement said "refrescar listado"
  store.fetchCustomers()
}
</script>

<style scoped>
.customers-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.primary-btn {
  background-color: #646cff;
  color: white;
  border: none;
  padding: 0.6em 1.2em;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
}
.primary-btn:hover {
  background-color: #535bf2;
}
.customers-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  color: #333;
}
.customers-table th, .customers-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}
.customers-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}
.customers-table tr:hover {
  background-color: #f9f9f9;
}
.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
}
.btn-sm:hover {
  background-color: #e0e0e0;
}
.loading, .error, .empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  background: white;
  border-radius: 8px;
  margin-top: 1rem;
}
.error {
  color: red;
  border: 1px solid #fecaca;
  background: #fef2f2;
}
</style>
