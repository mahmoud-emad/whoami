<template>
  <div class="wiz">
    <header class="wiz__head">
      <p class="wiz__eyebrow">First run</p>
      <h1 class="wiz__title">Let's get your name on it</h1>
      <p class="wiz__lede">
        Three short steps. Everything here can be changed later, and none of it is the content —
        your projects, posts and work history are written on the pages themselves once you are in.
      </p>

      <ol class="wiz__steps">
        <li v-for="(s, i) in STEPS" :key="s.key" class="wiz__step"
          :class="{ 'wiz__step--on': i === step, 'wiz__step--done': i < step }">
          <span class="wiz__step-n">{{ i < step ? '✓' : i + 1 }}</span>
          <span class="wiz__step-label">{{ s.label }}</span>
        </li>
      </ol>
    </header>

    <v-alert v-if="message" :type="messageType" variant="tonal" density="comfortable" class="mb-4">{{ message }}</v-alert>

    <v-form v-model="validForm" :disabled="saving" class="wiz__body">
      <!-- 1. Identity -->
      <template v-if="step === 0">
        <p class="wiz__hint">
          The only step that really matters. A fresh clone shows nobody's name until this is filled
          in, which is on purpose.
        </p>
        <v-text-field v-model="draft.displayName" :rules="required('Name')" label="Your name"
          placeholder="Ada Lovelace" variant="outlined" hide-details="auto" class="mb-4"
          hint="Shown in the navbar, the browser tab and the footer." persistent-hint></v-text-field>
        <v-text-field v-model="draft.handle" label="Handle" placeholder="@ada" variant="outlined"
          hide-details="auto" class="mb-4" hint="Optional. Sits under your name in the navbar."
          persistent-hint></v-text-field>
        <v-text-field v-model="draft.role" label="What you do" placeholder="Infrastructure engineer"
          variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <v-textarea v-model="draft.bio" label="A line or two about you" variant="outlined" hide-details="auto"
          rows="3" auto-grow class="mb-4"></v-textarea>
      </template>

      <!-- 2. Links -->
      <template v-else-if="step === 1">
        <p class="wiz__hint">
          Where people can reach you. Leave anything blank and it simply will not appear — nothing
          is invented for you. These also become the <code>rel="me"</code> links that let you sign
          in to other sites as your own domain.
        </p>
        <v-text-field v-model="draft.email" type="email" label="Email" variant="outlined" hide-details="auto"
          class="mb-4"></v-text-field>
        <v-text-field v-model="draft.githubUrl" type="url" label="GitHub" placeholder="https://github.com/ada"
          variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <v-text-field v-model="draft.linkedinUrl" type="url" label="LinkedIn" variant="outlined"
          hide-details="auto" class="mb-4"></v-text-field>
        <v-text-field v-model="draft.xUrl" type="url" label="X" variant="outlined" hide-details="auto"
          class="mb-4"></v-text-field>
        <v-text-field v-model="draft.timezone" label="Timezone" placeholder="Europe/London" variant="outlined"
          hide-details="auto" class="mb-4" hint="IANA name. Drives the local clock on the Contact page."
          persistent-hint></v-text-field>
      </template>

      <!-- 3. Look -->
      <template v-else-if="step === 2">
        <p class="wiz__hint">
          Which theme a visitor gets before they choose one of their own. The full palette, with a
          contrast check, is in Appearance whenever you want it.
        </p>
        <div class="wiz__themes">
          <button v-for="option in THEMES" :key="option.value" type="button" class="wiz__theme"
            :class="{ 'wiz__theme--on': draft.defaultTheme === option.value }"
            :aria-pressed="draft.defaultTheme === option.value" @click="draft.defaultTheme = option.value">
            <span class="wiz__swatch" :style="option.swatch"></span>
            <span class="wiz__theme-name">{{ option.label }}</span>
          </button>
        </div>
        <v-switch v-model="draft.multipleThemes" color="primary" inset hide-details density="compact"
          class="mt-2" label="Let visitors switch themes from the footer"></v-switch>
      </template>

      <!-- Done -->
      <template v-else>
        <p class="wiz__done-title">That is the setup.</p>
        <p class="wiz__hint">
          The rest of the site is filled in on the pages themselves while you stay signed in. Open a
          page and the controls are beside each thing they change.
        </p>
        <ul class="wiz__next">
          <li v-for="link in NEXT" :key="link.to">
            <RouterLink :to="link.to">{{ link.label }}</RouterLink>
            <span class="wiz__next-note">{{ link.note }}</span>
          </li>
        </ul>
      </template>
    </v-form>

    <div class="wiz__actions">
      <v-btn v-if="step > 0 && step < STEPS.length" variant="text" class="text-capitalize" :disabled="saving"
        @click="step -= 1">Back</v-btn>

      <v-btn v-if="step < STEPS.length" color="primary" variant="tonal" class="text-capitalize" :loading="saving"
        :disabled="saving || (step === 0 && !validForm)" @click="next">
        {{ step === STEPS.length - 1 ? 'Finish' : 'Next' }}
      </v-btn>

      <v-btn v-else color="primary" variant="tonal" class="text-capitalize" :loading="saving"
        @click="finish">Open the dashboard</v-btn>

      <!-- An escape hatch, always. Somebody re-running a configured install should not be trapped
           in a form they do not need. -->
      <v-btn v-if="step < STEPS.length" variant="text" class="text-capitalize wiz__skip" :disabled="saving"
        @click="finish">Skip for now</v-btn>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * First-run setup.
 *
 * A fresh clone used to drop a new owner straight onto nine tabs with no hint which of them had to
 * be filled in first. This asks for the handful of things that make the site theirs — name, links,
 * theme — and then says plainly that everything else is edited on the pages, which is the part
 * that is not obvious from a dashboard.
 *
 * When it shows is decided in AdminDashboard: a persisted `setupCompleted` flag, not the owner's
 * name. Production refuses to boot without SITE_OWNER, which seeds the name, so a name check would
 * have meant this could only ever appear in development.
 */
import { computed, defineComponent, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useSettingsStore } from '../../store';
import type { SettingsType } from '../../types';

export const SETUP_DISMISSED_KEY = 'whoami.setup.dismissed';

const STEPS = [
  { key: 'identity', label: 'You' },
  { key: 'links', label: 'Links' },
  { key: 'look', label: 'Look' },
];

const THEMES = [
  { value: 'light' as const, label: 'Light', swatch: { background: '#FDFCFA', borderColor: '#D9D1C5' } },
  { value: 'dark' as const, label: 'Dark', swatch: { background: '#14110F', borderColor: '#403830' } },
];

const NEXT = [
  { to: '/', label: 'Home', note: 'intro, work history, projects, articles' },
  { to: '/contact', label: 'Contact', note: 'contact channels' },
  { to: '/blog', label: 'Writing', note: 'posts, in markdown' },
  { to: '/projects', label: 'Projects', note: 'what you have built' },
];

export default defineComponent({
  name: 'SetupWizard',
  components: { RouterLink },
  emits: ['done'],
  setup(_props, { emit }) {
    const settingsStore = useSettingsStore();
    const step = ref(0);
    const saving = ref(false);
    const validForm = ref(false);
    const message = ref('');
    const messageType = ref<'success' | 'error'>('success');

    const profile = computed(() => settingsStore.profile);

    // Seeded from whatever is already configured, so a half-filled install shows its own values
    // rather than blank boxes the owner would have to retype.
    const draft = ref({
      displayName: profile.value?.brand?.displayName || profile.value?.fullName || '',
      handle: profile.value?.brand?.handle || '',
      role: profile.value?.role || '',
      bio: profile.value?.bio || '',
      email: profile.value?.socials?.email || '',
      githubUrl: profile.value?.socials?.githubUrl || '',
      linkedinUrl: profile.value?.socials?.linkedinUrl || '',
      xUrl: profile.value?.socials?.xUrl || '',
      timezone: profile.value?.socials?.timezone || '',
      defaultTheme: (settingsStore.theme?.defaultTheme || 'light') as 'light' | 'dark',
      multipleThemes: settingsStore.configuration?.multipleThemes !== false,
    });

    const required = (field: string) => [(v: string) => Boolean((v || '').trim()) || `${field} is required`];

    /** Fold the current step into the live settings and persist the whole object. */
    const save = async (): Promise<boolean> => {
      const full = settingsStore.getSettings() as SettingsType;
      const d = draft.value;

      if (step.value === 0) {
        const name = d.displayName.trim();
        full.profile = {
          ...full.profile,
          fullName: name,
          role: d.role.trim(),
          bio: d.bio.trim(),
          brand: {
            ...full.profile.brand,
            displayName: name,
            handle: d.handle.trim(),
            // The copyright line is the same person; asking for it twice would be busywork.
            copyrightOwner: full.profile.brand?.copyrightOwner?.trim() || name,
          },
        };
      } else if (step.value === 1) {
        full.profile = {
          ...full.profile,
          socials: {
            ...full.profile.socials,
            email: d.email.trim(),
            githubUrl: d.githubUrl.trim(),
            linkedinUrl: d.linkedinUrl.trim(),
            xUrl: d.xUrl.trim(),
            timezone: d.timezone.trim(),
          },
        };
        // The handle links somewhere sensible by default rather than nowhere.
        if (!full.profile.brand?.handleUrl?.trim() && d.githubUrl.trim()) {
          full.profile.brand = { ...full.profile.brand, handleUrl: d.githubUrl.trim() };
        }
      } else {
        full.theme = { ...full.theme, defaultTheme: d.defaultTheme };
        full.configuration = { ...full.configuration, multipleThemes: d.multipleThemes };
      }

      try {
        await settingsStore.saveSettings(full);
        return true;
      } catch {
        messageType.value = 'error';
        message.value = 'Could not save that. Check the server is reachable and try again.';
        return false;
      }
    };

    const next = async () => {
      saving.value = true;
      message.value = '';
      const okSaved = await save();
      saving.value = false;
      if (okSaved) step.value += 1;
    };

    /**
     * Mark the install as set up and leave.
     *
     * The flag goes to the server, so the wizard does not come back on another machine. The local
     * key is a fallback for the one case the server cannot cover — dismissing while the backend is
     * unreachable — and stops this browser asking again in the meantime.
     */
    const finish = async () => {
      try {
        localStorage.setItem(SETUP_DISMISSED_KEY, '1');
      } catch {
        // Private browsing with storage disabled. The server flag below is the real record.
      }
      try {
        const full = settingsStore.getSettings() as SettingsType;
        full.setupCompleted = true;
        await settingsStore.saveSettings(full);
      } catch {
        // Nothing to tell the owner here: they asked to leave, and the local key already got them
        // out. The worst case is the wizard reappearing on a different machine.
      }
      emit('done');
    };

    return {
      STEPS, THEMES, NEXT, step, saving, validForm, draft, required,
      message, messageType, next, finish,
    };
  },
});
</script>

<style scoped>
.wiz {
  max-width: 34rem;
  margin: 0 auto;
  padding: 1.5rem 0 3rem;
}

.wiz__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-link-hover-color));
  margin-bottom: 0.5rem !important;
}

.wiz__title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-text-color));
  margin-bottom: 0.6rem !important;
}

.wiz__lede {
  line-height: 1.7;
  color: rgb(var(--v-theme-gray-color));
  margin-bottom: 1.5rem !important;
}

/* The step rail. Numbered because these genuinely are a sequence. */
.wiz__steps {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.25rem;
  margin: 0 0 2rem !important;
  padding-left: 0 !important;
}

.wiz__step {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.76rem;
  color: rgb(var(--v-theme-gray-color));
}

.wiz__step-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.66rem;
}

.wiz__step--on,
.wiz__step--done {
  color: rgb(var(--v-theme-link-hover-color));
}

.wiz__step--on .wiz__step-n {
  background: rgba(var(--v-theme-link-hover-color), 0.16);
}

.wiz__hint {
  line-height: 1.7;
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.92rem;
  margin-bottom: 1.5rem !important;
}

.wiz__hint code {
  font-family: var(--font-mono);
  font-size: 0.9em;
}

/* Two swatches rather than a select: the choice is visual, so show it. */
.wiz__themes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.wiz__theme {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 8px;
  min-height: 48px;
  color: rgb(var(--v-theme-text-color)) !important;
  font-size: 0.92rem;
}

.wiz__theme--on {
  border-color: rgb(var(--v-theme-link-hover-color));
  background: rgba(var(--v-theme-link-hover-color), 0.1);
}

.wiz__swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid;
}

.wiz__done-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  color: rgb(var(--v-theme-text-color));
  margin-bottom: 0.6rem !important;
}

.wiz__next {
  list-style: none;
  margin: 0 !important;
  padding-left: 0 !important;
}

.wiz__next li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.55rem 0;
  border-top: 1px solid rgb(var(--v-theme-border-color));
}

.wiz__next li:last-child {
  border-bottom: 1px solid rgb(var(--v-theme-border-color));
}

.wiz__next a {
  font-weight: 600;
}

.wiz__next-note {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  color: rgb(var(--v-theme-gray-color));
}

.wiz__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 2rem;
}

.wiz__actions .v-btn {
  min-height: 40px;
}

/* Pushed away from the primary action so it is not the thing a thumb lands on by accident. */
.wiz__skip {
  margin-left: auto;
  color: rgb(var(--v-theme-gray-color)) !important;
}

@media (max-width: 600px) {
  .wiz__skip {
    margin-left: 0;
  }
}
</style>
