import { defineStore } from "pinia";
import { type Ref, ref } from "vue";
import {
    SettingsType,
    type MoreCard,
    type MoreShoeboxItem,
    type ExperienceRole,
    type SectionsConfig,
    type PagesConfig,
    type ContactChannel,
    type ThemeColors,
} from "../types";
import { apiFetch, apiJson } from "../utils/api";

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

const defaultNavItems = () => [
    { link: '/', name: '❄️ About', title: 'About me', show: true },
    { link: '/contact', name: '📞 Contact', title: 'Contact me', show: true },
    { link: '/projects', name: '🎨 Projects', title: 'See my projects', show: true },
    { link: '/blog', name: '✍️ Blog', title: 'See my blog', show: true },
    { link: '/guestbook', name: '🧁 Guestbook', title: 'Write me a guestbook', show: true },
    { link: '/more', name: '🌏 More', title: 'Wanna to see more?', show: true },
]

const defaultProfile = () => ({
    fullName: '',
    role: '',
    bio: '',
    welcomeMessages: [] as string[],
    resumeUrl: '',
    brand: {
        displayName: '',
        handle: '',
        handleUrl: '',
        logoUrl: '',
        copyrightOwner: '',
        copyrightYear: new Date().getFullYear(),
        navItems: defaultNavItems(),
    },
    problemSolving: {
        enabled: true,
        description: '',
        repoUrl: '',
    },
    socials: {
        email: '',
        signalUrl: '',
        githubUrl: '',
        linkedinUrl: '',
        xUrl: '',
        timezone: '',
    },
    contact: {
        intro: '',
        elsewhereIntro: '',
        emailLabel: '',
        emailDescription: '',
        signalLabel: '',
        signalDescription: '',
        githubLabel: '',
        linkedinLabel: '',
        xLabel: '',
    },
    more: {
        intro: '',
        cards: [] as MoreCard[],
        shoeboxIntro: '',
        shoebox: [] as MoreShoeboxItem[],
    },
    experience: [] as ExperienceRole[],
    sections: {
        intro: { title: '', emoji: '', intro: '', show: true, order: 1 },
        experience: { title: 'Experience', emoji: '\u2699\ufe0f', intro: '', show: true, order: 2 },
        projects: { title: 'Selected Work', emoji: '\ud83c\udfa8', intro: '', show: true, order: 3 },
        openSource: { title: 'Open Source', emoji: '\ud83c\udf1f', intro: '', show: true, order: 4 },
        problemSolving: { title: 'Problem Solving', emoji: '\ud83e\udde0', intro: '', show: true, order: 5 },
        articles: { title: 'Articles', emoji: '\ud83d\udcdd', intro: '', show: true, order: 6 },
    } as SectionsConfig,
    pages: {
        contact: { title: 'Contact', intro: '' },
        projects: { title: 'Projects', intro: '' },
        blog: { title: 'Blog', intro: '' },
        guestbook: { title: 'Guestbook', intro: '' },
        guestbookNotice: { title: '', intro: '' },
        search: { title: 'Search', intro: '' },
        notFound: { title: 'This page does not exist yet.', intro: '' },
    } as PagesConfig,
    channels: [] as ContactChannel[],
})

/**
 * An empty settings object. Forms start from this instead of hand-writing a literal, so adding a
 * config key does not break every form that happened to construct one.
 */
const defaultSettings = (): SettingsType => ({
    configuration: {
        githubURL: '',
        adminDashboard: false,
        multipleThemes: false,
        enableSearch: false,
        searchModels: [],
        antiBot: { enabled: true, question: '', answer: '', example: '' },
    },
    security: { debug: false },
    server: { host: '', port: 0 },
    theme: {
        defaultTheme: 'light',
        dark: {} as ThemeColors,
        light: {} as ThemeColors,
    },
    meta: { title: '', description: '', siteUrl: '', ogImage: '', faviconUrl: '', twitterHandle: '' },
    indieweb: {
        webring: { enabled: false, name: 'IndieWeb Webring', baseUrl: 'https://xn--sr8hvo.ws' },
    },
    profile: defaultProfile(),
})

// Module-level watcher state — kept out of reactive store state so timers don't trigger reactivity churn.
let healthWatcherTimer: ReturnType<typeof setInterval> | null = null;
const HEALTH_POLL_MS = 5000;
const HEALTH_TIMEOUT_MS = 3000;

const useSettingsStore = defineStore('settingsStore', {
    state: (): SettingsType & { __local: { loaded: boolean, serverUnreachable: boolean, lastError: string } } => {
        return {
            __local: {
                loaded: false,
                serverUnreachable: false,
                lastError: '',
            },
            configuration: {
                adminDashboard: false,
                enableSearch: false,
                githubURL: "",
                multipleThemes: false,
                searchModels: [],
                antiBot: { enabled: true, question: '', answer: '', example: '' },
            },
            security: {
                debug: false,
            },
            server: {
                host: '',
                port: 0
            },
            theme: {
                defaultTheme: 'light' as 'dark' | 'light',
                dark: {} as ThemeColors,
                light: {} as ThemeColors,
            },
            meta: {
                title: '', description: '', siteUrl: '', ogImage: '', faviconUrl: '', twitterHandle: '',
            },
            indieweb: {
                webring: { enabled: false, name: 'IndieWeb Webring', baseUrl: 'https://xn--sr8hvo.ws' },
            },
            profile: defaultProfile(),
        }
    },
    actions: {
        // Load settings on startup. Sets serverUnreachable=true on fetch failure instead of throwing,
        // so the App.vue gate can render the persistent dialog.
        async bootstrap(): Promise<boolean> {
            return this.loadSettings();
        },

        // One-shot health probe. Returns true if the server answered.
        async pingServer(): Promise<boolean> {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
            try {
                const res = await apiFetch('/health', { signal: ctrl.signal, cache: 'no-store' });
                return res.ok;
            } catch {
                return false;
            } finally {
                clearTimeout(t);
            }
        },

        // Start polling the backend's health endpoint. On every tick:
        //   - server up: serverUnreachable=false; if we were previously down (or settings never loaded), re-load.
        //   - server down: serverUnreachable=true.
        startHealthWatcher(onRecover?: () => void) {
            this.stopHealthWatcher();
            const tick = async () => {
                const wasDown = this.__local.serverUnreachable;
                const ok = await this.pingServer();
                if (ok) {
                    this.__local.serverUnreachable = false;
                    if (wasDown || !this.__local.loaded) {
                        // Refresh settings on recovery / first time so callers see current data.
                        const reloaded = await this.loadSettings();
                        if (reloaded && onRecover) onRecover();
                    }
                } else {
                    this.__local.serverUnreachable = true;
                    if (!this.__local.lastError) {
                        this.__local.lastError = 'Server did not respond';
                    }
                }
            };
            healthWatcherTimer = setInterval(tick, HEALTH_POLL_MS);
        },

        stopHealthWatcher() {
            if (healthWatcherTimer) {
                clearInterval(healthWatcherTimer);
                healthWatcherTimer = null;
            }
        },

        async loadSettings(): Promise<boolean> {
            try {
                const response = await apiFetch('/settings');
                if (!response.ok) {
                    this.__local.serverUnreachable = true;
                    this.__local.lastError = `Server returned ${response.status}`;
                    return false;
                }
                const result = await response.json();
                this._applySettings(result.data);
                this.__local.loaded = true;
                this.__local.serverUnreachable = false;
                this.__local.lastError = '';
                return true;
            } catch (error: any) {
                this.__local.serverUnreachable = true;
                this.__local.lastError = error?.message || String(error);
                return false;
            }
        },

        // Copy a server settings payload into the store. `security` only ever carries `debug` —
        // the signature hash never leaves the backend.
        _applySettings(data: SettingsType) {
            this.configuration = data.configuration;
            this.security = { debug: Boolean(data.security && data.security.debug) };
            this.theme = data.theme;
            this.meta = data.meta;
            if (data.indieweb) this.indieweb = data.indieweb;
            this.server = data.server;
            this.profile = data.profile || defaultProfile();
        },

        isServerUnreachable() {
            return this.__local.serverUnreachable;
        },

        getLastError() {
            return this.__local.lastError;
        },

        // Admin-only — the backend rejects this without a bearer token.
        async saveSettings(newData: SettingsType) {
            if (!this.isSettingsLoaded()) {
                throw new Error('Settings are not loaded')
            }
            const result = await apiJson<{ data: SettingsType }>('/settings', {
                method: 'POST',
                body: JSON.stringify(newData),
            })
            this._applySettings(result.data);
            return result.data
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

        getSettings() {
            if (!this.isSettingsLoaded()) {
                throw new Error('Settings are not loaded')
            }

            return {
                configuration: this.configuration,
                security: this.security,
                theme: this.theme,
                meta: this.meta,
                indieweb: this.indieweb,
                server: this.server,
                profile: this.profile,
            }
        },

        isSettingsLoaded() {
            return this.__local.loaded
        },

        /**
         * Change the site-wide default theme. Admin-only: this rewrites server config, so it is
         * not what a visitor's dark/light switch calls — that preference stays in their browser.
         */
        async setDefaultTheme(newTheme: 'dark' | 'light') {
            if (!this.isSettingsLoaded()) {
                throw new Error("Settings are not loaded");
            }

            return this.saveSettings({
                ...this.getSettings(),
                theme: { ...this.getSettings().theme, defaultTheme: newTheme },
            });
        }

    },
})

export {
    useAPILoading,
    useSettingsStore,
    defaultSettings,
    defaultProfile,
}