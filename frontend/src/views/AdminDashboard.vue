<template>
  <v-card v-if="siteSettings && siteSettings.configuration && !siteSettings.configuration.adminDashboard"
    class="head-card pa-4 mb-4" :style="{ background: 'transparent !important', borderColor: '#772020 !important' }">
    ❌ You cannot access this page; the admin has decided to close the admin dashboard service.
  </v-card>
  <!--
    A fresh install goes through the wizard instead of the tab rail. It is keyed on the owner's
    name being empty, so it disappears as soon as the first step is saved and is never seen on a
    configured site.
  -->
  <SetupWizard v-else-if="needsSetup" @done="needsSetup = false" />

  <div v-else class="admin-dashboard">
    <div class="head-card pa-4 d-flex align-center ga-3 flex-wrap">
      <v-alert color="primary" class="flex-grow-1 dashboard-title" title="📊 Admin Dashboard" variant="tonal" />
      <!-- Icon-only on phones so the title keeps the full width. -->
      <v-btn @click="signOut" :loading="signingOut" title="Sign out" color="primary" variant="tonal"
        :icon="isMobile" :prepend-icon="isMobile ? undefined : 'mdi-logout'" :aria-label="isMobile ? 'Sign out' : undefined">
        <template v-if="isMobile"><v-icon>mdi-logout</v-icon></template>
        <template v-else>Sign out</template>
      </v-btn>
    </div>

    <!--
      Phones get a dropdown instead of the vertical tab rail: a sidebar of section names leaves
      almost no room for the form beside it. Desktop keeps the rail.
    -->
    <div v-if="isMobile" class="px-2 pt-2">
      <v-select v-model="activeTab" :items="tabs" item-title="label" item-value="value" variant="outlined"
        density="comfortable" label="Section" hide-details="auto" class="mb-3">
        <template #item="{ props, item }">
          <v-list-item v-bind="props" :prepend-icon="item.raw.icon" :subtitle="item.raw.description" lines="two" />
        </template>
      </v-select>
    </div>

    <!-- Content no longer has a tab here, so say where it went rather than let the owner hunt. -->
    <p class="dashboard-note px-4 pt-3">
      Projects, posts, articles, experience, contact channels and the More page are edited on the
      pages themselves while you are signed in — open a page and use the controls beside each entry.
    </p>

    <div class="d-flex" :class="isMobile ? 'flex-column' : 'flex-row'">
      <!-- Sidebar navigation (desktop only) -->
      <v-tabs v-if="!isMobile" class="pa-2 ml-2 mb-2 mt-2 custom-border dashboard-rail" v-model="activeTab"
        color="primary" direction="vertical" variant="tonal">
        <v-tab :title="tab.description" v-for="tab in tabs" :key="tab.value" :prepend-icon="tab.icon" :text="tab.label"
          :value="tab.value"></v-tab>
      </v-tabs>

      <!-- Content Window -->
      <v-tabs-window class="mb-2 mt-2 custom-border dashboard-window" :class="isMobile ? 'pa-2 mx-2' : 'pa-2 ml-2'"
        v-model="activeTab">
        <!-- The description is the tab's tooltip and the dropdown's subtitle. Repeating it here as
             a third blue box stacked on top of the form's own intro said the same thing twice. -->
        <v-tabs-window-item v-for="tab in tabs" :key="tab.value" class="mt-2" :value="tab.value">
          <component :is="tab.component" />
        </v-tabs-window-item>
      </v-tabs-window>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAPILoading, useSettingsStore } from '../store';
import { SettingsType } from '../types';
import { logout } from '../utils/api';
import SetupWizard, { SETUP_DISMISSED_KEY } from '../components/admin/SetupWizard.vue';

// Lazy-loaded form components
const BrandForm = defineAsyncComponent(() => import('../components/forms/BrandForm.vue'));
const SocialsForm = defineAsyncComponent(() => import('../components/forms/SocialsForm.vue'));
const UploadsManager = defineAsyncComponent(() => import('../components/forms/UploadsManager.vue'));
const SearchEngineForm = defineAsyncComponent(() => import('../components/forms/SearchEngineForm.vue'));
const SettingsForm = defineAsyncComponent(() => import('../components/forms/SettingsForm.vue'));
const SectionsForm = defineAsyncComponent(() => import('../components/forms/SectionsForm.vue'));
const PagesForm = defineAsyncComponent(() => import('../components/forms/PagesForm.vue'));
const AppearanceForm = defineAsyncComponent(() => import('../components/forms/AppearanceForm.vue'));
const MetaForm = defineAsyncComponent(() => import('../components/forms/MetaForm.vue'));

/**
 * What is left in the dashboard: the settings that shape the whole site and are edited rarely.
 * Content — projects, posts, articles, experience, contact channels, the More page — is edited on
 * the page it appears on, so it is not duplicated here.
 *
 * Module scope rather than inside setup(), so the default tab below can be the first entry instead
 * of a hand-written key that goes stale the moment a tab is removed.
 */
const tabs = [
  {
    label: "Branding",
    value: "branding",
    icon: "mdi-palette-swatch",
    component: BrandForm,
    description: "Edit the navbar identity, logo, footer line, and which navigation links are visible."
  },
  {
    label: "Socials",
    value: "socials",
    icon: "mdi-web",
    component: SocialsForm,
    description: "Edit the social links and timezone shown on the Contact page."
  },
  {
    label: "Sections",
    value: "sections",
    icon: "mdi-view-dashboard-variant",
    component: SectionsForm,
    description: "Rename, reorder, hide or show the blocks that make up the home page."
  },
  {
    label: "Pages",
    value: "pages",
    icon: "mdi-file-document-multiple",
    component: PagesForm,
    description: "Edit the heading and intro paragraph of the Contact, Projects, Blog, Guestbook, Search and 404 pages."
  },
  {
    label: "Appearance",
    value: "appearance",
    icon: "mdi-palette",
    component: AppearanceForm,
    description: "Edit the dark and light palettes and the default theme, with a live WCAG contrast check."
  },
  {
    label: "Site meta",
    value: "site-meta",
    icon: "mdi-tag-text",
    component: MetaForm,
    description: "Edit the browser tab title, search description, preview image and favicon."
  },
  {
    label: "Uploads",
    value: "uploads",
    icon: "mdi-folder-image",
    component: UploadsManager,
    description: "Browse, copy URLs for, and delete files uploaded via posts or the profile resume field."
  },
  {
    label: "Configure Search engine",
    value: "search-engine",
    icon: "mdi-database-search",
    component: SearchEngineForm,
    description: "Use this form to configure the search engine."
  },
  {
    label: "Site Settings",
    value: "settings",
    icon: "mdi-cog",
    component: SettingsForm,
    description: "Use this form to configure site settings."
  },
];

export default {
  components: { SetupWizard },
  setup() {
    const activeTab = ref(tabs[0].value);
    const settingsStore = useSettingsStore();
    const apiLoadingStore = useAPILoading();
    const siteSettings = ref<SettingsType>({} as SettingsType);
    const router = useRouter();
    const signingOut = ref(false);
    const display = useDisplay();
    // Phones and small tablets get the stacked layout with a section dropdown.
    const isMobile = computed(() => display.smAndDown.value);

    // Local fallback, only for the case where the flag could not be written (server unreachable
    // at the moment the wizard was dismissed). The server flag is what normally decides.
    const dismissedLocally = (() => {
      try {
        return localStorage.getItem(SETUP_DISMISSED_KEY) === '1';
      } catch {
        return false;
      }
    })();

    /**
     * Does this install still need setting up?
     *
     * Not keyed on the owner's name: production refuses to boot without `SITE_OWNER`, which seeds
     * exactly that field, so a name check would mean the wizard could only ever appear in
     * development — and a fresh production deploy lands on nine tabs with no guidance, which is
     * the whole problem.
     *
     * So the persisted `setupCompleted` flag decides, and the emptiness check is only there for
     * installs that predate the flag. A site with a bio, a social link, a job or a contact channel
     * is one somebody has already configured, and must never be interrupted by a setup screen.
     */
    const looksUnconfigured = (): boolean => {
      if (settingsStore.setupCompleted) return false;
      const profile = settingsStore.profile;
      const socials = profile?.socials;
      return !(
        (profile?.bio || '').trim()
        || (socials?.email || '').trim()
        || (socials?.githubUrl || '').trim()
        || (socials?.linkedinUrl || '').trim()
        || (profile?.experience || []).length
        || (profile?.channels || []).length
      );
    };

    /**
     * Decided once, the first time settings arrive — deliberately not a live computed.
     *
     * Step one of the wizard writes the bio, which flips `looksUnconfigured` to false. As a
     * computed this unmounted the wizard the moment step one saved and dropped the owner into the
     * dashboard half way through the flow. Latching it means the wizard runs to its own end and
     * closes only when it says so.
     */
    const needsSetup = ref(false);
    let decided = false;
    watch(
      () => settingsStore.isSettingsLoaded(),
      (loaded) => {
        if (!loaded || decided) return;
        decided = true;
        needsSetup.value = !dismissedLocally && looksUnconfigured();
      },
      { immediate: true }
    );

    const signOut = async () => {
      signingOut.value = true;
      try {
        await logout();
        router.push('/');
      } finally {
        signingOut.value = false;
      }
    };

    onMounted(async () => {
      apiLoadingStore.setLoading(true)
      if (!settingsStore.isSettingsLoaded()) {
        await settingsStore.loadSettings();
      }
      siteSettings.value = settingsStore.getSettings();
      apiLoadingStore.setLoading(false)
    })

    return { activeTab, tabs, siteSettings, signOut, signingOut, isMobile, needsSetup };
  }
};
</script>

<style scoped>
.admin-dashboard {
  /* Nothing inside the dashboard may push the page sideways on a phone. */
  max-width: 100%;
  overflow-x: hidden;
}

/* Without min-width:0 a flex child refuses to shrink below its content width, which is what
   makes wide forms and tables push the whole dashboard sideways. */
.dashboard-window {
  flex: 1 1 auto;
  min-width: 0;
}

.dashboard-rail {
  flex: 0 0 auto;
  border: 1px solid rgb(var(--v-theme-border-color)) !important;
}

.dashboard-title {
  min-width: 0;
}

.dashboard-note {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
  line-height: 1.6;
  max-width: 70ch;
  margin: 0;
}

@media (max-width: 600px) {
  .dashboard-title :deep(.v-alert-title) {
    font-size: 1.05rem !important;
    line-height: 1.4;
  }

  /* Reclaim the horizontal space the desktop padding takes up. */
  .admin-dashboard :deep(.v-window__container) {
    padding: 0;
  }
}
</style>
