<template>
  <span class="reorder">
    <v-btn class="reorder__btn" variant="text" density="comfortable" icon="mdi-arrow-up" :disabled="disabled || !canUp"
      :title="`Move this ${noun} up`" :aria-label="`Move this ${noun} up`" @click.stop="$emit('up')"></v-btn>
    <v-btn class="reorder__btn" variant="text" density="comfortable" icon="mdi-arrow-down"
      :disabled="disabled || !canDown" :title="`Move this ${noun} down`" :aria-label="`Move this ${noun} down`"
      @click.stop="$emit('down')"></v-btn>
  </span>
</template>

<script lang="ts">
/**
 * Move one entry up or down within its list.
 *
 * The same pair of buttons appeared in four places with the same disabled-at-the-ends logic
 * rewritten each time. Callers pass whether each direction is possible; deciding that needs the
 * list, which is theirs.
 */
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ReorderControls',
  props: {
    /** Used in the tooltips: "Move this channel up". */
    noun: { type: String, default: 'item' },
    canUp: { type: Boolean, default: true },
    canDown: { type: Boolean, default: true },
    /** Blocks both while a write is in flight. */
    disabled: { type: Boolean, default: false },
  },
  emits: ['up', 'down'],
});
</script>

<style scoped>
.reorder {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.reorder__btn {
  color: rgb(var(--v-theme-gray-color)) !important;
}

.reorder__btn:hover:not(.v-btn--disabled) {
  color: rgb(var(--v-theme-text-color)) !important;
}
</style>
