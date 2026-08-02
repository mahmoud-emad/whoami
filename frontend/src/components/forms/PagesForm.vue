<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading the page copy from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    The heading and the paragraph under it for each standalone page. Leave the intro empty and the page
    simply shows its heading — nothing renders an empty paragraph.
  </v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <v-card v-for="group in groups" :key="group.key" variant="outlined" class="mb-4 pa-3">
      <h3 class="section-title">{{ group.label }}</h3>
      <p class="section-hint mb-3">{{ group.hint }}</p>

      <v-row class="ma-0">
        <v-col cols="12" class="pa-1">
          <v-text-field v-model="pages[group.key].title" :rules="nameRules({ fieldName: 'Heading', maxLength: 80 })"
            label="Heading" variant="outlined" hide-details="auto"
            density="comfortable"></v-text-field>
        </v-col>
        <v-col cols="12" class="pa-1">
          <v-textarea v-model="pages[group.key].intro" :rules="longTextRules({ fieldName: 'Intro paragraph', maxLength: 600 })"
            label="Intro paragraph" variant="outlined" hide-details="auto"
            density="comfortable" rows="2" auto-grow></v-textarea>
        </v-col>
      </v-row>
    </v-card>

    <v-divider class="my-4" />

    <v-btn @click="save" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save the page copy" class="mb-4" color="primary" variant="tonal">Save page copy</v-btn>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { deepClone, nameRules, longTextRules } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { PageCopy, PagesConfig } from '../../types';

type PageKey = keyof PagesConfig;

/** The schema is a record, so the UI owns the enumeration and the human labels. */
const GROUPS: { key: PageKey, label: string, hint: string }[] = [
  { key: 'contact', label: '📞 Contact', hint: 'Top of the Contact page, above the channels.' },
  { key: 'projects', label: '🎨 Projects', hint: 'Top of the Projects listing.' },
  { key: 'blog', label: '✍️ Blog', hint: 'Top of the blog index.' },
  { key: 'guestbook', label: '🧁 Guestbook', hint: 'Top of the guestbook page.' },
  {
    key: 'guestbookNotice',
    label: '📌 Guestbook notice',
    hint: 'The house-rules note shown beside the guestbook form. Leave both fields empty to drop it.',
  },
  { key: 'search', label: '🔍 Search', hint: 'Top of the search results page.' },
  { key: 'notFound', label: '🚧 Not found (404)', hint: 'Shown when a visitor hits a URL that does not exist.' },
];

const emptyPage = (): PageCopy => ({ title: '', intro: '' });

const emptyPages = (): PagesConfig =>
  GROUPS.reduce((acc, g) => {
    acc[g.key] = emptyPage();
    return acc;
  }, {} as PagesConfig);

export default {
  name: 'PagesForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const pages = ref<PagesConfig>(emptyPages());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().profile?.pages;
        if (current) {
          const base = emptyPages();
          const loaded = deepClone(current) as Partial<PagesConfig>;
          // Per-key merge so a config written before a page key existed still renders an editable card.
          GROUPS.forEach((g) => {
            base[g.key] = { ...emptyPage(), ...(loaded[g.key] || {}) };
          });
          pages.value = base;
        }
      }
    });

    const save = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Only this form's slice is written back, so it cannot clobber the other profile sections.
        full.profile = { ...full.profile, pages: pages.value };
        await settingsStore.saveSettings(full);
        success('Page copy saved');
      } catch (e) {
        error('Failed to save the page copy');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore, pages, groups: GROUPS, responseType, responseMessage, save,
      nameRules, longTextRules,
    };
  },
};
</script>

<style scoped>

.section-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.875rem;
}
</style>
