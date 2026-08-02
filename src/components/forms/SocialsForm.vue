<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading socials from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    Drives the Contact page. URLs decide whether each block appears; labels and descriptions are what visitors see.
    Empty values fall back to sensible defaults.
  </v-alert>

  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()">

    <!-- Page-level copy -->
    <h3 class="section-title">📝 Contact page copy</h3>
    <v-textarea v-model="contact.intro" :counter="400" label="Intro paragraph" variant="outlined"
      hide-details="auto" class="mb-4" rows="2" auto-grow></v-textarea>
    <v-text-field v-model="contact.elsewhereIntro" label="Elsewhere section intro" variant="outlined"
      hide-details="auto" class="mb-4"></v-text-field>

    <v-divider class="my-4" />

    <!-- Email -->
    <h3 class="section-title">📧 Email</h3>
    <v-text-field v-model="socials.email" type="email"
      :rules="socials.email?.length ? emailRules({ fieldName: 'Email', maxLength: 120, minLength: 5 }) : []"
      label="Email address" variant="outlined" hide-details="auto" class="mb-3"></v-text-field>
    <v-text-field v-model="contact.emailLabel" label="Display label" variant="outlined" hide-details="auto"
      class="mb-3"></v-text-field>
    <v-textarea v-model="contact.emailDescription" :counter="400" label="Description paragraph" variant="outlined"
      hide-details="auto" class="mb-4" rows="2" auto-grow></v-textarea>

    <v-divider class="my-4" />

    <!-- Signal -->
    <h3 class="section-title">💬 Signal</h3>
    <v-text-field v-model="socials.signalUrl" type="url" :rules="socials.signalUrl?.length ? websiteRules() : []"
      label="Signal URL" variant="outlined" hide-details="auto" class="mb-3"></v-text-field>
    <v-text-field v-model="contact.signalLabel" label="Display label" variant="outlined" hide-details="auto"
      class="mb-3"></v-text-field>
    <v-textarea v-model="contact.signalDescription" :counter="400" label="Description paragraph" variant="outlined"
      hide-details="auto" class="mb-4" rows="2" auto-grow></v-textarea>

    <v-divider class="my-4" />

    <!-- Elsewhere -->
    <h3 class="section-title">🌐 Elsewhere</h3>
    <v-text-field v-model="socials.githubUrl" type="url" :rules="socials.githubUrl?.length ? websiteRules() : []"
      label="GitHub URL" variant="outlined" hide-details="auto" class="mb-3"></v-text-field>
    <v-text-field v-model="contact.githubLabel" label="GitHub display label" variant="outlined" hide-details="auto"
      class="mb-4"></v-text-field>

    <v-text-field v-model="socials.linkedinUrl" type="url" :rules="socials.linkedinUrl?.length ? websiteRules() : []"
      label="LinkedIn URL" variant="outlined" hide-details="auto" class="mb-3"></v-text-field>
    <v-text-field v-model="contact.linkedinLabel" label="LinkedIn display label" variant="outlined" hide-details="auto"
      class="mb-4"></v-text-field>

    <v-text-field v-model="socials.xUrl" type="url" :rules="socials.xUrl?.length ? websiteRules() : []"
      label="X (Twitter) URL" variant="outlined" hide-details="auto" class="mb-3"></v-text-field>
    <v-text-field v-model="contact.xLabel" label="X display label" variant="outlined" hide-details="auto"
      class="mb-4"></v-text-field>

    <v-divider class="my-4" />

    <!-- Timezone -->
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
type Contact = ProfileType['contact'];

const emptySocials = (): Socials => ({
  email: '',
  signalUrl: '',
  githubUrl: '',
  linkedinUrl: '',
  xUrl: '',
  timezone: '',
});

const emptyContact = (): Contact => ({
  intro: '',
  elsewhereIntro: '',
  emailLabel: '',
  emailDescription: '',
  signalLabel: '',
  signalDescription: '',
  githubLabel: '',
  linkedinLabel: '',
  xLabel: '',
});

export default {
  name: 'SocialsForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const validForm = ref(false);
    const socials = ref<Socials>(emptySocials());
    const contact = ref<Contact>(emptyContact());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const profile = settingsStore.getSettings().profile;
        if (profile?.socials) socials.value = deepClone(profile.socials);
        if (profile?.contact) contact.value = deepClone(profile.contact);
      }
    });

    const saveSocials = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        full.profile = { ...full.profile, socials: socials.value, contact: contact.value };
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
      contact,
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

<style scoped>
.section-title {
  margin-top: 8px;
  margin-bottom: 12px;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
}
</style>
