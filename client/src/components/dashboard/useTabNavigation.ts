import { ref, computed, type Ref } from 'vue';
import { TabDefinition } from '../../types';

export function useTabNavigation(
	tabs: TabDefinition[],
	setupMode: Ref<boolean>,
	currentStep: Ref<number>,
	completedTabs: Ref<Record<string, boolean>>
) {
	const activeTab = ref('user-settings');
	const formData = ref<Record<string, any>>({});

	const visibleTabs = computed(() =>
		setupMode.value ? tabs.filter(tab => tab.setupStep !== null) : tabs
	);

	const saveFormData = (tabValue: string, data: any) => {
		formData.value[tabValue] = data;
	};

	const handleTabCompletion = (tabValue: string) => {
		completedTabs.value[tabValue] = true;
		if (setupMode.value) {
			const currentTabIndex = tabs.findIndex(tab => tab.value === tabValue);
			const nextTab = tabs[currentTabIndex + 1];
			if (nextTab) nextTab.enabled = true;
		}
	};

	const saveCurrentTabAndGoNext = () => {
		completedTabs.value[activeTab.value] = true;
		const currentTabIndex = tabs.findIndex(tab => tab.value === activeTab.value);
		const nextTab = tabs[currentTabIndex + 1];
		if (nextTab) {
			nextTab.enabled = true;
			goToNextStep();
		}
	};

	const goToNextStep = () => {
		const currentTab = tabs.find(tab => tab.value === activeTab.value);
		const currentTabStep = currentTab?.setupStep || 0;
		const nextTabs = tabs.filter(tab =>
			tab.setupStep !== null && (tab.setupStep || 0) > currentTabStep
		).sort((a, b) => (a.setupStep || 0) - (b.setupStep || 0));

		if (nextTabs.length) {
			activeTab.value = nextTabs[0].value;
			currentStep.value = nextTabs[0].setupStep || currentStep.value + 1;
		}
	};

	const goToPreviousStep = () => {
		const currentTab = tabs.find(tab => tab.value === activeTab.value);
		const currentTabStep = currentTab?.setupStep || 0;
		const prevTabs = tabs.filter(tab =>
			tab.setupStep !== null && (tab.setupStep || 0) < currentTabStep
		).sort((a, b) => (b.setupStep || 0) - (a.setupStep || 0));

		if (prevTabs.length) {
			activeTab.value = prevTabs[0].value;
			currentStep.value = prevTabs[0].setupStep || currentStep.value - 1;
		}
	};

	return {
		activeTab,
		visibleTabs,
		saveFormData,
		handleTabCompletion,
		saveCurrentTabAndGoNext,
		goToPreviousStep
	};
}