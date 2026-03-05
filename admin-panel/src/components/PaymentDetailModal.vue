<script setup lang="ts">
import { computed } from 'vue'
import type { Payment } from '../stores/paymentsStore'

// Extended interface for display purposes
interface EnrichedPayment extends Payment {
  customerName?: string
  planName?: string
}

const props = defineProps<{
  payment: EnrichedPayment
}>()

const emit = defineEmits(['close'])

const formattedDate = computed(() => {
  return new Date(props.payment.created_at).toLocaleString()
})

const formattedAmount = computed(() => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: props.payment.currency || 'USD' }).format(props.payment.amount)
})

const metadataJson = computed(() => {
  if (!props.payment.metadata) return null
  try {
    return JSON.stringify(props.payment.metadata, null, 2)
  } catch (e) {
    return String(props.payment.metadata)
  }
})
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Detalle de Pago</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      
      <div class="payment-info">
        <div class="info-group">
          <label>ID Pago:</label>
          <span>{{ payment.id }}</span>
        </div>
        
        <div class="info-group">
          <label>Fecha:</label>
          <span>{{ formattedDate }}</span>
        </div>

        <div class="info-group">
          <label>Cliente:</label>
          <span>{{ payment.customerName || 'Desconocido' }} ({{ payment.customer_id }})</span>
        </div>

        <div class="info-group">
          <label>Plan:</label>
          <span>{{ payment.planName || 'N/A' }} ({{ payment.plan_id }})</span>
        </div>

        <div class="info-group">
          <label>Monto:</label>
          <span class="amount">{{ formattedAmount }}</span>
        </div>

        <div class="info-group">
          <label>Estado:</label>
          <span :class="['status-badge', payment.status]">{{ payment.status }}</span>
        </div>

        <div class="info-group">
          <label>Proveedor:</label>
          <span>{{ payment.provider }}</span>
        </div>

        <div class="info-group">
          <label>Ref. Proveedor:</label>
          <span class="monospace">{{ payment.provider_ref }}</span>
        </div>

        <div class="info-group" v-if="payment.license_id">
          <label>Licencia Vinculada:</label>
          <span>{{ payment.license_id }}</span>
        </div>

        <div class="info-group full-width" v-if="metadataJson">
          <label>Metadata:</label>
          <pre class="json-box">{{ metadataJson }}</pre>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Cerrar</button>
      </div>
    </div>
  </div>
</template>

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
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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

.payment-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.info-group {
  display: flex;
  flex-direction: column;
}

.info-group.full-width {
  grid-column: span 2;
}

.info-group label {
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.info-group span {
  font-size: 1rem;
  color: #333;
}

.amount {
  font-weight: bold;
  color: #2c3e50;
}

.monospace {
  font-family: monospace;
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
}

.json-box {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: capitalize;
  width: fit-content;
}

.status-badge.approved {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.rejected {
  background-color: #f8d7da;
  color: #721c24;
}

.modal-footer {
  margin-top: 2rem;
  text-align: right;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #5a6268;
}
</style>
