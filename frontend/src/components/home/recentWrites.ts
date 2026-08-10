import type { PostType } from '../../types';

/** How many posts the home-page teaser shows. Enough to prove the blog is alive, short to scan. */
export const MAX_WRITES = 3;

/**
 * A timestamp as milliseconds, or 0 when it is missing or unparseable.
 *
 * Without this a bad `createdAt` yields NaN, and a comparator returning NaN is read as "equal" —
 * so one malformed date would quietly scramble the order of everything around it rather than
 * sinking to the bottom.
 */
const at = (value?: string): number => {
  const ms = Date.parse(value || '');
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * The newest posts, for the home page.
 *
 * Two things the `/posts` listing order cannot give this section, which is why it re-derives them
 * rather than taking the first few rows:
 *
 * Hidden posts go, even for the owner. The blog dims them in place to say what they are; there is
 * no such affordance on the home page, so a draft would read as published.
 *
 * Pins are ignored. The blog floats pinned posts to the top on purpose, but a section headed
 * "recent" that leads with a year-old pinned post is lying to the reader.
 *
 * Lives outside the component so these rules can be tested without mounting Vuetify, Pinia and a
 * router to assert on the shape of a list.
 */
export const selectRecentWrites = (posts: PostType[], limit: number = MAX_WRITES): PostType[] => {
  const visible = posts.filter((post) => post.show !== false);
  return [...visible].sort((a, b) => at(b.createdAt) - at(a.createdAt)).slice(0, limit);
};

/** How many posts a visitor could still go and read, given what the teaser is already showing. */
export const countVisible = (posts: PostType[]): number =>
  posts.filter((post) => post.show !== false).length;
