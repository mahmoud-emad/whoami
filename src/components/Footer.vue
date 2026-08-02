<template>
  <div class="c-footer mt-5 mb-2">
    <div class="long-line opacity-80 mb-3"></div>

    <!-- One row: who owns the site on the left, who it is ringed with on the right. Both groups
         centre and stack when the row no longer fits. -->
    <div class="footer-row">
      <small class="footer-text">
        <!-- No owner configured means no copyright line to print — the year alone would be noise,
             and a made-up name would be wrong. -->
        <span v-if="copyrightOwner">© {{ copyrightOwner }} {{ copyrightYear }}</span>
        <span v-if="copyrightOwner && showThemeToggle" aria-hidden="true">•</span>
        <a v-if="showThemeToggle" href="#" @click.prevent="toggleTheme">
          {{ isDark ? 'Light Mode' : 'Dark Mode' }}
        </a>
      </small>

      <!--
        Webring navigation. The whole point of a ring is reciprocal traffic: these links send
        visitors on to the neighbouring member sites, and other members' rings send visitors here.
        The prev/next endpoints are bare — the ring works out which member sent the visitor from the
        Referer header — so no per-site slug belongs in these URLs.
      -->
      <nav v-if="webringActive" class="webring" :aria-label="webring.name">
        <a :href="`${webringBase}/previous`" rel="noopener" :title="`Previous site in the ${webring.name}`">←</a>
        <a :href="webringBase" rel="noopener" class="webring__name">{{ webring.name }}</a>
        <a :href="`${webringBase}/next`" rel="noopener" :title="`Next site in the ${webring.name}`">→</a>
      </nav>
    </div>
  </div>
</template>

<script lang="ts">
import { useDark } from '@vueuse/core';
import { useTheme } from 'vuetify';
import { useSettingsStore } from '../store';
import { computed, onMounted, ref, watch } from 'vue';
import { SettingsType } from '../types';

// Records that the visitor picked a theme explicitly, so the site default stops overriding it.
const THEME_CHOICE_KEY = 'whoami.theme.choice';

export default {
  // Not "Footer" — that collides with the reserved HTML element name.
  name: 'AppFooter',
  setup() {
    const isDark = useDark();
    const theme = useTheme();
    const settingsStore = useSettingsStore();
    const siteSettings = ref<SettingsType>({} as SettingsType);

    const webring = computed(
      () => settingsStore.indieweb?.webring || { enabled: false, name: '', baseUrl: '' }
    );
    // The ring's endpoints are member-agnostic, so a slug is not needed to link into them — only
    // the membership toggle and somewhere to point.
    const webringActive = computed(
      () => Boolean(webring.value.enabled && webring.value.baseUrl?.trim())
    );
    const webringBase = computed(() => (webring.value.baseUrl || '').replace(/\/+$/, ''));

    // Hiding the toggle when the site ships a single theme keeps the footer from offering a
    // control that would do nothing.
    const showThemeToggle = computed(
      () => Boolean(siteSettings.value?.configuration?.multipleThemes)
    );

    const copyrightOwner = computed(
      () => settingsStore.profile?.brand?.copyrightOwner?.trim() || ''
    );
    const copyrightYear = computed(
      () => settingsStore.profile?.brand?.copyrightYear || new Date().getFullYear()
    );

    // App.vue bootstraps settings before children mount; just read them.
    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        siteSettings.value = settingsStore.getSettings();
        // The admin-configured default only applies to visitors who haven't picked a theme
        // themselves; a returning visitor's own choice always wins.
        const chosen = localStorage.getItem(THEME_CHOICE_KEY);
        isDark.value = chosen
          ? chosen === 'dark'
          : siteSettings.value.theme.defaultTheme === 'dark';
        theme.global.name.value = isDark.value ? 'dark' : 'light';
      }
    });

    // A visitor's theme is their own browser preference — it is stored locally and never written
    // back to the server, which would both require admin rights and change the site for everyone.
    function toggleTheme() {
      isDark.value = !isDark.value;
      localStorage.setItem(THEME_CHOICE_KEY, isDark.value ? 'dark' : 'light');
    }

    watch(isDark, (newVal) => {
      theme.global.name.value = newVal ? 'dark' : 'light';
    });

    return {
      isDark,
      siteSettings,
      toggleTheme,
      copyrightOwner,
      webring,
      webringActive,
      webringBase,
      copyrightYear,
      showThemeToggle,
    };
  }
};
</script>

<style scoped>
.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.6rem 1.5rem;
}

.footer-text {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

/* Mono and quiet: the ring is a courtesy link to neighbours, not a call to action, so it should
   not compete with the site's own navigation. */
.webring {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.webring a {
  color: rgb(var(--v-theme-gray-color)) !important;
  padding: 2px 6px;
  border-radius: 3px;
}

.webring a:hover {
  color: rgb(var(--v-theme-link-hover-color)) !important;
  background: rgba(var(--v-theme-link-hover-color), 0.1);
}

.webring a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: 2px;
}

.webring__name {
  letter-spacing: 0.02em;
}

/* Once the two groups no longer sit side by side, space-between would shove each wrapped line to
   the left edge; centring reads as intentional stacking instead of a broken row. */
@media (max-width: 600px) {
  .footer-row {
    justify-content: center;
    text-align: center;
  }

  .footer-text {
    justify-content: center;
  }

  .webring {
    justify-content: center;
  }
}
</style>
