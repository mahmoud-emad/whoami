<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading settings from the server</p>
  </v-alert>
  <v-alert v-if="!siteSettings?.configuration?.enableSearch" variant="tonal" type="info">Enable search engine to use the
    search feature</v-alert>
  <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
    variant="tonal">{{ responseMessage }}</v-alert>

  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()" @submit.prevent="saveSettings">
    <v-switch :loading="apiLoadingStore.isLoading()" v-model="enableSearch" title="Enable search engine" color="primary"
      label="Enable Search" hide-details inset />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!enableSearch" v-model="searchGuestbooks"
      title="Search all guestbooks" color="primary" inset label="Search all guestbooks" hide-details />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!enableSearch" v-model="searchProjects"
      title="Search all projects" color="primary" inset label="Search all projects" hide-details />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!enableSearch" v-model="searchArticles"
      title="Search all articles" color="primary" inset label="Search all articles" hide-details />
    <v-switch :loading="apiLoadingStore.isLoading()" :disabled="!enableSearch" v-model="searchPosts"
      title="Search all blog posts" color="primary" inset label="Search all blog posts" hide-details />
    <!-- Save button - hidden in setup mode -->
    <v-btn v-if="!setupMode" @click="saveSettings" :loading="apiLoadingStore.isLoading()"
      :disabled="apiLoadingStore.isLoading()" title="Save Settings" class="mb-4 mt-4" color="primary"
      variant="tonal">Save</v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { SettingsType } from '../../types';
import { useAPILoading, useSiteSettingsStore } from '../../store';

// Define props and emits
const props = defineProps({
  setupMode: {
    type: Boolean,
    default: false
  },
  introMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['settings-saved', 'form-data-changed']);

// Initialize reactive state
const apiLoadingStore = useAPILoading();
const validForm = ref(false);
const enableSearch = ref(false);
const searchGuestbooks = ref(false);
const searchProjects = ref(false);
const searchPosts = ref(false);
const searchArticles = ref(false);
const responseType = ref('success');
const responseMessage = ref<string | undefined>();
const settingsStore = useSiteSettingsStore();
const siteSettings = ref<SettingsType>({} as SettingsType);

// Watch for changes and emit to parent
watch([enableSearch, searchGuestbooks, searchProjects, searchPosts, searchArticles], () => {
  const formData = {
    enableSearch: enableSearch.value,
    searchGuestbooks: searchGuestbooks.value,
    searchProjects: searchProjects.value,
    searchPosts: searchPosts.value,
    searchArticles: searchArticles.value
  };

  emit('form-data-changed', formData);
}, { deep: true });

onMounted(async () => {
  try {
    apiLoadingStore.setLoading(true);

    if (!settingsStore.isSettingsLoaded()) {
      await settingsStore.loadSettings();
    }
    siteSettings.value = settingsStore.getSettings;

    // Initialize enableSearch from settings
    if (siteSettings.value?.configuration?.enableSearch !== undefined) {
      enableSearch.value = siteSettings.value.configuration.enableSearch;
    }

    // Initialize search models from settings
    if (siteSettings.value?.configuration?.searchModels) {
      searchGuestbooks.value = siteSettings.value.configuration.searchModels.includes('guestbooks');
      searchProjects.value = siteSettings.value.configuration.searchModels.includes('projects');
      searchPosts.value = siteSettings.value.configuration.searchModels.includes('posts');
      searchArticles.value = siteSettings.value.configuration.searchModels.includes('articles');
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  } finally {
    apiLoadingStore.setLoading(false);
  }
});

const saveSettings = async () => {
  try {
    apiLoadingStore.setLoading(true);

    // Make sure we have a valid configuration object
    if (!siteSettings.value.configuration) {
      siteSettings.value.configuration = {
        adminDashboard: true,
        displayNavbarImage: true,
        multipleThemes: false,
        enableSearch: enableSearch.value,
        searchModels: []
      };
    } else {
      siteSettings.value.configuration.enableSearch = enableSearch.value;
    }

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

    await settingsStore.updateSettings(siteSettings.value);
    siteSettings.value = settingsStore.getSettings;
    responseMessage.value = 'Settings saved successfully';
    responseType.value = 'success';

    // Emit event to notify parent component that settings were saved
    emit('settings-saved');
  } catch (error) {
    responseMessage.value = "Failed to save settings";
    responseType.value = 'error';
    console.error("Failed to save settings:", error);
  } finally {
    apiLoadingStore.setLoading(false);
    if (responseType.value === 'success') {
      setTimeout(() => {
        responseMessage.value = undefined;
      }, 3000);
    }
  }
};
</script>