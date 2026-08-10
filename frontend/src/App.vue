<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useTheme } from 'vuetify';
import ContainerLayout from "./layouts/ContainerLayout.vue";
import ImageViewer from "./components/ImageViewer.vue";
import { useRoute } from "vue-router";
import { useSettingsStore } from "./store";
import { useAdmin } from "./composables/useAdmin";
import { applyThemeColors } from "./plugins/vuetify";
import { useDocumentHead } from "./composables/useDocumentHead";
import { getServerUrl } from "./utils";

const settingsStore = useSettingsStore();
const theme = useTheme();
const route = useRoute();
const { refresh: refreshAdmin } = useAdmin();

// Re-check the session on mount and on every navigation. Doing it here keeps the in-place editing
// controls in step with reality without each page having to ask: after signing in the redirect
// itself triggers the check, and an expired token stops offering buttons that would only 401.
onMounted(refreshAdmin);
watch(() => route.fullPath, () => { refreshAdmin(); });

const ready = ref(false);
const retrying = ref(false);
// Empty base URL means the API is served from this same origin (the production setup).
const backendLabel = computed(() => getServerUrl() || window.location.origin);
// Vite replaces import.meta.env.DEV with a literal, so in a production build this folds to `null`
// and the dynamic import below becomes unreachable — Rollup then drops DevServerHint and the
// shell command inside it from the bundle entirely, rather than merely hiding it with v-if.
const DevServerHint = import.meta.env.DEV
  ? defineAsyncComponent(() => import('./components/DevServerHint.vue'))
  : null;

const tryBootstrap = async () => {
  retrying.value = true;
  const ok = await settingsStore.bootstrap();
  if (ok) ready.value = true;
  retrying.value = false;
};

onMounted(async () => {
  await tryBootstrap();
  // Live health watcher — auto-shows/auto-hides the dialog as the server goes down or recovers.
  settingsStore.startHealthWatcher(() => {
    ready.value = true;
  });
});

onBeforeUnmount(() => {
  settingsStore.stopHealthWatcher();
});

// If initial bootstrap failed but the watcher later succeeded, mount the layout.
watch(
  () => settingsStore.__local.loaded,
  (loaded) => { if (loaded) ready.value = true; }
);

// <meta> tags and the favicon follow config from here on. The composable watches the store itself,
// so it also picks up a reload triggered by the health watcher. See its header for why it does not
// own document.title.
useDocumentHead(settingsStore);

// The plugin boots with the fallback palettes because it is created before /settings answers; once
// settings are in, the configured palettes are painted over them. Watched rather than applied once,
// because the health watcher re-loads settings whenever the backend comes back and an admin saving
// new colours should see them without a refresh.
//
// This only recolours the two themes — it never changes which one is active. Which theme is on stays
// the visitor's own choice, persisted by Footer.vue.
watch(
  () => settingsStore.theme,
  (configured) => { applyThemeColors(theme, configured); },
  { immediate: true, deep: true }
);
</script>

<template>
  <ContainerLayout v-if="ready">
    <template v-slot:layout-child>
      <RouterView />
    </template>
  </ContainerLayout>

  <!-- Mounted once for the whole app: any image on any page opens into this one overlay. Outside
       ContainerLayout's v-if so it survives a backend blip closing the layout mid-view. -->
  <ImageViewer />

  <v-dialog v-model="settingsStore.__local.serverUnreachable" persistent max-width="540">
    <v-card class="head-card pa-4 server-down-card">
      <div class="d-flex align-center mb-3">
        <v-icon color="error" size="32" class="mr-2">mdi-server-network-off</v-icon>
        <h2 class="dialog-title">Server is not reachable</h2>
      </div>

      <!-- Developer detail only exists in the dev build; see DevServerHint. A visitor to the live
           site gets the neutral line below instead. -->
      <component :is="DevServerHint" v-if="DevServerHint" :backend-label="backendLabel"
        :last-error="settingsStore.getLastError()" />

      <p v-else class="dialog-text mb-3">
        This site is temporarily unavailable. It will come back on its own — the page is retrying
        in the background.
      </p>

      <p class="dialog-hint mb-4">
        <v-icon size="14" class="mr-1">mdi-sync</v-icon>
        Checking every few seconds…
      </p>

      <div class="d-flex justify-end">
        <v-btn :loading="retrying" :disabled="retrying" color="primary" variant="tonal" prepend-icon="mdi-refresh"
          @click="tryBootstrap">Retry now</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.server-down-card {
  color: rgb(var(--v-theme-text-color));
}

.dialog-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
}

.dialog-text {
  color: rgb(var(--v-theme-text-color));
  font-size: 0.95rem;
}

.dialog-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.85rem;
  display: flex;
  align-items: center;
}

.inline-code {
  background: rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-text-color));
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
}

.code-block {
  background: rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-text-color));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  padding: 10px 14px;
  border-radius: 4px;
}
</style>
