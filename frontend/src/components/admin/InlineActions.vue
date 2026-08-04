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

    <!--
      Pinning asks in a dialog rather than arming in place like delete does: it changes what every
      reader sees first, so the prompt should say that in words before it happens.
    -->
    <v-btn v-if="pinnable && !confirming" class="inline-actions__btn" variant="text" density="comfortable"
      :class="{ 'inline-actions__btn--on': pinned }" :icon="pinned ? 'mdi-pin' : 'mdi-pin-outline'"
      :title="pinTitle" :aria-label="pinTitle" :aria-pressed="pinned"
      @click.stop="$emit('toggle-pinned')"></v-btn>

    <!-- Hiding is reversible, so unlike delete it fires on the first click. -->
    <v-btn v-if="hideable && !confirming" class="inline-actions__btn" variant="text" density="comfortable"
      :icon="hidden ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" :title="hideTitle" :aria-label="hideTitle"
      @click.stop="$emit('toggle-hidden')"></v-btn>

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
    /** Show the pin toggle. Off by default; only the blog pins things today. */
    pinnable: { type: Boolean, default: false },
    /** Current state, so the icon and the tooltip can offer the opposite action. */
    pinned: { type: Boolean, default: false },
    /** Show the hide/unhide toggle. Off by default; only collections with a `show` field use it. */
    hideable: { type: Boolean, default: false },
    /** Current state, so the button can offer the opposite action. */
    hidden: { type: Boolean, default: false },
    /** Noun used in the tooltips, e.g. 'project' -> "Edit project". */
    label: { type: String, default: '' },
  },
  emits: ['edit', 'remove', 'add', 'toggle-hidden', 'toggle-pinned'],
  setup(props, { emit }) {
    const { isAdmin } = useAdmin();
    const confirming = ref(false);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const noun = computed(() => (props.label ? ` ${props.label}` : ''));
    const addTitle = computed(() => `New${noun.value || ' item'}`);
    const editTitle = computed(() => `Edit${noun.value}`);
    const removeTitle = computed(() => `Delete${noun.value}`);
    const pinTitle = computed(() =>
      props.pinned ? `Unpin${noun.value}` : `Pin${noun.value} to the top`);

    // Says what the click will do, not what the current state is.
    const hideTitle = computed(() =>
      props.hidden ? `Show${noun.value} on the site` : `Hide${noun.value} from the site`);
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
      hideTitle,
      pinTitle,
      confirmTitle,
      requestRemove,
      confirmRemove,
      cancelRemove,
    };
  },
});
</script>

<style scoped>
/* A pinned post's button stays lit, so the state is visible without hovering for the tooltip. */
.inline-actions__btn--on {
  color: rgb(var(--v-theme-link-hover-color)) !important;
}

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
