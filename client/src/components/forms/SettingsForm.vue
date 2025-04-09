<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading settings from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
    variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="warning" class="mb-4" variant="tonal">
    <strong>Be careful when modifying these settings, especially the admin fingerprint signature.</strong>
    <p>
      Changing the fingerprint signature will disable the admin dashboard. Set it to a secret word you'll remember,
      like a password.
    </p>
    <p>
      The fingerprint is stored as a hash on the server. When logging in or updating it, you'll need to enter the
      actual value, not the hash.
    </p>
  </v-alert>
  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()">
    <v-text-field :loading="apiLoadingStore.isLoading()" v-model="githubURL" title="Your GitHub Link" class="mb-4"
      label="Your GitHub Link" type="url" variant="outlined" hide-details="auto"
      :rules="[...isValidURL(), ...githubWebsiteRules()]"></v-text-field>
    <v-text-field :loading="apiLoadingStore.isLoading()" type="password" :rules="longTextRules({
      fieldName: 'Admin Fingerprint Signature',
      maxLength: 400,
      minLength: 6
    })" v-model="adminFingerprint" title="Change admin fingerprint signature" class="mb-4"
      label="Change admin fingerprint signature" variant="outlined" hide-details="auto"
      hint="It's recommended to change the signature to avoid being detected as a bot.">
    </v-text-field>

    <v-switch :loading="apiLoadingStore.isLoading()" v-model="support2Themes" title="Support 2 themes Dark/Light"
      color="primary" inset label="Support 2 themes Dark/Light" hide-details class="mb-4" />

    <v-switch :loading="apiLoadingStore.isLoading()" v-model="adminDashboard"
      title="Enabling this will display the admin dashboard and its fingerprint" color="primary" inset
      label="Enable admin dashboard service" hide-details class="mb-4" />

    <!-- Save button - hidden in setup mode -->
    <v-btn v-if="!setupMode" @click="saveSettings" :loading="apiLoadingStore.isLoading()"
      :disabled="apiLoadingStore.isLoading()" title="Save Settings" class="mb-4 mt-4" color="primary"
      variant="tonal">Save</v-btn>
  </v-form>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useAPILoading, useSiteSettingsStore } from '../../store';
import { SettingsType } from '../../types';
import { longTextRules, isValidURL, githubWebsiteRules } from '../../utils';

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
const settingsStore = useSiteSettingsStore();
const adminDashboard = ref(false);
const support2Themes = ref(false);
const githubURL = ref('');
const adminFingerprint = ref('');
const validForm = ref(false);
const responseType = ref('success');
const responseMessage = ref<string | undefined>();

const siteSettings = ref<SettingsType>({} as SettingsType);

// Watch for changes and emit to parent
watch([githubURL, adminDashboard, support2Themes, adminFingerprint], () => {
  const formData = {
    githubLink: githubURL.value,
    adminDashboard: adminDashboard.value,
    support2Themes: support2Themes.value,
    adminFingerprintSignature: adminFingerprint.value,
    debug: false
  };

  emit('form-data-changed', formData);
}, { deep: true });

onMounted(async () => {
  try {
    apiLoadingStore.setLoading(true);

    if (!settingsStore.isSettingsLoaded()) {
      await settingsStore.loadSettings();
    }

    siteSettings.value = settingsStore.settings;

    if (siteSettings.value && siteSettings.value.configuration) {
      adminDashboard.value = siteSettings.value.configuration.adminDashboard;
      support2Themes.value = siteSettings.value.configuration.multipleThemes;
    }

    if (siteSettings.value && siteSettings.value.security) {
      adminFingerprint.value = siteSettings.value.security.adminFingerprintSignature || '';
    }

    // Get GitHub URL from personal settings if available
    if (siteSettings.value?.personal?.social?.github) {
      githubURL.value = siteSettings.value.personal.social.github;
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

    // Make sure we have valid configuration and security objects
    if (!siteSettings.value.configuration) {
      siteSettings.value.configuration = {
        adminDashboard: true,
        displayNavbarImage: true,
        multipleThemes: false,
        enableSearch: false,
        searchModels: []
      };
    }

    if (!siteSettings.value.security) {
      siteSettings.value.security = {
        adminFingerprintSignature: '',
        debug: false
      };
    }

    siteSettings.value.configuration.adminDashboard = adminDashboard.value;
    siteSettings.value.configuration.multipleThemes = support2Themes.value;
    siteSettings.value.security.adminFingerprintSignature = adminFingerprint.value;

    // Update GitHub URL in personal settings
    if (!siteSettings.value.personal) {
      siteSettings.value.personal = {
        fullName: '',
        email: '',
        country: '',
        social: {
          github: githubURL.value,
          linkedin: ''
        }
      };
    } else if (!siteSettings.value.personal.social) {
      siteSettings.value.personal.social = {
        github: githubURL.value,
        linkedin: ''
      };
    } else {
      siteSettings.value.personal.social.github = githubURL.value;
    }

    await settingsStore.updateSettings(siteSettings.value);
    siteSettings.value = settingsStore.settings;
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