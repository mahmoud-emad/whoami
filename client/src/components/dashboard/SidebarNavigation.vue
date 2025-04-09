<template>
  <v-tabs class="pa-2 mb-2 mt-2 custom-border tabs-height" v-model="modelValue" color="primary" direction="vertical">
    <v-tab v-for="tab in tabs" :key="tab.value" :prepend-icon="tab.icon" :text="tab.label" :value="tab.value"
      :disabled="setupMode ? !tab.enabled : false" />
  </v-tabs>
</template>

<script setup lang="ts">
import { TabDefinition } from '../../types';

defineProps<{
  tabs: TabDefinition[];
  setupMode: boolean;
}>();

defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const modelValue = defineModel<string>('modelValue', { required: true });
</script>

<style scoped>
.tabs-height {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.custom-border {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 4px;
}

.hidden-mobile {
  display: none;
}
</style>