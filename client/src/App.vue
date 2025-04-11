<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import ContainerLayout from "./layouts/ContainerLayout.vue";
import { useAPILoading, useSiteSettingsStore } from "./store";

const apiLoading = useAPILoading();
const settingsStore = useSiteSettingsStore();
const router = useRouter();
const isDashboard = ref(false);

const checkAndLoadSettings = async () => {
  try {
    apiLoading.setLoading(true);
    isDashboard.value = router.currentRoute.value.name === 'admin-dashboard';

    if (!settingsStore.isSettingsLoaded() && !isDashboard.value) {
      await settingsStore.loadSettings();
    }
  } catch (error: any) {
    await handleSettingsError(error);
  } finally {
    apiLoading.setLoading(false);
  }
};

const handleSettingsError = async (error: Error) => {
  if (error.message.toLowerCase().includes('site settings not found')) {
    await redirectToDashboardWithDelay();
  }
};

const redirectToDashboardWithDelay = async () => {
  return new Promise<void>((resolve) => {
    apiLoading.setLoading(true);
    setTimeout(() => {
      router.push({
        name: 'admin-dashboard',
        query: { intro: 'true' }
      });
      apiLoading.setLoading(false);
      resolve();
    }, 5000);
  });
};

onMounted(() => {
  setTimeout(checkAndLoadSettings, 1000);
});
</script>

<template>
  <ContainerLayout>
    <template v-slot:layout-child>
      <RouterView />
    </template>
  </ContainerLayout>
</template>