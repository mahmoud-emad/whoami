<template>
  <div class="setup-navigation d-flex">
    <v-btn v-if="currentStep > 1" variant="outlined" @click="$emit('previous')" class="mr-2">
      Previous
    </v-btn>
    <v-spacer></v-spacer>
    <v-btn v-if="currentStep < totalSteps" color="primary" @click="$emit('next')">
      Next
    </v-btn>
    <v-btn v-else color="success" @click="$emit('complete')">
      Finish Setup
    </v-btn>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentStep: number;
  totalSteps: number;
}>();

defineEmits<{
  (e: 'previous'): void;
  (e: 'next'): void;
  (e: 'complete'): void;
}>();
</script>

<style scoped>
.setup-navigation {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>