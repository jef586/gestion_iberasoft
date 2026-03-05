import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLicenseStore = defineStore('license', () => {
  const licenses = ref([])
  
  return { licenses }
})
