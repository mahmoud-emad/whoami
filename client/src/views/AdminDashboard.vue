<template>
  <v-card v-if="siteSettings && siteSettings.configuration && !siteSettings.configuration.adminDashboard"
    class="head-card pa-4 mb-4" :style="{ background: 'transparent !important', borderColor: '#772020 !important' }">
    ❌ You cannot access this page; the admin has decided to close the admin dashboard service.
  </v-card>
  <div v-else>
    <v-alert color="primary" class="head-card pa-4" title="📊 Admin Dashboard" variant="tonal" />

    <div class="d-flex flex-row">
      <!-- Sidebar Navigation -->
      <v-tabs class="pa-2 ml-2 mb-2 mt-2 custom-border" v-model="activeTab" color="primary" direction="vertical"
        variant="tonal" style="border: 1px solid #e0e0e0;">
        <v-tab :title="tab.description" v-for="tab in tabs" :key="tab.value" :prepend-icon="tab.icon" :text="tab.label"
          :value="tab.value"></v-tab>
      </v-tabs>

      <!-- Content Window -->
      <v-tabs-window class="pa-2 ml-2 mb-2 mt-2 custom-border" v-model="activeTab"
        style="border: 1px solid #e0e0e0; width: 95%;">
        <v-tabs-window-item v-for="tab in tabs" :key="tab.value" class="mt-2" :value="tab.value">
          <v-alert class="mb-4 custom-border" type="info" variant="tonal">
            {{ tab.description }}
          </v-alert>
          <component :is="tab.component" />
        </v-tabs-window-item>
      </v-tabs-window>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, defineAsyncComponent, onMounted } from 'vue';
import { useAPILoading, useSettingsStore } from '../store';
import { SettingsType } from '../types';

// Lazy-loaded form components
const UserSettingsForm = defineAsyncComponent(() => import('../components/forms/UserSettingsForm.vue'));
const ProjectForm = defineAsyncComponent(() => import('../components/forms/ProjectForm.vue'));
const ArticleForm = defineAsyncComponent(() => import('../components/forms/ArticleForm.vue'));
const PostForm = defineAsyncComponent(() => import('../components/forms/PostForm.vue'));
const DeleteGuestbookForm = defineAsyncComponent(() => import('../components/forms/DeleteGuestbookForm.vue'));
const DeleteProject = defineAsyncComponent(() => import('../components/forms/DeleteProject.vue'));
const SearchEngineForm = defineAsyncComponent(() => import('../components/forms/SearchEngineForm.vue'));
const SettingsForm = defineAsyncComponent(() => import('../components/forms/SettingsForm.vue'));

export default {
  setup() {
    const activeTab = ref('user-settings');
    const settingsStore = useSettingsStore();
    const apiLoadingStore = useAPILoading();
    const siteSettings = ref<SettingsType>({} as SettingsType);

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
        label: "User Settings",
        value: "user-settings",
        icon: "mdi-account",
        component: UserSettingsForm,
        description: "Use this form to configure user settings."
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
        label: "Delete a project",
        value: "delete-project",
        icon: "mdi-package",
        component: DeleteProject,
        description: "Use this form to delete a project from the database."
      },
      {
        label: "Delete a guestbook",
        value: "delete-guestbook",
        icon: "mdi-comment",
        component: DeleteGuestbookForm,
        description: "Use this form to delete a guestbook from the database."
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

    return { activeTab, tabs, siteSettings };
  }
};
</script>
