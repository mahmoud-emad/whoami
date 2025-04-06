<script setup lang="ts">
import { onMounted } from "vue";
import ContainerLayout from "./layouts/ContainerLayout.vue";
import { useAPILoading, useSiteSettingsStore } from "./store";

onMounted(async () => {
  const settingsStore = useSiteSettingsStore();
  const apiLoading = useAPILoading();
  if (!settingsStore.isSettingsLoaded()) {
    apiLoading.setLoading(true);
    // Load settings from backend
    await settingsStore.loadSettings();
    apiLoading.setLoading(false);
  }
})
</script>

<template>
  <ContainerLayout>
    <template v-slot:layout-child>
      <RouterView />
    </template>
  </ContainerLayout>
</template>
