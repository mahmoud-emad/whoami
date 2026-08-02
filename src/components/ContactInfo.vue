<template>
  <div class="contact-info">
    <h2 v-if="title" class="section-heading">
      <span v-html="title"></span>
    </h2>
    <p v-if="description" class="section-intro" v-html="description + (additionalText || '')"></p>

    <!-- No `color="transparent"`: that prop emits a `!important` background rule that no scoped
         style can override, which is why this card could never take the theme's panel colour. -->
    <v-card class="contact-info__card" :class="{ 'contact-info__card--wide': cols, 'contact-info__card--flush': flush }"
      flat>
      <!--
        rel="me" is what makes these profiles verifiable as the same person: an IndieWeb consumer
        follows the link, finds a rel="me" pointing back at this domain, and treats the identity as
        confirmed. It is also what IndieAuth uses to let the owner sign in with their own domain.
        Only real profile links get it, which is why it is a prop rather than always-on.
      -->
      <a class="contact-info__link" :href="link" target="_blank" :rel="linkRel">
        <template v-if="icon">
          <v-icon v-if="icon.startsWith('mdi-')" size="18">{{ icon }}</v-icon>
          <span v-else aria-hidden="true">{{ icon }}</span>
        </template>
        <span class="contact-info__text">{{ linkText }}</span>
      </a>
    </v-card>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'ContactInfo',
  props: {
    title: String,
    description: String,
    additionalText: String,
    link: String,
    linkText: String,
    /** True on md-and-up. Only affects the type size, never the alignment. */
    cols: Boolean,
    icon: String,
    /** Set for links that are genuinely another profile of the site owner. */
    me: { type: Boolean, default: false },
    /**
     * Drop the card's border and side padding so the link sits on the page's own left edge.
     * Contact sets it: a boxed e-mail sitting a dozen pixels right of the "Elsewhere" rows below
     * it read as two different kinds of thing that had failed to line up. More does not — there
     * the block really is a card in a grid.
     */
    flush: { type: Boolean, default: false },
  },
  setup(props) {
    // noopener on every external link; "me" only where the link really is another profile of the
    // owner, since claiming identity on an arbitrary URL would be wrong.
    const linkRel = computed(() => (props.me ? 'me noopener' : 'noopener'));

    return { linkRel };
  },
});
</script>

<style scoped>
/* The block owns its own rhythm rather than inheriting a `.section` rule from whichever page
   happens to mount it (Contact and More styled that class differently). */
.contact-info {
  margin-bottom: 1.25rem;
  /* The heading, the description and the card all start on the same left edge as the rest of the
     page. The card used to centre its own contents on narrow screens, which put this block half a
     column out of step with everything above it. */
  min-width: 0;
}

.contact-info__card {
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 6px;
  background: rgb(var(--v-theme-box-bg-color));
  box-shadow: none;
}

/* Flush variant: the same hairline row the rest of the page uses, aligned to the column edge. */
.contact-info__card--flush {
  border: 0;
  border-top: 1px solid rgb(var(--v-theme-border-color));
  border-bottom: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 0;
  background: transparent;
}

.contact-info__card--flush .contact-info__link {
  padding-left: 0;
  padding-right: 0;
}

/* The card is the tap target, so the padding is what gets the row past the ~40px a thumb needs. */
.contact-info__link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0.55rem 0.75rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: rgb(var(--v-theme-text-color)) !important;
}

.contact-info__card--wide .contact-info__link {
  font-size: 0.9375rem;
}

.contact-info__link:hover {
  color: rgb(var(--v-theme-link-hover-color)) !important;
}

.contact-info__text {
  /* Channel links are configuration now, so they can be long unbroken strings (a Signal invite, a
     long e-mail address). Without min-width:0 plus a break rule they push the page sideways on a
     390px screen. */
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
