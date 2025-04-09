<template>
    <v-card class="head-card pa-4 mb-4" style="background: transparent !important; border-color: #772020 !important;">
        ❌ You cannot access this page; the admin has disabled the admin dashboard service.
    </v-card>
</template>

<script setup lang="ts">
import { defineComponent } from 'vue';
defineComponent({ name: 'AccessDeniedCard' });
</script>

<style scoped>
.head-card {
    border: 1px solid #772020;
}
</style>