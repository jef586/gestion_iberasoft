import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCustomerStore = defineStore('customer', () => {
  const customers = ref([])
  
  return { customers }
})
