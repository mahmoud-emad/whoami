/**
 * Everything injected into the served HTML comes from owner-editable config, so it is untrusted as
 * far as the HTML parser is concerned: a stray quote in a site description would otherwise break out
 * of the attribute it sits in. Escaped once, centrally, rather than remembered at each call site.
 */
export const escapeHtml = (value: unknown): string =>
  String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Resolve a possibly-relative asset path (e.g. an uploaded /uploads/og.png) against the site URL.
 * Link previews are fetched by other servers, which have no notion of "relative to your origin".
 */
export const absoluteUrl = (value: string, siteUrl: string): string => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (!siteUrl) return value;
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return value;
  }
};
