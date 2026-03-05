<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePaymentsStore } from '../stores/paymentsStore'
import { useCustomersStore } from '../stores/customersStore'
import { usePlansStore } from '../stores/plansStore'
import PaymentDetailModal from '../components/PaymentDetailModal.vue'
import type { Payment } from '../stores/paymentsStore'

const paymentsStore = usePaymentsStore()
const customersStore = useCustomersStore()
const plansStore = usePlansStore()

const showDetailModal = ref(false)
const selectedPayment = ref<Payment | null>(null)

// Local state for filters to bind to UI before applying to store
const filterStatus = ref('all')
const filterCustomer = ref('all')
const filterProvider = ref('all')
const isLoading = ref(true)

onMounted(async () => {
  try {
    await Promise.all([
      paymentsStore.fetchPayments(),
      customersStore.fetchCustomers(),
      plansStore.fetchPlans()
    ])
  } finally {
    isLoading.value = false
  }
})

const enrichedPayments = computed(() => {
  return paymentsStore.items.map(p => {
    const customer = customersStore.items.find(c => c.id === p.customer_id)
    const plan = plansStore.items.find(pl => pl.id === p.plan_id)
    return {
      ...p,
      customerName: customer ? customer.name : 'Desconocido',
      planName: plan ? plan.name : 'Desconocido'
    }
  })
})

const uniqueProviders = computed(() => {
  const providers = new Set(paymentsStore.items.map(p => p.provider))
  return Array.from(providers)
})

function applyFilters() {
  paymentsStore.setFilters({
    status: filterStatus.value,
    customerId: filterCustomer.value,
    provider: filterProvider.value
  })
}

function clearFilters() {
  filterStatus.value = 'all'
  filterCustomer.value = 'all'
  filterProvider.value = 'all'
  paymentsStore.clearFilters()
}

function openDetail(payment: Payment) {
  selectedPayment.value = payment
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedPayment.value = null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency }).format(amount)
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h1>Pagos</h1>
      <p>Historial y gestión de pagos</p>
    </div>

    <div class="filters-bar">
      <div class="filter-group">
        <label>Estado:</label>
        <select v-model="filterStatus" @change="applyFilters">
          <option value="all">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Cliente:</label>
        <select v-model="filterCustomer" @change="applyFilters">
          <option value="all">Todos</option>
          <option v-for="c in customersStore.items" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Proveedor:</label>
        <select v-model="filterProvider" @change="applyFilters">
          <option value="all">Todos</option>
          <option v-for="p in uniqueProviders" :key="p" :value="p">
            {{ p }}
          </option>
        </select>
      </div>

      <button class="btn-clear" @click="clearFilters">Limpiar Filtros</button>
    </div>

    <div v-if="isLoading || paymentsStore.loading" class="loading">
      Cargando pagos...
    </div>

    <div v-else-if="paymentsStore.error" class="error">
      {{ paymentsStore.error }}
    </div>

    <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Proveedor</th>
            <th>Ref.</th>
            <th>Estado</th>
            <th>Monto</th>
            <th>Plan</th>
            <th>Licencia</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in enrichedPayments" :key="payment.id">
            <td>{{ formatDate(payment.created_at) }}</td>
            <td>{{ payment.customerName }}</td>
            <td>{{ payment.provider }}</td>
            <td><span class="ref-code">{{ payment.provider_ref }}</span></td>
            <td>
              <span :class="['badge', payment.status]">{{ payment.status }}</span>
            </td>
            <td>{{ formatCurrency(payment.amount, payment.currency) }}</td>
            <td>{{ payment.planName }}</td>
            <td>
              <span v-if="payment.license_id" title="Licencia vinculada">✓</span>
              <span v-else>-</span>
            </td>
            <td>
              <button class="btn-action" @click="openDetail(payment)">Ver detalle</button>
            </td>
          </tr>
          <tr v-if="enrichedPayments.length === 0">
            <td colspan="9" class="text-center">No se encontraron pagos.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaymentDetailModal 
      v-if="showDetailModal && selectedPayment" 
      :payment="selectedPayment" 
      @close="closeDetail" 
    />
  </div>
</template>

<style scoped>
.page {
  padding: 1rem;
}

.header {
  margin-bottom: 2rem;
}

.filters-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #555;
}

select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
}

.btn-clear {
  padding: 0.5rem 1rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  height: 35px;
}

.btn-clear:hover {
  background: #5a6268;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.data-table th, .data-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.data-table th {
  background: #f1f3f5;
  font-weight: 600;
  color: #495057;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge.approved {
  background: #d4edda;
  color: #155724;
}

.badge.pending {
  background: #fff3cd;
  color: #856404;
}

.badge.rejected {
  background: #f8d7da;
  color: #721c24;
}

.ref-code {
  font-family: monospace;
  background: #f8f9fa;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.9em;
}

.btn-action {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-action:hover {
  background: #0056b3;
}

.loading, .error {
  padding: 2rem;
  text-align: center;
  font-size: 1.2rem;
}

.error {
  color: #dc3545;
}

.text-center {
  text-align: center;
}
</style>
