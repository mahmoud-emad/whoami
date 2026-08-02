<script setup lang="ts">
import CNavbar from '../components/Navbar.vue';
import CFooter from '../components/Footer.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

// The login stands on its own: no navbar, no footer, nothing that frames it as part of the site.
// Both the current path and the one it replaced are listed so a bookmarked URL still renders bare
// while the redirect resolves. Matched exactly rather than by substring, because `/admin-dashboard`
// also starts with "/admin" and *does* keep the site chrome.
const CHROMELESS_PATHS = ['/admin', '/admin-signature'];

const currentRoute = useRoute();
const isAllowedPath = computed(() => {
    const path = currentRoute.path.replace(/\/+$/, '') || '/';
    return !CHROMELESS_PATHS.includes(path);
});
</script>

<template>
    <template v-if="isAllowedPath">
        <v-container class="c-container">
            <CNavbar></CNavbar>
            <!-- The page is wrapped so it can be the growing part of the column, which is what
                 holds the footer on the bottom edge of a short page. <main> rather than a div
                 because that is what this region is. -->
            <main class="c-main">
                <slot name="layout-child"></slot>
            </main>
            <CFooter></CFooter>
        </v-container>
    </template>
    <template v-else>
        <slot name="layout-child"></slot>
    </template>
</template>
