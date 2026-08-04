<template>
  <!--
    Renders nothing for a visitor. Gating here rather than at each call site means a page cannot
    forget the check and leak its controls, the same guarantee InlineActions gives.
  -->
  <div v-if="isAdmin" class="owner-bar" :class="{ 'owner-bar--flush': flush }">
    <slot />
  </div>
</template>

<script lang="ts">
/**
 * The strip of owner controls that sits above a list or beside a heading.
 *
 * Twelve files had their own copy of this rule, and they had drifted: some centred their items,
 * some did not, and the top margin was 12px in one place and 1rem in another. One component, one
 * answer.
 */
import { defineComponent } from 'vue';
import { useAdmin } from '../../composables/useAdmin';

export default defineComponent({
  name: 'OwnerBar',
  props: {
    /** Drop the top margin, for bars that sit directly under their own heading. */
    flush: { type: Boolean, default: false },
  },
  setup() {
    const { isAdmin } = useAdmin();
    return { isAdmin };
  },
});
</script>

<style scoped>
.owner-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 1rem;
  min-width: 0;
}

.owner-bar--flush {
  margin-top: 0;
}
</style>
