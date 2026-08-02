<template>
  <div class="page-body guestbook" :class="{ 'gb--light': isLight }">
    <!-- Header -->
    <header class="gb-header">
      <img :src="guestbookGif" alt="" class="gb-header__mark" width="72" height="72" />
      <div class="gb-header__copy">
        <h1 class="gb-header__title">{{ pageTitle }}</h1>
        <p class="gb-header__intro">{{ pageIntro }}</p>
        <div class="gb-header__actions">
          <button type="button" class="gb-cta" @click="scrollToGuestbook">Sign the guestbook</button>
          <span v-if="guestbooks.length" class="gb-count">
            {{ guestbooks.length }} {{ guestbooks.length === 1 ? 'message' : 'messages' }}
          </span>
        </div>
      </div>
    </header>

    <v-alert v-if="noticeIntro" class="mb-6" type="info" variant="tonal" density="comfortable">
      <strong v-if="noticeTitle">{{ noticeTitle }}</strong>
      <p class="mb-0">{{ noticeIntro }}</p>
    </v-alert>

    <!-- Owner-only result of a moderation action. Visitors never see this block. -->
    <v-alert v-if="isAdmin && responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-6">
      {{ responseMessage }}
    </v-alert>

    <!--
      A grid of note cards, two per row, modelled on the reference: square corners, a hairline
      border, a folded dog-ear at the top right, and name / date / message stacked inside. Grid
      rather than CSS columns so cards in a row share a height and nothing is left stranded in one
      half of the page.
    -->
    <section class="gb-grid">
      <LoadingComponent v-if="apiLoadingStore.isLoading()" type="card" :content-length="2"
        :content-name="'Guestbooks'" />

      <div v-else-if="!guestbooks.length" class="gb-empty">
        <p class="gb-empty__line">No messages yet.</p>
        <p class="gb-empty__hint">Yours would be the first.</p>
      </div>

      <article v-for="entry in decoratedGuestbooks" :key="entry.id ?? entry.createdAt" class="gb-note">
        <a v-if="entry.website" :href="normalizeUrl(entry.website)" :title="`Visit ${entry.website}`" target="_blank"
          rel="noopener nofollow" class="gb-note__name gb-note__name--link">{{ entry.name }}</a>
        <span v-else class="gb-note__name">{{ entry.name }}</span>

        <time v-if="entry.createdAt" class="gb-note__date" :datetime="entry.createdAt">
          {{ formatData(entry.createdAt) }}
        </time>

        <p class="gb-note__text">{{ entry.message }}</p>

        <!--
          Moderation only: visitors write their own entries, so there is no create or edit here —
          rewriting someone else's message would be dishonest. Pushed to the bottom of the note so
          the card design (dog-ear, name/date/message stack) is untouched for everyone else.
        -->
        <div v-if="isAdmin" class="gb-note__admin">
          <InlineActions :edit="false" label="message" @remove="removeGuestbook(entry)" />
        </div>
      </article>
    </section>

    <!-- Form -->
    <section class="gb-form-wrap" id="guestbookForm">
      <h2 class="gb-form__title">Leave a message</h2>

      <v-form v-model="validForm" @submit.prevent="writeGuestbook(newGuestbook)">
        <v-row class="ma-0">
          <v-col cols="12" md="6" class="pa-0 pr-md-2 pb-4">
            <v-text-field v-model="newGuestbook.name" :counter="25" prepend-inner-icon="mdi-account"
              :rules="nameRules({ fieldName: 'Your Name', maxLength: 25, minLength: 2 })" label="Your name" hint="Leave blank to sign as Anonymous." persistent-hint
              variant="outlined" hide-details="auto" />
          </v-col>
          <v-col cols="12" md="6" class="pa-0 pl-md-2 pb-4">
            <v-text-field v-model="newGuestbook.website" :counter="100" prepend-inner-icon="mdi-web"
              :rules="urlRules({ fieldName: 'Website' })" label="Website or GitHub (optional)"
              hint="Linked from your name." persistent-hint variant="outlined" hide-details="auto" />
          </v-col>
        </v-row>

        <v-textarea v-model="newGuestbook.message" :counter="500" prepend-inner-icon="mdi-message"
          :rules="longTextRules({ fieldName: 'Your Message', maxLength: 500, minLength: 30 })"
          label="Your message" variant="outlined" rows="4" auto-grow class="mb-4" hide-details="auto" />

        <template v-if="antiBotEnabled">
          <!-- error-messages carries the server's verdict. The answer is deliberately absent from
               GET /api/settings, so the client cannot check it and the only real "wrong answer"
               comes back from the POST. Without this the visitor was told nothing at all. -->
          <v-text-field v-model="antiBotAnswer" prepend-inner-icon="mdi-shield-check"
            :rules="antiBotRules(antiBotExpected)" :label="antiBotQuestion || 'Anti-bot check'"
            :error-messages="antiBotError" :placeholder="antiBotExample"
            :hint="antiBotHint" persistent-hint
            @update:model-value="antiBotError = ''"
            variant="outlined" class="mb-4" hide-details="auto" />
        </template>

        <div class="form-actions justify-end">
          <v-btn color="primary" :disabled="!validForm" :loading="apiLoadingStore.isLoading()" type="submit"
            size="large" class="text-capitalize" variant="flat">Sign guestbook</v-btn>
        </div>
      </v-form>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTheme } from 'vuetify';
import { apiFetch, apiJson } from '../utils/api';
import { antiBotRules, formatData, longTextRules, nameRules, urlRules, websiteRules } from '../utils';
import { type GuestBookType } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { useAPILoading, useSettingsStore } from '../store';
// Imported so Vite bundles it; a literal "/src/assets/..." path 404s in a production build.
import guestbookGif from '../assets/images/guestbook.gif';

export default {
  name: 'Guestbook',
  components: { LoadingComponent, InlineActions },
  setup() {
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const validForm = ref(false);
    const newGuestbook = ref<GuestBookType>({ name: '', website: '', message: '' });
    const antiBotAnswer = ref('');
    const guestbooks = ref<GuestBookType[]>([]);
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const theme = useTheme();
    // Drives the light-theme colour overrides. A `:global(.v-theme--light)` prefix was dropped by
    // the scoped-style compiler, so the component tags itself rather than reaching for Vuetify's
    // class from inside scoped CSS.
    const isLight = computed(() => !theme.current.value.dark);

    // Page copy. Headings and the guestbook blurb are UI chrome, so the built-in English text is a
    // reasonable default; nothing here identifies the owner.
    const page = computed(() => settingsStore.profile?.pages?.guestbook);
    const notice = computed(() => settingsStore.profile?.pages?.guestbookNotice);
    const pageTitle = computed(() => page.value?.title?.trim() || 'Guestbook');
    const pageIntro = computed(
      () =>
        page.value?.intro?.trim() ||
        'Back in the 90s and early 2000s, guestbooks were a staple of personal websites — a nice way for visitors to leave their mark. Feel free to share a few words, or just say hello.'
    );
    const noticeTitle = computed(() => notice.value?.title?.trim() || '');
    const noticeIntro = computed(() => notice.value?.intro?.trim() || '');

    // Anti-bot configuration. `answer` is what the client-side rule compares against; the server
    // validates the submitted value again, which is the check that actually matters.
    const antiBot = computed(() => settingsStore.configuration?.antiBot);
    const antiBotEnabled = computed(() => antiBot.value?.enabled !== false);
    const antiBotQuestion = computed(() => antiBot.value?.question?.trim() || '');
    const antiBotExpected = computed(() => antiBot.value?.answer?.trim() || '');
    /** Owner-written hint about the form of the answer. Public by design; the answer is not. */
    const antiBotExample = computed(() => antiBot.value?.example?.trim() || '');

    /**
     * Holds the server's rejection until the visitor edits the field again.
     *
     * A wrong answer can only be detected server side, so this is the field's only real error
     * state. It clears on input rather than on the next submit, so the message goes away as soon
     * as the visitor starts correcting it.
     */
    const antiBotError = ref('');

    const antiBotHint = computed(() => {
      if (antiBotExample.value) return `For example: ${antiBotExample.value}`;
      return antiBotQuestion.value ? 'Answering this keeps the spam out.' : '';
    });

    /**
     * A stable hue per author.
     *
     * The old version picked from a five-colour list with Math.random() *inside the template*, so
     * every re-render reshuffled the colours and the same person changed colour as you typed. A
     * hash of the name means someone who signs twice looks the same both times, and the colour
     * carries a little information instead of being noise.
     */
    const authorHue = (name: string): number => {
      let hash = 0;
      for (let i = 0; i < name.length; i += 1) {
        hash = (hash * 31 + name.charCodeAt(i)) % 360;
      }
      return hash;
    };

    /** Up to two initials, so the avatar reads as a person rather than a blob. */
    const initialsOf = (name: string): string =>
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || '?';

    const decoratedGuestbooks = computed(() =>
      guestbooks.value.map((entry) => ({
        ...entry,
        hue: authorHue(entry.name || 'Anonymous'),
        initials: initialsOf(entry.name || 'Anonymous'),
      }))
    );

    const loadGuestbooks = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/guestbooks`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const result = await res.json();
        guestbooks.value = result.data.sort((a: GuestBookType, b: GuestBookType) =>
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
      } catch (error) {
        console.error('Failed to load guestbooks:', error);
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const writeGuestbook = async (guestbook: GuestBookType) => {
      try {
        apiLoadingStore.setLoading(true);
        // The typed answer travels as `antiBotAnswer` so the server can reject bots itself — a
        // client-only check is trivially bypassed by posting straight to the API.
        const submission = {
          ...guestbook,
          name: guestbook.name || 'Anonymous',
          antiBotAnswer: antiBotEnabled.value ? antiBotAnswer.value.trim() : '',
        };
        const res = await apiFetch(`/guestbooks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          // The server answers 400 with a specific reason. Showing it on the anti-bot field is
          // the whole point: a rejected signature used to fail silently, so the visitor pressed
          // the button again and again with no idea what was wrong.
          const message = typeof result?.error === 'string' ? result.error : 'Could not sign the guestbook.';
          antiBotError.value = message;
          return;
        }
        guestbooks.value.unshift({ ...result.data, createdAt: new Date().toISOString() });
        newGuestbook.value = { name: '', website: '', message: '' };
        antiBotAnswer.value = '';
        antiBotError.value = '';
      } catch (error) {
        console.error('Failed to write guestbook:', error);
        antiBotError.value = 'Could not reach the server. Please try again.';
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    /**
     * Remove an entry. Confirmation happens in the control strip before this is ever called, and the
     * server checks the bearer token again — this is moderation, not a client-side permission.
     */
    const removeGuestbook = async (entry: GuestBookType) => {
      if (entry.id === undefined) return;
      // Optimistic: the note disappears at once and comes back if the delete fails.
      const snapshot = guestbooks.value;
      guestbooks.value = guestbooks.value.filter((item) => item.id !== entry.id);
      try {
        const result = await apiJson<{ message?: string }>(`/guestbooks/${entry.id}`, { method: 'DELETE' });
        success(result.message || 'Message deleted.');
      } catch (e: any) {
        guestbooks.value = snapshot;
        error(e?.message || 'Failed to delete the message.');
      } finally {
        await loadGuestbooks();
      }
    };

    const scrollToGuestbook = () => {
      document.getElementById('guestbookForm')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    };

    const normalizeUrl = (url: string) => {
      return url.match(/^https?:\/\//) ? url : `https://${url}`;
    };

    onMounted(loadGuestbooks);

    return {
      guestbookGif,
      guestbooks,
      validForm,
      newGuestbook,
      apiLoadingStore,
      decoratedGuestbooks,
      isLight,
      formatData,
      normalizeUrl,
      longTextRules,
      websiteRules,
      antiBotRules,
      scrollToGuestbook,
      nameRules,
      writeGuestbook,
      pageTitle,
      pageIntro,
      noticeTitle,
      noticeIntro,
      antiBotAnswer,
      antiBotEnabled,
      antiBotQuestion,
      antiBotExpected,
      antiBotExample,
      antiBotError,
      antiBotHint,
      isAdmin,
      responseType,
      responseMessage,
      removeGuestbook,

      urlRules,

    };
  }
};
</script>

<style scoped>
.guestbook {
  /* Comfortable measure for reading prose. Entries now use the full width of this column rather
     than half of it. */
  max-width: 44rem;
  margin: 0 auto;
}

/* ---- header ---------------------------------------------------------- */
.gb-header {
  display: flex;
  gap: 1.1rem;
  align-items: flex-start;
  padding: 2rem 0 1.75rem;
}

.gb-header__mark {
  flex: 0 0 auto;
  image-rendering: pixelated;
  margin-top: 0.2rem;
}

.gb-header__copy {
  min-width: 0;
}

.gb-header__title {
  font-size: clamp(1.7rem, 4.5vw, 2.3rem);
  font-weight: 600;
  letter-spacing: -0.025em;
  color: rgb(var(--v-theme-text-color));
}

.gb-header__intro {
  margin-top: 0.6rem !important;
  line-height: 1.7;
  color: rgb(var(--v-theme-gray-color));
}

.gb-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.2rem;
}

.gb-cta {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  padding: 0.55rem 1.1rem;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-link-hover-color), 0.55);
  color: rgb(var(--v-theme-link-hover-color)) !important;
  background: transparent !important;
  text-transform: none !important;
  transition: background-color .2s ease, border-color .2s ease;
}

.gb-cta:hover {
  background: rgba(var(--v-theme-link-hover-color), 0.12) !important;
  border-color: rgb(var(--v-theme-link-hover-color));
}

.gb-cta:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: 2px;
}

.gb-count {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-gray-color));
}

/* ---- note grid ------------------------------------------------------- */
.gb-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 0 0 3.5rem;
  /* Cards in a row share the tallest height, so a one-line message sits beside a long one without
     leaving a hole. minmax(0, 1fr) is what stops a long word widening a track past its share. */
  align-items: stretch;
}

.gb-empty {
  grid-column: 1 / -1;
  padding: 2.5rem 0;
  border-top: 1px solid rgb(var(--v-theme-border-color));
}

.gb-empty__line {
  font-size: 1.05rem;
  color: rgb(var(--v-theme-text-color));
}

.gb-empty__hint {
  margin-top: 0.35rem !important;
  color: rgb(var(--v-theme-gray-color));
}

.gb-note {
  --fold: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1.1rem 1.15rem 1.25rem;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgb(var(--v-theme-border-color));
  /* Square corners, except the top right which is cut away so the fold can sit in it. */
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - var(--fold)) 0, 100% var(--fold), 100% 100%, 0 100%);
  transition: background-color .2s ease;
}

.gb-note:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* The folded-over corner itself: the lower-left half of the cut square, a shade lighter so it
   reads as paper turned back on itself. */
.gb-note::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: var(--fold);
  height: var(--fold);
  background: rgba(255, 255, 255, 0.10);
  clip-path: polygon(0 0, 100% 100%, 0 100%);
}

.gb-note__name {
  font-weight: 700;
  font-size: 0.98rem;
  color: rgb(var(--v-theme-text-color));
  overflow-wrap: anywhere;
  /* Room for the fold so a long name never runs under it. */
  padding-right: var(--fold);
}

.gb-note__name--link {
  color: rgb(var(--v-theme-link-hover-color)) !important;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.gb-note__date {
  margin-top: 0.15rem;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-gray-color));
}

.gb-note__text {
  margin-top: 0.9rem !important;
  font-size: 0.96rem;
  line-height: 1.7;
  color: rgb(var(--v-theme-text-color));
  white-space: pre-line;
  overflow-wrap: anywhere;
}

/* Owner-only footer inside a note. `margin-top: auto` pins it to the bottom of the flex column so
   the fold, name, date and message keep their exact positions. */
.gb-note__admin {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 0.4rem;
}

/* Light theme: warm paper, matching the light palette's off-white page. It used to be a pale
   blue-grey, which was the last blue left on the site once the palette went warm. */
.gb--light .gb-note {
  background: #f7f3ec;
  border-color: rgba(0, 0, 0, 0.1);
}

.gb--light .gb-note:hover {
  background: #f2ece2;
}

.gb--light .gb-note::after {
  background: rgba(0, 0, 0, 0.09);
}

/* ---- form ------------------------------------------------------------ */
.gb-form-wrap {
  padding: 1.5rem;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 14px;
  /* Same neutral lift as the cards, so the compose panel reads as part of the board. */
  background:
    linear-gradient(0deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.035)),
    rgb(var(--v-theme-background));
}

.gb--light .gb-form-wrap {
  background: #fffcf7;
}

.gb-form__title {
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: rgb(var(--v-theme-text-color));
  margin-bottom: 1.25rem !important;
}

/* Two narrow columns squeeze prose into a ribbon; below this the notes stack. */
@media (max-width: 760px) {
  .gb-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 600px) {
  .gb-header {
    gap: 0.8rem;
    padding-top: 1.25rem;
  }

  .gb-header__mark {
    width: 48px;
    height: 48px;
  }

  .gb-note {
    padding: 1rem;
  }

  .gb-form-wrap {
    padding: 1rem;
  }
}
</style>