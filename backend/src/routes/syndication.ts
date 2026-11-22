import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase } from '../db';
import { readConfig } from '../config/store';
import { escapeHtml } from '../lib/html';
import { log } from '../lib/logger';
import { sortPosts } from './posts';
import type { DbRecord } from '../types';

/**
 * `/feed.xml`, `/sitemap.xml` and `/robots.txt` — the parts of the site that machines read.
 *
 * Mounted at the root, like `/cv.pdf`, because feed readers and crawlers look for these exact
 * paths. All three build absolute URLs from the configured `meta.siteUrl` and nothing else: the
 * request's Host header is attacker-controlled and would otherwise end up in a cached document.
 * Without a siteUrl the feed and sitemap answer 404 rather than guess, and robots.txt simply
 * leaves out its Sitemap line.
 *
 * Hidden posts are the owner's drafts and are filtered here exactly as `GET /posts` filters them
 * for anyone who is not the owner. A feed is always anonymous, so there is no owner branch.
 */
export const syndicationRouter: Router = express.Router();

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const FEED_LIMIT = 20;
const SUMMARY_LENGTH = 280;

/** The site's origin without a trailing slash, or '' when it is not configured or not http(s). */
const readSiteUrl = async (): Promise<string> => {
  const config = await readConfig();
  const meta = config?.meta as Record<string, unknown> | undefined;
  const raw = typeof meta?.siteUrl === 'string' ? meta.siteUrl.trim() : '';
  if (!/^https?:\/\//i.test(raw)) return '';
  return raw.replace(/\/+$/, '');
};

const publicPosts = async (): Promise<DbRecord[]> => {
  const db = await readDatabase();
  return sortPosts(db.posts.filter((post) => post.show !== false && typeof post.uuid === 'string'));
};

const iso = (value: unknown): string => {
  const ms = Date.parse(typeof value === 'string' ? value : '');
  return new Date(Number.isNaN(ms) ? 0 : ms).toISOString();
};

/** First stretch of a post as plain text: markdown punctuation dropped, whitespace collapsed. */
export const summarise = (markdown: unknown): string => {
  const text = String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH).trimEnd()}…` : text;
};

syndicationRouter.get('/feed.xml', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [siteUrl, config, posts] = await Promise.all([readSiteUrl(), readConfig(), publicPosts()]);
    if (!siteUrl) {
      res.status(404).type('txt').send('Not found');
      return;
    }
    const meta = (config?.meta ?? {}) as Record<string, unknown>;
    const profile = (config?.profile ?? {}) as Record<string, unknown>;
    const title = String(meta.title || profile.fullName || 'Blog');
    const author = String(profile.fullName || title);
    const entries = posts.slice(0, FEED_LIMIT);

    // Newest *post* date, not the first entry's: pinning puts an older post at the top of the list.
    const newest = entries.reduce((max, post) => Math.max(max, Date.parse(iso(post.createdAt))), 0);

    const body = entries
      .map((post) => {
        const url = `${siteUrl}/blog/${post.uuid}`;
        return `  <entry>
    <title>${escapeHtml(post.title)}</title>
    <id>${escapeHtml(url)}</id>
    <link href="${escapeHtml(url)}" />
    <published>${iso(post.createdAt)}</published>
    <updated>${iso(post.updatedAt || post.createdAt)}</updated>
    <summary>${escapeHtml(summarise(post.content))}</summary>
    <content type="text">${escapeHtml(post.content)}</content>
  </entry>`;
      })
      .join('\n');

    res.type('application/atom+xml').send(`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeHtml(title)}</title>
  <id>${escapeHtml(`${siteUrl}/blog`)}</id>
  <link href="${escapeHtml(`${siteUrl}/blog`)}" />
  <link rel="self" href="${escapeHtml(`${siteUrl}/feed.xml`)}" />
  <updated>${new Date(newest).toISOString()}</updated>
  <author><name>${escapeHtml(author)}</name></author>
${body}
</feed>
`);
  } catch (error) {
    log(`Failed to build feed: ${errorMessage(error)}`, 'error');
    res.status(500).type('txt').send('Could not build the feed');
  }
});

/** Top-level pages that always exist. Admin and API paths are deliberately absent. */
const STATIC_PATHS = ['/', '/projects', '/blog', '/guestbook', '/contact', '/more'];

syndicationRouter.get('/sitemap.xml', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [siteUrl, posts] = await Promise.all([readSiteUrl(), publicPosts()]);
    if (!siteUrl) {
      res.status(404).type('txt').send('Not found');
      return;
    }
    const urls = [
      ...STATIC_PATHS.map((p) => ({ loc: `${siteUrl}${p === '/' ? '' : p}`, lastmod: '' })),
      ...posts.map((post) => ({
        loc: `${siteUrl}/blog/${post.uuid}`,
        lastmod: iso(post.updatedAt || post.createdAt),
      })),
    ];
    const body = urls
      .map(
        (u) =>
          `  <url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`,
      )
      .join('\n');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`);
  } catch (error) {
    log(`Failed to build sitemap: ${errorMessage(error)}`, 'error');
    res.status(500).type('txt').send('Could not build the sitemap');
  }
});

syndicationRouter.get('/robots.txt', async (_req: Request, res: Response): Promise<void> => {
  let siteUrl = '';
  try {
    siteUrl = await readSiteUrl();
  } catch (error) {
    // robots.txt must never 500: crawlers treat that as "stay away from everything".
    log(`robots.txt could not read the config: ${errorMessage(error)}`, 'warn');
  }
  const lines = ['User-agent: *', 'Disallow: /api/', 'Disallow: /admin', ''];
  if (siteUrl) lines.push(`Sitemap: ${siteUrl}/sitemap.xml`, '');
  res.type('txt').send(lines.join('\n'));
});
