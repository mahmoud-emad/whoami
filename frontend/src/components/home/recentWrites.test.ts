import { describe, expect, it } from 'vitest';
import { MAX_WRITES, countVisible, selectRecentWrites } from './recentWrites';
import type { PostType } from '../../types';

const post = (over: Partial<PostType> & { id: number }): PostType => ({
  title: `Post ${over.id}`,
  content: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('selectRecentWrites', () => {
  it('returns the newest first', () => {
    const picked = selectRecentWrites([
      post({ id: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
      post({ id: 2, createdAt: '2026-03-01T00:00:00.000Z' }),
      post({ id: 3, createdAt: '2026-02-01T00:00:00.000Z' }),
    ]);
    expect(picked.map((p) => p.id)).toEqual([2, 3, 1]);
  });

  // The whole reason this does not just take the first rows the API returns: /posts sorts pinned
  // posts to the top, and a "recent" list led by an old pinned post misreports the blog.
  it('ignores pinning', () => {
    const picked = selectRecentWrites([
      post({ id: 1, createdAt: '2020-01-01T00:00:00.000Z', pinnedAt: '2026-08-01T00:00:00.000Z' }),
      post({ id: 2, createdAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    expect(picked.map((p) => p.id)).toEqual([2, 1]);
  });

  it('drops hidden posts', () => {
    const picked = selectRecentWrites([
      post({ id: 1, createdAt: '2026-03-01T00:00:00.000Z', show: false }),
      post({ id: 2, createdAt: '2026-02-01T00:00:00.000Z' }),
    ]);
    expect(picked.map((p) => p.id)).toEqual([2]);
  });

  // `show` is absent on every post written before hiding existed; absent means visible.
  it('keeps posts with no show flag', () => {
    expect(selectRecentWrites([post({ id: 1 })])).toHaveLength(1);
  });

  it('caps the list', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      post({ id: i, createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` })
    );
    expect(selectRecentWrites(many)).toHaveLength(MAX_WRITES);
    expect(selectRecentWrites(many, 2)).toHaveLength(2);
  });

  it('does not reorder its input', () => {
    const posts = [
      post({ id: 1, createdAt: '2026-01-01T00:00:00.000Z' }),
      post({ id: 2, createdAt: '2026-03-01T00:00:00.000Z' }),
    ];
    selectRecentWrites(posts);
    expect(posts.map((p) => p.id)).toEqual([1, 2]);
  });

  // A malformed date must sink rather than scramble the posts around it — see `at`.
  it('sorts an unparseable date to the bottom without disturbing the rest', () => {
    const picked = selectRecentWrites([
      post({ id: 1, createdAt: 'not a date' }),
      post({ id: 2, createdAt: '2026-01-01T00:00:00.000Z' }),
      post({ id: 3, createdAt: '2026-02-01T00:00:00.000Z' }),
    ]);
    expect(picked.map((p) => p.id)).toEqual([3, 2, 1]);
  });

  it('handles an empty list', () => {
    expect(selectRecentWrites([])).toEqual([]);
  });
});

describe('countVisible', () => {
  it('counts only what a visitor could read', () => {
    expect(
      countVisible([post({ id: 1 }), post({ id: 2, show: false }), post({ id: 3, show: true })])
    ).toBe(2);
  });
});
