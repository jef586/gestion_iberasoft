<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <aside class="sidebar">
    <nav>
      <ul>
        <li><RouterLink to="/dashboard">Dashboard</RouterLink></li>
        <li><RouterLink to="/customers">Customers</RouterLink></li>
        <li><RouterLink to="/licenses">Licenses</RouterLink></li>
        <li><RouterLink to="/payments">Payments</RouterLink></li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 200px;
  background-color: #f4f4f4;
  padding: 1rem;
  height: 100vh;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  margin-bottom: 0.5rem;
}
a {
  text-decoration: none;
  color: #333;
}
a.router-link-active {
  font-weight: bold;
  color: #007bff;
}
</style>
