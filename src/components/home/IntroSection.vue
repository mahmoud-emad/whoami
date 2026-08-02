<template>
  <!--
    The hero states a claim instead of performing a greeting. Every line of it comes from settings;
    an unconfigured install renders an empty hero rather than someone else's introduction.
  -->
  <!-- No `pa-2`: Vuetify's spacing utilities are !important, so that class was silently overriding
       the block's own padding and collapsing the hero's breathing room to 8px. -->
  <div v-if="show" class="intro">
    <p v-if="role" class="intro__eyebrow">{{ role }}</p>
    <h1 v-if="claim" class="intro__claim">{{ claim }}</h1>
    <p v-if="bio" class="intro__bio">{{ bio }}</p>

    <div class="intro__actions">
      <a v-if="resumeUrl" :href="resumeUrl" target="_blank" rel="noopener" class="intro__cta">
        <v-icon size="16">mdi-file-document-outline</v-icon>
        Read the CV
      </a>
      <router-link to="/contact" class="intro__cta intro__cta--quiet">Get in touch</router-link>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue';
import { useSettingsStore } from '../../store';
import { sectionHeading } from '../../utils';


export default defineComponent({
  name: 'IntroSection',
  setup() {
    const settingsStore = useSettingsStore();

    const section = computed(() => settingsStore.profile?.sections?.intro);
    const show = computed(() => section.value?.show !== false);

    const welcomeMessages = computed<string[]>(() =>
      (settingsStore.profile?.welcomeMessages || []).filter((m) => m && m.trim().length > 0)
    );

    // The hero has no separate <h2>: its headline *is* the section heading. So when no welcome
    // message is configured, the section's own emoji + title stand in — still config, never a name.
    const configuredHeading = computed<string>(() => sectionHeading(section.value));

    // Likewise the bio doubles as the section intro paragraph; either source is fine, neither
    // invents copy when both are empty.
    const bio = computed<string>(() =>
      settingsStore.profile?.bio?.trim() || section.value?.intro?.trim() || ''
    );

    const role = computed<string>(() => settingsStore.profile?.role?.trim() || '');
    const resumeUrl = computed<string>(() => settingsStore.profile?.resumeUrl?.trim() || '');

    const messageIndex = ref(0);

    const pickMessage = () => {
      const pool = welcomeMessages.value;
      if (!pool.length) return;
      messageIndex.value = Math.floor(Math.random() * pool.length);
    };

    const claim = computed<string>(() => welcomeMessages.value[messageIndex.value] || configuredHeading.value);

    let intervalId: ReturnType<typeof setInterval> | null = null;

    onMounted(() => {
      // Only cycle if more than one line was configured. A headline that rewrites itself every
      // three seconds is a distraction when there is nothing to cycle through.
      if (welcomeMessages.value.length > 1) {
        intervalId = setInterval(pickMessage, 3000);
      }
    });

    onUnmounted(() => {
      if (intervalId) clearInterval(intervalId);
    });
    return {
      show,
      claim,
      bio,
      role,
      resumeUrl,
    };
  },
});
</script>

<style scoped>
/* Vertical padding only. The hero starts on the same left edge as every section below it — it used
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
</style>
