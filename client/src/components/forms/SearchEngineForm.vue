<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading settings from the server</p>
  </v-alert>
  <v-alert v-if="!siteSettings.configuration.enableSearch" variant="tonal" type="info">Enable search engine to use the
    search feature</v-alert>
  <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
    variant="tonal">{{ responseMessage }}</v-alert>

  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()" @submit.prevent="saveSettings">
    <v-switch :loading="apiLoadingStore.isLoading()" v-model="siteSettings.configuration.enableSearch"
      title="Enable search engine" color="primary" label="Enable Search" hide-details inset />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!siteSettings.configuration.enableSearch"
      v-model="searchGuestbooks" title="Search all guestbooks" color="primary" inset label="Search all guestbooks"
      hide-details />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!siteSettings.configuration.enableSearch"
      v-model="searchProjects" title="Search all projects" color="primary" inset label="Search all projects"
      hide-details />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!siteSettings.configuration.enableSearch"
      v-model="searchArticles" title="Search all articles" color="primary" inset label="Search all articles"
      hide-details />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!siteSettings.configuration.enableSearch"
      v-model="searchPosts" title="Search all blog posts" color="primary" inset label="Search all blog posts"
      hide-details />
    <v-btn @click="saveSettings" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save Settings" class="mb-4" color="primary" variant="tonal">Save</v-btn>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { SettingsType } from '../../types';
import { useAPILoading, useSettingsStore } from '../../store';


export default {
  setup() {
    const apiLoadingStore = useAPILoading();
    const validForm = ref(false);
    const searchGuestbooks = ref(false);
    const searchProjects = ref(false);
    const searchPosts = ref(false);
    const searchArticles = ref(false);
    const responseType = ref('success');
    const responseMessage = ref();
    const settingsStore = useSettingsStore();
    const siteSettings = ref<SettingsType>({
      configuration: {
        adminDashboard: false,
        enableSearch: false,
        githubURL: '',
        multipleThemes: false,
        searchModels: [
          'guestbooks',
          'projects',
          'articles',
          'posts'
        ]
      },
      security: {
        adminFingerprintSignature: '',
        debug: false,
      },
      server: {
        host: '',
        port: 0,
      },
      theme: {
        defaultTheme: 'light'
      }
    });

    onMounted(() => {
      apiLoadingStore.setLoading(true);
      siteSettings.value = settingsStore.getSettings();
      searchGuestbooks.value = siteSettings.value.configuration.searchModels.includes('guestbooks');
      searchProjects.value = siteSettings.value.configuration.searchModels.includes('projects');
      searchPosts.value = siteSettings.value.configuration.searchModels.includes('posts');
      searchArticles.value = siteSettings.value.configuration.searchModels.includes('articles');
      apiLoadingStore.setLoading(false);
    })

    const saveSettings = async () => {
      try {
        apiLoadingStore.setLoading(true);
        siteSettings.value.configuration.searchModels = [];
        if (searchGuestbooks.value) {
          siteSettings.value.configuration.searchModels.push('guestbooks');
        }
        if (searchProjects.value) {
          siteSettings.value.configuration.searchModels.push('projects');
        }
        if (searchPosts.value) {
          siteSettings.value.configuration.searchModels.push('posts');
        }
        if (searchArticles.value) {
          siteSettings.value.configuration.searchModels.push('articles');
        }

        await settingsStore.saveSettings(siteSettings.value);
        siteSettings.value = settingsStore.getSettings();
        responseMessage.value = 'Settings saved successfully';
        responseType.value = 'success';
      } catch (error) {
        responseMessage.value = "Failed to save settings";
        responseType.value = 'error';
        console.error("Failed to save settings:", error);
      } finally {
        apiLoadingStore.setLoading(false);
        if (responseType.value == 'success') {
          setTimeout(() => {
            responseMessage.value = undefined;
          }, 3000);
        }
      }
    }

    return {
      apiLoadingStore,
      siteSettings,
      validForm,
      searchGuestbooks,
      searchProjects,
      responseType,
      responseMessage,
      searchPosts,
      searchArticles,
      saveSettings,
    };
  }
};
</script>