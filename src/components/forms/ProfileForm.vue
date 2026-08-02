<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading profile from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    These fields drive the public Home, Contact, and Problem-Solving sections. Any field left empty is hidden on the
    site.
  </v-alert>

  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()">

    <!-- Identity -->
    <h3 class="section-title">👤 Identity</h3>
    <v-text-field v-model="profile.fullName" :rules="profile.fullName?.length ? nameRules({
      fieldName: 'Full Name',
      maxLength: 60,
      minLength: 2,
    }) : []" title="Full Name" class="mb-4" label="Full Name" variant="outlined"
      hide-details="auto"></v-text-field>
    <!-- Example moved to a placeholder so the label is not ellipsised in a ~290px field. -->
    <v-text-field v-model="profile.role" title="Role" class="mb-4" label="Role" placeholder="Software Engineer"
      variant="outlined" hide-details="auto"></v-text-field>
    <v-textarea v-model="profile.bio" :rules="profile.bio?.length ? longTextRules({
      fieldName: 'Bio',
      maxLength: 600,
      minLength: 10,
    }) : []" :counter="600" title="Bio" class="mb-4" label="Bio" variant="outlined" hide-details="auto" rows="4"
      auto-grow></v-textarea>

    <v-divider class="my-4" />

    <!-- Welcome messages -->
    <h3 class="section-title">👋 Welcome messages</h3>
    <p class="section-hint mb-3">
      Phrases that rotate in the hero section every 3 seconds. Press Enter to add a new line.
    </p>
    <!-- Welcome messages are whole phrases, and a v-chip is nowrap + overflow:hidden by default, so
         on a phone each one was hard-clipped mid-word with no ellipsis. See the scoped rule below. -->
    <v-combobox v-model="profile.welcomeMessages" class="mb-4 welcome-combobox" label="Welcome messages"
      variant="outlined" hide-details="auto" multiple chips closable-chips></v-combobox>

    <v-divider class="my-4" />

    <!-- Resume -->
    <h3 class="section-title">📄 Resume</h3>
    <v-file-input v-model="resumeFile" :loading="uploading" :disabled="uploading" label="Upload Resume (PDF or image)"
      title="Upload Resume" variant="outlined" hide-details="auto" show-size prepend-icon="" append-icon="mdi-upload"
      @update:model-value="uploadResume" class="mb-4"></v-file-input>
    <v-text-field v-model="profile.resumeUrl" title="Resume URL" label="Resume URL" variant="outlined"
      hide-details="auto" class="mb-4" hint="Auto-filled after upload; can also be set manually."
      persistent-hint></v-text-field>

    <v-divider class="my-4" />

    <!-- Problem solving -->
    <h3 class="section-title">🧠 Problem Solving</h3>
    <v-switch v-model="profile.problemSolving.enabled" color="primary" inset label="Show Problem Solving section"
      hide-details></v-switch>
    <v-textarea v-model="profile.problemSolving.description" :counter="400" title="Description" class="mb-4"
      label="Description" variant="outlined" hide-details="auto" rows="3" auto-grow></v-textarea>
    <v-text-field v-model="profile.problemSolving.repoUrl" type="url"
      :rules="profile.problemSolving.repoUrl?.length ? websiteRules() : []" title="Repository URL" class="mb-4"
      label="Repository URL" variant="outlined" hide-details="auto"></v-text-field>

    <v-divider class="my-4" />

    <div class="form-actions mb-4">
      <v-btn @click="saveProfile" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
        title="Save Profile" color="primary" variant="tonal">Save Profile</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { apiFetch } from '../../utils/api';
import { useAPILoading, useSettingsStore, defaultProfile } from '../../store';
import { ProfileType } from '../../types';
import { nameRules, longTextRules, websiteRules, deepClone } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';

// Placeholder used only until the store's profile is cloned in onMounted. The brand/socials/contact
// sections are owned by other forms — saveProfile writes back only the fields this form edits, so
// these empty values can never overwrite them.
// Starts from the store's factory so a new config key never breaks this form again.
const emptyProfile = (): ProfileType => defaultProfile();

export default {
  name: 'ProfileForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const validForm = ref(false);
    const uploading = ref(false);
    const resumeFile = ref<File | File[] | null>(null);
    const profile = ref<ProfileType>(emptyProfile());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().profile;
        if (current) profile.value = deepClone(current);
      }
    });

    const uploadResume = async (val: File | File[] | null) => {
      const file = Array.isArray(val) ? val[0] : val;
      if (!file) return;
      try {
        uploading.value = true;
        const fd = new FormData();
        fd.append('image', file);
        const res = await apiFetch(`/upload`, { method: 'POST', body: fd });
        const result = await res.json();
        if (res.ok) {
          profile.value.resumeUrl = result.url;
          success('Resume uploaded. Remember to press Save Profile.');
        } else {
          error(result.error || 'Upload failed.');
        }
      } catch (e: any) {
        error('Upload failed: ' + (e?.message || ''));
      } finally {
        uploading.value = false;
      }
    };

    const saveProfile = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Write back only the fields this form owns. brand/socials/contact belong to BrandForm and
        // SocialsForm, so they are carried through untouched from the latest store state.
        full.profile = {
          ...full.profile,
          fullName: profile.value.fullName,
          role: profile.value.role,
          bio: profile.value.bio,
          welcomeMessages: profile.value.welcomeMessages,
          resumeUrl: profile.value.resumeUrl,
          problemSolving: profile.value.problemSolving,
        };
        await settingsStore.saveSettings(full);
        success('Profile saved successfully');
      } catch (e) {
        error('Failed to save profile');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      profile,
      validForm,
      responseType,
      responseMessage,
      resumeFile,
      uploading,
      uploadResume,
      saveProfile,
      nameRules,
      longTextRules,
      websiteRules,
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

.section-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.875rem;
}

/* A welcome message is a full phrase, but v-chip is `white-space: nowrap; overflow: hidden` with
   no ellipsis, so on a phone every chip was cut off mid-word and the entries became impossible to
   tell apart. Letting the chip wrap and grow keeps the whole message readable. */
.welcome-combobox :deep(.v-chip) {
  height: auto;
  min-height: 32px;
  white-space: normal;
  padding-top: 4px;
  padding-bottom: 4px;
}

.welcome-combobox :deep(.v-chip__content) {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
