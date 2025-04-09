<template>
  <div>
    <!-- Access Denied Card -->
    <AccessDeniedCard v-if="isAdminDashboardDisabled" />

    <!-- Main Dashboard Content -->
    <div v-else class="dashboard-wrapper">
      <!-- Setup Wizard Alert -->
      <SetupWizardAlert v-if="!setupComplete" />

      <!-- Dashboard Header -->
      <DashboardHeader />

      <!-- Setup Progress -->
      <SetupProgress v-if="setupMode" :progress="setupProgress" />

      <!-- Dashboard Layout -->
      <DashboardLayout :setup-mode="setupMode">
        <!-- Sidebar Navigation -->
        <template #sidebar>
          <SidebarNavigation :tabs="visibleTabs" v-model="activeTab" :setup-mode="setupMode" />
        </template>

        <!-- Mobile Navigation -->
        <template #mobile-nav>
          <MobileNavigation v-if="!setupMode" :tabs="tabs" v-model="activeTab" />
        </template>

        <!-- Content Area -->
        <template #content>
          <ContentWindow :tabs="tabs" v-model="activeTab" :setup-mode="setupMode" :is-intro="isIntro"
            :current-step="currentStep" :total-steps="totalSteps" @settings-saved="handleTabCompletion"
            @form-data-changed="saveFormData" @next-step="saveCurrentTabAndGoNext" @previous-step="goToPreviousStep"
            @complete-setup="saveCurrentTabAndComplete" />
        </template>
      </DashboardLayout>

      <!-- Dialogs -->
      <SetupBeginDialog v-model="showBeginDialog" />
      <SetupCompletionDialog v-model="showCompletionDialog" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAPILoading, useSiteSettingsStore } from '../store';
import { dashboardTabs } from '../components/dashboard/tabDefinitions';
import { SettingsType, TabDefinition } from '../types';
import { useDynamicComponents } from '../components/dashboard/useDynamicComponents';
import { useSetupWizard } from '../components/dashboard/useSetupWizard';
import { useTabNavigation } from '../components/dashboard/useTabNavigation';

// Components
import AccessDeniedCard from '../components/dashboard/AccessDeniedCard.vue';
import SetupWizardAlert from '../components/dashboard/SetupWizardAlert.vue';
import DashboardHeader from '../components/dashboard/DashboardHeader.vue';
import SetupProgress from '../components/dashboard/SetupProgress.vue';
import DashboardLayout from '../components/dashboard/DashboardLayout.vue';
import SidebarNavigation from '../components/dashboard/SidebarNavigation.vue';
import MobileNavigation from '../components/dashboard/MobileNavigation.vue';
import ContentWindow from '../components/dashboard/ContentWindow.vue';
import SetupBeginDialog from '../components/dashboard/SetupBeginDialog.vue';
import SetupCompletionDialog from '../components/dashboard/SetupCompletionDialog.vue';

// Stores and Router
const router = useRouter();
const settingsStore = useSiteSettingsStore();
const apiLoading = useAPILoading();

// State
const siteSettings = ref<SettingsType>({} as SettingsType);
const isIntro = ref(!!router.currentRoute.value.query['intro']);

// Dynamic Components
const { tabs } = useDynamicComponents(dashboardTabs);

// Setup Wizard Logic
const {
  setupMode,
  setupComplete,
  currentStep,
  setupProgress,
  totalSteps,
  completedTabs,
  showBeginDialog,
  showCompletionDialog,
  completeSetup
} = useSetupWizard(tabs, settingsStore);

// Tab Navigation Logic
const {
  activeTab,
  visibleTabs,
  saveFormData,
  handleTabCompletion,
  saveCurrentTabAndGoNext,
  goToPreviousStep
} = useTabNavigation(tabs, setupMode, currentStep, completedTabs);

// Computed Properties
const isAdminDashboardDisabled = computed(() =>
  siteSettings.value?.configuration && !siteSettings.value.configuration.adminDashboard
);

// Methods
const saveCurrentTabAndComplete = () => {
  completedTabs.value[activeTab.value] = true;
  completeSetup();
};

// Initialization
onMounted(async () => {
  apiLoading.setLoading(true);
  try {
    if (!settingsStore.isSettingsLoaded() && !isIntro.value) {
      await settingsStore.loadSettings();
      siteSettings.value = settingsStore.settings;
      if (settingsStore.isSettingsLoaded()) {
        setupMode.value = false;
        setupComplete.value = true;
      }
    }
  } catch (error) {
    console.error('Settings initialization failed:', error);
  } finally {
    apiLoading.setLoading(false);
  }
});

// Watchers
watch(isIntro, (value) => {
  if (value) {
    setTimeout(() => showBeginDialog.value = true, 1000);
  }
}, { immediate: true });
</script>

<style scoped>
.dashboard-wrapper {
  padding: 16px;
}

@media (max-width: 768px) {
  .dashboard-wrapper {
    padding: 12px;
  }
}
</style>