<template>
  <v-alert v-if="apiLoadingStore.isLoading()" type="info" class="mb-4" variant="tonal">
    <p>Loading the theme from the server</p>
  </v-alert>

  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal">{{ responseMessage }}</v-alert>

  <v-alert type="info" class="mb-4" variant="tonal">
    Both palettes ship with the site — the default below decides which one a first-time visitor sees.
    Values accept 6-digit hex (<code>#1b1b1b</code>) or 8-digit hex with alpha (<code>#120131bb</code>).
    The swatch next to each field is a colour picker; it only understands 6 digits, so it shows the opaque
    part while the text field stays the source of truth.
  </v-alert>

  <v-form :disabled="apiLoadingStore.isLoading()">
    <h3 class="section-title">🌓 Default theme</h3>
    <p class="section-hint mb-3">What a visitor gets before they touch the dark/light switch.</p>
    <v-select v-model="theme.defaultTheme" :items="themeOptions" item-title="label" item-value="value"
      label="Default theme" variant="outlined" hide-details="auto" density="comfortable" class="mb-6"></v-select>

    <v-divider class="my-4" />

    <div v-for="palette in palettes" :key="palette" class="mb-6">
      <h3 class="section-title">{{ palette === 'dark' ? '🌚 Dark palette' : '🌞 Light palette' }}</h3>

      <!-- Contrast readout first: it is the thing most likely to be wrong, so it should not be below the fold. -->
      <v-card variant="outlined" class="pa-3 mb-4">
        <p class="section-hint mb-2">
          Readability against the background. WCAG AA wants at least 4.5:1 for body text.
        </p>
        <div v-for="check in contrastChecks(palette)" :key="`${palette}-${check.key}`"
          class="d-flex align-center justify-space-between flex-wrap ga-2 py-1">
          <span class="contrast-label">{{ check.label }}</span>
          <v-chip :color="check.ratio === null ? 'warning' : (check.pass ? 'success' : 'error')" size="small"
            variant="tonal" :title="check.ratio === null ? 'Could not read these colours as hex' : undefined">
            {{ check.ratio === null ? 'not measurable' : `${check.ratio.toFixed(2)}:1 ${check.pass ? 'AA pass' : 'AA fail'}` }}
          </v-chip>
        </div>
      </v-card>

      <v-row class="ma-0">
        <v-col v-for="key in colorKeys" :key="`${palette}-${key}`" cols="12" sm="6" class="pa-1">
          <div class="d-flex align-center ga-2">
            <!--
              Native picker: no library, works on iOS/Android as the OS colour sheet. It is fed a
              6-digit truncation because type=color rejects an alpha channel outright.
            -->
            <input type="color" class="color-swatch" :value="pickerValue(theme[palette][key])"
              :aria-label="`${key} colour picker`" :disabled="apiLoadingStore.isLoading()"
              @input="onPick(palette, key, ($event.target as HTMLInputElement).value)" />
            <v-text-field v-model="theme[palette][key]" :label="key" variant="outlined" hide-details="auto"
              density="comfortable" spellcheck="false" autocapitalize="none" class="flex-grow-1"></v-text-field>
          </div>
        </v-col>
      </v-row>
    </div>

    <v-divider class="my-4" />

    <v-btn @click="save" :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()"
      title="Save the theme" class="mb-4" color="primary" variant="tonal">Save appearance</v-btn>
  </v-form>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { useAPILoading, useSettingsStore } from '../../store';
import { deepClone } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';
import type { SettingsType, ThemeColors } from '../../types';

type ThemeSlice = SettingsType['theme'];
type PaletteName = 'dark' | 'light';
type ColorKey = keyof ThemeColors;

const COLOR_KEYS: ColorKey[] = [
  'background',
  'text-color',
  'border-color',
  'gray-color',
  'link-color',
  'box-bg-color',
  'link-hover-color',
  'front-end-bg-color',
  'back-end-bg-color',
  'form',
];

/** WCAG 2.1 AA minimum for normal-size body text. */
const AA_THRESHOLD = 4.5;

const emptyColors = (): ThemeColors =>
  COLOR_KEYS.reduce((acc, key) => {
    acc[key] = '';
    return acc;
  }, {} as ThemeColors);

const emptyTheme = (): ThemeSlice => ({
  defaultTheme: 'dark',
  dark: emptyColors(),
  light: emptyColors(),
});

/**
 * Parse #rgb / #rrggbb / #rrggbbaa into 0-255 channels plus 0-1 alpha.
 * Returns null for anything else (named colours, rgb(), an empty field) so callers can say
 * "not measurable" instead of printing a nonsense ratio.
 */
const parseHex = (value: string): { r: number, g: number, b: number, a: number } | null => {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;

  let r: string, g: string, b: string, a = 'ff';
  if (hex.length === 3) {
    [r, g, b] = [hex[0] + hex[0], hex[1] + hex[1], hex[2] + hex[2]];
  } else if (hex.length === 6 || hex.length === 8) {
    r = hex.slice(0, 2);
    g = hex.slice(2, 4);
    b = hex.slice(4, 6);
    if (hex.length === 8) a = hex.slice(6, 8);
  } else {
    return null;
  }

  return {
    r: parseInt(r, 16),
    g: parseInt(g, 16),
    b: parseInt(b, 16),
    a: parseInt(a, 16) / 255,
  };
};

/** sRGB relative luminance, per WCAG 2.1 — channels linearised, then weighted. */
const relativeLuminance = (r: number, g: number, b: number): number => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/**
 * Contrast ratio of `fg` over `bg`. A translucent foreground is composited over the background
 * first — that is what the eye actually sees, and ignoring alpha would report a flattering ratio
 * for a colour that renders much fainter.
 */
const contrastRatio = (fg: string, bg: string): number | null => {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return null;

  const mix = (fc: number, bc: number) => fc * f.a + bc * (1 - f.a);
  const lf = relativeLuminance(mix(f.r, b.r), mix(f.g, b.g), mix(f.b, b.b));
  const lb = relativeLuminance(b.r, b.g, b.b);
  const [lighter, darker] = lf > lb ? [lf, lb] : [lb, lf];
  return (lighter + 0.05) / (darker + 0.05);
};

export default {
  name: 'AppearanceForm',
  setup() {
    const apiLoadingStore = useAPILoading();
    const settingsStore = useSettingsStore();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const theme = ref<ThemeSlice>(emptyTheme());

    onMounted(() => {
      if (settingsStore.isSettingsLoaded()) {
        const current = settingsStore.getSettings().theme;
        if (current) {
          const loaded = deepClone(current) as Partial<ThemeSlice>;
          theme.value = {
            defaultTheme: loaded.defaultTheme === 'light' ? 'light' : 'dark',
            // Per-key merge so a palette missing a colour still gets an editable (empty) field.
            dark: { ...emptyColors(), ...(loaded.dark || {}) },
            light: { ...emptyColors(), ...(loaded.light || {}) },
          };
        }
      }
    });

    /** type=color only accepts #rrggbb, so hand it the opaque prefix (or black when unparseable). */
    const pickerValue = (value: string): string => {
      const parsed = parseHex(value);
      if (!parsed) return '#000000';
      const hex = (n: number) => n.toString(16).padStart(2, '0');
      return `#${hex(parsed.r)}${hex(parsed.g)}${hex(parsed.b)}`;
    };

    /** Picking a colour rewrites only the RGB half, so an existing alpha suffix survives. */
    const onPick = (palette: PaletteName, key: ColorKey, picked: string) => {
      const existing = (theme.value[palette][key] || '').trim().replace(/^#/, '');
      const alpha = existing.length === 8 ? existing.slice(6, 8) : '';
      theme.value[palette][key] = `${picked}${alpha}`;
    };

    const contrastChecks = (palette: PaletteName) => {
      const colors = theme.value[palette];
      return (['text-color', 'gray-color'] as ColorKey[]).map((key) => {
        const ratio = contrastRatio(colors[key], colors.background);
        return {
          key,
          label: `${key} on background`,
          ratio,
          pass: ratio !== null && ratio >= AA_THRESHOLD,
        };
      });
    };

    const save = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const full = settingsStore.getSettings();
        // Top-level key: appearance lives beside `profile`, not inside it. Writing only this slice
        // keeps the other forms' data intact.
        full.theme = theme.value;
        await settingsStore.saveSettings(full);
        success('Appearance saved');
      } catch (e) {
        error('Failed to save the appearance');
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    return {
      apiLoadingStore,
      theme,
      colorKeys: COLOR_KEYS,
      palettes: ['dark', 'light'] as PaletteName[],
      themeOptions: [
        { label: 'Dark', value: 'dark' },
        { label: 'Light', value: 'light' },
      ],
      responseType,
      responseMessage,
      pickerValue,
      onPick,
      contrastChecks,
      save,
    };
  },
};
</script>

<style scoped>
.section-title {
  margin-top: 8px;
  margin-bottom: 4px;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
}

.section-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.875rem;
}

.contrast-label {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-text-color));
  overflow-wrap: anywhere;
}

/* 44px keeps the swatch a comfortable thumb target; flex-shrink:0 stops it collapsing next to the field. */
.color-swatch {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.color-swatch:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
