<template>
  <!--
    Renders nothing at all for a visitor: the whole strip is behind `isAdmin`, so a signed-out page
    keeps exactly the markup it had before in-place editing existed.
  -->
  <div v-if="isAdmin" class="inline-actions" :class="{ 'inline-actions--confirming': confirming }">
    <v-btn v-if="add" class="inline-actions__btn" variant="text" density="comfortable" icon="mdi-plus"
      :title="addTitle" :aria-label="addTitle" @click.stop="$emit('add')"></v-btn>

    <v-btn v-if="edit && !confirming" class="inline-actions__btn" variant="text" density="comfortable"
      icon="mdi-pencil-outline" :title="editTitle" :aria-label="editTitle" @click.stop="$emit('edit')"></v-btn>

    <template v-if="remove">
      <v-btn v-if="!confirming" class="inline-actions__btn" variant="text" density="comfortable"
        icon="mdi-delete-outline" :title="removeTitle" :aria-label="removeTitle"
        @click.stop="requestRemove"></v-btn>

      <!--
        Deleting is irreversible and there is no undo, so the trash icon only arms the action; the
        second, explicitly-labelled click is the one that fires. The prompt replaces the icon in
        place rather than opening a modal, which would be heavy for a one-line confirmation.
      -->
      <template v-else>
        <span class="inline-actions__ask">Delete?</span>
        <v-btn class="inline-actions__btn inline-actions__btn--danger" variant="text" density="comfortable"
          color="error" icon="mdi-check" :title="confirmTitle" :aria-label="confirmTitle"
          @click.stop="confirmRemove"></v-btn>
        <v-btn class="inline-actions__btn" variant="text" density="comfortable" icon="mdi-close" title="Keep it"
          aria-label="Keep it" @click.stop="cancelRemove"></v-btn>
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onScopeDispose, ref } from 'vue';
import { useAdmin } from '../../composables/useAdmin';

// How long an armed delete stays armed. Long enough to move the pointer across a card, short enough
// that a forgotten confirm button does not sit there waiting for an accidental click.
const CONFIRM_TIMEOUT_MS = 6000;

export default defineComponent({
  name: 'InlineActions',
  props: {
    /** Show a create (+) button. Off by default — most call sites only edit and delete. */
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: true },
    remove: { type: Boolean, default: true },
    /** Noun used in the tooltips, e.g. 'project' -> "Edit project". */
    label: { type: String, default: '' },
  },
  emits: ['edit', 'remove', 'add'],
  setup(props, { emit }) {
    const { isAdmin } = useAdmin();
    const confirming = ref(false);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const noun = computed(() => (props.label ? ` ${props.label}` : ''));
    const addTitle = computed(() => `New${noun.value || ' item'}`);
    const editTitle = computed(() => `Edit${noun.value}`);
    const removeTitle = computed(() => `Delete${noun.value}`);
    const confirmTitle = computed(() => `Yes, delete${noun.value}`);

    const stopTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const cancelRemove = () => {
      confirming.value = false;
      stopTimer();
    };

    const requestRemove = () => {
      confirming.value = true;
      stopTimer();
      timer = setTimeout(cancelRemove, CONFIRM_TIMEOUT_MS);
    };

    const confirmRemove = () => {
      cancelRemove();
      emit('remove');
    };

    onScopeDispose(stopTimer);

    return {
      isAdmin,
      confirming,
      addTitle,
      editTitle,
      removeTitle,
      confirmTitle,
      requestRemove,
      confirmRemove,
      cancelRemove,
    };
  },
});
</script>

<style scoped>
.inline-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  /* Quiet until wanted: the controls are chrome for one person, not part of the content. */
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.inline-actions:hover,
.inline-actions:focus-within,
.inline-actions--confirming {
  opacity: 1;
}

/* v-btn's own small/comfortable sizes land under 40px; this pins the touch target at the minimum
   comfortable size on a phone without making the icons themselves bigger. */
.inline-actions__btn.v-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  color: rgb(var(--v-theme-text-color));
}

.inline-actions__btn--danger.v-btn {
  color: rgb(var(--v-theme-error));
}

.inline-actions__ask {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: rgb(var(--v-theme-gray-color));
}
</style>
