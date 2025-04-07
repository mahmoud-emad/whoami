<script setup lang="ts">
import { onMounted } from "vue";
import ContainerLayout from "./layouts/ContainerLayout.vue";
import { useAPILoading, useSiteSettingsStore } from "./store";
import router from "./router";

onMounted(async () => {
  const settingsStore = useSiteSettingsStore();
  const apiLoading = useAPILoading();
  if (!settingsStore.isSettingsLoaded()) {
    apiLoading.setLoading(true);
    // Load settings from backend
    try {
      await settingsStore.loadSettings();
    } catch (error: any) {
      if (error.message.toLocaleLowerCase().includes('site settings not found')) {
        setTimeout(() => {
          router.push(
            {
              name: 'admin-dashboard',
              query: { 'intro': 'true' }
            }
          );
        }, 3000);
      }
    }
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
