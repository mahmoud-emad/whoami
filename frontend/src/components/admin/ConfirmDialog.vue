<template>
  <v-dialog :model-value="modelValue" :max-width="maxWidth" :persistent="busy"
    @update:model-value="$emit('update:modelValue', $event)">
    <v-card class="cd">
      <h2 class="cd__title">{{ title }}</h2>

      <div class="cd__body">
        <!-- The thing being acted on, quoted, so the prompt is about something specific. -->
        <p v-if="subject" class="cd__subject">{{ subject }}</p>
        <!-- Default slot wins when a sentence is not enough. -->
        <slot>
          <p v-if="message" class="cd__message">{{ message }}</p>
        </slot>
      </div>

      <div class="cd__actions">
        <v-btn variant="text" class="text-capitalize cd__cancel" :disabled="busy"
          @click="$emit('update:modelValue', false)">{{ cancelText }}</v-btn>
        <v-btn :color="danger ? 'error' : 'primary'" variant="tonal" class="text-capitalize" :loading="busy"
          @click="$emit('confirm')">{{ confirmText }}</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
/**
 * Ask before doing something, in the site's own style.
 *
 * The counterpart to `EditorDialog`: that one holds a form, this one holds a question. Both exist
 * so a dialog is never hand-rolled per page — the pin prompt started as one-off `v-dialog` markup
 * in the blog, which is exactly how two dialogs end up looking like two different products.
 *
 * `InlineActions` still arms delete in place rather than opening this. That is deliberate: a
 * two-step on the row is lighter for something you do often, and a modal for every trash click
 * would be in the way. Use this where the consequence needs a sentence to explain — pinning
 * reorders the page for every reader, and that is worth saying out loud.
 *
 * Everything is configurable: title, subject, message or slot, both button labels, a `danger`
 * flag that turns the confirm button red, and `busy` which shows a spinner and blocks dismissal
 * while the write is in flight.
 */
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ConfirmDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: 'Are you sure?' },
    /** The specific thing being acted on. Rendered in bold above the explanation. */
    subject: { type: String, default: '' },
    /** What will happen. Ignored when the default slot is used. */
    message: { type: String, default: '' },
    confirmText: { type: String, default: 'Confirm' },
    cancelText: { type: String, default: 'Cancel' },
    /** Red confirm button, for anything that destroys or cannot be undone. */
    danger: { type: Boolean, default: false },
    /** Write in flight: spins the button and stops the dialog being dismissed mid-request. */
    busy: { type: Boolean, default: false },
    maxWidth: { type: [String, Number], default: 440 },
  },
  emits: ['update:modelValue', 'confirm'],
});
</script>

<style scoped>
.cd {
  padding: 1.25rem;
  background: rgb(var(--v-theme-box-bg-color)) !important;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 10px;
}

.cd__title {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-text-color));
  margin: 0 0 0.75rem !important;
}

.cd__body {
  color: rgb(var(--v-theme-gray-color));
  line-height: 1.65;
  font-size: 0.94rem;
}

.cd__subject {
  margin: 0 0 0.5rem !important;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
  overflow-wrap: anywhere;
}

.cd__message {
  margin: 0 !important;
}

.cd__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 1.5rem;
}

.cd__actions .v-btn {
  min-height: 40px;
}

.cd__cancel {
  color: rgb(var(--v-theme-gray-color)) !important;
}

/* On a phone the two buttons take a row each rather than being squeezed together. */
@media (max-width: 600px) {
  .cd__actions .v-btn {
    flex: 1 1 auto;
  }
}
</style>
