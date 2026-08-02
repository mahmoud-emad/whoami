<template>
  <v-card v-if="siteSettings && siteSettings.configuration && !siteSettings.configuration.adminDashboard"
    class="head-card pa-4 mb-4" :style="{ background: 'transparent !important', borderColor: '#772020 !important' }">
    ❌ You cannot access this page; the admin has decided to close the admin dashboard service.
  </v-card>
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
      Phones get a dropdown instead of the vertical tab rail: two dozen tabs in a sidebar leave
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
        <v-tabs-window-item v-for="tab in tabs" :key="tab.value" class="mt-2" :value="tab.value">
          <v-alert class="mb-4 custom-border" type="info" variant="tonal" :density="isMobile ? 'compact' : 'default'">
            {{ tab.description }}
          </v-alert>
          <component :is="tab.component" />
        </v-tabs-window-item>
      </v-tabs-window>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAPILoading, useSettingsStore } from '../store';
import { SettingsType } from '../types';
import { logout } from '../utils/api';

// Lazy-loaded form components
const ProfileForm = defineAsyncComponent(() => import('../components/forms/ProfileForm.vue'));
const BrandForm = defineAsyncComponent(() => import('../components/forms/BrandForm.vue'));
const SocialsForm = defineAsyncComponent(() => import('../components/forms/SocialsForm.vue'));
const ProjectForm = defineAsyncComponent(() => import('../components/forms/ProjectForm.vue'));
const ArticleForm = defineAsyncComponent(() => import('../components/forms/ArticleForm.vue'));
const PostForm = defineAsyncComponent(() => import('../components/forms/PostForm.vue'));
const EditProject = defineAsyncComponent(() => import('../components/forms/EditProject.vue'));
const EditArticle = defineAsyncComponent(() => import('../components/forms/EditArticle.vue'));
const EditPost = defineAsyncComponent(() => import('../components/forms/EditPost.vue'));
const EditGuestbook = defineAsyncComponent(() => import('../components/forms/EditGuestbook.vue'));
const DeleteGuestbookForm = defineAsyncComponent(() => import('../components/forms/DeleteGuestbookForm.vue'));
const DeleteProject = defineAsyncComponent(() => import('../components/forms/DeleteProject.vue'));
const DeleteArticle = defineAsyncComponent(() => import('../components/forms/DeleteArticle.vue'));
const DeletePost = defineAsyncComponent(() => import('../components/forms/DeletePost.vue'));
const UploadsManager = defineAsyncComponent(() => import('../components/forms/UploadsManager.vue'));
const SearchEngineForm = defineAsyncComponent(() => import('../components/forms/SearchEngineForm.vue'));
const SettingsForm = defineAsyncComponent(() => import('../components/forms/SettingsForm.vue'));
const MoreForm = defineAsyncComponent(() => import('../components/forms/MoreForm.vue'));
const ExperienceForm = defineAsyncComponent(() => import('../components/forms/ExperienceForm.vue'));
const SectionsForm = defineAsyncComponent(() => import('../components/forms/SectionsForm.vue'));
const PagesForm = defineAsyncComponent(() => import('../components/forms/PagesForm.vue'));
const ChannelsForm = defineAsyncComponent(() => import('../components/forms/ChannelsForm.vue'));
const AppearanceForm = defineAsyncComponent(() => import('../components/forms/AppearanceForm.vue'));
const MetaForm = defineAsyncComponent(() => import('../components/forms/MetaForm.vue'));

export default {
  setup() {
    const activeTab = ref('profile');
    const settingsStore = useSettingsStore();
    const apiLoadingStore = useAPILoading();
    const siteSettings = ref<SettingsType>({} as SettingsType);
    const router = useRouter();
    const signingOut = ref(false);
    const display = useDisplay();
    // Phones and small tablets get the stacked layout with a section dropdown.
    const isMobile = computed(() => display.smAndDown.value);

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

    const tabs = [
      {
        label: "Profile",
        value: "profile",
        icon: "mdi-card-account-details",
        component: ProfileForm,
        description: "Edit the public profile: hero name, bio, welcome messages, resume and problem-solving section."
      },
      {
        label: "Branding",
        value: "branding",
        icon: "mdi-palette-swatch",
        component: BrandForm,
        description: "Edit the navbar identity, logo, footer line, and which navigation links are visible."
      },
      {
        label: "More page",
        value: "more-page",
        icon: "mdi-view-list",
        component: MoreForm,
        description: "Edit the cards and shoebox links on the More page. Entries without a link never render."
      },
      {
        label: "Socials",
        value: "socials",
        icon: "mdi-web",
        component: SocialsForm,
        description: "Edit the social links and timezone shown on the Contact page."
      },
      {
        label: "Experience",
        value: "experience",
        icon: "mdi-briefcase",
        component: ExperienceForm,
        description: "Edit the work history on the home page: roles, bullet points, order, and the RUNNING/STOPPED marker."
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
        label: "Channels",
        value: "channels",
        icon: "mdi-account-network",
        component: ChannelsForm,
        description: "Edit the ways visitors can reach you on the Contact page: add, reorder, feature or hide a channel."
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
        label: "Create a new project",
        value: "new-project",
        icon: "mdi-package",
        component: ProjectForm,
        description: "Use this form to create a new project."
      },
      {
        label: "Create a new article",
        value: "new-article",
        icon: "mdi-marker",
        component: ArticleForm,
        description: "Use this form to create a new article."
      },
      {
        label: "Create a new post",
        value: "new-image",
        icon: "mdi-image",
        component: PostForm,
        description: "Use this form to post a new blog post. Markdown supported."
      },
      {
        label: "Edit a project",
        value: "edit-project",
        icon: "mdi-package-variant",
        component: EditProject,
        description: "Use this form to edit an existing project."
      },
      {
        label: "Edit an article",
        value: "edit-article",
        icon: "mdi-pencil",
        component: EditArticle,
        description: "Use this form to edit an existing article."
      },
      {
        label: "Edit a post",
        value: "edit-post",
        icon: "mdi-image-edit",
        component: EditPost,
        description: "Use this form to edit an existing blog post. Markdown supported."
      },
      {
        label: "Edit a guestbook",
        value: "edit-guestbook",
        icon: "mdi-comment-edit",
        component: EditGuestbook,
        description: "Use this form to edit an existing guestbook entry."
      },
      {
        label: "Delete a project",
        value: "delete-project",
        icon: "mdi-package",
        component: DeleteProject,
        description: "Use this form to delete a project from the database."
      },
      {
        label: "Delete an article",
        value: "delete-article",
        icon: "mdi-marker",
        component: DeleteArticle,
        description: "Use this form to delete an article from the database."
      },
      {
        label: "Delete a post",
        value: "delete-post",
        icon: "mdi-image",
        component: DeletePost,
        description: "Use this form to delete a blog post from the database."
      },
      {
        label: "Delete a guestbook",
        value: "delete-guestbook",
        icon: "mdi-comment",
        component: DeleteGuestbookForm,
        description: "Use this form to delete a guestbook from the database."
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

    return { activeTab, tabs, siteSettings, signOut, signingOut, isMobile };
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
