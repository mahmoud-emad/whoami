<template>
  <div class="c-footer mt-5 mb-2">
    <div class="long-line opacity-80 mb-3"></div>
    <small class="footer-text">
      © Omdanii 2025 •
      <router-link to="#">Support</router-link> •
      <span v-if="siteSettings && siteSettings.configuration && siteSettings.configuration.adminDashboard">
        <router-link to="/admin-dashboard">Admin Space</router-link> •
      </span>
      <a v-if="siteSettings && siteSettings.configuration && siteSettings.configuration.multipleThemes" href="#"
        @click.prevent="toggleTheme">
        {{ isDark ? 'Light Mode' : 'Dark Mode' }}
      </a>
    </small>
  </div>
</template>

<script lang="ts">
import { useDark } from '@vueuse/core';
import { useTheme } from 'vuetify';
import { useSettingsStore } from '../store';
import { onMounted, ref, watch } from 'vue';
import { SettingsType } from '../types';

export default {
  name: 'CustomFooter',
  setup() {
    const isDark = useDark();
    const theme = useTheme();
    const settingsStore = useSettingsStore();
    // const serverUrl = import.meta.env.VITE_SERVER_URL;
    const siteSettings = ref<SettingsType>({} as SettingsType);

    onMounted(async () => {
      // if (!settingsStore.isSettingsLoaded()) {
      //   if (serverUrl) {
      //     const url = new URL(serverUrl);
      //     settingsStore.server.host = url.hostname;
      //     settingsStore.server.port = Number(url.port) || (url.protocol === 'https:' ? 443 : 80);
      //   } else {
      //     throw new Error('VITE_SERVER_URL is not defined');
      //   }
      //   await settingsStore.loadSettings();
      // }

      // siteSettings.value = settingsStore.getSettings();
      // isDark.value = siteSettings.value.theme.defaultTheme === 'dark';
      // theme.global.name.value = isDark.value ? 'dark' : 'light';
    });

    function toggleTheme() {
      isDark.value = !isDark.value;
      theme.global.name.value = isDark.value ? 'dark' : 'light';

      // Persist the theme selection in settings store
      settingsStore.setTheme(isDark.value ? 'dark' : 'light');
    }

    // Watch for changes in the theme and persist them
    watch(isDark, (newVal) => {
      settingsStore.setTheme(newVal ? 'dark' : 'light');
      siteSettings.value.theme.defaultTheme = newVal ? 'dark' : 'light';
    });

    return {
      isDark,
      siteSettings,
      toggleTheme
    };
  }
};
</script>
