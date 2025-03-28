<template>
  <div class="main-scope pa-3 bg-image">
    <div class="d-flex justify-center align-center">
      <v-alert class="d-flex justify-center align-center" variant="outlined" type="warning">
        Please be aware that this area is restricted to admins only. If you are here by mistake or wish to
        return to
        the site, please click `<router-link to="/">Return me</router-link>`.
      </v-alert>
    </div>
    <div class="admin-form d-flex justify-center align-center" style="height: 750px;">
      <v-card width="500" class="pa-4 login-card head-card" :style="{ background: 'transparent !important' }">
        <p class="mb-4">
          <strong>Admin Login Signature</strong>
          <small> 🔑 </small>
        </p>
        <small class="mb-4">
          Please enter your email and password to access the admin panel.
        </small>
        <v-form v-model="validForm" @submit.prevent="login">
          <v-text-field :rules="signatureRules()" v-model="signature" append-icon="mdi-fingerprint" class="mb-4"
            type="password" label="Signature" hide-details="auto" variant="outlined"></v-text-field>
          <v-alert v-if="showInvalidAlert" class="mt-4 mb-4" type="error" variant="tonal">
            The signature you entered is invalid
          </v-alert>
          <v-alert v-if="siteSettings && siteSettings.configuration && !siteSettings.configuration.adminDashboard"
            class="mt-4 mb-4" type="warning" variant="tonal">
            The admin-dashboard service is disabled, would you like to enable it?
          </v-alert>
          <v-switch class="mb-3"
            v-if="siteSettings && siteSettings.configuration && !siteSettings.configuration.adminDashboard"
            :loading="apiLoadingStore.isLoading()" v-model="enableAdminDashboard" title="Enable admin-dashboard service"
            color="primary" hide-details inset>
            <template #label>
              Enable <strong class="ml-1 mr-1" style="font-size: 16px;">admin-dashboard</strong> service
            </template>
          </v-switch>
          <v-btn :loading="apiLoadingStore.isLoading()" :disabled="!validForm" @click="login" variant="tonal"
            color="primary" class="mb-2 mt-2">
            Validate
          </v-btn>
        </v-form>
      </v-card>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import md5 from 'md5';
import { validateAdminSignature } from '../utils';
import { useAPILoading, useSettingsStore } from "../store/index";
import { SettingsType } from '../types';

export default {
  name: 'AdminSignature',
  setup() {
    const showPassword = ref(false)
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const siteSettings = ref<SettingsType>({} as SettingsType);
    const signature = ref('');
    const showInvalidAlert = ref(false)
    const validForm = ref(false);
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    const enableAdminDashboard = ref(false);


    onMounted(async () => {
      await loadSettings();
    })

    // Load settings from backend
    const loadSettings = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await fetch(`${serverUrl}/settings`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const result = await res.json();
        siteSettings.value = result.data;
        settingsStore.saveSettings(result.data);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const login = () => {
      apiLoadingStore.setLoading(true);
      try {
        const hashedUserInputSignature = md5(signature.value)
        const savedSignature = siteSettings.value.security.adminFingerprintSignature
        if (!validateAdminSignature(savedSignature, hashedUserInputSignature)) {
          showInvalidAlert.value = true
          return
        }

        if (enableAdminDashboard.value) {
          siteSettings.value.configuration.adminDashboard = true
          settingsStore.saveSettings(siteSettings.value)
        }
        showInvalidAlert.value = false
        window.location.href = '/admin-dashboard'
      } catch (error) {
        console.error("Failed to validate signature:", error);
      } finally {
        apiLoadingStore.setLoading(false);
      }

    }

    const signatureRules = () => [
      (v: string) => v && v.length > 0 || 'Admin signature is required',
    ];

    return {
      validForm,
      showPassword,
      signature,
      showInvalidAlert,
      siteSettings,
      apiLoadingStore,
      enableAdminDashboard,
      signatureRules,
      login,
    };
  }
};
</script>

<style scoped>
.login-card {
  border: 1px solid #494949 !important;
  align-items: center;
  margin: 0 auto;
  display: grid;
}
</style>
