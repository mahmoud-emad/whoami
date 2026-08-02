<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading socials from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    Where you are on the rest of the web. These addresses seed the Contact page and identify you to
    services that read <code>rel="me"</code>. Labels, descriptions and the page copy are edited on the
    Contact page itself.
  </v-alert>

  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()">

    <h3 class="section-title">📧 Email</h3>
    <v-text-field v-model="socials.email" type="email"
      :rules="socials.email?.length ? emailRules({ fieldName: 'Email', maxLength: 120, minLength: 5 }) : []"
      label="Email address" variant="outlined" hide-details="auto" class="mb-4"></v-text-field>

    <v-divider class="my-4" />

    <h3 class="section-title">💬 Instant messaging</h3>
    <v-text-field v-model="socials.signalUrl" type="url" :rules="socials.signalUrl?.length ? websiteRules() : []"
      label="Signal URL" variant="outlined" hide-details="auto" class="mb-4"></v-text-field>

    <v-divider class="my-4" />

    <h3 class="section-title">🌐 Profiles</h3>
    <v-text-field v-model="socials.githubUrl" type="url" :rules="socials.githubUrl?.length ? websiteRules() : []"
      label="GitHub URL" variant="outlined" hide-details="auto" class="mb-3"></v-text-field>
    <v-text-field v-model="socials.linkedinUrl" type="url" :rules="socials.linkedinUrl?.length ? websiteRules() : []"
      label="LinkedIn URL" variant="outlined" hide-details="auto" class="mb-3"></v-text-field>
    <v-text-field v-model="socials.xUrl" type="url" :rules="socials.xUrl?.length ? websiteRules() : []"
      label="X (Twitter) URL" variant="outlined" hide-details="auto" class="mb-4"></v-text-field>

    <v-divider class="my-4" />

    <h3 class="section-title">🕒 Timezone</h3>
    <!-- The IANA example moved from the label to a placeholder: at 390px the field is ~290px wide
         and the old label was clipped to "Timezone (IANA, e.g. Afri…". The hint below already
         explains what the value is for, so nothing is lost. -->
    <v-text-field v-model="socials.timezone" label="Timezone" placeholder="Europe/London" variant="outlined"
      hide-details="auto" class="mb-4" hint="IANA timezone string used for the live clock on Contact."
      persistent-hint></v-text-field>

    <div class="form-actions mb-4">
      <v-btn @click="saveSocials" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
        title="Save Socials" color="primary" variant="tonal">Save Socials</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { ProfileType } from '../../types';
import { websiteRules, emailRules, deepClone } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';

type Socials = ProfileType['socials'];

const emptySocials = (): Socials => ({
  email: '',
  signalUrl: '',
  githubUrl: '',
  linkedinUrl: '',
  xUrl: '',
  timezone: '',
});

export default {
  name: 'SocialsForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const validForm = ref(false);
    const socials = ref<Socials>(emptySocials());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const profile = settingsStore.getSettings().profile;
        if (profile?.socials) socials.value = deepClone(profile.socials);
      }
    });

    // Only `socials` is written. profile.contact still exists as the pre-channels fallback the
    // Contact page reads from, and the Contact page is what edits it now — writing a stale copy
    // back from here would undo an in-place edit made since this tab was opened.
    const saveSocials = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        full.profile = { ...full.profile, socials: socials.value };
        await settingsStore.saveSettings(full);
        success('Socials saved successfully');
      } catch (e) {
        error('Failed to save socials');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      socials,
      validForm,
      responseType,
      responseMessage,
      saveSocials,
      websiteRules,
      emailRules,
    };
  },
};
</script>

