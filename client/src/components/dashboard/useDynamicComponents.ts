import { defineAsyncComponent } from 'vue';
import { TabDefinition } from '../../types';

/**
 * Dynamically loads and maps components to dashboard tab definitions.
 *
 * This function takes an array of dashboard tab definitions and enhances each
 * tab with a corresponding Vue component dynamically imported using the Vue
 * `defineAsyncComponent` function. The components are lazy-loaded to improve
 * performance, with loading indicators provided.
 *
 * @param {TabDefinition[]} dashboardTabs - An array of tab definitions containing
 * information about each tab, including the name of the component to load.
 *
 * @returns {Object} - An object containing the updated array of tab definitions
 * with the components mapped and ready for rendering.
 */
export function useDynamicComponents(dashboardTabs: TabDefinition[]): { tabs: TabDefinition[] } {
	const componentMap = {
		UserSettingsForm: defineAsyncComponent({
			loader: () => import('../../components/forms/UserSettingsForm.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		}),
		ProjectForm: defineAsyncComponent({
			loader: () => import('../../components/forms/ProjectForm.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		}),
		ArticleForm: defineAsyncComponent({
			loader: () => import('../../components/forms/ArticleForm.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		}),
		PostForm: defineAsyncComponent({
			loader: () => import('../../components/forms/PostForm.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		}),
		DeleteGuestbookForm: defineAsyncComponent({
			loader: () => import('../../components/forms/DeleteGuestbookForm.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		}),
		DeleteProject: defineAsyncComponent({
			loader: () => import('../../components/forms/DeleteProject.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		}),
		SearchEngineForm: defineAsyncComponent({
			loader: () => import('../../components/forms/SearchEngineForm.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		}),
		SettingsForm: defineAsyncComponent({
			loader: () => import('../../components/forms/SettingsForm.vue'),
			loadingComponent: () => import('../../components/LoadingComponent.vue')
		})
	};

	const tabs = dashboardTabs.map(tab => ({
		...tab,
		component: componentMap[tab.componentName as keyof typeof componentMap]
	}));

	return { tabs };
}