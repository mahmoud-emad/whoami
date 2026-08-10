<template>
  <!--
    Teleported to <body> so the overlay is never trapped by an ancestor's stacking context. The
    post cards, the navbar and the layout all create their own; a fixed-position child of any of
    them would sit under the next one along, whatever its z-index says.
  -->
  <Teleport to="body">
    <Transition name="viewer">
      <!--
        The whole backdrop is the close button — that is what "click anywhere to close" means, and
        it includes the image itself, so there is no dead zone to hunt for a way out of.

        role="dialog" with a label rather than a bare div: to a screen reader this is a thing that
        opened over the page, not decoration, and Escape has to be advertised as the way out.
      -->
      <div v-if="isOpen" class="viewer" role="dialog" aria-modal="true"
        :aria-label="alt ? `Image: ${alt}` : 'Image viewer'" @click="close">
        <img class="viewer__image" :src="src" :alt="alt" />

        <!--
          Decorative: the backdrop already closes on click, and this just repeats it where people
          look for the familiar control. The click reaches `close` by bubbling to the backdrop.

          A <span> rather than a <button> on purpose. style.css paints every button with
          `color: rgb(var(--v-theme-text-color)) !important`, which on this permanently dark
          backdrop resolves to near-black under the light theme — an invisible X. Matching that
          !important with another one would work and would leave the next person to edit this
          wondering why. It was never a real button anyway: it is aria-hidden and unfocusable,
          because the accessible ways out are Escape and clicking anywhere.
        -->
        <span class="viewer__close" aria-hidden="true" title="Close">
          <v-icon size="20">mdi-close</v-icon>
        </span>

        <p v-if="alt" class="viewer__caption">{{ alt }}</p>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { useImageViewer } from '../composables/useImageViewer';

const { src, alt, isOpen, close } = useImageViewer();

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') close();
};

/**
 * The listener and the scroll lock are tied to the open state, not to the component's lifetime:
 * this is mounted for the whole session, so binding them on mount would swallow Escape on every
 * page and freeze the body scroll permanently.
 *
 * `overflow: hidden` on <html> rather than <body> — Vuetify's own overlays lock the html element,
 * and a page that scrolled behind the image would drift the picture off screen under the pointer.
 */
watch(isOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', onKeydown);
    document.documentElement.style.overflow = 'hidden';
  } else {
    window.removeEventListener('keydown', onKeydown);
    document.documentElement.style.overflow = '';
  }
});

// A route change can unmount the app mid-view; leaving the scroll locked would strand the page.
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  document.documentElement.style.overflow = '';
});
</script>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  /* Above Vuetify's overlay stack (2400) so an image opened from inside a dialog still wins. */
  z-index: 2500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: clamp(1rem, 4vw, 3rem);
  /* Near-black regardless of theme: a light backdrop would wash out the picture, which is the
     only thing on screen that matters here. */
  background: rgba(0, 0, 0, 0.88);
  cursor: zoom-out;
  backdrop-filter: blur(2px);
}

/*
  Capped by both axes so a tall photo is bounded by the viewport height and a wide one by its
  width — either way the whole image is visible without scrolling, which is the point of opening
  it. `object-fit: contain` keeps the aspect ratio while it is fitted.
*/
.viewer__image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}

/*
  Fixed light-on-dark, not theme tokens. The backdrop is near-black under both themes, so a token
  that flips with the theme would take the X with it — which is exactly how it went missing in
  light mode. Everything inside this overlay is coloured against the backdrop, not the page.
*/
.viewer__close {
  position: absolute;
  top: clamp(0.75rem, 2vw, 1.25rem);
  right: clamp(0.75rem, 2vw, 1.25rem);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  cursor: zoom-out;
}

/* VIcon renders its own element, so the colour has to reach it rather than stopping at the span. */
.viewer__close :deep(.v-icon) {
  color: #fff;
}

.viewer__caption {
  margin: 0;
  max-width: 60ch;
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.72);
}

/* Fade only. A zoom would fight the layout shift while the image is still being fitted. */
.viewer-enter-active,
.viewer-leave-active {
  transition: opacity 0.18s ease;
}

.viewer-enter-from,
.viewer-leave-to {
  opacity: 0;
}

/* Respect a reduced-motion preference: appear and disappear, no fade. */
@media (prefers-reduced-motion: reduce) {

  .viewer-enter-active,
  .viewer-leave-active {
    transition: none;
  }
}
</style>
