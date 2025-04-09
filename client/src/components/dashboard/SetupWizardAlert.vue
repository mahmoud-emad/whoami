<template>
    <v-alert class="mt-4 head-card intro-alert" type="warning" variant="tonal">
        Since this is your first time visiting the site and it looks like the settings haven't been configured yet,
        please
        follow the step-by-step guide to set things up.
    </v-alert>
</template>

<script setup lang="ts">
import { defineComponent } from 'vue';
defineComponent({ name: 'SetupWizardAlert' });
</script>

<style scoped>
.intro-alert {
    margin-bottom: 16px;
}
</style>