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
    actions: {
        async loadSettings() {
            try {
                const data = await SettingsAPI.getSettings();
                if (data) {
                    this.settings = data;
                    this.isInitialized = true;
                }
            } catch (error) {
                throw error;
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