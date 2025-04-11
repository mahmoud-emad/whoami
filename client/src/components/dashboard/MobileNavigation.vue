<template>
	<v-select class="mt-4 mb-0 purple_bg" v-model="modelValue"
		:items="tabs.map(tab => ({ title: tab.label, value: tab.value }))" label="Select Section" variant="outlined"
		density="compact" hide-details="auto" base-color="primary" color="primary" item-color="primary"
		bg-color="rgb(var(--v-theme-box-bg-color))">
	</v-select>
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
