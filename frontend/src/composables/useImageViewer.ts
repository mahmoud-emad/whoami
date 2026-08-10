import { readonly, ref } from 'vue';

/**
 * The one image currently blown up to full screen, if any.
 *
 * State lives at module scope rather than inside the component, so anything on the page can open
 * the viewer without owning it. The blog renders one MarkdownView per post; a per-component viewer
 * would mean a dozen overlays mounted on that page, each with its own key listener and its own
 * claim on `body`'s scroll position. There is exactly one screen, so there is exactly one viewer,
 * mounted once in App.vue.
 */
const src = ref('');
const alt = ref('');
const isOpen = ref(false);

export const useImageViewer = () => {
  const open = (imageSrc: string, imageAlt = ''): void => {
    if (!imageSrc) return;
    src.value = imageSrc;
    alt.value = imageAlt;
    isOpen.value = true;
  };

  /**
   * Closing keeps `src` rather than clearing it. Blanking it here would swap the <img> to an empty
   * source for the length of the fade-out, so the picture would vanish a beat before the backdrop
   * does. The next open overwrites it anyway.
   */
  const close = (): void => {
    isOpen.value = false;
  };

  return {
    src: readonly(src),
    alt: readonly(alt),
    isOpen: readonly(isOpen),
    open,
    close,
  };
};
