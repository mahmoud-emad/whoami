<template>
  <!--
    The intro states a claim instead of performing a greeting. Every line of it comes from settings;
    an unconfigured install renders an empty intro rather than someone else's introduction.
  -->
  <!-- No `pa-2`: Vuetify's spacing utilities are !important, so that class was silently overriding
       the block's own padding and collapsing the intro's breathing room to 8px. -->
  <!-- `|| isAdmin` keeps the block mounted for the owner when the section is switched off or still
       empty — otherwise a fresh install offers nowhere to fill the intro in from. For a visitor the
       condition is exactly the `show` it always was. -->
  <div v-if="show || isAdmin" class="intro">
    <p v-if="role" class="intro__eyebrow">{{ role }}</p>
    <h1 v-if="claim" class="intro__claim">{{ claim }}</h1>
    <p v-if="bio" class="intro__bio">{{ bio }}</p>

    <div class="intro__actions">
      <a v-if="resumeHref" :href="resumeHref" target="_blank" rel="noopener" class="intro__cta">
        <v-icon size="16">mdi-file-document-outline</v-icon>
        Read the CV
      </a>
      <router-link to="/contact" class="intro__cta intro__cta--quiet">Get in touch</router-link>
    </div>

    <!-- Owner-only strip, below the calls to action so the visitor layout above it is untouched. -->
    <OwnerBar >
      <InlineActions label="intro" :remove="false" @edit="openEditor" />
      <!-- The owner is looking at a block nobody else can see; say so rather than let it read as a
           rendering bug. -->
      <span v-if="!show" class="owner-bar__note">Hidden from visitors</span>
      <FeedbackNote v-if="!editorOpen && responseMessage" :message="responseMessage" :type="responseType" />
    </OwnerBar>

    <!-- Mounted only for the owner, so a visitor never loads the form at all. -->
    <EditorDialog v-if="isAdmin" v-model="editorOpen" title="Edit intro">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="validForm" :disabled="saving">
        <!-- The section entry (profile.sections.intro) is edited here as well as in the dashboard,
             so the intro can be retitled or hidden from the page it actually belongs to. -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
          <span class="editor-group">Section</span>
          <v-switch v-model="draft.section.show" color="primary" inset hide-details density="compact"
            :label="draft.section.show ? 'Visible' : 'Hidden'"></v-switch>
        </div>
        <!-- Home.vue drops a hidden section from the page entirely, this editor included, so hiding
             the intro is not undoable from here. Say so before it is switched off, not after. -->
        <p v-if="!draft.section.show" class="editor-warning mb-2">
          Hidden removes the whole intro from the page — including this editor. Bring it back from
          Sections in the dashboard.
        </p>
        <v-row class="ma-0">
          <v-col cols="12" sm="3" class="pa-1">
            <v-text-field v-model="draft.section.emoji" :rules="emojiRules()" title="Section Emoji" label="Emoji"
              placeholder="❄️" variant="outlined" hide-details="auto" density="comfortable"></v-text-field>
          </v-col>
          <v-col cols="12" sm="9" class="pa-1">
            <!-- The intro has no <h2> of its own: emoji + heading stand in as the headline whenever
                 no claim line is set, which is why this is worth filling in. -->
            <v-text-field v-model="draft.section.title" :rules="nameRules({ fieldName: 'Heading', maxLength: 80 })"
              title="Section Heading" label="Heading" variant="outlined"
              hide-details="auto" density="comfortable"
              hint="Used as the headline when no claim line is set." persistent-hint></v-text-field>
          </v-col>
          <v-col cols="12" class="pa-1">
            <!-- There is no separate intro paragraph either: the bio fills that slot, and this
                 is what shows when the bio is empty. -->
            <v-textarea v-model="draft.section.intro" :rules="longTextRules({ fieldName: 'Intro paragraph', maxLength: 600 })"
              title="Section Intro" label="Intro paragraph" variant="outlined"
              hide-details="auto" density="comfortable" rows="2" auto-grow
              hint="Shown in place of the bio when the bio is empty." persistent-hint></v-textarea>
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <!-- Example in the placeholder, not the label: at 390px a label with an example in it is
             ellipsised away. Same treatment as the dashboard's profile form. -->
        <v-text-field v-model="draft.role" :rules="nameRules({ fieldName: 'Role', maxLength: 80 })" title="Role"
          label="Role" placeholder="Software Engineer" variant="outlined"
          hide-details="auto" class="mb-4"></v-text-field>
        <!-- An array, not a line: whatever is listed here rotates in the headline, and the section
             only cycles once there is more than one. -->
        <v-combobox v-model="draft.welcomeMessages" :rules="stringListRules({ fieldName: 'Claim lines', max: 12, maxItemLength: 120 })"
          title="Claim Lines" label="Claim lines" variant="outlined"
          hide-details="auto" multiple chips closable-chips
          hint="The headline. Type a line and press enter; more than one rotates every 3 seconds."
          persistent-hint class="mb-4 welcome-combobox"></v-combobox>
        <!-- Rules only bite once something has been typed, so an empty intro is still savable. -->
        <v-textarea v-model="draft.bio" :rules="longTextRules({
          fieldName: 'Bio',
          maxLength: 600,
          minLength: 10,
        })" :counter="600" title="Bio" label="Bio" variant="outlined" hide-details="auto" rows="4" auto-grow
          class="mb-4"></v-textarea>
        <!--
          Upload sits above the URL field and fills it in, the same pairing the logo uses. The URL
          stays editable because a CV hosted elsewhere is a perfectly good answer; uploading is
          just the path that does not require having somewhere to host it.
        -->
        <v-file-input v-model="resumeFile" :rules="fileRules({ fieldName: 'Resume', accept: RESUME_TYPES })"
          :loading="uploadingResume" :disabled="uploadingResume" label="Upload a resume (PDF)"
          title="Upload a resume" variant="outlined" hide-details="auto" show-size prepend-icon=""
          append-icon="mdi-upload" accept="application/pdf" @update:model-value="uploadResume"
          class="mb-4"></v-file-input>
        <v-text-field v-model="draft.resumeUrl" type="url"
          :rules="urlRules({ fieldName: 'Resume URL', allowRelative: true })" title="Resume URL"
          label="Resume URL"
          variant="outlined" hide-details="auto"
          hint="Filled in by the upload above, or paste a link. Empty hides the “Read the CV” button."
          persistent-hint class="mb-4"></v-text-field>
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
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';
import OwnerBar from '../../components/admin/OwnerBar.vue';
import FeedbackNote from '../../components/admin/FeedbackNote.vue';
import { useSettingsStore } from '../../store';
import EditorDialog from '../admin/EditorDialog.vue';
import InlineActions from '../admin/InlineActions.vue';
import { useAdmin } from '../../composables/useAdmin';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { SectionConfig } from '../../types';
import { deepClone, emojiRules, fileRules, longTextRules, nameRules, sectionHeading, stringListRules, urlRules, websiteRules } from '../../utils';
import { apiFetch } from '../../utils/api';

const ROTATE_MS = 3000;

/** The intro's own slice of the profile — exactly the keys `save` writes back, and no others. */
type IntroDraft = {
  role: string;
  bio: string;
  welcomeMessages: string[];
  resumeUrl: string;
  section: SectionConfig;
};

const emptyDraft = (): IntroDraft => ({
  role: '',
  bio: '',
  welcomeMessages: [],
  resumeUrl: '',
  // `order` drives Home.vue's section sequence; the stored value replaces this default on open, so
  // editing the intro never reshuffles the page.
  section: { title: '', emoji: '', intro: '', show: true, order: 1 },
});

/** The upload endpoint takes images and PDFs; a resume is only ever the latter. */
const RESUME_TYPES = ['application/pdf'];

export default defineComponent({
  name: 'IntroSection',
  components: { OwnerBar, FeedbackNote, EditorDialog, InlineActions },
  setup() {
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    const section = computed(() => settingsStore.profile?.sections?.intro);
    const show = computed(() => section.value?.show !== false);

    const welcomeMessages = computed<string[]>(() =>
      (settingsStore.profile?.welcomeMessages || []).filter((m) => m && m.trim().length > 0)
    );

    // The intro has no separate <h2>: its headline *is* the section heading. So when no welcome
    // message is configured, the section's own emoji + title stand in — still config, never a name.
    const configuredHeading = computed<string>(() => sectionHeading(section.value));

    // Likewise the bio doubles as the section intro paragraph; either source is fine, neither
    // invents copy when both are empty.
    const bio = computed<string>(() =>
      settingsStore.profile?.bio?.trim() || section.value?.intro?.trim() || ''
    );

    const role = computed<string>(() => settingsStore.profile?.role?.trim() || '');
    const resumeUrl = computed<string>(() => settingsStore.profile?.resumeUrl?.trim() || '');

    /**
     * Where the CV button actually points.
     *
     * `resumeUrl` is storage: the upload endpoint names files `<timestamp>-<random>.pdf` so two
     * uploads cannot collide. That is the wrong thing to hand a reader — it is unreadable, and it
     * changes every time the document is replaced, so anyone who copied it is left holding a link
     * to an old resume. The server publishes /cv.pdf as a stable alias that resolves this same
     * setting, so a locally uploaded resume is offered under that name instead.
     *
     * A resume hosted elsewhere keeps its own URL: the alias would only add a redirect through
     * this server on the way to the same file.
     */
    const resumeHref = computed<string>(() => {
      const url = resumeUrl.value;
      if (!url) return '';
      return /^https?:\/\//i.test(url) ? url : '/cv.pdf';
    });


    const messageIndex = ref(0);

    const pickMessage = () => {
      const pool = welcomeMessages.value;
      if (!pool.length) return;
      messageIndex.value = Math.floor(Math.random() * pool.length);
    };

    const claim = computed<string>(() => welcomeMessages.value[messageIndex.value] || configuredHeading.value);

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stopRotation = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    /**
     * Only cycle if more than one line is configured. A headline that rewrites itself every three
     * seconds is a distraction when there is nothing to cycle through.
     *
     * Re-evaluated rather than decided once at mount: settings arrive asynchronously, and the owner
     * can now add or remove lines without a reload, so the pool this depends on changes after mount.
     */
    const syncRotation = () => {
      stopRotation();
      if (welcomeMessages.value.length > 1) {
        intervalId = setInterval(pickMessage, ROTATE_MS);
      }
    };

    watch(welcomeMessages, () => {
      // The old index can point past the end of a shortened list, which would blank the headline.
      messageIndex.value = 0;
      syncRotation();
    });

    onMounted(syncRotation);
    onUnmounted(stopRotation);

    // In-place editing state.
    const editorOpen = ref(false);
    const draft = ref<IntroDraft>(emptyDraft());

    // Upload state for the editor's file input.
    const resumeFile = ref<File | File[] | null>(null);
    const uploadingResume = ref(false);

    /**
     * Send the picked PDF to /upload and put the returned path in the URL field.
     *
     * It does not save on its own: the dialog's Save is still what writes the profile, so picking
     * a file and then cancelling leaves the site exactly as it was. The upload itself is not undone
     * by cancelling, but an orphaned file in the uploads list is cheap and removable, whereas
     * silently rewriting the live CV link would not be.
     */
    const uploadResume = async (val: File | File[] | null) => {
      const file = Array.isArray(val) ? val[0] : val;
      if (!file) return;
      try {
        uploadingResume.value = true;
        const fd = new FormData();
        // The field is named `image` because that is what the endpoint's multer instance expects;
        // it accepts PDFs too.
        fd.append('image', file);
        const res = await apiFetch('/upload', { method: 'POST', body: fd });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.url) throw new Error(result.error || 'Upload failed.');
        draft.value.resumeUrl = result.url;
        success('Resume uploaded. Press Save to publish it.');
      } catch (e: any) {
        error(e?.message || 'Upload failed.');
      } finally {
        uploadingResume.value = false;
        resumeFile.value = null;
      }
    };
    const validForm = ref(false);
    const saving = ref(false);

    const openEditor = () => {
      clear();
      const profile = settingsStore.profile;
      // Cloned, so typing in the dialog does not rewrite the intro behind it before anything is
      // saved — and so Cancel really cancels.
      draft.value = {
        ...emptyDraft(),
        role: profile?.role || '',
        bio: profile?.bio || '',
        welcomeMessages: deepClone(profile?.welcomeMessages || []),
        resumeUrl: profile?.resumeUrl || '',
        section: {
          ...emptyDraft().section,
          ...(deepClone(profile?.sections?.intro || {}) as Partial<SectionConfig>),
        },
      };
      editorOpen.value = true;
    };

    const save = async () => {
      try {
        saving.value = true;
        const full = settingsStore.getSettings();
        // Only the keys this dialog owns are written back. brand/socials/contact/more/experience and
        // every other `sections` entry are carried through from current store state, so saving the
        // intro can never clobber another form's or another section's data.
        full.profile = {
          ...full.profile,
          role: draft.value.role,
          bio: draft.value.bio,
          // Blank chips are dropped on the way in, so what is stored is what rotates.
          welcomeMessages: draft.value.welcomeMessages
            .map((message) => (message || '').trim())
            .filter(Boolean),
          resumeUrl: draft.value.resumeUrl,
          sections: {
            ...full.profile.sections,
            intro: { ...full.profile.sections?.intro, ...draft.value.section },
          },
        };
        await settingsStore.saveSettings(full);
        editorOpen.value = false;
        success('Intro saved.');
      } catch (e: any) {
        error(e?.message || 'Failed to save the intro.');
      } finally {
        saving.value = false;
      }
    };

    return {
      show,
      claim,
      bio,
      role,
      resumeUrl,
      resumeHref,
      resumeFile,
      uploadingResume,
      uploadResume,
      fileRules,
      RESUME_TYPES,
      isAdmin,
      editorOpen,
      draft,
      validForm,
      saving,
      responseType,
      responseMessage,
      openEditor,
      save,
      longTextRules,
      websiteRules,

      emojiRules,

      nameRules,

      stringListRules,

      urlRules,

    };
  },
});
</script>

<style scoped>
/* Vertical padding only. The intro starts on the same left edge as every section below it — it used
   to be indented by half a rem, which is exactly enough to look like a mistake. The max-width it
   also set was a second measure inside .c-container's. */
.intro {
  padding: 2.5rem 0 1.5rem;
  min-width: 0;
}

@media (max-width: 600px) {
  .intro {
    padding: 1.5rem 0 1rem;
  }
}

/* Mono marks the role the way a label marks a value — the same device used by the status strip
   further down the page, so the two read as one system. */
.intro__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-link-hover-color));
  margin-bottom: 0.9rem !important;
}

.intro__claim {
  font-size: clamp(1.9rem, 5vw, 2.9rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.08;
  color: rgb(var(--v-theme-text-color));
  text-wrap: balance;
}

.intro__bio {
  margin-top: 1.1rem !important;
  font-size: 1.02rem;
  line-height: 1.7;
  color: rgb(var(--v-theme-gray-color));
}

.intro__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.6rem;
}

/* min-height, not more padding: the buttons were ~33px tall, under the ~40px a thumb needs. */
.intro__cta {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  padding: 0.5rem 0.95rem;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-link-hover-color), 0.5);
  color: rgb(var(--v-theme-link-hover-color)) !important;
  transition: background-color .2s ease, border-color .2s ease;
}

.intro__cta:hover {
  background: rgba(var(--v-theme-link-hover-color), 0.1);
  border-color: rgb(var(--v-theme-link-hover-color));
}

.intro__cta--quiet {
  border-color: rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-gray-color)) !important;
}

.intro__cta--quiet:hover {
  background: rgba(var(--v-theme-gray-color), 0.08);
}

.intro__cta:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: 2px;
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

/* A claim line is a whole phrase, but v-chip is `white-space: nowrap; overflow: hidden` with no
   ellipsis, so on a phone every chip was cut off mid-word and the lines became indistinguishable.
   Letting the chip wrap and grow keeps the whole message readable. */
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
