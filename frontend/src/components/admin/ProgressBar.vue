<template>
  <div class="pb" :class="{ 'pb--slim': slim }">
    <span v-if="showCount" class="pb__count">{{ done }} / {{ total }}</span>
    <span class="pb__track" role="progressbar" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"
      :aria-label="label || undefined">
      <span class="pb__fill" :style="{ width: percent + '%' }"></span>
    </span>
    <span v-if="showPercent" class="pb__pct">{{ percent }}%</span>
  </div>
</template>

<script lang="ts">
/**
 * How much of something is done.
 *
 * Written three times across the lists pages with the same track-and-fill markup and three
 * different heights. The percentage is derived here so no caller has to remember to guard against
 * dividing by zero on an empty list.
 */
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'ProgressBar',
  props: {
    done: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    /** Thinner track, for a bar under a heading rather than one that is the headline itself. */
    slim: { type: Boolean, default: false },
    showCount: { type: Boolean, default: true },
    showPercent: { type: Boolean, default: false },
    /** Accessible name, since a bare bar says nothing to a screen reader. */
    label: { type: String, default: '' },
  },
  setup(props) {
    // An empty list is 0%, not NaN%.
    const percent = computed(() =>
      props.total > 0 ? Math.round((props.done / props.total) * 100) : 0);
    return { percent };
  },
});
</script>

<style scoped>
.pb {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: rgb(var(--v-theme-gray-color));
}

.pb__count {
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
  font-variant-numeric: tabular-nums;
}

.pb__track {
  flex: 1 1 auto;
  min-width: 60px;
  height: 6px;
  border-radius: 999px;
  background: rgb(var(--v-theme-form));
  overflow: hidden;
}

.pb--slim .pb__track {
  height: 3px;
}

.pb__fill {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-link-hover-color));
  transition: width .3s ease;
}

.pb__pct {
  font-variant-numeric: tabular-nums;
}
</style>
