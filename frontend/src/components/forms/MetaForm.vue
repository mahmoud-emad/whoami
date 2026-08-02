<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading the site meta from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    What search engines and chat apps show when someone links to the site: the browser tab title, the
    snippet under it, and the preview card image.
  </v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <h3 class="section-title">🔖 Title and description</h3>

    <v-text-field v-model="meta.title" :rules="nameRules({ fieldName: 'Site title', maxLength: 70 })"
      label="Site title" variant="outlined" hide-details="auto" class="mb-4"
      hint="Fills the browser tab and is the headline in search results." persistent-hint></v-text-field>

    <v-textarea v-model="meta.description" :rules="longTextRules({ fieldName: 'Description', maxLength: 300 })"
      label="Description" variant="outlined" hide-details="auto" rows="3"
      auto-grow :counter="155" class="mb-6"
      hint="Around 155 characters is all a search result will show — anything past that gets cut off."
      persistent-hint></v-textarea>

    <v-divider class="my-4" />

    <h3 class="section-title">🔗 Addresses and images</h3>

    <v-text-field v-model="meta.siteUrl" :rules="urlRules({ fieldName: 'Site URL' })"
      label="Site URL" variant="outlined" hide-details="auto" class="mb-4"
      placeholder="https://example.com"
      hint="The canonical address. Relative image paths below are resolved against it." persistent-hint></v-text-field>

    <v-text-field v-model="meta.ogImage" :rules="imageUrlRules({ fieldName: 'Preview image' })"
      label="Preview image (og:image)" variant="outlined" hide-details="auto"
      class="mb-4" placeholder="/uploads/preview.png"
      hint="Shown on social and chat previews. A /uploads/… path from the Uploads tab works here."
      persistent-hint></v-text-field>

    <v-text-field v-model="meta.faviconUrl" :rules="imageUrlRules({ fieldName: 'Favicon URL' })"
      label="Favicon URL" variant="outlined" hide-details="auto" class="mb-6"
      placeholder="/favicon.ico" hint="The little tab icon. An /uploads/… path works here too."
      persistent-hint></v-text-field>

    <v-divider class="my-4" />

    <h3 class="section-title">🐦 Social attribution</h3>

    <v-text-field v-model="meta.twitterHandle" :rules="twitterHandleRules()"
      label="X / Twitter handle" variant="outlined" hide-details="auto"
      class="mb-6" placeholder="@you" hint="Credited on the X preview card. Leave empty to omit the tag."
      persistent-hint></v-text-field>

    <v-btn @click="save" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save the site meta" class="mb-4" color="primary" variant="tonal">Save site meta</v-btn>
  </v-form>

  <v-divider class="my-6" />

  <!-- Webring membership. Stored under the top-level `indieweb` key, so it saves on its own and
       leaves the meta slice above untouched. The footer renders the links; this is only the
       config for them. -->
  <h3 class="section-title">🔗 Webring</h3>

  <v-alert type="info" class="mb-4" variant="tonal">
    A webring is a loop of sites that link to each other. Turning this on puts
    <strong>← IndieWeb Webring →</strong> in the footer, so visitors can step to the next or
    previous site in the ring. Join the ring at
    <a href="https://xn--sr8hvo.ws/" target="_blank" rel="noopener">xn--sr8hvo.ws</a> first. The ring
    recognises the site from the address the visitor arrived from, so there is nothing else to enter.
  </v-alert>

  <v-alert v-if="webringMessage" :type="webringType" class="mb-4" variant="tonal">{{ webringMessage }}</v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <v-switch v-model="webring.enabled" color="primary" inset class="mb-2"
      label="Show the webring links in the footer" title="Show the webring links in the footer"
      hide-details></v-switch>

    <v-text-field v-model="webring.name" :rules="nameRules({ fieldName: 'Ring name', maxLength: 60 })"
      label="Ring name" variant="outlined" hide-details="auto" class="mb-4"
      placeholder="IndieWeb Webring" hint="Shown between the two arrows and used for the link titles."
      persistent-hint></v-text-field>

    <v-text-field v-model="webring.baseUrl" :rules="urlRules({ fieldName: 'Ring base URL' })"
      label="Ring base URL" variant="outlined" hide-details="auto" class="mb-6"
      placeholder="https://xn--sr8hvo.ws"
      hint="The arrows point at /previous and /next under this address. Leave it as it is unless you joined a different ring."
      persistent-hint></v-text-field>

    <v-btn @click="saveWebring" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save the webring settings" class="mb-4" color="primary" variant="tonal">Save webring</v-btn>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { deepClone, nameRules, longTextRules, urlRules, imageUrlRules, twitterHandleRules } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { SiteMeta } from '../../types';

const emptyMeta = (): SiteMeta => ({
  title: '',
  description: '',
  siteUrl: '',
  ogImage: '',
  faviconUrl: '',
  twitterHandle: '',
});

// Only the three fields this form edits. Saving merges them over whatever the stored webring
// object holds, so a key added to the config later survives a save from an older form.
type WebringForm = {
  enabled: boolean,
  name: string,
  baseUrl: string,
};

const emptyWebring = (): WebringForm => ({
  enabled: false,
  name: 'IndieWeb Webring',
  baseUrl: 'https://xn--sr8hvo.ws',
});

export default {
  name: 'MetaForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    // The webring section saves separately, so it gets its own alert rather than sharing the
    // meta one and reporting "saved" for a slice that was never written.
    const {
      responseType: webringType,
      responseMessage: webringMessage,
      success: webringSaved,
      error: webringFailed,
    } = useFormFeedback();
    const meta = ref<SiteMeta>(emptyMeta());
    const webring = ref<WebringForm>(emptyWebring());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const settings = settingsStore.getSettings();
        const current = settings.meta;
        // Spread over an empty meta so a config written before a field existed still edits cleanly.
        if (current) meta.value = { ...emptyMeta(), ...deepClone(current) };

        const ring = settings.indieweb && settings.indieweb.webring;
        // Pick the three fields out by hand rather than spreading: the stored object may carry
        // keys this form does not own, and they belong in the config, not in the form model.
        if (ring) {
          webring.value = {
            enabled: Boolean(ring.enabled),
            name: ring.name || emptyWebring().name,
            baseUrl: ring.baseUrl || emptyWebring().baseUrl,
          };
        }
      }
    });

    const save = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Top-level key: meta lives beside `profile`, not inside it. Writing only this slice keeps
        // the other forms' data intact.
        full.meta = meta.value;
        await settingsStore.saveSettings(full);
        success('Site meta saved');
      } catch (e) {
        error('Failed to save the site meta');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const saveWebring = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Top-level key, saved on its own. Merging over the stored webring keeps any key this
        // form does not edit, and leaves `meta` above exactly as the server has it.
        const stored = full.indieweb.webring;
        full.indieweb = { ...full.indieweb, webring: { ...stored, ...webring.value } };
        await settingsStore.saveSettings(full);
        webringSaved('Webring saved');
      } catch (e) {
        webringFailed('Failed to save the webring settings');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      meta,
      responseType,
      responseMessage,
      save,
      webring,
      webringType,
      webringMessage,
      saveWebring,
      nameRules,
      longTextRules,
      urlRules,
      imageUrlRules,
      twitterHandleRules,
    };
  },
};
</script>

