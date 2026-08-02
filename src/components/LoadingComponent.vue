<template>
    <!--
        role="status" so a screen reader announces the wait instead of leaving the user on a page
        that appears to be doing nothing. `text-primary` was Vuetify's own blue, which is not one of
        this site's colours; this is a status line, so it takes the mono face and the muted tone
        every other piece of metadata uses.
    -->
    <h3 class="loading__label" role="status" aria-live="polite">
        <span class="animate-spin" aria-hidden="true">💠</span> Loading {{ contentName }}, Please Wait <span
            class="animate-spin" aria-hidden="true">💠</span>
    </h3>
    <v-row class="mt-4 mb-4">
        <v-col xl='6' cols="12" md="6" sm="6" xs="12" v-for="i in contentLength" :key="i">
            <v-skeleton-loader class="pt-0 mt-0" :style="{ background: 'transparent' }" :type="type">
            </v-skeleton-loader>
        </v-col>
    </v-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    name: 'LoadingComponent',
    props: {
        contentLength: {
            type: Number,
            required: true
        },
        contentName: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    },
    setup() {
        return {}
    },
})
</script>

<style>
@keyframes rotating {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

.animate-spin {
    animation: rotating 2s linear infinite;
    display: inline-block;
    /* Ensures proper animation */
}

/* Respect the visitor's motion preference: a permanently spinning glyph is exactly the kind of
   thing "reduce motion" is asking us to stop doing. */
@media (prefers-reduced-motion: reduce) {
    .animate-spin {
        animation: none;
    }
}
</style>

<style scoped>
.loading__label {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-align: center;
    color: rgb(var(--v-theme-gray-color));
    padding-top: 0.5rem !important;
}
</style>
