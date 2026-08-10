/**
 * Mounts the section against a stubbed API. The rules it applies to the post list are covered in
 * recentWrites.test.ts; what this adds is that the component actually wires them to the template —
 * that the rows render, and that each one links to the right post on the blog.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import RecentWritesSection from './RecentWritesSection.vue';

const posts = [
  { id: 1, title: 'Old pinned post', content: '', createdAt: '2020-01-01T00:00:00.000Z', pinnedAt: '2026-08-01T00:00:00.000Z' },
  { id: 2, title: 'Newest post', content: '', createdAt: '2026-08-10T00:00:00.000Z' },
  { id: 3, title: 'Hidden draft', content: '', createdAt: '2026-08-09T00:00:00.000Z', show: false },
  { id: 4, title: 'Middle post', content: '', createdAt: '2026-08-05T00:00:00.000Z' },
  { id: 5, title: 'Third newest', content: '', createdAt: '2026-08-04T00:00:00.000Z' },
];

// Partial mock: useAdmin reads getToken from this same module at import time, and a bare factory
// would leave it undefined and take the component down before it rendered anything.
vi.mock('../../utils/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/api')>()),
  apiFetch: vi.fn(async () => ({
    ok: true,
    json: async () => ({ data: posts, total: posts.length }),
  })),
}));

// Braced, not a concise arrow: returning the Pinia instance would be read as a cleanup callback.
beforeEach(() => {
  setActivePinia(createPinia());
});

const mountSection = async () => {
  const wrapper = mount(RecentWritesSection, {
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: { 'router-link': { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  });
  await flushPromises();
  return wrapper;
};

describe('RecentWritesSection', () => {
  it('shows the three newest posts, newest first', async () => {
    const html = (await mountSection()).html();
    expect(html).toContain('Newest post');
    expect(html).toContain('Middle post');
    expect(html).toContain('Third newest');
    expect(html.indexOf('Newest post')).toBeLessThan(html.indexOf('Middle post'));
  });

  it('never shows a hidden post', async () => {
    expect((await mountSection()).html()).not.toContain('Hidden draft');
  });

  // The blog floats this one to the top; a section headed "recent" must not.
  it('does not let a pin promote an old post', async () => {
    expect((await mountSection()).html()).not.toContain('Old pinned post');
  });

  it('deep links each row to its post on the blog', async () => {
    const html = (await mountSection()).html();
    expect(html).toContain('/blog#post-2');
    expect(html).toContain('/blog#post-4');
  });

  // Four visible posts, three shown — so there is genuinely more to read.
  it('offers the blog when it is holding posts back', async () => {
    expect((await mountSection()).html()).toContain('Read the rest of the blog');
  });
});
