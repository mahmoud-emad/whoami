<template>
  <span class="badge" :class="[`badge--${tone}`, { 'badge--solid': solid }]" :title="title || undefined">
    <v-icon v-if="icon" :size="iconSize" class="badge__icon">{{ icon }}</v-icon>
    <slot>{{ label }}</slot>
  </span>
</template>

<script lang="ts">
/**
 * A small mono pill that states what something is: HIDDEN, PINNED, RUNNING, IN PROGRESS.
 *
 * There were seven of these written by hand across the site, in four slightly different sizes and
 * two different border styles, because each one was copied from the last and adjusted. Same idea,
 * same job, so it is one component with a tone rather than four near-misses.
 *
 * The label is always a word, never colour alone: anyone who cannot separate two hues still reads
 * the state.
 */
import { defineComponent, type PropType } from 'vue';

/** `muted` for parked or inactive, `accent` for anything the owner deliberately turned on. */
export type BadgeTone = 'muted' | 'accent' | 'success';

export default defineComponent({
  name: 'StatusBadge',
  props: {
    /** The word. Ignored when the default slot is used. */
    label: { type: String, default: '' },
    tone: { type: String as PropType<BadgeTone>, default: 'muted' },
    /** A solid border rather than the default dashed one. Dashed reads as "not live". */
    solid: { type: Boolean, default: false },
    /** Optional leading mdi icon, e.g. mdi-pin. */
    icon: { type: String, default: '' },
    iconSize: { type: [String, Number], default: 12 },
    title: { type: String, default: '' },
  },
});
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 2px 7px;
  border: 1px dashed currentColor;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
  line-height: 1.4;
  text-transform: uppercase;
  white-space: nowrap;
  vertical-align: middle;
}

.badge--solid {
  border-style: solid;
}

.badge--muted {
  color: rgb(var(--v-theme-gray-color));
}

.badge--accent {
  color: rgb(var(--v-theme-link-hover-color));
}

.badge--success {
  color: rgb(var(--v-theme-success));
}

.badge__icon {
  /* The glyph sits a touch high next to uppercase mono. */
  margin-top: -1px;
}
</style>
