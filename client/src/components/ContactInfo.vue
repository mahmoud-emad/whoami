<template>
  <div class="section mb-4">
    <h2 v-if="title">
      <span v-html="title">
      </span>
    </h2>
    <p v-if="description" class="mb-2 mt-3" v-html="description + (additionalText || '')"></p>
    <v-card :class="`pa-2 ${!display.mdAndUp.value ? 'responsive-info-card justify-start' : 'info-card'}`" outlined
      color="transparent"
      :style="{ border: '1px solid rgb(var(--v-theme-border-color))', borderRadius: '6px', fontSize: '12px' }">
      <a class="card-link-text" v-if="icon" :href="link" target="_blank">
        <v-icon v-if="icon.startsWith('mdi-')">{{ icon }}</v-icon>
        <span v-else>{{ icon }}</span>
        {{ linkText }}
      </a>
      <a class="card-link-text" v-else :href="link" target="_blank">
        {{ linkText }}
      </a>
    </v-card>
  </div>
</template>

<script lang="ts">
import { useDisplay } from 'vuetify';


export default {
  name: 'ContactInfo',
  props: {
    title: String,
    description: String,
    additionalText: String,
    link: String,
    linkText: String,
    cols: Boolean,
    icon: String,
  },
  setup() {
    const display = useDisplay();

    return {
      display
    };
  },
}
</script>

<style scoped>
.text-info {
  font-weight: bold;
  color: #00c0ef;
}

.info-card {
  font-size: 15px !important;
  font-family: 'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif !important;
}

.responsive-info-card {
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 6px;
  font-size: 12px;
  width: 100% !important;
  font-size: 14px !important;
  display: flex;
  justify-content: center;
  background: var(--v-theme-box-bg-color) !important;
  border: 1px solid #16171a7a;
  border-radius: 4px;
  box-shadow: none;
  outline: none;
  font-family: serif !important;
  text-align: start !important;
}

.card-link-text {
  font-family: system-ui;
  font-size: 14px;
}
</style>