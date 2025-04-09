<template>
    <div class="setup-header mb-4">
        <h2 class="text-h5">Step {{ currentStep }}: {{ tabLabel }}</h2>
        <p class="text-subtitle-1">{{ instructions }}</p>
    </div>
</template>

<script setup lang="ts">
defineProps({
    currentStep: {
        type: Number,
        required: true
    },
    tabLabel: {
        type: String,
        required: true
    },
    instructions: {
        type: String,
        required: true
    }
});
</script>

<style scoped>
.setup-header {
    background-color: rgba(var(--v-theme-surface-variant), 0.1);
    border-radius: 4px;
    padding: 16px;
}
</style>