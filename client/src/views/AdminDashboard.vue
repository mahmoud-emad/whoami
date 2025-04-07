<template>
  <v-card v-if="siteSettings?.configuration && !siteSettings.configuration.adminDashboard" class="head-card pa-4 mb-4"
    style="background: transparent !important; border-color: #772020 !important;">
    ❌ You cannot access this page; the admin has disabled the admin dashboard service.
  </v-card>

  <div v-else>
    <!-- Setup Wizard Intro Alert -->
    <v-alert v-if="!setupComplete" class="mt-4 head-card intro-alert" type="warning" variant="tonal">
      Since this is your first time visiting the site and it looks like the settings haven't been configured yet, please
      follow the step-by-step guide to set things up.
    </v-alert>

    <v-alert class="pa-2 mb-2 head-card">📊 Admin Dashboard</v-alert>

    <!-- Setup Progress -->
    <v-progress-linear v-if="setupMode" class="mb-4" :model-value="setupProgress" color="primary" height="10"
      rounded></v-progress-linear>

    <!-- Responsive Layout -->
    <div class="dashboard-container" :class="{ 'setup-mode': setupMode }">
      <!-- Sidebar Navigation - Hidden on small screens -->
      <div class="sidebar-container" ref="sidebarContainer">
        <v-tabs class="pa-2 mb-2 mt-2 custom-border tabs-height" v-model="activeTab" color="primary"
          direction="vertical" variant="tonal" style="border: 1px solid #e0e0e0;"
          :class="{ 'hidden-mobile': setupMode }">
          <v-tab v-for="tab in visibleTabs" :key="tab.value" :prepend-icon="tab.icon" :text="tab.label"
            :value="tab.value" :disabled="setupMode ? !tab.enabled : false" />
        </v-tabs>
      </div>

      <!-- Mobile Navigation - Visible only on small screens -->
      <div class="mobile-nav d-md-none mb-4" v-if="!setupMode">
        <v-select v-model="activeTab" :items="tabs.map(tab => ({ title: tab.label, value: tab.value }))"
          label="Select Section" variant="outlined" density="compact"></v-select>
      </div>

      <!-- Content Window -->
      <div class="content-container" ref="contentContainer">
        <v-tabs-window class="pa-2 mb-2 mt-2 custom-border tabs-height" v-model="activeTab">
          <v-tabs-window-item v-for="tab in tabs" :key="tab.value" class="mt-2" :value="tab.value">
            <div class="tab-content-scroll">
              <!-- Setup Mode Header -->
              <SetupWizardHeader v-if="setupMode" :current-step="currentStep" :tab-label="tab.label"
                :instructions="tab.setupInstructions || tab.description" class="mb-4" />

              <!-- Regular Mode Description -->
              <v-alert v-else class="mb-4 custom-border" type="info" variant="tonal">
                {{ tab.description }}
              </v-alert>

              <!-- Component -->
              <component :is="tab.component" @settings-saved="handleTabCompletion(tab.value)" :setup-mode="setupMode"
                :intro-mode="isIntro" @form-data-changed="saveFormData(tab.value, $event)" />

              <!-- Field-level intro guides -->
              <div v-if="setupMode && tab.fieldGuides && tab.fieldGuides.length > 0" class="field-guides mt-4">
                <v-expansion-panels class="setup-header" variant="accordion" v-model="isShowGuide">
                  <v-expansion-panel class="transparent-bg setup-header pa-0 ma-0">
                    <v-expansion-panel-title>
                      <v-icon class="mr-2">mdi-help-circle-outline</v-icon>
                      Field Guide
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <div v-for="(guide, index) in tab.fieldGuides" :key="index" class="field-guide-item mb-2">
                        <strong>{{ guide.field }}:</strong> {{ guide.description }}
                      </div>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>

              <!-- Setup Navigation Buttons -->
              <div v-if="setupMode" class="setup-navigation d-flex mt-4">
                <v-btn v-if="currentStep > 1" variant="outlined" @click="goToPreviousStep" class="mr-2">
                  Previous
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn v-if="currentStep < totalSteps" color="primary" @click="saveCurrentTabAndGoNext">
                  Next
                </v-btn>
                <v-btn v-else color="success" @click="saveCurrentTabAndComplete">
                  Finish Setup
                </v-btn>
              </div>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </div>
    </div>

    <!-- Setup Begin Dialog -->
    <v-dialog v-model="showBeginDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Setup Guide</v-card-title>
        <v-card-text>
          <p>Welcome to the admin dashboard setup guide!</p>
          <p>This guide will walk you through the process of setting up your admin dashboard.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showBeginDialog = false">
            Get Started
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Setup Completion Dialog -->
    <v-dialog v-model="showCompletionDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Setup Complete!</v-card-title>
        <v-card-text>
          <p>Congratulations! You have successfully configured your admin dashboard.</p>
          <p>You can now access all features and make changes at any time.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showCompletionDialog = false">
            Get Started
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import { useAPILoading, useSiteSettingsStore } from '../store';
import { SettingsType, TabDefinition } from '../types';
import router from '../router';
import { dashboardTabs } from './dashboard/tabDefinitions';
import SetupWizardHeader from './dashboard/SetupWizardHeader.vue';

// Lazy-loaded form components with improved loading indicators
const UserSettingsForm = defineAsyncComponent({
  loader: () => import('../components/forms/UserSettingsForm.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});
const ProjectForm = defineAsyncComponent({
  loader: () => import('../components/forms/ProjectForm.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});
const ArticleForm = defineAsyncComponent({
  loader: () => import('../components/forms/ArticleForm.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});
const PostForm = defineAsyncComponent({
  loader: () => import('../components/forms/PostForm.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});
const DeleteGuestbookForm = defineAsyncComponent({
  loader: () => import('../components/forms/DeleteGuestbookForm.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});
const DeleteProject = defineAsyncComponent({
  loader: () => import('../components/forms/DeleteProject.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});
const SearchEngineForm = defineAsyncComponent({
  loader: () => import('../components/forms/SearchEngineForm.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});
const SettingsForm = defineAsyncComponent({
  loader: () => import('../components/forms/SettingsForm.vue'),
  loadingComponent: () => import('../components/LoadingComponent.vue')
});

// Basic state
const activeTab = ref('user-settings');
const siteSettings = ref<SettingsType>({} as SettingsType);
const settingsStore = useSiteSettingsStore();
const apiLoadingStore = useAPILoading();
const isShowGuide = ref(0);
const isIntro = ref(!!router.currentRoute.value.query['intro']);

// Setup wizard state
const setupMode = ref(true);
const setupComplete = ref(false);
const completedTabs = ref<Record<string, boolean>>({});
const currentStep = ref(1);
const showCompletionDialog = ref(false);
const showBeginDialog = ref(false);

// Store form data from each tab
const formData = ref<Record<string, any>>({});

// Refs for height syncing
const sidebarContainer = ref<HTMLElement | null>(null);
const contentContainer = ref<HTMLElement | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

// Map component references to tab definitions
const componentMap = {
  'UserSettingsForm': UserSettingsForm,
  'ProjectForm': ProjectForm,
  'ArticleForm': ArticleForm,
  'PostForm': PostForm,
  'DeleteGuestbookForm': DeleteGuestbookForm,
  'DeleteProject': DeleteProject,
  'SearchEngineForm': SearchEngineForm,
  'SettingsForm': SettingsForm
};

// Process tab definitions with component references
const tabs: TabDefinition[] = dashboardTabs.map(tab => ({
  ...tab,
  component: componentMap[tab.componentName as keyof typeof componentMap]
}));

// Computed properties
const activeIntroMessage = computed(() => {
  const tab = tabs.find(t => t.value === activeTab.value);
  return tab?.introMessage || '';
});

const visibleTabs = computed(() => {
  if (setupMode.value) {
    return tabs.filter(tab => tab.setupStep !== null);
  }
  return tabs;
});

const totalSteps = computed(() => {
  return tabs.filter(tab => tab.setupStep !== null && tab.required).length;
});

const setupProgress = computed(() => {
  return (currentStep.value / totalSteps.value) * 100;
});

const isCurrentTabCompleted = computed(() => {
  const currentTabValue = activeTab.value;
  return completedTabs.value[currentTabValue] || false;
});

// Get the current active tab object
const currentTabObject = computed(() => {
  return tabs.find(tab => tab.value === activeTab.value);
});

// Function to set sidebar height with debounce
const setSidebarHeight = (() => {
  let timeoutId: number | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      if (contentContainer.value && sidebarContainer.value) {
        const contentHeight = contentContainer.value.offsetHeight;
        sidebarContainer.value.style.height = `${contentHeight}px`;
      }
      timeoutId = null;
    }, 50);
  };
})();

// Lifecycle hooks for height syncing
onMounted(() => {
  if (contentContainer.value) {
    resizeObserver.value = new ResizeObserver(setSidebarHeight);
    resizeObserver.value.observe(contentContainer.value);
  }

  nextTick(setSidebarHeight);
  window.addEventListener('resize', setSidebarHeight);
});

onUnmounted(() => {
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
  window.removeEventListener('resize', setSidebarHeight);
});

// Combined watch for activeTab changes
watch(activeTab, (newTab) => {
  // Update sidebar height after tab change
  nextTick(() => setSidebarHeight());

  // Update current step in setup mode
  if (setupMode.value) {
    const tab = tabs.find(t => t.value === newTab);
    if (tab && tab.setupStep) {
      currentStep.value = tab.setupStep;
    }
  }
});

// Methods
const saveFormData = (tabValue: string, data: any) => {
  formData.value[tabValue] = data;
  console.log("formData", formData.value);
};

const handleTabCompletion = (tabValue: string) => {
  completedTabs.value[tabValue] = true;

  if (setupMode.value) {
    const currentTabIndex = tabs.findIndex(tab => tab.value === tabValue);
    const nextTab = tabs[currentTabIndex + 1];

    if (nextTab) {
      nextTab.enabled = true;
    }
  }
};

const saveCurrentTabAndGoNext = () => {
  const currentTabValue = activeTab.value;
  completedTabs.value[currentTabValue] = true;

  const currentTabIndex = tabs.findIndex(tab => tab.value === activeTab.value);
  const nextTab = tabs[currentTabIndex + 1];

  if (nextTab) {
    nextTab.enabled = true;
  }

  goToNextStep();
};

const saveCurrentTabAndComplete = () => {
  const currentTabValue = activeTab.value;
  completedTabs.value[currentTabValue] = true;
  completeSetup();
};

const goToNextStep = () => {
  const currentTabIndex = tabs.findIndex(tab => tab.value === activeTab.value);
  const currentTab = tabs[currentTabIndex];
  const currentTabStep = currentTab?.setupStep || 0;

  const nextSetupTabs = tabs.filter(tab =>
    tab.setupStep !== null &&
    (tab.setupStep || 0) > currentTabStep
  );

  if (nextSetupTabs.length > 0) {
    nextSetupTabs.sort((a, b) => (a.setupStep || 0) - (b.setupStep || 0));
    activeTab.value = nextSetupTabs[0].value;
    currentStep.value = nextSetupTabs[0].setupStep || currentStep.value + 1;
  }
};

const goToPreviousStep = () => {
  const currentTabIndex = tabs.findIndex(tab => tab.value === activeTab.value);
  const currentTab = tabs[currentTabIndex];
  const currentTabStep = currentTab?.setupStep || 0;

  const prevSetupTabs = tabs.filter(tab =>
    tab.setupStep !== null &&
    (tab.setupStep || 0) < currentTabStep
  );

  if (prevSetupTabs.length > 0) {
    prevSetupTabs.sort((a, b) => (b.setupStep || 0) - (a.setupStep || 0));
    activeTab.value = prevSetupTabs[0].value;
    currentStep.value = prevSetupTabs[0].setupStep || currentStep.value - 1;
  }
};

/**
 * Complete the setup process and save all settings
 */
const completeSetup = async () => {
  setupMode.value = false;
  setupComplete.value = true;
  showCompletionDialog.value = true;

  // Enable all tabs
  tabs.forEach(tab => {
    tab.enabled = true;
  });

  // Get search models from form data
  const getSearchModels = (data: any) => {
    if (!data) return [];

    const searchModels: Array<'projects' | 'guestbooks' | 'articles' | 'posts'> = [];
    if (data.searchGuestbooks) {
      searchModels.push('guestbooks');
    }
    if (data.searchProjects) {
      searchModels.push('projects');
    }
    if (data.searchPosts) {
      searchModels.push('posts');
    }
    if (data.searchArticles) {
      searchModels.push('articles');
    }
    return searchModels;
  };

  // Create settings object from form data
  const searchEngineData = formData.value['search-engine'] || {};
  const settingsData = formData.value['settings'] || {};
  const userSettingsData = formData.value['user-settings'] || {};

  const settingsFormData: SettingsType = {
    configuration: {
      adminDashboard: true,
      displayNavbarImage: true,
      enableSearch: searchEngineData.enableSearch || false,
      searchModels: getSearchModels(searchEngineData),
      multipleThemes: settingsData.support2Themes || false
    },
    security: {
      adminFingerprintSignature: settingsData.adminFingerprintSignature || '',
      debug: settingsData.debug || false
    },
    theme: {
      defaultTheme: 'dark'
    },
    personal: {
      fullName: userSettingsData.fullName || '',
      email: userSettingsData.email || '',
      country: userSettingsData.country || '',
      resumeURL: userSettingsData.resumeUrl || '',
      social: {
        github: settingsData.githubLink || '',
        linkedin: '',
        twitter: '',
        whatsapp: '',
        signal: '',
        telegram: ''
      }
    }
  };

  // Save settings to store
  try {
    await settingsStore.updateSettings(settingsFormData);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

/**
 * Initialize the component
 */
onMounted(async () => {
  try {
    if (!settingsStore.isSettingsLoaded()) {
      await settingsStore.loadSettings();
    }
    // Set intro mode if query parameter is present
    if (router.currentRoute.value.query['intro']) {
      isIntro.value = true;
    }

    // Try to load settings, but don't throw an error if they don't exist
    try {
      if (!settingsStore.isSettingsLoaded()) {
        await settingsStore.loadSettings();
      }
      siteSettings.value = settingsStore.getSettings;

      // Check if settings are already configured
      if (
        Object.keys(siteSettings.value || {}).length > 0 &&
        siteSettings.value?.personal &&
        siteSettings.value?.personal?.fullName
      ) {
        setupMode.value = false;
        setupComplete.value = true;
      }
    } catch (error) {
      console.log('Settings not found, starting setup wizard');
      // Continue with setup wizard in this case
    }
  } catch (error) {
    console.error('Error in component initialization:', error);
  }
});

// Show begin dialog when in intro mode
watch([isIntro], () => {
  if (isIntro.value) {
    setTimeout(() => {
      showBeginDialog.value = true;
    }, 1000);
  }
}, { immediate: true });
</script>

<style scoped>
.dashboard-container {
  display: flex;
  min-height: 600px;
  gap: 16px;
  align-items: stretch;
}

.sidebar-container {
  width: 250px;
  transition: all 0.3s ease;
}

.content-container {
  flex: 1;
  min-width: 0;
  /* Prevent content from overflowing */
}

.tabs-height {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.v-tabs.tabs-height {
  flex: 1 1 auto;
  max-height: none;
}

.v-tabs-window.tabs-height {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}

.v-tabs-window-item {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-content-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  padding: 16px;
  border-radius: 4px;
}

.setup-header {
  margin-bottom: 24px;
  padding: 16px;
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  border-radius: 4px;
}

.field-guides {
  margin-top: 24px;
}

.field-guide-item {
  margin-bottom: 8px;
}

.setup-navigation {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}

.intro-alert {
  margin-bottom: 16px;
}

.custom-border {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 4px;
}

/* Mobile styles */
@media (max-width: 768px) {
  .dashboard-container {
    flex-direction: column;
    min-height: 400px;
  }

  .sidebar-container {
    max-width: 100%;
    width: 100%;
  }

  .hidden-mobile {
    display: none;
  }

  .sidebar-container {
    display: none !important;
  }

  .mobile-nav {
    margin-bottom: 16px;
  }

  .tab-content-scroll {
    padding: 12px;
  }
}

@media (min-width: 769px) {
  .dashboard-container:not(.setup-mode) {
    flex-direction: row;
  }

  .dashboard-container.setup-mode .sidebar-container {
    display: none !important;
  }

  .mobile-nav {
    display: none;
  }
}
</style>