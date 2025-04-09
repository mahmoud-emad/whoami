<template>
	<div class="field-guides">
		<v-expansion-panels class="setup-header" variant="accordion" v-model="panel">
			<v-expansion-panel class="transparent-bg setup-header pa-0 ma-0">
				<v-expansion-panel-title>
					<v-icon class="mr-2">mdi-help-circle-outline</v-icon>
					Field Guide
				</v-expansion-panel-title>
				<v-expansion-panel-text>
					<div v-for="(guide, index) in guides" :key="index" class="field-guide-item mb-2">
						<strong>{{ guide.field }}:</strong> {{ guide.description }}
					</div>
				</v-expansion-panel-text>
			</v-expansion-panel>
		</v-expansion-panels>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FieldGuide } from '../../types';

defineProps<{
	guides: FieldGuide[];
}>();

const panel = ref(0);
</script>

<style scoped>
.field-guides {
	margin-top: 24px;
}

.field-guide-item {
	margin-bottom: 8px;
}

.setup-header {
	margin-bottom: 24px;
	padding: 16px;
	background-color: rgba(var(--v-theme-surface-variant), 0.1);
	border-radius: 4px;
}
</style>