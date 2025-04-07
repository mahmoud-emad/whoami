import { defineStore } from "pinia";
import SettingsAPI from "../api/settings";
import { SettingsType } from "../types";

/**
 * Create default settings object for new installations
 */
const createDefaultSettings = (): SettingsType => {
    return {
        configuration: {
            adminDashboard: true,
            displayNavbarImage: true,
            multipleThemes: false,
            enableSearch: false,
            searchModels: [],
        },
        theme: {
            defaultTheme: 'dark'
        },
        security: {
            debug: false,
            adminFingerprintSignature: ''
        },
        personal: {
            fullName: '',
            email: '',
            country: '',
            resumeURL: '',
            social: {
                github: '',
                linkedin: '',
                twitter: '',
                whatsapp: '',
                signal: '',
                telegram: ''
            }
        }
    };
};

const useSettingssStore = defineStore('settingsStore', {
    state: () => ({
        settings: {} as SettingsType,
        isInitialized: false
    }),
    getters: {
        getSettings: (state): SettingsType => {
            // Return default settings if not initialized
            if (!state.isInitialized || Object.keys(state.settings).length === 0) {
                return createDefaultSettings();
            }
            return state.settings;
        },
    },
    actions: {
        async loadSettings() {
            try {
                const data = await SettingsAPI.getSettings();
                if (data) {
                    this.settings = data;
                    this.isInitialized = true;
                } else {
                    // If no settings found, use default settings
                    this.settings = createDefaultSettings();
                    this.isInitialized = true;
                }
            } catch (error) {
                console.log('Settings not found, using defaults');
                this.settings = createDefaultSettings();
                this.isInitialized = true;
                // Don't throw the error, just use defaults
            }
        },

        async updateSettings(settings: SettingsType) {
            try {
                const data = await SettingsAPI.updateSettings(settings);
                if (data) {
                    this.settings = data;
                    this.isInitialized = true;
                }
            } catch (error) {
                console.error('Failed to update settings:', error);
                throw error;
            }
        },

        isSettingsLoaded() {
            return this.isInitialized;
        },

        getDefaultSettings() {
            return createDefaultSettings();
        }
    },
});

export default useSettingssStore;