<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading settings from the server</p>
  </v-alert>
  <v-alert v-if="!siteSettings.configuration.enableSearch" class="mb-4" variant="tonal" type="info">Enable search engine
    to use the search feature</v-alert>
  <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />

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
    <div class="form-actions mt-4 mb-4">
      <v-btn @click="saveSettings" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
        title="Save Settings" color="primary" variant="tonal">Save</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useFormFeedback } from '../../composables/useFormFeedback';
import FeedbackNote from '../../components/admin/FeedbackNote.vue';
import { SettingsType } from '../../types';
import { useAPILoading, useSettingsStore, defaultSettings } from '../../store';


export default {
  components: { FeedbackNote },
  setup() {
    const apiLoadingStore = useAPILoading();
    const validForm = ref(false);
    // Shared composable rather than a hand-rolled message/type pair and a setTimeout that only
    // ever fired on success, leaving errors on screen until the next save.
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const searchGuestbooks = ref(false);
    const searchProjects = ref(false);
    const searchPosts = ref(false);
    const searchArticles = ref(false);
    const settingsStore = useSettingsStore();
    const siteSettings = ref<SettingsType>(defaultSettings());

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
        success('Settings saved successfully');
      } catch (err) {
        error('Failed to save settings');
        console.error('Failed to save settings:', err);
      } finally {
        apiLoadingStore.setLoading(false);
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