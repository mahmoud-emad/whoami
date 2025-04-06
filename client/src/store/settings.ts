import { defineStore } from "pinia";
import SettingsAPI from "../api/settings";
import { SettingsType } from "../types";

const useSettingssStore = defineStore('settingsStore', {
    state: () => ({
        settings: {} as SettingsType,
    }),
    getters: {
        getSettings: (state): SettingsType => state.settings,
    },
    actions: {
        async loadSettings() {
            const data = await SettingsAPI.getSettings();
            this.settings = data;
        },

        async updateSettings(settings: SettingsType) {
            const data = await SettingsAPI.updateSettings(settings)
            if (data) {
                this.settings = data
            }
        },

        isSettingsLoaded() {
            return Object.keys(this.settings).length > 0
        }
    },
});

export default useSettingssStore;