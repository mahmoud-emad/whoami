<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading branding from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    Controls the navbar identity, the footer line, and which navigation links are visible. Empty fields fall back to
    sensible defaults.
  </v-alert>

  <v-form v-model="validForm" :disabled="apiLoadingStore.isLoading()">

    <!-- Identity -->
    <h3 class="section-title">🪪 Identity</h3>
    <!-- The parenthetical examples used to live in the labels. A field is only ~290px wide at
         390px, so every one of them was ellipsised down to a useless stub.
         Moving the example to a placeholder or hint keeps it visible and the label intact. -->
    <v-text-field v-model="brand.displayName" :rules="nameRules({ fieldName: 'Display name', maxLength: 60 })"
      title="Display name in navbar" class="mb-4" label="Display name"
      placeholder="Ada Lovelace" variant="outlined" hide-details="auto"></v-text-field>
    <v-text-field v-model="brand.handle" :rules="handleRules({ fieldName: 'Handle' })"
      title="Public handle shown under the name" class="mb-4" label="Handle"
      placeholder="@ada" variant="outlined" hide-details="auto"></v-text-field>
    <v-text-field v-model="brand.handleUrl" type="url" :rules="urlRules({ fieldName: 'Handle URL' })"
      title="Where the handle links to" class="mb-4" label="Handle URL" variant="outlined" hide-details="auto"
      hint="Where the handle links to — usually your GitHub profile." persistent-hint></v-text-field>

    <v-divider class="my-4" />

    <!-- Logo -->
    <h3 class="section-title">🖼️ Logo</h3>
    <v-file-input v-model="logoFile" :rules="fileRules({ fieldName: 'Logo' })" :loading="uploading"
      :disabled="uploading" label="Upload logo (PNG / JPEG / GIF)"
      title="Upload logo" variant="outlined" hide-details="auto" show-size prepend-icon="" append-icon="mdi-upload"
      @update:model-value="uploadLogo" class="mb-4"></v-file-input>
    <v-text-field v-model="brand.logoUrl" :rules="imageUrlRules({ fieldName: 'Logo URL' })" title="Logo URL"
      label="Logo URL" variant="outlined" hide-details="auto"
      class="mb-4" hint="Auto-filled after upload; can also be set manually." persistent-hint></v-text-field>

    <v-divider class="my-4" />

    <!-- Footer -->
    <h3 class="section-title">📎 Footer</h3>
    <v-text-field v-model="brand.copyrightOwner" :rules="nameRules({ fieldName: 'Copyright owner', maxLength: 80 })"
      title="Footer copyright owner" class="mb-4" label="Copyright owner"
      placeholder="Ada Lovelace" variant="outlined" hide-details="auto"></v-text-field>
    <v-text-field v-model.number="brand.copyrightYear" type="number" :rules="yearRules({ fieldName: 'Copyright year' })"
      title="Footer copyright year" class="mb-4"
      label="Copyright year" variant="outlined" hide-details="auto"></v-text-field>

    <v-divider class="my-4" />

    <!-- Navigation -->
    <h3 class="section-title">🧭 Navigation</h3>
    <p class="section-hint mb-3">
      Customise the label and visibility of each top-bar link. The route path is fixed because it has to match the
      app's router.
    </p>
    <v-card v-for="(item, index) in brand.navItems" :key="item.link" class="nav-item-card mb-3 pa-3">
      <!-- flex-wrap so the route chip and the visibility toggle drop onto separate lines instead of
           overflowing the card on a narrow screen. -->
      <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-2">
        <code class="route-code">{{ item.link }}</code>
        <v-switch v-model="item.show" color="primary" inset hide-details density="compact"
          :label="item.show ? 'Visible' : 'Hidden'" />
      </div>
      <!-- The route is already printed above, so the labels no longer repeat it; interpolating it
           made them long enough to be ellipsised in a phone-width field. -->
      <v-text-field v-model="item.name" :rules="nameRules({ fieldName: 'Label', maxLength: 40, required: true })"
        label="Label" :title="`Label for ${item.link}`" variant="outlined"
        hide-details="auto" density="compact" class="mb-2"></v-text-field>
      <v-text-field v-model="item.title" :rules="nameRules({ fieldName: 'Hover tooltip', maxLength: 120 })"
        label="Hover tooltip" :title="`Hover tooltip for ${item.link}`"
        variant="outlined" hide-details="auto" density="compact"></v-text-field>
      <input type="hidden" :value="index" />
    </v-card>

    <v-divider class="my-4" />

    <div class="form-actions mb-4">
      <v-btn @click="saveBrand" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
        title="Save Branding" color="primary" variant="tonal">Save Branding</v-btn>
    </div>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { apiFetch } from '../../utils/api';
import { useAPILoading, useSettingsStore } from '../../store';
import { BrandType } from '../../types';
import { deepClone, fileRules, handleRules, imageUrlRules, nameRules, urlRules, yearRules } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';

const emptyBrand = (): BrandType => ({
  displayName: '',
  handle: '',
  handleUrl: '',
  logoUrl: '',
  copyrightOwner: '',
  copyrightYear: new Date().getFullYear(),
  navItems: [],
});

export default {
  name: 'BrandForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const validForm = ref(false);
    const uploading = ref(false);
    const logoFile = ref<File | File[] | null>(null);
    const brand = ref<BrandType>(emptyBrand());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().profile?.brand;
        if (current) brand.value = deepClone(current);
      }
    });

    const uploadLogo = async (val: File | File[] | null) => {
      const file = Array.isArray(val) ? val[0] : val;
      if (!file) return;
      try {
        uploading.value = true;
        const fd = new FormData();
        fd.append('image', file);
        const res = await apiFetch(`/upload`, { method: 'POST', body: fd });
        const result = await res.json();
        if (res.ok) {
          brand.value.logoUrl = result.url;
          success('Logo uploaded. Remember to press Save Branding.');
        } else {
          error(result.error || 'Upload failed.');
        }
      } catch (e: any) {
        error('Upload failed: ' + (e?.message || ''));
      } finally {
        uploading.value = false;
      }
    };

    const saveBrand = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        full.profile = { ...full.profile, brand: brand.value };
        await settingsStore.saveSettings(full);
        success('Branding saved successfully');
      } catch (e) {
        error('Failed to save branding');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      brand,
      validForm,
      responseType,
      responseMessage,
      uploading,
      logoFile,
      uploadLogo,
      saveBrand,
      urlRules,
      nameRules,
      handleRules,
      imageUrlRules,
      yearRules,

      fileRules,

    };
  },
};
</script>

<style scoped>

.section-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.875rem;
}

.nav-item-card {
  background: rgb(var(--v-theme-box-bg-color)) !important;
  border: 1px solid rgb(var(--v-theme-border-color)) !important;
  border-radius: 6px !important;
}

/* min-width:0 lets this flex child shrink below the width of the route string; without it a long
   route would push the switch off the edge of the card instead of wrapping. */
.route-code {
  background: rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-text-color));
  padding: 2px 8px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
}
</style>
