import { ref, computed } from 'vue';
import { useSiteSettingsStore } from '../../store';
import { TabDefinition, SettingsType } from '../../types';
import { useRouter } from 'vue-router';

export function useSetupWizard(tabs: TabDefinition[], settingsStore: ReturnType<typeof useSiteSettingsStore>) {
	const router = useRouter();
	const setupMode = ref(router.currentRoute.value.query['intro'] === 'true');
	const setupComplete = ref(false);
	const currentStep = ref(1);
	const completedTabs = ref<Record<string, boolean>>({});
	const showCompletionDialog = ref(false);
	const showBeginDialog = ref(false);

	const totalSteps = computed(() =>
		tabs.filter(tab => tab.setupStep !== null && tab.required).length
	);
	const setupProgress = computed(() =>
		(currentStep.value / totalSteps.value) * 100
	);

	const completeSetup = async () => {
		setupMode.value = false;
		setupComplete.value = true;
		showCompletionDialog.value = true;
		tabs.forEach(tab => tab.enabled = true);

		const settingsFormData: SettingsType = {} as SettingsType;
		try {
			await settingsStore.updateSettings(settingsFormData);
		} catch (error) {
			console.error('Error saving settings:', error);
		}
	};

	return {
		setupMode,
		setupComplete,
		currentStep,
		setupProgress,
		totalSteps,
		completedTabs,
		showBeginDialog,
		showCompletionDialog,
		completeSetup
	};
}