<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
</script>

<template>
  <div class="layout">
    <AppSidebar />
    <div class="main-content">
      <AppHeader />
      <main>
        <slot></slot> <!-- Or router-view if used as a layout wrapper in router -->
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
main {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}
</style>
