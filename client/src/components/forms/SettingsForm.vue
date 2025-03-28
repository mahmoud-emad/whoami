<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading settings from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
    variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="warning" class="mb-4" variant="tonal">
    <strong>Be careful when modifying these settings, especially the admin fingerprint signature.</strong>
    <p>
      Changing the fingerprint signature will disable the admin dashboard. Set it to a secret word you’ll remember,
      like a password.
    </p>
    <p>
      The fingerprint is stored as a hash on the server. When logging in or updating it, you'll need to enter the
      actual value, not the hash.
    </p>
  </v-alert>
  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()">
    <v-text-field :loading="apiLoadingStore.isLoading()" v-model="siteSettings.configuration.githubURL"
      title="Your GitHub Link" class="mb-4" label="Your GitHub Link" type="url" variant="outlined" hide-details="auto"
      :rules="[...websiteRules(), ...githubWebsiteRules()]"></v-text-field>
    <v-text-field :loading="apiLoadingStore.isLoading()" type="password" :rules="longTextRules({
      fieldName: 'Admin Fingerprint Signature',
      maxLength: 400,
      minLength: 6
    })" v-model="siteSettings.security.adminFingerprintSignature" title="Change admin fingerprint signature"
      class="mb-4" label="Change admin fingerprint signature" variant="outlined" hide-details="auto"
      hint="It's recommended to change the signature to avoid being detected as a bot.">
    </v-text-field>

    <v-switch :loading="apiLoadingStore.isLoading()" v-model="support2Themes" title="Support 2 themes Dark/Light"
      color="primary" inset label="Support 2 themes Dark/Light" hide-details />

    <v-switch :loading="apiLoadingStore.isLoading()" v-model="adminDashboard"
      title="Enabling this will display the admin dashboard and its fingerprint" color="primary" inset
      label="Enable admin dashboard service" hide-details />

    <v-btn @click="saveSettings" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save Settings" class="mb-4" color="primary" variant="tonal">Save</v-btn>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { SettingsType } from '../../types';
import { longTextRules, websiteRules, githubWebsiteRules } from '../../utils';


export default {
  name: 'SettingsForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const adminDashboard = ref(false)
    const support2Themes = ref(false)
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
    const validForm = ref(false);
    const responseType = ref('success');
    const responseMessage = ref();

    onMounted(() => {
      apiLoadingStore.setLoading(true);
      siteSettings.value = settingsStore.getSettings();
      adminDashboard.value = siteSettings.value.configuration.adminDashboard;
      support2Themes.value = siteSettings.value.configuration.multipleThemes;
      apiLoadingStore.setLoading(false);
    })

    const saveSettings = async () => {
      try {
        apiLoadingStore.setLoading(true);
        siteSettings.value.configuration.adminDashboard = adminDashboard.value;
        siteSettings.value.configuration.multipleThemes = support2Themes.value;
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
      responseMessage,
      adminDashboard,
      responseType,
      siteSettings,
      validForm,
      githubWebsiteRules,
      longTextRules,
      websiteRules,
      saveSettings,
      support2Themes,
    };
  }
};
</script>