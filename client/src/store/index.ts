import { defineStore } from "pinia";
import { type Ref, ref } from "vue";
import { SettingsType } from "../types";

const useAPILoading = defineStore("apiLoading", {
    state: (): { loading: Ref<boolean> } => {
        return { loading: ref(false) }
    },

    actions: {
        setLoading(value: boolean) {
            this.loading = value
        },

        isLoading(): boolean {
            return this.loading === true

        },

        getLoading(): boolean {
            return this.loading
        }
    }
})

const useSettingsStore = defineStore('settingsStore', {
    state: (): SettingsType & { __local: { loaded: boolean } } => {
        return {
            __local: {
                loaded: false
            },
            configuration: {
                adminDashboard: false,
                enableSearch: false,
                multipleThemes: false,
                searchModels: [],
                displayNavbarImage: false
            },
            personal: {
                country: '',
                email: '',
                fullName: '',
                social: {
                    github: '',
                    linkedin: '',
                    twitter: '',
                    whatsapp: '',
                    signal: '',
                    telegram: ''
                },
                resumeURL: '',
            },
            security: {
                adminFingerprintSignature: '',
                debug: false,
            },
            server: {
                host: '',
                port: 0
            },
            theme: {
                defaultTheme: 'light'
            }
        }
    },
    actions: {
        async loadSettings() {
            if (this.server.host === '') {
                throw new Error('Server host is not set')
            }

            if (this.server.port === 0) {
                throw new Error('Server port is not set')
            }

            let serverUrl = ''
            if (this.server.host === 'localhost' || this.server.host === '127.0.0.1') {
                serverUrl = `http://${this.server.host}:${this.server.port}`
            } else {
                serverUrl = `https://${this.server.host}:${this.server.port}`
            }

            try {
                const response = await fetch(`${serverUrl}/settings`);
                const result = await response.json();
                this.configuration = result.data.configuration;
                this.security = result.data.security;
                this.theme = result.data.theme;
                this.server = result.data.server;
                this.__local.loaded = true
                return result.data
            } catch (error) {
                throw (`Failed to load settings: ${error}`);
            }
        },

        async saveSettings(newData: SettingsType) {
            if (!this.isSettingsLoaded()) {
                throw new Error('Settings are not loaded')
            }
            const serverUrl = this.getServerUrl()
            const response = await fetch(`${serverUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newData),
            })
            if (response.ok) {
                const result = await response.json();
                this.configuration = result.data.configuration;
                this.security = result.data.security;
                this.theme = result.data.theme;
                this.server = result.data.server;
                return result.data
            }

            throw (`Failed to save settings: ${response.statusText}`)
        },

        getSetting(key: string): any {
            if (key in this) {
                return Reflect.get(this, key)
            }
            throw new Error(`Setting ${key} not found`)
        },

        setSetting(key: string, value: any) {
            if (key in this) {
                return Reflect.set(this, key, value)
            }
            throw new Error(`Setting ${key} not found`)
        },

        getSettings(): SettingsType {
            if (!this.isSettingsLoaded()) {
                throw new Error('Settings are not loaded')
            }

            return {
                configuration: this.configuration,
                security: this.security,
                theme: this.theme,
                server: this.server,
                personal: this.personal

            }
        },

        getServerUrl() {
            if (!this.isSettingsLoaded()) {
                throw new Error('Settings are not loaded')
            }

            if (this.server.host === 'localhost' || this.server.host === '127.0.0.1') {
                return `http://${this.server.host}:${this.server.port}`
            } else {
                return `https://${this.server.host}:${this.server.port}`
            }
        },

        isSettingsLoaded() {
            return this.__local.loaded
        },

        async setTheme(newTheme: string) {
            if (!this.isSettingsLoaded()) {
                throw new Error("Settings are not loaded");
            }

            const serverUrl = this.getServerUrl();

            // Prepare the new settings with the updated theme
            const updatedSettings = {
                ...this.getSettings(), // Get current settings
                theme: { defaultTheme: newTheme }, // Update the theme
            };

            try {
                const response = await fetch(`${serverUrl}/settings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updatedSettings),
                });

                if (response.ok) {
                    const result = await response.json();
                    this.theme = result.data.theme; // Update local store
                    return result.data;
                }

                throw new Error(`Failed to update theme: ${response.statusText}`);
            } catch (error) {
                throw new Error(`Failed to update theme: ${error}`);
            }
        }

    },
})

export {
    useAPILoading,
    useSettingsStore,
}