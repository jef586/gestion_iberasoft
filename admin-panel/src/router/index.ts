import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import AppLayout from '../components/AppLayout.vue'
import Login from '../pages/Login.vue'
import Dashboard from '../pages/Dashboard.vue'
import Customers from '../pages/Customers.vue'
import Plans from '../pages/Plans.vue'
import Licenses from '../pages/Licenses.vue'
import Payments from '../pages/Payments.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard'
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: Dashboard
        },
        {
          path: 'customers',
          name: 'customers',
          component: Customers
        },
        {
          path: 'plans',
          name: 'plans',
          component: Plans
        },
        {
          path: 'licenses',
          name: 'licenses',
          component: Licenses
        },
        {
          path: 'payments',
          name: 'payments',
          component: Payments
        }
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Ensure session is initialized
  if (!authStore.session && !authStore.loading) {
    await authStore.initialize()
  }
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
