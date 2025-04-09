<template>
	<v-dialog v-model="modelValue" max-width="500">
		<v-card>
			<v-card-title class="text-h5">Setup Guide</v-card-title>
			<v-card-text>
				<p>Welcome to the admin dashboard setup guide!</p>
				<p>This guide will walk you through the process of setting up your admin dashboard.</p>
			</v-card-text>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn color="primary" @click="modelValue = false">
					Get Started
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
}>();

const modelValue = defineModel<boolean>('modelValue', { required: true });
</script>