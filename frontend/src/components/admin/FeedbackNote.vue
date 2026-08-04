<template>
  <!--
    `role` is assertive only for errors: a success note that steals focus mid-task is noise, but a
    failure the reader might otherwise miss is worth interrupting for.
  -->
  <p v-if="message" class="fb" :class="`fb--${type}`" :role="type === 'error' ? 'alert' : 'status'"
    :aria-live="type === 'error' ? 'assertive' : 'polite'">
    <span v-if="resolvedLabel" class="fb__label">{{ resolvedLabel }}</span>
    <span class="fb__text"><slot>{{ message }}</slot></span>
    <button v-if="dismissible" type="button" class="fb__close" title="Dismiss" aria-label="Dismiss"
      @click="$emit('dismiss')">
      <v-icon size="14">mdi-close</v-icon>
    </button>
  </p>
</template>

<script lang="ts">
/**
 * The result of an action, in the site's own voice.
 *
 * Every form used a Vuetify `v-alert`, which paints a filled green or red block in the factory
 * palette. Next to a page built from hairlines, mono labels and a warm accent, that read as though
 * it belonged to a different product. This is the same object the rest of the site already uses
 * for state: a mono label, a rule down the left, and the message in ordinary text.
 *
 * The colours come from the theme, so recolouring the site recolours these too, and both palettes
 * clear the 4.5:1 contrast floor.
 *
 * Configurable: `label` overrides the mono tag, `showLabel` drops it, `dismissible` adds a close
 * button, and the default slot replaces the message with arbitrary content when a sentence is not
 * enough.
 */
import { computed, defineComponent, type PropType } from 'vue';
import type { FeedbackType } from '../../composables/useFormFeedback';

/** Short enough to scan, and the same width family so the messages line up under each other. */
const LABELS: Record<FeedbackType, string> = {
  success: 'DONE',
  error: 'FAILED',
  info: 'NOTE',
  warning: 'CHECK',
};

export default defineComponent({
  name: 'FeedbackNote',
  props: {
    /** Empty renders nothing at all, so callers can bind it straight to the composable. */
    message: { type: String, default: '' },
    type: { type: String as PropType<FeedbackType>, default: 'success' },
    /** Override the mono label, e.g. "SAVED" instead of the default "DONE". */
    label: { type: String, default: '' },
    /** Drop the label entirely, for places where the message alone is enough. */
    showLabel: { type: Boolean, default: true },
    /** Adds a close button and emits `dismiss`. Off by default: most notes clear themselves. */
    dismissible: { type: Boolean, default: false },
  },
  emits: ['dismiss'],
  setup(props) {
    // An explicit label wins; otherwise the type picks one. Blank when labels are switched off.
    const resolvedLabel = computed(() =>
      props.showLabel ? (props.label || LABELS[props.type] || '') : '');

    return { resolvedLabel };
  },
});
</script>

<style scoped>
.fb {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.1rem 0.6rem;
  /* Beats the global `p { margin: 0 !important }` reset. */
  margin: 0 0 1rem !important;
  padding: 0.55rem 0.8rem !important;
  border-left: 2px solid rgb(var(--v-theme-gray-color));
  border-radius: 0 6px 6px 0;
  background: rgba(var(--v-theme-gray-color), 0.09);
  line-height: 1.6;
  font-size: 0.92rem;
  color: rgb(var(--v-theme-text-color));
}

/* The label carries the meaning; the message stays in reading colour so it is easy to read. */
.fb__label {
  flex: 0 0 auto;
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.12em;
  color: rgb(var(--v-theme-gray-color));
}

.fb__text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.fb__close {
  margin-left: auto;
  align-self: center;
  display: inline-flex;
  /* Small mark, thumb-sized target. */
  padding: 6px;
  margin-right: -6px;
  border-radius: 6px;
  color: rgb(var(--v-theme-gray-color)) !important;
}

.fb__close:hover {
  color: rgb(var(--v-theme-text-color)) !important;
  background: rgba(var(--v-theme-text-color), 0.08);
}

.fb--success {
  border-left-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.1);
}

.fb--success .fb__label {
  color: rgb(var(--v-theme-success));
}

.fb--error {
  border-left-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.1);
}

.fb--error .fb__label {
  color: rgb(var(--v-theme-error));
}

.fb--info {
  border-left-color: rgb(var(--v-theme-info));
  background: rgba(var(--v-theme-info), 0.1);
}

.fb--info .fb__label {
  color: rgb(var(--v-theme-info));
}

.fb--warning {
  border-left-color: rgb(var(--v-theme-link-hover-color));
  background: rgba(var(--v-theme-link-hover-color), 0.1);
}

.fb--warning .fb__label {
  color: rgb(var(--v-theme-link-hover-color));
}

/* Inside an owner bar it sits beside the buttons rather than under them, so it must be able to
   shrink and must not carry the block margin. */
.owner-bar .fb {
  flex: 1 1 220px;
  margin-bottom: 0 !important;
}
</style>
