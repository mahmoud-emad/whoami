<template>
  <div class="votes-wrap">
    <div class="votes">
      <button type="button" class="votes__btn" :class="{ 'votes__btn--on': tally.mine === 'up' }" :disabled="busy"
        :aria-pressed="tally.mine === 'up'" :title="tally.mine === 'up' ? 'Take back your upvote' : 'Upvote this post'"
        @click="cast('up')">
        <v-icon size="14">mdi-arrow-up-bold-outline</v-icon>
        <span class="votes__count">{{ tally.up }}</span>
      </button>

      <button type="button" class="votes__btn" :class="{ 'votes__btn--on': tally.mine === 'down' }" :disabled="busy"
        :aria-pressed="tally.mine === 'down'"
        :title="tally.mine === 'down' ? 'Take back your downvote' : 'Downvote this post'" @click="cast('down')">
        <v-icon size="14">mdi-arrow-down-bold-outline</v-icon>
        <span class="votes__count">{{ tally.down }}</span>
      </button>

    </div>
    <!-- Outside the pill: an error is about the attempt, not about either arrow. -->
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
.votes-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Reddit-sized: the pair is a small control beside the post, not a call to action. The two
   buttons share one pill so they read as one thing with two directions. */
.votes {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 999px;
}

.votes__btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  /* Smaller than the 40px touch target the rest of the site uses, which is the point — but the
     hit area is padded out below so a thumb still lands on it. */
  height: 26px;
  padding: 0 0.5rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--v-theme-gray-color));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  line-height: 1;
  transition: color .15s ease, background-color .15s ease;
}

/* The visible pill stays small; the tappable area does not, so a thumb still lands on it. */
.votes__btn::after {
  content: '';
  position: absolute;
  inset: -7px -2px;
}

.votes__btn:hover:not(:disabled) {
  color: rgb(var(--v-theme-text-color));
  background: rgba(var(--v-theme-text-color), 0.07);
}

.votes__btn:disabled {
  opacity: 0.6;
}

/* The chosen one is filled, so "what did I press" survives a page reload. */
.votes__btn--on {
  color: rgb(var(--v-theme-link-hover-color));
  background: rgba(var(--v-theme-link-hover-color), 0.16);
}

.votes__count {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.votes__error {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.78rem;
}

/* A hairline between the two halves, so the pill reads as up | down. */
.votes__btn + .votes__btn {
  box-shadow: -1px 0 0 rgb(var(--v-theme-border-color));
}
</style>
