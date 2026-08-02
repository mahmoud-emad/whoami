/**
 * Form validation rules.
 *
 * Every rule factory returns an array of Vuetify rules: functions that take the field value and
 * return `true` when it passes, or a message string when it does not.
 *
 * Two conventions run through this file.
 *
 * **Optional is the default.** Almost everything in this project is optional — an unconfigured site
 * renders nothing rather than a placeholder, so demanding a value would be wrong. Pass
 * `required: true` for the handful of fields that genuinely cannot be blank. This replaces the
 * `field?.length ? someRules() : []` pattern that used to appear at every call site, which had to
 * be repeated by hand and was easy to forget.
 *
 * **A blank optional field always passes.** Each rule returns early on an empty value, so an
 * optional URL field does not complain about format until something is actually typed into it.
 *
 * These rules are a user-interface affordance, not a security control. They tell the owner what a
 * field expects before a bad value is saved. The server re-validates everything that matters —
 * anything relying on a value being safe must check it server side too.
 */

/** One Vuetify rule: `true` when the value is acceptable, otherwise the message to display. */
export type Rule = (_value: any) => true | string;

export interface BaseOptions {
  /** Name used in messages. Defaults to "This field". */
  fieldName?: string;
  /** Whether a blank value is rejected. Defaults to false. */
  required?: boolean;
}

export interface LengthOptions extends BaseOptions {
  minLength?: number;
  maxLength?: number;
}

/** Everything arrives from an input as a string; normalise the empty cases to ''. */
const asText = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);

const isBlank = (value: unknown): boolean => asText(value).trim() === '';

/**
 * The guard every rule opens with.
 *
 * Returns a verdict when the emptiness of the value already settles the question — `true` to stop
 * checking an empty optional field, or the "required" message for an empty required one — and
 * `null` when there is a real value that the caller should go on to inspect.
 */
const emptyVerdict = (value: unknown, { fieldName = 'This field', required = false }: BaseOptions): true | string | null => {
  if (!isBlank(value)) return null;
  return required ? `${fieldName} is required` : true;
};

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

/** Length-bounded free text. The base for most fields. */
export const textRules = (options: LengthOptions = {}): Rule[] => {
  const { fieldName = 'This field', minLength, maxLength } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      const text = asText(v).trim();
      if (minLength !== undefined && text.length < minLength) {
        return `${fieldName} must be at least ${minLength} characters`;
      }
      if (maxLength !== undefined && text.length > maxLength) {
        return `${fieldName} must be at most ${maxLength} characters`;
      }
      return true;
    },
  ];
};

/** A short single-line label: a title, a name, a heading. */
export const nameRules = (options: LengthOptions = {}): Rule[] =>
  textRules({ maxLength: 120, ...options });

/** A multi-line body: a bio, a description, an intro. */
export const longTextRules = (options: LengthOptions = {}): Rule[] =>
  textRules({ maxLength: 2000, ...options });

/** A required choice in a select. */
export const selectRules = (options: BaseOptions = {}): Rule[] => {
  const { fieldName = 'This field' } = options;
  return [(v) => (isBlank(v) ? `${fieldName} is required` : true)];
};

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

// Deliberately not RFC 5322. A full grammar accepts addresses no personal site will ever use and
// is unreadable; this rejects the mistakes people actually make — no @, no dot in the domain, a
// stray space, a trailing dot — and leaves genuine delivery to the mail server.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export const emailRules = (options: LengthOptions = {}): Rule[] => {
  const { fieldName = 'Email', maxLength = 254 } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      const text = asText(v).trim();
      if (!EMAIL_PATTERN.test(text)) return `${fieldName} is not a valid email address`;
      if (text.length > maxLength) return `${fieldName} must be at most ${maxLength} characters`;
      return true;
    },
  ];
};

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/**
 * Schemes that may never appear in a configured link.
 *
 * `javascript:` in an href is script execution, and `data:` can carry a whole HTML document. The
 * server strips both when it builds `rel="me"` links, but a dashboard that happily stores one and
 * renders it elsewhere is still a hole. Rejecting them at the input is the cheap half of the fix.
 */
const DANGEROUS_SCHEMES = /^\s*(javascript|data|vbscript|file):/i;

export interface UrlOptions extends BaseOptions {
  /** Accept a site-relative path such as `/lists`. Off by default. */
  allowRelative?: boolean;
  /** Restrict to these hostnames, `www.` prefix ignored. */
  hosts?: string[];
  maxLength?: number;
}

/**
 * An absolute http(s) URL.
 *
 * Parsed with `URL` rather than matched with a regular expression. The regex this replaced accepted
 * a bare `example.com` — which then rendered as a *relative* link, quietly pointing at a page on
 * the owner's own site — and rejected any TLD longer than six letters, so `.technology` and
 * `.software` failed, as did `localhost` and any IP address.
 */
export const urlRules = (options: UrlOptions = {}): Rule[] => {
  const { fieldName = 'URL', allowRelative = false, hosts, maxLength = 2048 } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      const text = asText(v).trim();

      if (text.length > maxLength) return `${fieldName} must be at most ${maxLength} characters`;
      if (DANGEROUS_SCHEMES.test(text)) return `${fieldName} must be a web address, not a script`;

      if (text.startsWith('/')) {
        return allowRelative ? true : `${fieldName} must start with http:// or https://`;
      }

      let parsed: URL;
      try {
        parsed = new URL(text);
      } catch {
        return allowRelative
          ? `${fieldName} must be a full address (https://…) or a path starting with /`
          : `${fieldName} must be a full address, starting with http:// or https://`;
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return `${fieldName} must use http:// or https://`;
      }
      if (!parsed.hostname) return `${fieldName} is missing a domain`;

      if (hosts?.length) {
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
        if (!hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) {
          return `${fieldName} must be a ${hosts[0]} link`;
        }
      }
      return true;
    },
  ];
};

/** Backwards-compatible alias. Prefer {@link urlRules}. */
export const websiteRules = (options: UrlOptions = {}): Rule[] => urlRules(options);

/**
 * A link that may point inside this site or out of it.
 *
 * The More page and the navigation both store either kind: `/lists` renders as an in-app link,
 * `https://…` opens a new tab.
 */
export const linkRules = (options: UrlOptions = {}): Rule[] =>
  urlRules({ fieldName: 'Link', allowRelative: true, ...options });

/** A URL on one specific service. */
export const hostUrlRules = (host: string, options: UrlOptions = {}): Rule[] =>
  urlRules({ hosts: [host], ...options });

export const githubWebsiteRules = (options: UrlOptions = {}): Rule[] =>
  urlRules({ fieldName: 'GitHub URL', hosts: ['github.com'], ...options });

export const linkedinUrlRules = (options: UrlOptions = {}): Rule[] =>
  urlRules({ fieldName: 'LinkedIn URL', hosts: ['linkedin.com'], ...options });

export const xUrlRules = (options: UrlOptions = {}): Rule[] =>
  urlRules({ fieldName: 'X URL', hosts: ['x.com', 'twitter.com'], ...options });

/**
 * An image reference: an uploaded file, or an image hosted elsewhere.
 *
 * `/uploads/…` is what the Uploads tab hands back, so a relative path is the common case here
 * rather than the exception.
 */
export const imageUrlRules = (options: UrlOptions = {}): Rule[] =>
  urlRules({ fieldName: 'Image URL', allowRelative: true, ...options });

// ---------------------------------------------------------------------------
// Small formats
// ---------------------------------------------------------------------------

/** `#rrggbb` or `#rrggbbaa`, with or without the hash. Matches what the palette editor stores. */
export const hexColorRules = (options: BaseOptions = {}): Rule[] => {
  const { fieldName = 'Colour' } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      const text = asText(v).trim();
      return /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)
        ? true
        : `${fieldName} must be a hex colour such as #1d6fa5 or #1d6fa5cc`;
    },
  ];
};

/**
 * An IANA timezone.
 *
 * Validated by asking `Intl` to build a formatter with it, which is the same check the server runs
 * at startup — anything it accepts is a real zone, and it throws `RangeError` for everything else.
 */
export const timezoneRules = (options: BaseOptions = {}): Rule[] => {
  const { fieldName = 'Timezone' } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: asText(v).trim() });
        return true;
      } catch {
        return `${fieldName} must be an IANA zone such as Europe/Berlin`;
      }
    },
  ];
};

/** A short handle such as `@ada`. The leading @ is optional. */
export const handleRules = (options: LengthOptions = {}): Rule[] => {
  const { fieldName = 'Handle', maxLength = 40 } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      const text = asText(v).trim();
      if (text.length > maxLength) return `${fieldName} must be at most ${maxLength} characters`;
      return /^@?[\w.-]+$/.test(text)
        ? true
        : `${fieldName} may only contain letters, numbers, dots, dashes and underscores`;
    },
  ];
};

/** An X / Twitter handle: `@` plus up to 15 word characters, which is what the platform allows. */
export const twitterHandleRules = (options: BaseOptions = {}): Rule[] => {
  const { fieldName = 'X handle' } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      return /^@?\w{1,15}$/.test(asText(v).trim())
        ? true
        : `${fieldName} must look like @name, up to 15 characters`;
    },
  ];
};

/** One or two emoji used as a section marker. Counted by code point, so a flag is one character. */
export const emojiRules = (options: BaseOptions = {}): Rule[] => {
  const { fieldName = 'Emoji' } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      return [...asText(v).trim()].length <= 4 ? true : `${fieldName} must be one or two emoji`;
    },
  ];
};

/** A URL-safe slug: lowercase letters, numbers and dashes. */
export const slugRules = (options: LengthOptions = {}): Rule[] => {
  const { fieldName = 'Slug', maxLength = 80 } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      const text = asText(v).trim();
      if (text.length > maxLength) return `${fieldName} must be at most ${maxLength} characters`;
      return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(text)
        ? true
        : `${fieldName} may only contain lowercase letters, numbers and dashes`;
    },
  ];
};

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export interface NumberOptions extends BaseOptions {
  min?: number;
  max?: number;
}

/** A whole number, optionally bounded. Used by the order fields. */
export const integerRules = (options: NumberOptions = {}): Rule[] => {
  const { fieldName = 'This field', min, max } = options;
  return [
    (v) => {
      const verdict = emptyVerdict(v, options);
      if (verdict !== null) return verdict;
      const n = Number(asText(v).trim());
      if (!Number.isInteger(n)) return `${fieldName} must be a whole number`;
      if (min !== undefined && n < min) return `${fieldName} must be ${min} or more`;
      if (max !== undefined && n > max) return `${fieldName} must be ${max} or less`;
      return true;
    },
  ];
};

/**
 * A four-digit year.
 *
 * The upper bound is the next calendar year rather than the current one, so a book already
 * announced for next year is not rejected as a typo.
 */
export const yearRules = (options: BaseOptions = {}): Rule[] =>
  integerRules({
    fieldName: 'Year',
    min: 1000,
    max: new Date().getFullYear() + 1,
    ...options,
  });

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** A capped list of short tags, as the project cards use. */
export const tagsRules = (options: { fieldName?: string; max?: number; maxTagLength?: number } = {}): Rule[] => {
  const { fieldName = 'Tags', max = 4, maxTagLength = 24 } = options;
  return [
    (v) => {
      const tags: unknown[] = Array.isArray(v) ? v : [];
      if (tags.length > max) return `${fieldName}: up to ${max} allowed`;
      const tooLong = tags.find((tag) => asText(tag).trim().length > maxTagLength);
      return tooLong === undefined
        ? true
        : `Each tag must be at most ${maxTagLength} characters`;
    },
  ];
};

/** A list of short lines, such as the rotating welcome messages. */
export const stringListRules = (options: { fieldName?: string; max?: number; maxItemLength?: number } = {}): Rule[] => {
  const { fieldName = 'This list', max = 20, maxItemLength = 200 } = options;
  return [
    (v) => {
      const items: unknown[] = Array.isArray(v) ? v : [];
      if (items.length > max) return `${fieldName}: up to ${max} allowed`;
      const tooLong = items.find((item) => asText(item).trim().length > maxItemLength);
      return tooLong === undefined
        ? true
        : `Each entry must be at most ${maxItemLength} characters`;
    },
  ];
};

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/** What the upload endpoint accepts. Mirrors the multer filter on the server. */
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/**
 * A file chosen in a `v-file-input`.
 *
 * The server enforces both limits and answers 400 or 413 either way; checking here just means the
 * owner finds out before waiting for a 5 MB upload to fail.
 */
export const fileRules = (options: {
  fieldName?: string;
  accept?: string[];
  maxBytes?: number;
  required?: boolean;
} = {}): Rule[] => {
  const {
    fieldName = 'File',
    accept = IMAGE_MIME_TYPES,
    maxBytes = UPLOAD_MAX_BYTES,
    required = false,
  } = options;
  return [
    (v) => {
      const files: File[] = Array.isArray(v) ? v : v ? [v as File] : [];
      if (!files.length) return required ? `${fieldName} is required` : true;
      const megabytes = Math.round(maxBytes / (1024 * 1024));
      for (const file of files) {
        if (accept.length && file.type && !accept.includes(file.type)) {
          const names = accept.map((t) => t.replace(/^image\//, '').toUpperCase()).join(', ');
          return `${fieldName} must be one of: ${names}`;
        }
        if (file.size > maxBytes) return `${fieldName} must be under ${megabytes} MB`;
      }
      return true;
    },
  ];
};

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/** Minimum admin signature length. Mirrors MIN_SIGNATURE_LENGTH on the server. */
export const MIN_SIGNATURE_LENGTH = 8;

/**
 * The admin signature.
 *
 * `forLogin` skips the length check: an existing signature might predate the minimum, and telling
 * somebody their password is too short while they are trying to use it helps nobody — and leaks
 * the rule to whoever is guessing.
 */
export const signatureRules = (options: { fieldName?: string; forLogin?: boolean } = {}): Rule[] => {
  const { fieldName = 'Signature', forLogin = false } = options;
  return [
    (v) => {
      if (isBlank(v)) return `${fieldName} is required`;
      if (forLogin) return true;
      return asText(v).length >= MIN_SIGNATURE_LENGTH
        ? true
        : `${fieldName} must be at least ${MIN_SIGNATURE_LENGTH} characters`;
    },
  ];
};
