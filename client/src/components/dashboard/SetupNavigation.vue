<template>
  <div class="setup-navigation d-flex">
    <v-btn v-if="hasPreviousStep" variant="outlined" @click="$emit('previous')" class="mr-2">
      Previous
    </v-btn>

    <v-spacer></v-spacer>

    isValidForm = {{ isValidForm }}
    <v-btn v-if="!isFinalStep" color="primary" @click="$emit('next')" :disabled="!isValidForm">
      Next
    </v-btn>

    <v-btn v-else color="success" @click="$emit('complete')">
      Finish Setup
    </v-btn>
  </div>
</template>

<script lang="ts">
import { computed, type PropType } from 'vue';

export default {
  name: 'SetupNavigation',
  props: {
    currentStep: {
      type: Number,
      required: true,
    },
    totalSteps: {
      type: Number,
      required: true,
    },
    isValidForm: {
      type: Boolean,
      required: true
    }
  },
  emits: ['previous', 'next', 'complete'],
  setup(props) {
    // Computed props for better readability
    const hasPreviousStep = computed(() => props.currentStep > 1);
    const isFinalStep = computed(() => props.currentStep >= props.totalSteps);
    // const isFormDataValid = computed(() => {
    //   // Ensure formData exists and has keys
    //   if (!props.formData || Object.keys(props.formData).length === 0) {
    //     return false;
    //   }

    //   // Check that every key has a meaningful value
    //   return Object.keys(props.formData).every(key => {
    //     const value = Reflect.get(props.formData, key);
    //     // Reject undefined, null, empty strings, empty arrays, or empty objects
    //     if (value === undefined || value === null) return false;
    //     if (typeof value === 'string' && value.trim() === '') return false;
    //     if (Array.isArray(value) && value.length === 0) return false;
    //     if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    //     return true;
    //   });
    // });

    return {
      hasPreviousStep,
      isFinalStep,
      // isFormDataValid
    };
  }
};
</script>

<style scoped>
.setup-navigation {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>
