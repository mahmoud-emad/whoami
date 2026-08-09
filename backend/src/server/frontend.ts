import fs from 'node:fs/promises';
import express from 'express';
import type { Express, Request } from 'express';
import { DIST_DIR, INDEX_HTML_PATH } from '../config/paths';
import { SERVE_FRONTEND } from '../config/runtime';
import { readConfig } from '../config/store';
import { escapeHtml, absoluteUrl } from '../lib/html';
import { log } from '../lib/logger';
import type { SiteConfig } from '../types';

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * `a || b || c` over untyped config leaves. The config's nested branches are deliberately loose
 * (an old config.json may be missing them entirely), so the fallback chain works on `unknown` and
 * stringifies whatever the first truthy value turns out to be — exactly what the original `||`
 * chains did before the tags were escaped.
 */
const firstTruthy = (...values: unknown[]): string => {
  for (const value of values) {
    if (value) return String(value);
  }
  return '';
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Normalise one configured channel address into something safe to put in an href.
 *
 * Only http, https and mailto survive. Config is owner-editable, and an unchecked value here would
 * put whatever it contains — `javascript:` included — into a link in the served document.
 * A bare address with an @ and no scheme is an email, which is how the Contact page stores them.
 */
const relMeHref = (raw: unknown): string => {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^mailto:/i.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return '';
};

/**
 * The identities this site claims, as rel="me".
 *
 * IndieAuth consumers — IndieLogin.com among them — fetch the page with a plain HTTP client and
 * parse the HTML. They do not run JavaScript, so the rel="me" anchors Vue renders on the Contact
 * page are invisible to them: the claim has to be in the document the server returns. A <link> in
 * the head counts exactly as much as an <a> in the body and changes nothing on screen, which keeps
 * the page's markup the owner's business.
 *
 * The list is the one the Contact page renders from — configured channels when there are any, the
 * pre-channels socials otherwise — so what the site shows and what it claims cannot drift apart.
 * A channel the owner has hidden is not claimed either; hiding it is a statement about the address,
 * not about the page it sits on.
 *
 * Verification is reciprocal. A link here proves nothing on its own: the profile has to link back
 * to this domain (GitHub's "website" field, GitLab's and Codeberg's, a Mastodon profile field).
 */
const buildRelMeLinks = (configData: SiteConfig | null | undefined): string[] => {
  const profile = asRecord(configData?.profile);
  const channels = asArray(profile.channels);

  const configured = channels
    .map(asRecord)
    .filter((channel) => channel.show !== false)
    .map((channel) => relMeHref(channel.url));

  const socials = asRecord(profile.socials);
  const legacy = [socials.githubUrl, socials.linkedinUrl, socials.xUrl, socials.signalUrl, socials.email]
    .map(relMeHref);

  const hrefs = configured.some(Boolean) ? configured : legacy;
  return [...new Set(hrefs.filter(Boolean))];
};

/**
 * Build the <head> tags for one request. Falls back through meta -> profile so a site that never
 * touched the SEO tab still gets a real title and description instead of an empty tag.
 */
const buildHeadTags = (configData: SiteConfig | null | undefined, req: Request): string => {
  const meta = asRecord(configData?.meta);
  const profile = asRecord(configData?.profile);
  const brand = asRecord(profile.brand);

  const title = firstTruthy(meta.title, brand.displayName, profile.fullName, 'Portfolio');
  const description = firstTruthy(meta.description, profile.bio);
  const siteUrl = firstTruthy(meta.siteUrl);
  const image = absoluteUrl(firstTruthy(meta.ogImage, brand.logoUrl), siteUrl);
  const favicon = firstTruthy(meta.faviconUrl, '/image.png');
  const twitterHandle = firstTruthy(meta.twitterHandle);
  // Per-request canonical URL: crawlers should see the page they actually fetched, not the home
  // page, otherwise every client-side route dedupes into one result.
  let pageUrl = siteUrl;
  if (siteUrl) {
    try {
      pageUrl = new URL(req.originalUrl || req.path || '/', siteUrl).toString();
    } catch {
      pageUrl = siteUrl;
    }
  }

  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="icon" href="${escapeHtml(favicon)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
  ];
  if (description) {
    tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
    tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
    tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  }
  if (pageUrl) {
    tags.push(`<meta property="og:url" content="${escapeHtml(pageUrl)}" />`);
    tags.push(`<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);
  }
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);
  }
  if (twitterHandle) {
    tags.push(`<meta name="twitter:site" content="${escapeHtml(twitterHandle)}" />`);
  }
  for (const href of buildRelMeLinks(configData)) {
    tags.push(`<link rel="me" href="${escapeHtml(href)}" />`);
  }
  return `\n    ${tags.join('\n    ')}\n  `;
};

/**
 * Remove the static head tags that `buildHeadTags` is about to replace.
 *
 * index.html ships generic defaults so that an unconfigured clone, and any crawler that never runs
 * our JavaScript, still sees something sensible. But injecting on top of them left the document with
 * two <title> elements and two of every description/og/twitter tag — and consumers take the FIRST
 * occurrence, so the generic default silently won and the owner's configured values were ignored.
 * Strip first, then inject.
 *
 * Only the tags we re-emit are removed; charset, viewport, the module script and the stylesheet are
 * left exactly where the build put them.
 */
const stripReplaceableHeadTags = (html: string): string => {
  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) return html;

  const head = html.slice(0, headEnd);
  const rest = html.slice(headEnd);

  const cleanedHead = head
    .replace(/[^\S\n]*<title>[\s\S]*?<\/title>\n?/gi, '')
    .replace(/[^\S\n]*<meta\s+name=["'](description|twitter:[^"']+)["'][^>]*>\n?/gi, '')
    .replace(/[^\S\n]*<meta\s+property=["']og:[^"']+["'][^>]*>\n?/gi, '')
    .replace(/[^\S\n]*<link\s+[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>\n?/gi, '');

  return cleanedHead + rest;
};

/**
 * The build output never changes while the process runs, so it is read once. The config is
 * re-read per request instead: it is a few KB and changes whenever the owner saves the
 * dashboard, and a title that only updates on restart is a bug waiting to be reported.
 */
let indexHtmlCache: string | null = null;
const readIndexHtml = async (): Promise<string> => {
  if (indexHtmlCache === null) indexHtmlCache = await fs.readFile(INDEX_HTML_PATH, 'utf8');
  return indexHtmlCache;
};

/**
 * Frontend (production).
 *
 * In production this process also serves the Vite build, so the site and its API share one origin
 * and one port. Must be called after every API route is registered: anything that did not match
 * above is a client side route and gets index.html.
 */
export const mountFrontend = (app: Express): void => {
  if (!SERVE_FRONTEND) return;

  // cacheControl:false, not just an omitted maxAge — express.static still emits
  // "max-age=0" otherwise, which would conflict with the Cache-Control the reverse proxy sets.
  app.use(express.static(DIST_DIR, { index: false, cacheControl: false }));

  // This is a single-page app: without server-rendered head tags a crawler or a link preview
  // bot sees an empty <div id="app">, because neither runs the JavaScript that would fill it in.
  app.get('*', async (req, res, next) => {
    if (req.path.startsWith('/uploads')) {
      next();
      return;
    }
    // A build artefact that express.static did not find does not exist, and answering with the
    // SPA shell would hand the browser HTML under a .js URL: the script fails to parse, the app
    // never boots, and because the proxy marks /assets/* immutable the broken response is then
    // cached for a year. A 404 is both the truth and something a reload can recover from.
    if (req.path.startsWith('/assets/')) {
      res.status(404).type('txt').send('Not found');
      return;
    }
    try {
      const [rawHtml, configData] = await Promise.all([readIndexHtml(), readConfig()]);
      if (rawHtml.indexOf('</head>') === -1) throw new Error('index.html has no </head>');
      // Strip the static defaults before injecting, or the document ends up with two of
      // every tag and the first (generic) one wins.
      const html = stripReplaceableHeadTags(rawHtml);
      const closingHead = html.indexOf('</head>');
      const tags = buildHeadTags(configData, req);
      res.type('html').send(html.slice(0, closingHead) + tags + html.slice(closingHead));
    } catch (error) {
      // Serving a page with weak SEO beats serving a 500. Any failure here — unreadable
      // config, malformed HTML — degrades to exactly the previous behaviour.
      log(`Falling back to raw index.html: ${errorMessage(error)}`, 'warn');
      res.sendFile(INDEX_HTML_PATH);
    }
  });
};
