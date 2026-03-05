<script setup lang="ts">
import { onMounted } from 'vue'
import { useDashboardStore } from '../stores/dashboardStore'
import { storeToRefs } from 'pinia'

const store = useDashboardStore()
const { activeLicenses, expiringLicenses, recentPayments, loading } = storeToRefs(store)

onMounted(() => {
  store.fetchDashboardData()
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="dashboard-container">
    <h1 class="page-title">Dashboard</h1>
    
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando datos del sistema...</p>
    </div>
    
    <div v-else class="dashboard-content">
      <!-- Metrics Cards -->
      <div class="metrics-grid">
        <div class="metric-card active-licenses">
          <div class="card-header">
            <h3>Licencias Activas</h3>
            <span class="icon">✅</span>
          </div>
          <div class="card-body">
            <span class="metric-value">{{ activeLicenses }}</span>
            <span class="metric-label">Total activas</span>
          </div>
        </div>
        
        <div class="metric-card expiring-licenses">
          <div class="card-header">
            <h3>Licencias por Vencer</h3>
            <span class="icon">⚠️</span>
          </div>
          <div class="card-body">
            <span class="metric-value">{{ expiringLicenses }}</span>
            <span class="metric-label">En los próximos 7 días</span>
          </div>
        </div>
        
        <div class="metric-card recent-payments-metric">
          <div class="card-header">
            <h3>Pagos Recientes</h3>
            <span class="icon">💰</span>
          </div>
          <div class="card-body">
            <span class="metric-value">{{ recentPayments.length }}</span>
            <span class="metric-label">Últimas transacciones</span>
          </div>
        </div>
      </div>

      <!-- Recent Payments Table -->
      <div class="recent-payments-section">
        <h2>Pagos Recientes</h2>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID Pago</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="recentPayments.length === 0">
                <td colspan="5" class="empty-state">No hay pagos recientes</td>
              </tr>
              <tr v-for="payment in recentPayments" :key="payment.payment_id">
                <td class="id-col">#{{ payment.payment_id }}</td>
                <td>{{ payment.customer || 'Desconocido' }}</td>
                <td class="amount-col">{{ formatCurrency(payment.amount) }}</td>
                <td>
                  <span :class="['status-badge', payment.status]">
                    {{ payment.status }}
                  </span>
                </td>
                <td>{{ formatDate(payment.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #333;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #666;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Metrics Cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #eee;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

.card-header .icon {
  font-size: 24px;
}

.card-body {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 36px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #6b7280;
}

.expiring-licenses .metric-value {
  color: #d97706; /* Warning color */
}

/* Recent Payments Table */
.recent-payments-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid #eee;
}

.recent-payments-section h2 {
  padding: 20px 24px;
  margin: 0;
  font-size: 18px;
  border-bottom: 1px solid #eee;
  background: #f9fafb;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th {
  padding: 12px 24px;
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.data-table td {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  color: #4b5563;
  font-size: 14px;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.data-table tr:hover {
  background-color: #f9fafb;
}

.id-col {
  font-family: monospace;
  color: #6b7280;
}

.amount-col {
  font-weight: 600;
  color: #111827;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.completed, .status-badge.paid {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.pending {
  background-color: #fef3c7;
  color: #92400e;
}

.status-badge.failed {
  background-color: #fee2e2;
  color: #991b1b;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-style: italic;
}
</style>
