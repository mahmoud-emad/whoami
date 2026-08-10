/**
 * The overlay teleports to <body>, so these query the document rather than the wrapper.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import ImageViewer from './ImageViewer.vue';
import { useImageViewer } from '../composables/useImageViewer';

let wrapper: ReturnType<typeof mount>;

const overlay = () => document.querySelector<HTMLElement>('.viewer');

beforeEach(() => {
  useImageViewer().close();
  wrapper = mount(ImageViewer, {
    global: { plugins: [createVuetify({ components, directives })] },
  });
});

afterEach(() => {
  useImageViewer().close();
  wrapper.unmount();
});

const openViewer = async () => {
  useImageViewer().open('/uploads/chair.png', 'A broken chair');
  await nextTick();
};

describe('ImageViewer', () => {
  it('shows the image and its caption once opened', async () => {
    expect(overlay()).toBeNull();
    await openViewer();

    const img = overlay()?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/uploads/chair.png');
    expect(overlay()?.textContent).toContain('A broken chair');
  });

  it('closes on a click anywhere on the backdrop', async () => {
    await openViewer();
    overlay()?.click();
    await nextTick();
    expect(useImageViewer().isOpen.value).toBe(false);
  });

  // The image is inside the backdrop, so clicking it must close too — no dead zone.
  it('closes on a click on the image itself', async () => {
    await openViewer();
    overlay()?.querySelector('img')?.click();
    await nextTick();
    expect(useImageViewer().isOpen.value).toBe(false);
  });

  it('closes on the X', async () => {
    await openViewer();
    overlay()?.querySelector<HTMLElement>('.viewer__close')?.click();
    await nextTick();
    expect(useImageViewer().isOpen.value).toBe(false);
  });

  /*
   * style.css paints every <button> with the theme's text colour and !important, which on this
   * permanently dark backdrop is near-black under the light theme — the X was invisible there.
   * Keeping the control out of that selector is the fix, so this guards the element it renders as.
   */
  it('does not render the X as a button, which a global rule would recolour', async () => {
    await openViewer();
    expect(overlay()?.querySelector('.viewer__close')?.tagName).toBe('SPAN');
    expect(overlay()?.querySelector('button')).toBeNull();
  });

  it('closes on Escape', async () => {
    await openViewer();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(useImageViewer().isOpen.value).toBe(false);
  });

  // Mounted for the whole session, so it must not eat keys or hold the scroll lock while closed.
  it('locks page scroll only while open', async () => {
    expect(document.documentElement.style.overflow).toBe('');
    await openViewer();
    expect(document.documentElement.style.overflow).toBe('hidden');

    useImageViewer().close();
    await nextTick();
    expect(document.documentElement.style.overflow).toBe('');
  });
});
