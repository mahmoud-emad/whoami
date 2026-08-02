<template>
  <div class="votes">
    <button type="button" class="votes__btn" :class="{ 'votes__btn--on': tally.mine === 'up' }" :disabled="busy"
      :aria-pressed="tally.mine === 'up'" :title="tally.mine === 'up' ? 'Take back your upvote' : 'Upvote this post'"
      @click="cast('up')">
      <v-icon size="18">mdi-arrow-up-bold-outline</v-icon>
      <span class="votes__count">{{ tally.up }}</span>
      <span class="votes__label">Helpful</span>
    </button>

    <button type="button" class="votes__btn" :class="{ 'votes__btn--on': tally.mine === 'down' }" :disabled="busy"
      :aria-pressed="tally.mine === 'down'"
      :title="tally.mine === 'down' ? 'Take back your downvote' : 'Downvote this post'" @click="cast('down')">
      <v-icon size="18">mdi-arrow-down-bold-outline</v-icon>
      <span class="votes__count">{{ tally.down }}</span>
      <span class="votes__label">Not for me</span>
    </button>

    <span v-if="failed" class="votes__error">{{ failed }}</span>
  </div>
</template>

<script lang="ts">
/**
 * Up and down votes on a post, for readers who are not signed in to anything.
 *
 * No accounts and no replies: the whole interaction is one click, and clicking the arrow already
 * chosen takes the vote back. The server identifies a voter by a salted hash of their address, so
 * one reader gets one vote per post and can change it — a courtesy limit rather than a guarantee,
 * which is the right trade when the alternative is making somebody sign up to say they liked
 * something.
 */
import { defineComponent, ref, watch, type PropType } from 'vue';
import { apiFetch } from '../utils/api';

type Vote = 'up' | 'down';

export interface Tally {
  up: number;
  down: number;
  mine: Vote | null;
}

const emptyTally = (): Tally => ({ up: 0, down: 0, mine: null });

export default defineComponent({
  name: 'PostVotes',
  props: {
    postId: { type: Number, required: true },
    /** Seeded from the listing response, so the counts never flash zero on the way in. */
    initial: { type: Object as PropType<Tally | null>, default: null },
  },
  setup(props) {
    const tally = ref<Tally>({ ...emptyTally(), ...(props.initial || {}) });
    const busy = ref(false);
    const failed = ref('');

    watch(() => props.initial, (value) => {
      if (value && !busy.value) tally.value = { ...emptyTally(), ...value };
    });

    const cast = async (vote: Vote) => {
      if (busy.value) return;
      failed.value = '';

      // Clicking the arrow you already chose is "undo", not "vote again".
      const next = tally.value.mine === vote ? null : vote;
      const before = { ...tally.value };

      // Applied first so the click feels instant, and rolled back if the write fails.
      const optimistic = { ...before };
      if (before.mine === 'up') optimistic.up -= 1;
      if (before.mine === 'down') optimistic.down -= 1;
      if (next === 'up') optimistic.up += 1;
      if (next === 'down') optimistic.down += 1;
      optimistic.mine = next;
      tally.value = optimistic;

      busy.value = true;
      try {
        const res = await apiFetch(`/posts/${props.postId}/reactions`, {
          method: 'POST',
          body: JSON.stringify({ vote: next }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Could not record that.');
        // The server's count wins: somebody else may have voted while this one was in flight.
        if (json.data) tally.value = { ...emptyTally(), ...json.data };
      } catch (e: unknown) {
        tally.value = before;
        failed.value = e instanceof Error ? e.message : 'Could not record that.';
      } finally {
        busy.value = false;
      }
    };

    return { tally, busy, failed, cast };
  },
});
</script>

<style scoped>
.votes {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.votes__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  /* 40px is the smallest a thumb reliably hits. */
  min-height: 40px;
  padding: 0.3rem 0.75rem;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--v-theme-gray-color));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8rem;
  line-height: 1;
  transition: color .15s ease, border-color .15s ease, background-color .15s ease;
}

.votes__btn:hover:not(:disabled) {
  color: rgb(var(--v-theme-text-color));
  border-color: rgb(var(--v-theme-link-hover-color));
}

.votes__btn:disabled {
  opacity: 0.6;
}

/* The chosen one is filled, so "what did I press" survives a page reload. */
.votes__btn--on {
  color: rgb(var(--v-theme-link-hover-color));
  border-color: rgb(var(--v-theme-link-hover-color));
  background: rgba(var(--v-theme-link-hover-color), 0.12);
}

.votes__count {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.votes__error {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.78rem;
}

/* The words are for pointing devices; on a phone the arrow and the number say it. */
@media (max-width: 600px) {
  .votes__label {
    display: none;
  }
}
</style>
