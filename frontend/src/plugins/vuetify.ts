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
 *
 * Warm charcoal and lamplight. This used to be navy — a #01061F page, #123869 borders, a pale blue
 * accent, and Vuetify's factory blue on every control — which read as a dashboard rather than as
 * somebody's own site. The base is now a near-black with a warm cast, and the one colour on the
 * page is amber.
 *
 * Every ratio below is measured against `background` and clears the 4.5:1 WCAG AA floor for body
 * text. `border-color` is the exception: a hairline only has to be visible, not readable.
 */
export const BOOT_DARK_COLORS: ThemeColors = {
    background: "#14110F",
    "text-color": "#F2EDE7",       // 16.16:1
    "border-color": "#403830",     //  1.64:1
    "gray-color": "#A79E95",       //  7.13:1
    "link-color": "#E5C9A3",       // 11.83:1
    "box-bg-color": "#1C1815",
    "link-hover-color": "#E0A458", //  8.61:1 — the accent, also the intro CTAs and the RUNNING state
    "front-end-bg-color": "#33241A",
    "back-end-bg-color": "#2A2A1C",
    "form": "#1A1613",
    "primary": "#E0A458",          //  8.61:1
    "info": "#A8B89A",             //  8.94:1 — sage, so a note reads apart from the amber accent
};

export const BOOT_LIGHT_COLORS: ThemeColors = {
    // Off-white rather than #fff: the same warmth as the dark palette, far short of cream.
    background: "#FDFCFA",
    "text-color": "#1A1613",       // 17.53:1
    "border-color": "#D9D1C5",     //  1.48:1
    // Was #9e9e9e — 2.68:1 on white, well under the 4.5:1 WCAG AA needs for body
    // text. This carries the bio, every experience bullet and every project
    // description, so it has to be readable. #6B6259 is 5.82:1.
    "gray-color": "#6B6259",
    "link-color": "#8A4F1B",       //  6.37:1
    "box-bg-color": "#FFFFFF",
    // Accent used for the RUNNING state and the intro CTAs; the amber that works on
    // charcoal is far too light on white, so light gets the burnt end of the same hue.
    "link-hover-color": "#9A5A1C", //  5.32:1
    "front-end-bg-color": "#F5E6D3",
    "back-end-bg-color": "#EDE9DA",
    "form": "#F7F4EF",
    "primary": "#9A5A1C",          //  5.32:1
    "info": "#46603D",             //  6.82:1
};

/** A config palette is allowed to be partial, or missing entirely. */
export type PartialThemeColors = Partial<Record<keyof ThemeColors, string>>;

/**
 * Merge one configured palette over the boot palette.
 *
 * Only non-empty strings win: a half-filled config (say, only `background` set) must not blank out
 * the rest of the palette and leave the site unreadable — every unset key falls back to the boot
 * value. Keys Vuetify itself owns and this palette does not name (surface, error, on-*, …) are
 * carried over from `current` untouched, because replacing `colors` wholesale would drop them.
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
