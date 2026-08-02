<template>
  <!--
    Deliberately plain. This page is reached by typing the URL, never by following a link, so it
    does not need to sell anything or explain where the visitor is — it needs one input and a way
    back out. No branding, no owner name, no hint about the credential.
  -->
  <div class="signin">
    <section class="signin__panel">
      <p class="signin__eyebrow">Restricted</p>
      <h1 class="signin__title">Sign in</h1>
      <p class="signin__lede">
        This page is for the site owner. If you landed here by accident,
        <router-link to="/" class="signin__back">return to the site</router-link>.
      </p>

      <v-form v-model="validForm" class="signin__form" @submit.prevent="login">
        <label class="signin__label" for="signature">Signature</label>
        <v-text-field id="signature" v-model="signature" :rules="signatureRules()"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          autocomplete="current-password" density="comfortable" variant="outlined" hide-details="auto"
          @click:append-inner="showPassword = !showPassword"></v-text-field>

        <v-alert v-if="showInvalidAlert" class="mt-4" type="error" variant="tonal" density="compact">
          {{ errorMessage || 'That signature was not accepted' }}
        </v-alert>

        <!-- Only offered while the dashboard is off: with it already on, the switch would be a
             control that changes nothing. -->
        <template v-if="dashboardDisabled">
          <p class="signin__note">The dashboard is currently switched off.</p>
          <v-switch v-model="enableAdminDashboard" :loading="apiLoadingStore.isLoading()" class="signin__switch"
            color="primary" density="compact" hide-details inset>
            <template #label>
              <span class="signin__switch-label">Switch it back on when I sign in</span>
            </template>
          </v-switch>
        </template>

        <v-btn :loading="apiLoadingStore.isLoading()" :disabled="!validForm" type="submit" variant="flat"
          color="primary" class="signin__submit" block>
          Continue
        </v-btn>
      </v-form>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { login as apiLogin } from '../utils/api';
import { useAPILoading, useSettingsStore } from "../store/index";
import { SettingsType } from '../types';

export default {
  name: 'AdminSignature',
  setup() {
    const showPassword = ref(false)
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const router = useRouter();
    const siteSettings = ref<SettingsType>({} as SettingsType);
    const signature = ref('');
    const showInvalidAlert = ref(false)
    const errorMessage = ref('')
    const validForm = ref(false);
    const enableAdminDashboard = ref(false);

    // Settings arrive asynchronously, so this is false until they land — which is the right
    // default: the extra switch stays hidden rather than flashing in and out.
    const dashboardDisabled = computed(
      () => Boolean(siteSettings.value?.configuration) && !siteSettings.value.configuration.adminDashboard
    );

    onMounted(async () => {
      await loadSettings();
    })

    // Read the public settings so the form knows whether the dashboard is currently enabled.
    const loadSettings = async () => {
      try {
        apiLoadingStore.setLoading(true);
        await settingsStore.loadSettings();
        if (settingsStore.isSettingsLoaded()) {
          siteSettings.value = settingsStore.getSettings();
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    // The signature is verified on the server, which returns a short-lived bearer token. Nothing
    // about the credential is checked or stored in the browser.
    const login = async () => {
      apiLoadingStore.setLoading(true);
      showInvalidAlert.value = false;
      errorMessage.value = '';
      try {
        await apiLogin(signature.value);

        // Turning the dashboard back on requires the token we just obtained.
        if (enableAdminDashboard.value) {
          const current = settingsStore.getSettings();
          current.configuration.adminDashboard = true;
          await settingsStore.saveSettings(current);
        }

        router.push('/admin-dashboard');
      } catch (error: any) {
        showInvalidAlert.value = true;
        errorMessage.value = error?.message || 'That signature was not accepted';
      } finally {
        apiLoadingStore.setLoading(false);
      }
    }

    const signatureRules = () => [
      (v: string) => v && v.length > 0 || 'A signature is required',
    ];

    return {
      validForm,
      showPassword,
      signature,
      showInvalidAlert,
      errorMessage,
      siteSettings,
      dashboardDisabled,
      apiLoadingStore,
      enableAdminDashboard,
      signatureRules,
      login,
    };
  }
};
</script>

<style scoped>
/* The page renders without the site's navbar and footer, so it owns the whole viewport and centres
   its one panel in it. */
.signin {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-text-color));
}

.signin__panel {
  width: 100%;
  max-width: 25rem;
}

/* Mono eyebrow above a display heading: the same pairing the home page hero uses, so this screen
   reads as part of the site rather than a stray admin tool. */
.signin__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-gray-color));
  margin-bottom: 0.75rem;
}

.signin__title {
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 6vw, 2.2rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: rgb(var(--v-theme-text-color));
}

.signin__lede {
  font-family: var(--font-body);
  font-size: 0.95rem;
  line-height: 1.65;
  color: rgb(var(--v-theme-gray-color));
  margin-top: 0.9rem;
}

.signin__back {
  color: rgb(var(--v-theme-link-hover-color)) !important;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.signin__form {
  margin-top: 2.25rem;
}

.signin__label {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-gray-color));
  margin-bottom: 0.5rem;
}

.signin__note {
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: rgb(var(--v-theme-gray-color));
  margin-top: 1.5rem;
}

.signin__switch {
  margin-top: 0.25rem;
}

.signin__switch-label {
  font-family: var(--font-body);
  font-size: 0.88rem;
  color: rgb(var(--v-theme-gray-color));
}

.signin__submit {
  margin-top: 1.75rem;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  text-transform: none;
}

/* Vuetify paints the field from its own palette, which is not the one the rest of the site uses;
   these pull it back onto the theme tokens so it holds up in both light and dark. */
.signin__form :deep(.v-field) {
  background: rgb(var(--v-theme-box-bg-color));
  color: rgb(var(--v-theme-text-color));
  border-radius: 4px;
}

.signin__form :deep(.v-field__outline) {
  --v-field-border-opacity: 1;
  color: rgb(var(--v-theme-border-color));
}

.signin__form :deep(.v-field--focused .v-field__outline) {
  color: rgb(var(--v-theme-link-hover-color));
}

.signin__form :deep(.v-field__input),
.signin__form :deep(input) {
  font-family: var(--font-mono);
  color: rgb(var(--v-theme-text-color));
}

.signin__form :deep(.v-field__append-inner .v-icon) {
  color: rgb(var(--v-theme-gray-color));
}
</style>
