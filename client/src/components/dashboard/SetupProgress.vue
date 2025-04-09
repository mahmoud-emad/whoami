<template>
    <v-progress-linear class="mb-4" :model-value="progress" color="primary" height="10" rounded></v-progress-linear>
</template>

<script setup lang="ts">
defineProps<{
    progress: number;
}>();
</script>