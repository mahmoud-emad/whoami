<template>
  <!--
    Hidden unless there is something to show: the section is switched on in settings, not hidden
    behind a hardcoded blurb and a link to someone else's repository.

    No `mt-3` and no `pa-2`: Home.vue owns the gap between sections, and the utility padding put
    this section's copy 8px to the right of its own heading.

    `|| isAdmin` keeps the block reachable for the owner once it has been switched off or emptied —
    a section that hides itself completely can never be turned back on from the page. The condition
    a visitor is judged by is unchanged.
  -->
  <div v-if="publiclyVisible || isAdmin" class="problem-solving">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>
    <p v-if="intro" class="section-intro">{{ intro }}</p>
    <p v-if="description" class="ps-copy" v-html="description"></p>
    <p v-if="repoUrl" class="ps-copy ps-copy--spaced">
      Would you like to challenge me? Open an issue on my
      <a class="body-link" :href="repoUrl" target="_blank" rel="noopener">
        problem-solving repository
      </a>.
    </p>

    <!-- Owner-only strip, appended after the copy so the signed-out layout is untouched. -->
    <OwnerBar >
      <InlineActions label="problem solving" :remove="false" @edit="openEditor" />
      <!-- The owner is looking at a block nobody else can see; say so rather than let it read as a
           rendering bug. -->
      <span v-if="!publiclyVisible" class="owner-bar__note">Hidden from visitors</span>
      <FeedbackNote v-if="!editorOpen && responseMessage" :message="responseMessage" :type="responseType" />
    </OwnerBar>

    <!-- Mounted only for the owner, so a visitor never loads the form at all. -->
    <EditorDialog v-if="isAdmin" v-model="editorOpen" title="Edit problem solving">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="validForm" :disabled="saving">
        <!-- The section entry (profile.sections.problemSolving) is edited here as well as in the
             dashboard, so the block can be retitled from the page it belongs to. -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
          <span class="editor-group">Section</span>
          <v-switch v-model="draft.section.show" color="primary" inset hide-details density="compact"
            :label="draft.section.show ? 'Visible' : 'Hidden'"></v-switch>
        </div>
        <!-- Home.vue drops a hidden section from the page entirely, this editor included, so this
             switch is not undoable from here — unlike the feature flag below, which is. -->
        <p v-if="!draft.section.show" class="editor-warning mb-2">
          Hidden removes the whole block from the page — including this editor. Bring it back from
          Sections in the dashboard, or use the switch below to empty it while keeping it editable.
        </p>
        <v-row class="ma-0">
          <v-col cols="12" sm="3" class="pa-1">
            <v-text-field v-model="draft.section.emoji" :rules="emojiRules()" title="Section Emoji" label="Emoji"
              placeholder="🧠" variant="outlined" hide-details="auto" density="comfortable"></v-text-field>
          </v-col>
          <v-col cols="12" sm="9" class="pa-1">
            <v-text-field v-model="draft.section.title" :rules="nameRules({ fieldName: 'Heading', maxLength: 80 })"
              title="Section Heading" label="Heading" variant="outlined"
              hide-details="auto" density="comfortable"></v-text-field>
          </v-col>
          <v-col cols="12" class="pa-1">
            <v-textarea v-model="draft.section.intro" :rules="longTextRules({ fieldName: 'Intro paragraph', maxLength: 600 })"
              title="Section Intro" label="Intro paragraph" variant="outlined"
              hide-details="auto" density="comfortable" rows="2" auto-grow></v-textarea>
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <!-- Two switches gate this block: the section's own `show` above, and this feature flag.
             Both are here so the owner is never left hunting for the one that is off. -->
        <v-switch v-model="draft.enabled" color="primary" inset label="Show Problem Solving section"
          hide-details></v-switch>
        <v-textarea v-model="draft.description" :rules="longTextRules({ fieldName: 'Description', maxLength: 400 })"
          :counter="400" title="Description" label="Description"
          variant="outlined" hide-details="auto" rows="3" auto-grow hint="Basic HTML is allowed." persistent-hint
          class="mb-4 mt-2"></v-textarea>
        <!-- Rules only bite once something has been typed, so an empty URL is still savable. -->
        <v-text-field v-model="draft.repoUrl" type="url" :rules="urlRules({ fieldName: 'Repository URL' })"
          title="Repository URL" label="Repository URL" variant="outlined" hide-details="auto"
          hint="Leave empty to hide the closing “open an issue” line." persistent-hint class="mb-4"></v-text-field>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
          class="text-capitalize" @click="save">Save changes</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import OwnerBar from '../../components/admin/OwnerBar.vue';
import FeedbackNote from '../../components/admin/FeedbackNote.vue';
import { useSettingsStore } from '../../store';
import EditorDialog from '../admin/EditorDialog.vue';
import InlineActions from '../admin/InlineActions.vue';
import { useAdmin } from '../../composables/useAdmin';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { SectionConfig } from '../../types';
import { deepClone, emojiRules, longTextRules, nameRules, sectionHeading, urlRules, websiteRules } from '../../utils';

/** This section's own slice of the profile — exactly the keys `save` writes back, and no others. */
type ProblemSolvingDraft = {
  enabled: boolean;
  description: string;
  repoUrl: string;
  section: SectionConfig;
};

const emptyDraft = (): ProblemSolvingDraft => ({
  enabled: true,
  description: '',
  repoUrl: '',
  // `order` drives Home.vue's section sequence; the stored value replaces this default on open, so
  // editing this block never reshuffles the page.
  section: { title: '', emoji: '', intro: '', show: true, order: 5 },
});

export default defineComponent({
  name: 'ProblemSolvingSection',
  components: { OwnerBar, FeedbackNote, EditorDialog, InlineActions },
  setup() {
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    const section = computed(() => settingsStore.profile?.sections?.problemSolving);
    const ps = computed(() => settingsStore.profile?.problemSolving);

    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');
    const description = computed(() => ps.value?.description?.trim() || '');
    const repoUrl = computed(() => ps.value?.repoUrl?.trim() || '');

    // Two switches have to agree — the feature flag and the section's own `show` — and there has to
    // be some content. A heading over an empty block reads as a broken page.
    const publiclyVisible = computed(() =>
      ps.value?.enabled !== false &&
      section.value?.show !== false &&
      Boolean(intro.value || description.value || repoUrl.value)
    );

    // In-place editing state.
    const editorOpen = ref(false);
    const draft = ref<ProblemSolvingDraft>(emptyDraft());
    const validForm = ref(false);
    const saving = ref(false);

    const openEditor = () => {
      clear();
      const profile = settingsStore.profile;
      // Cloned, so typing in the dialog does not rewrite the section behind it before anything is
      // saved — and so Cancel really cancels.
      const stored = deepClone(profile?.problemSolving || {}) as Partial<ProblemSolvingDraft>;
      draft.value = {
        ...emptyDraft(),
        // `enabled` defaults to true only when it has never been set; an explicit false must survive
        // a round trip through the dialog.
        enabled: stored.enabled !== false,
        description: stored.description || '',
        repoUrl: stored.repoUrl || '',
        section: {
          ...emptyDraft().section,
          ...(deepClone(profile?.sections?.problemSolving || {}) as Partial<SectionConfig>),
        },
      };
      editorOpen.value = true;
    };

    const save = async () => {
      try {
        saving.value = true;
        const full = settingsStore.getSettings();
        // Only the keys this dialog owns are written back. The rest of the profile and every other
        // `sections` entry are carried through from current store state, so saving this block can
        // never clobber another form's or another section's data.
        full.profile = {
          ...full.profile,
          problemSolving: {
            ...full.profile.problemSolving,
            enabled: draft.value.enabled,
            description: draft.value.description,
            repoUrl: draft.value.repoUrl,
          },
          sections: {
            ...full.profile.sections,
            problemSolving: { ...full.profile.sections?.problemSolving, ...draft.value.section },
          },
        };
        await settingsStore.saveSettings(full);
        editorOpen.value = false;
        success('Problem solving saved.');
      } catch (e: any) {
        error(e?.message || 'Failed to save the section.');
      } finally {
        saving.value = false;
      }
    };

    return {
      publiclyVisible,
      heading,
      sectionTitle,
      intro,
      description,
      repoUrl,
      isAdmin,
      editorOpen,
      draft,
      validForm,
      saving,
      responseType,
      responseMessage,
      openEditor,
      save,
      websiteRules,

      emojiRules,

      nameRules,

      longTextRules,

      urlRules,

    };
  },
});
</script>

<style scoped>
.problem-solving {
  /* `description` is admin-authored HTML and can hold a long URL; this is what stops it widening
     the page on a phone. */
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Same measure and colour as .section-intro, so the intro, the description and the closing line
   read as one block of prose rather than three differently-styled paragraphs. */
.ps-copy {
  line-height: 1.7;
  color: rgb(var(--v-theme-gray-color));
}

.ps-copy--spaced {
  margin-top: 1rem !important;
}


.owner-bar__note {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-gray-color));
}


.editor-group {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
}

.editor-warning {
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgb(var(--v-theme-warning));
}
</style>
