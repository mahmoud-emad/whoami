<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading settings from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType == 'success' ? 'success' : 'error'" class="mb-4"
    variant="tonal">{{ responseMessage }}</v-alert>

  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()">
    <v-text-field :loading="apiLoadingStore.isLoading()" v-model="siteSettings.configuration.githubURL"
      title="Your GitHub Link" class="mb-4" label="Your GitHub Link" type="url" variant="outlined" hide-details="auto"
      :rules="githubWebsiteRules()"></v-text-field>

    <v-switch :loading="apiLoadingStore.isLoading()" v-model="support2Themes" title="Support 2 themes Dark/Light"
      color="primary" inset label="Support 2 themes Dark/Light" hide-details />

    <v-switch :loading="apiLoadingStore.isLoading()" v-model="adminDashboard"
      title="Enabling this will display the admin dashboard and its fingerprint" color="primary" inset
      label="Enable admin dashboard service" hide-details />

    <div class="form-actions mb-4">
      <v-btn @click="saveSettings" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
        title="Save Settings" color="primary" variant="tonal">Save</v-btn>
    </div>
  </v-form>

  <v-divider class="my-6" />

  <!-- Credential changes go through their own endpoint, never the settings payload: the signature
       is stored as a hash the browser never sees, so it cannot be edited as an ordinary field. -->
  <h3 class="section-title">🔑 Admin signature</h3>
  <v-alert type="info" class="mb-4" variant="tonal">
    Your signature is stored on the server as a salted hash and is never sent to the browser.
    Changing it signs out every active session, including this one.
  </v-alert>

  <v-alert v-if="signatureMessage" :type="signatureType" class="mb-4" variant="tonal">{{ signatureMessage }}</v-alert>

  <v-form v-model="validSignatureForm" :disabled="changingSignature">
    <v-text-field v-model="currentSignature" type="password" title="Current signature" class="mb-4"
      label="Current signature" variant="outlined" hide-details="auto"
      :rules="signatureRules({ fieldName: 'Current signature', forLogin: true })"></v-text-field>
    <v-text-field v-model="newSignature" type="password" title="New signature" class="mb-4" label="New signature"
      variant="outlined" hide-details="auto"
      :rules="signatureRules({ fieldName: 'New signature' })"></v-text-field>
    <div class="form-actions mb-4">
      <v-btn @click="changeSignature" :loading="changingSignature" :disabled="!validSignatureForm || changingSignature"
        title="Change signature" color="warning" variant="tonal">Change signature</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAPILoading, useSettingsStore, defaultSettings } from '../../store';
import { SettingsType } from '../../types';
import { githubWebsiteRules, signatureRules } from '../../utils';
import { apiJson, clearToken } from '../../utils/api';


export default {
  name: 'SettingsForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const adminDashboard = ref(false)
    const support2Themes = ref(false)
    const siteSettings = ref<SettingsType>(defaultSettings());
    const validForm = ref(false);
    const responseType = ref('success');
    const responseMessage = ref();
    const router = useRouter();

    const currentSignature = ref('');
    const newSignature = ref('');
    const changingSignature = ref(false);
    const validSignatureForm = ref(false);
    const signatureMessage = ref('');
    const signatureType = ref<'success' | 'error'>('success');

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

    // Changing the signature invalidates every token server-side, so the admin is signed out and
    // sent back to the login screen to prove they know the new value.
    const changeSignature = async () => {
      changingSignature.value = true;
      signatureMessage.value = '';
      try {
        await apiJson('/auth/signature', {
          method: 'POST',
          body: JSON.stringify({
            currentSignature: currentSignature.value,
            newSignature: newSignature.value,
          }),
        });
        signatureType.value = 'success';
        signatureMessage.value = 'Signature updated. Signing you out…';
        currentSignature.value = '';
        newSignature.value = '';
        clearToken();
        setTimeout(() => router.push('/admin-signature'), 1200);
      } catch (e: any) {
        signatureType.value = 'error';
        signatureMessage.value = e?.message || 'Failed to change the signature';
      } finally {
        changingSignature.value = false;
      }
    };

    return {
      apiLoadingStore,
      responseMessage,
      adminDashboard,
      responseType,
      siteSettings,
      validForm,
      githubWebsiteRules,
      saveSettings,
      support2Themes,
      currentSignature,
      newSignature,
      changingSignature,
      validSignatureForm,
      signatureMessage,
      signatureType,
      changeSignature,
      signatureRules,
    };
  }
};
</script>