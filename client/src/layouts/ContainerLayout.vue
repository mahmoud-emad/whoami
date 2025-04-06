<script setup lang="ts">
import CNavbar from '../components/Navbar.vue';
import CFooter from '../components/Footer.vue';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const currentRoute = useRoute();
const isAllowedPath = ref(!currentRoute.fullPath.includes('admin-signature'))
watch(currentRoute, () => {
    isAllowedPath.value = !currentRoute.fullPath.includes('admin-signature');
})
</script>

<template>
    <template v-if="isAllowedPath">
        <v-container class="c-container">
            <CNavbar></CNavbar>
            <slot name="layout-child"></slot>
            <CFooter></CFooter>
            <div id="notification-card" class="notification-card">
                <div id="notification-title" class="notification-title"></div>
                <div id="notification-message" class="notification-message"></div>
            </div>
        </v-container>
    </template>
    <template v-else>
        <slot name="layout-child"></slot>
    </template>
</template>
