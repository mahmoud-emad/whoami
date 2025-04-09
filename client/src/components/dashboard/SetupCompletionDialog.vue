<template>
  <v-dialog v-model="modelValue" max-width="500">
    <v-card>
      <v-card-title class="text-h5">Setup Complete!</v-card-title>
      <v-card-text>
        <p>Congratulations! You have successfully configured your admin dashboard.</p>
        <p>You can now access all features and make changes at any time.</p>
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
import { onMounted, watch } from 'vue';

defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const modelValue = defineModel<boolean>('modelValue', { required: true });

watch(modelValue, (newValue) => {
  if (newValue) {
    // Remove the intro query parameter from the URL
    const url = new URL(window.location.href);
    url.searchParams.delete('intro');
    window.history.replaceState({}, '', url);

  }
})
onMounted(() => {
})
</script>