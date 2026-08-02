<template>
  <!--
    Shell for in-place create/edit. It owns the chrome (title bar, scrolling body, action row) and
    nothing else — every page passes its own fields through the default slot, because a project, a
    post and an article have nothing in common beyond "a form in a dialog".

    Full-screen below the md breakpoint: at 390px a centred dialog leaves ~16px gutters and the form
    fields end up in a column too narrow to type in comfortably.
  -->
  <v-dialog :model-value="modelValue" @update:model-value="onToggle" :fullscreen="display.smAndDown.value"
    :max-width="maxWidth" scrollable>
    <v-card class="editor-dialog">
      <v-card-title class="editor-dialog__head">
        <span class="editor-dialog__title">{{ title }}</span>
        <v-spacer></v-spacer>
        <v-btn class="editor-dialog__close" variant="text" density="comfortable" icon="mdi-close" title="Close"
          aria-label="Close" @click="close"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="editor-dialog__body">
        <slot></slot>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="editor-dialog__actions">
        <slot name="actions"></slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDisplay } from 'vuetify';

export default defineComponent({
  name: 'EditorDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    /** Desktop width. Wide enough for a description textarea, narrow enough to stay readable. */
    maxWidth: { type: [Number, String], default: 760 },
  },
  emits: ['update:modelValue'],
  setup(_props, { emit }) {
    const display = useDisplay();

    const onToggle = (value: boolean) => emit('update:modelValue', value);
    const close = () => emit('update:modelValue', false);

    return { display, onToggle, close };
  },
});
</script>

<style scoped>
.editor-dialog {
  background: rgb(var(--v-theme-background)) !important;
  color: rgb(var(--v-theme-text-color));
}

.editor-dialog__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.015em;
}

/* Long titles truncate instead of wrapping the close button onto a second line. */
.editor-dialog__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-dialog__close.v-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  color: rgb(var(--v-theme-text-color));
}

.editor-dialog__body {
  padding: 1.25rem 1rem 0.5rem;
}

.editor-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}

@media (max-width: 600px) {
  .editor-dialog__body {
    padding: 1rem 0.85rem 0.5rem;
  }

  /* Stacked, full-width buttons: side-by-side they are ~150px each on a small phone and the
     secondary action ends up uncomfortably close to the primary one. */
  .editor-dialog__actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>
