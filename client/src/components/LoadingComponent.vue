<template>
    <h3 class="text-center text-primary pt-2" style="font-size: 14px">
        <span class="animate-spin">💠</span> Loading {{ contentName }}, Please Wait <span class="animate-spin">💠</span>
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
</style>
