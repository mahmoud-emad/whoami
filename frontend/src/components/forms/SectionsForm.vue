<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading the home-page sections from the server</p>
  </v-alert>

  <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />

  <v-alert type="info" class="mb-4" variant="tonal">
    These are the blocks that make up the home page. <strong>Order</strong> controls the sequence they appear
    in — lowest number first — and a <strong>hidden</strong> section renders nothing at all, not even its heading.
    The cards below are sorted by their current order so you can see the page shape at a glance.
  </v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <v-card v-for="entry in orderedSections" :key="entry.key" variant="outlined" class="mb-4 pa-3">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <span class="section-key">{{ labels[entry.key] }}</span>
        <v-switch v-model="entry.section.show" color="primary" inset hide-details density="compact"
          :label="entry.section.show ? 'Visible' : 'Hidden'"></v-switch>
      </div>

      <v-row class="ma-0">
        <v-col cols="12" sm="3" class="pa-1">
          <v-text-field v-model="entry.section.emoji" :rules="emojiRules()" label="Emoji" variant="outlined"
            hide-details="auto" density="comfortable" placeholder="🎨"></v-text-field>
        </v-col>
        <v-col cols="12" sm="6" class="pa-1">
          <v-text-field v-model="entry.section.title" :rules="nameRules({ fieldName: 'Heading', maxLength: 80 })"
            label="Heading" variant="outlined" hide-details="auto"
            density="comfortable"></v-text-field>
        </v-col>
        <v-col cols="12" sm="3" class="pa-1">
          <!-- Bound through a number-safe handler: a raw v-model on type=number yields '' for an empty box. -->
          <v-text-field :model-value="entry.section.order" @update:model-value="setOrder(entry.section, $event)"
            :rules="integerRules({ fieldName: 'Order', min: 1, max: 99 })"
            label="Order" type="number" inputmode="numeric" min="1" variant="outlined" hide-details="auto"
            density="comfortable"></v-text-field>
        </v-col>
        <v-col cols="12" class="pa-1">
          <v-textarea v-model="entry.section.intro" :rules="longTextRules({ fieldName: 'Intro paragraph', maxLength: 600 })"
            label="Intro paragraph" variant="outlined" hide-details="auto"
            density="comfortable" rows="2" auto-grow></v-textarea>
        </v-col>
      </v-row>
    </v-card>

    <v-divider class="my-4" />

    <v-btn @click="save" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save the home-page sections" class="mb-4" color="primary" variant="tonal">Save sections</v-btn>
  </v-form>
</template>

<script lang="ts">
import { computed, onMounted, ref } from 'vue';
import FeedbackNote from '../../components/admin/FeedbackNote.vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { deepClone, nameRules, longTextRules, emojiRules, integerRules } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { SectionConfig, SectionsConfig } from '../../types';

type SectionKey = keyof SectionsConfig;

/** Fixed key list — the schema is a record, not an array, so the UI owns the enumeration. */
const SECTION_KEYS: SectionKey[] = [
  'intro',
  'experience',
  'projects',
  'openSource',
  'problemSolving',
  'articles',
];

const LABELS: Record<SectionKey, string> = {
  intro: 'Intro',
  experience: 'Experience',
  projects: 'Projects',
  openSource: 'Open Source',
  problemSolving: 'Problem Solving',
  articles: 'Articles',
};

const emptySection = (order: number): SectionConfig => ({
  title: '',
  emoji: '',
  intro: '',
  show: true,
  order,
});

const emptySections = (): SectionsConfig =>
  SECTION_KEYS.reduce((acc, key, i) => {
    acc[key] = emptySection(i + 1);
    return acc;
  }, {} as SectionsConfig);

export default {
  name: 'SectionsForm',
  components: { FeedbackNote },
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const sections = ref<SectionsConfig>(emptySections());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().profile?.sections;
        if (current) {
          const base = emptySections();
          const loaded = deepClone(current) as Partial<SectionsConfig>;
          // Per-key merge: a config missing a section key still gets an editable row.
          SECTION_KEYS.forEach((key, i) => {
            base[key] = { ...emptySection(i + 1), ...(loaded[key] || {}) };
          });
          sections.value = base;
        }
      }
    });

    /**
     * Rows sorted by order so the form mirrors the rendered page. The objects are the same
     * references held by `sections`, so editing a sorted row edits the real model.
     */
    const orderedSections = computed(() =>
      SECTION_KEYS.map((key) => ({ key, section: sections.value[key] })).sort(
        (a, b) => (a.section.order ?? 0) - (b.section.order ?? 0),
      ),
    );

    /** Keep `order` numeric: v-text-field hands back strings, and '' would sort as NaN. */
    const setOrder = (section: SectionConfig, value: string | number) => {
      const parsed = Number(value);
      section.order = Number.isFinite(parsed) ? parsed : 0;
    };

    const save = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Only this form's slice is written back, so it cannot clobber the other profile sections.
        full.profile = { ...full.profile, sections: sections.value };
        await settingsStore.saveSettings(full);
        success('Sections saved');
      } catch (e) {
        error('Failed to save the sections');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      sections,
      orderedSections,
      labels: LABELS,
      responseType,
      responseMessage,
      setOrder,
      save,
      nameRules,
      longTextRules,
      emojiRules,
      integerRules,
    };
  },
};
</script>

<style scoped>
.section-key {
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
}
</style>
