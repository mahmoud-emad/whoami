<script setup lang="ts">
/**
 * The developer half of the "server is not reachable" dialog.
 *
 * It lives in its own component so it can be pulled in behind
 * `import.meta.env.DEV ? defineAsyncComponent(...) : null`. Vite replaces that with `null` in a
 * production build, the dynamic import becomes unreachable, and Rollup drops this file entirely.
 *
 * A plain `v-if="isDev"` in App.vue was not enough: the template compiler hoists static nodes like
 * the command block to module scope, so the markup — and the shell command in it — stayed in the
 * shipped bundle even though it never rendered. A visitor to the live site has no use for the
 * backend address, the command that starts it, or the raw error, and publishing them says more
 * about the deployment than anyone outside it needs to know.
 */
defineProps<{
  backendLabel: string;
  lastError?: string;
}>();
</script>

<template>
  <p class="dialog-text mb-3">
    The backend at
    <code class="inline-code">{{ backendLabel }}</code>
    isn't responding. The app will resume automatically when it comes back.
  </p>

  <p class="dialog-text mb-2">Start it in a terminal:</p>
  <div class="code-block mb-3">yarn server</div>

  <v-alert v-if="lastError" type="error" variant="tonal" density="compact" class="mb-3">
    {{ lastError }}
  </v-alert>
</template>
