import "vuetify/styles";
import { createVuetify, type ThemeInstance } from "vuetify";
import { useDark } from '@vueuse/core';
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import type { ThemeColors } from "../types";

// Get the dark mode state from useDark hook
const isDark = useDark();

/**
 * Boot palettes.
 *
 * The Vuetify plugin is created at import time, long before the backend answers /settings, so the
 * app needs *something* to paint with on the very first frame. These are that fallback — and they
 * are also what a fresh clone renders with when nothing has been configured yet. The real palettes
 * live in config and are applied over these by `applyThemeColors` once settings land.
 */
export const BOOT_DARK_COLORS: ThemeColors = {
    background: "#01061F",
    "text-color": "#ffffff",
    "border-color": "#123869",
    "gray-color": "#cdd4df",
    "link-color": "#cdd4df",
    "box-bg-color": "#120131bb",
    "link-hover-color": "#82adf3",
    "front-end-bg-color": "#05143dbb",
    "back-end-bg-color": "#05283dbb",
    "form": "#091C21FF",
};

export const BOOT_LIGHT_COLORS: ThemeColors = {
    background: "#fff",
    "text-color": "#11161f",
    "border-color": "#e2e6ec",
    // Was #9e9e9e — 2.68:1 on white, well under the 4.5:1 WCAG AA needs for body
    // text. This carries the bio, every experience bullet and every project
    // description, so it has to be readable. #5b6473 is 5.97:1.
    "gray-color": "#5b6473",
    "link-color": "#2a4d8f",
    "box-bg-color": "#ffffff",
    // Accent used for the RUNNING state and the hero CTAs; the pale #82adf3 that
    // works on navy is far too light on white.
    "link-hover-color": "#2f6bd4",
    "front-end-bg-color": "#cedeff",
    "back-end-bg-color": "#c4e1ff",
    "form": "#f4f6fa",
};

/** A config palette is allowed to be partial, or missing entirely. */
export type PartialThemeColors = Partial<Record<keyof ThemeColors, string>>;

/**
 * Merge one configured palette over the boot palette.
 *
 * Only non-empty strings win: a half-filled config (say, only `background` set) must not blank out
 * the other nine colours and leave the site unreadable — every unset key falls back to the boot
 * value. Keys Vuetify itself owns (primary, surface, on-*, …) are carried over from `current`
 * untouched, because replacing `colors` wholesale would otherwise drop them.
 */
function mergePalette(
    current: Record<string, string>,
    boot: ThemeColors,
    configured: PartialThemeColors | undefined,
): Record<string, string> {
    const next: Record<string, string> = { ...current };
    for (const key of Object.keys(boot) as Array<keyof ThemeColors>) {
        const value = configured?.[key];
        next[key] = typeof value === 'string' && value.trim() !== '' ? value.trim() : boot[key];
    }
    return next;
}

/**
 * Push the configured palettes onto the live Vuetify theme.
 *
 * Deliberately touches only `themes.value.<name>.colors`. Which theme is *active* belongs to the
 * visitor (Footer.vue persists their pick under 'whoami.theme.choice'), so this must never write
 * `theme.global.name` — recolouring is not the same as switching.
 *
 * Never throws: called on every settings load, including ones that return junk.
 */
export function applyThemeColors(
    theme: ThemeInstance,
    palettes: { dark?: PartialThemeColors, light?: PartialThemeColors } | undefined | null,
): void {
    const themes = theme?.themes?.value;
    if (!themes) return;

    if (themes.dark) {
        themes.dark.colors = mergePalette(themes.dark.colors, BOOT_DARK_COLORS, palettes?.dark) as typeof themes.dark.colors;
    }
    if (themes.light) {
        themes.light.colors = mergePalette(themes.light.colors, BOOT_LIGHT_COLORS, palettes?.light) as typeof themes.light.colors;
    }
}

const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: isDark.value ? 'dark' : 'light',
        themes: {
            dark: {
                dark: true,
                colors: { ...BOOT_DARK_COLORS },
            },
            light: {
                dark: false,
                colors: { ...BOOT_LIGHT_COLORS },
            },
        },
    },
});

export default vuetify;
