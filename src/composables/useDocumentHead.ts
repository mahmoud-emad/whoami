import { watch } from 'vue';
import type { SiteMeta } from '../types';
import type { useSettingsStore } from '../store';

type SettingsStore = ReturnType<typeof useSettingsStore>;

/**
 * OWNERSHIP BOUNDARY — read before touching this file.
 *
 * This composable owns the <meta> tags and the favicon <link>. Nothing else writes them.
 *
 * It does NOT own document.title. The router sets a page-specific title
 * ("<page> - <brand.displayName>") in its beforeEach guard, and that must win: it is more specific
 * than the site-wide meta.title and it changes on every navigation. So the title is only ever
 * written here while the document still carries the static title index.html shipped with — i.e.
 * before the first navigation has completed. The instant the router has spoken, we stay out of it.
 *
 * BOOT_TITLE is captured at module-evaluation time. This module is pulled in through App.vue, which
 * main.ts imports before it mounts the app, so this runs before the router's first guard — the value
 * really is the static default from index.html and not something the router set.
 */
const BOOT_TITLE = typeof document !== 'undefined' ? document.title : '';

/** Whether the document title is still the untouched index.html default. */
function titleIsStillDefault(): boolean {
  return document.title === BOOT_TITLE;
}

/**
 * Set a meta tag's content, creating the tag when the page does not already have it.
 *
 * Empty values are a no-op rather than a write: an unconfigured field should leave the generic
 * default from index.html standing, not replace it with an empty string that unfurlers would show.
 */
function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setFavicon(href: string): void {
  if (!href) return;
  // `rel~="icon"` matches both `icon` and `shortcut icon`, whichever the template happens to ship.
  let el = document.head.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'icon');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  // The type hint stops being true once the owner points this at an .ico or .svg; the browser
  // sniffs the real type anyway, so drop it rather than lie.
  el.removeAttribute('type');
}

/**
 * Link previews need absolute URLs — a crawler on another host cannot resolve "/uploads/og.png".
 * If the owner configured a site URL we can promote a relative image to an absolute one; if not, we
 * pass the value through untouched rather than guess.
 */
function absoluteUrl(value: string, siteUrl: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const base = siteUrl.trim() || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return value;
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

/** Twitter wants "@handle"; config may hold it with or without the @. */
function normalizeHandle(handle: string): string {
  const trimmed = handle.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

/** Apply one `meta` config block to the document head. Never throws. */
function applyMeta(meta: Partial<SiteMeta> | undefined | null): void {
  if (typeof document === 'undefined') return;

  const title = (meta?.title || '').trim();
  const description = (meta?.description || '').trim();
  const siteUrl = (meta?.siteUrl || '').trim();
  const ogImage = absoluteUrl((meta?.ogImage || '').trim(), siteUrl);
  const twitterHandle = normalizeHandle(meta?.twitterHandle || '');

  // Initial default only — see the ownership note at the top of this file.
  if (title && titleIsStillDefault()) {
    document.title = title;
  }

  upsertMeta('name', 'description', description);

  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', ogImage);
  upsertMeta('property', 'og:url', siteUrl);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', ogImage);
  upsertMeta('name', 'twitter:site', twitterHandle);
  upsertMeta('name', 'twitter:creator', twitterHandle);

  setFavicon((meta?.faviconUrl || '').trim());
}

/**
 * Keep the document head in sync with the site config.
 *
 * Runs once immediately (harmless when settings have not loaded — every field is empty and every
 * write is skipped) and again whenever the store swaps in a fresh `meta` object, which happens on
 * bootstrap, on an admin save, and on a reload after the health watcher sees the server come back.
 */
export function useDocumentHead(settingsStore: SettingsStore) {
  watch(
    // Deep, because the admin settings form edits fields on the existing object as well as
    // _applySettings replacing it wholesale after a reload.
    () => settingsStore.meta,
    (meta) => {
      try {
        applyMeta(meta);
      } catch {
        // The head is cosmetic; a malformed config must never take the app down with it.
      }
    },
    { immediate: true, deep: true },
  );
}
