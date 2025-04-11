<template>
  <div class="dashboard-container" :class="{ 'setup-mode': setupMode }">
    <div class="sidebar-container">
      <slot name="sidebar"></slot>
    </div>
    <div class="mobile-nav d-md-none">
      <slot name="mobile-nav"></slot>
    </div>
    <div class="content-container">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  setupMode: boolean;
}>();
</script>

<style scoped>
.dashboard-container {
  display: flex;
  min-height: 600px;
  gap: 16px;
  align-items: stretch;
}

.sidebar-container {
  width: 250px;
  transition: all 0.3s ease;
}

.content-container {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .dashboard-container {
    flex-direction: column;
    min-height: 400px;
  }

  .sidebar-container {
    max-width: 100%;
    width: 100%;
    display: none !important;
  }

  .mobile-nav {
    margin-bottom: 16px;
  }
}

@media (min-width: 769px) {
  .dashboard-container:not(.setup-mode) {
    flex-direction: row;
  }

  .dashboard-container.setup-mode .sidebar-container {
    display: none !important;
  }

  .mobile-nav {
    display: none;
  }
}
</style>