<template>
	<v-select v-model="modelValue" :items="tabs.map(tab => ({ title: tab.label, value: tab.value }))"
		label="Select Section" variant="outlined" density="compact"></v-select>
</template>

<script setup lang="ts">
import { TabDefinition } from '../../types';

defineProps<{
	tabs: TabDefinition[];
}>();

defineEmits<{
	(e: 'update:modelValue', value: string): void;
}>();

const modelValue = defineModel<string>('modelValue', { required: true });
</script>

<style scoped>
.mobile-nav {
	margin-bottom: 16px;
}
</style>