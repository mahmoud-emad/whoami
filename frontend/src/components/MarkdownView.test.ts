/**
 * The image-viewer wiring. The renderer rebuilds its own HTML whenever the content or an async
 * library changes, so the click handler is delegated from the container rather than bound per
 * image — these mount the real component and click a real rendered <img> to prove that holds.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import MarkdownView from './MarkdownView.vue';
import { useImageViewer } from '../composables/useImageViewer';

const mountMd = async (content: string) => {
  const wrapper = mount(MarkdownView, {
    props: { content },
    global: { plugins: [createVuetify({ components, directives })] },
  });
  await flushPromises();
  return wrapper;
};

// One viewer for the whole app, so state carries between tests unless it is reset.
beforeEach(() => useImageViewer().close());

describe('MarkdownView images', () => {
  it('opens a clicked image, carrying its alt text as the caption', async () => {
    const wrapper = await mountMd('![A broken chair](/uploads/chair.png)');
    await wrapper.find('img').trigger('click');

    const viewer = useImageViewer();
    expect(viewer.isOpen.value).toBe(true);
    expect(viewer.src.value).toContain('/uploads/chair.png');
    expect(viewer.alt.value).toBe('A broken chair');
  });

  // An author who wrapped an image in a link meant it to be followed.
  it('leaves a linked image to its link', async () => {
    const wrapper = await mountMd('[![logo](/uploads/logo.png)](https://example.com)');
    await wrapper.find('img').trigger('click');
    expect(useImageViewer().isOpen.value).toBe(false);
  });

  it('ignores clicks on the prose around an image', async () => {
    const wrapper = await mountMd('Some words.\n\n![chair](/uploads/chair.png)');
    await wrapper.find('p').trigger('click');
    expect(useImageViewer().isOpen.value).toBe(false);
  });

  it('still opens an image that arrived with new content', async () => {
    const wrapper = await mountMd('No pictures here.');
    await wrapper.setProps({ content: '![later](/uploads/later.png)' });
    await flushPromises();

    await wrapper.find('img').trigger('click');
    expect(useImageViewer().src.value).toContain('/uploads/later.png');
  });
});
