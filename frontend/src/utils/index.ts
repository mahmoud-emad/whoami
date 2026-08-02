
const nameRules = (options: {
  fieldName: string,
  minLength: number,
  maxLength: number
}) => [
    (v: string) => v && v.length > 0 || `${options.fieldName} is required`,
    (v: string) => v && v.length >= options.minLength || `${options.fieldName} must be at least ${options.minLength} characters`,
    (v: string) => v && v.length <= options.maxLength || `${options.fieldName} must be at most ${options.maxLength} characters`
  ];

const githubWebsiteRules = () => [
  (v: string) => v && v.length > 0 || 'GitHub profile URL is required',
  (v: string) => v && v.includes('github.com') || 'Please enter a valid GitHub profile URL',
];

const longTextRules = (options: {
  fieldName: string,
  minLength: number,
  maxLength: number
}) => [
    (v: string) => v && v.length > 0 || `${options.fieldName} is required`,
    (v: string) => v && v.length >= options.minLength || `${options.fieldName} must be at least ${options.minLength} characters`,
    (v: string) => v && v.length <= options.maxLength || `${options.fieldName} must be at most ${options.maxLength} characters`
  ];

const emailRules = (options: {
  fieldName: string,
  minLength: number,
  maxLength: number
}) => [
    (v: string) => typeof v === 'string' || `${options.fieldName} must be a string.`,
    (v: string) => !!v || `${options.fieldName} is required.`,
    (v: string) => /.+@.+\..+/.test(v) || `${options.fieldName} is not valid.`,
    (v: string) => v && v.length >= options.minLength || `${options.fieldName} must be at least ${options.minLength} characters`,
    (v: string) => v && v.length <= options.maxLength || `${options.fieldName} must be at most ${options.maxLength} characters`
  ];


const websiteRules = () => [
  (v: string) => v && /^(https?:\/\/)?([\w\d-]+\.)+[a-z]{2,6}(:[0-9]+)?(\/.*)?$/.test(v) || 'Please enter a valid URL'
];

/**
 * Anti-bot check for the guestbook.
 *
 * The expected answer is a parameter, not a constant: it used to be the original owner's handle
 * hardcoded here, which made the guestbook unanswerable — and therefore unusable — on every other
 * install of this template. Callers pass `configuration.antiBot.answer`.
 *
 * Comparison is trimmed and case-insensitive. When nothing is configured the rule only insists on a
 * non-empty value; the server validates the answer for real, so an unconfigured client-side
 * expectation must not lock visitors out.
 */
const antiBotRules = (expected: string) => [
  (v: string) => {
    const want = (expected || '').trim().toLowerCase();
    const got = (v || '').trim().toLowerCase();
    if (!got) return 'This field is required';
    if (!want) return true;
    return got === want || 'That answer is not correct, please try again.';
  },
];

/**
 * Compose a section heading out of its configured emoji and title, tolerating either half being
 * unset. Returns '' when neither is configured, so callers can drop the heading entirely.
 */
const sectionHeading = (section?: { emoji?: string, title?: string }): string =>
  [section?.emoji?.trim(), section?.title?.trim()].filter(Boolean).join(' ');

const validateProjectTagsRules = (tags: string[]) => [
  // if tags, then it should be at 4 or less
  (v: string[]) => v && tags.length <= 4 || 'You can add up to 4 tags',
];

/**
 * Deep-clone plain data for editing in a form without mutating the store.
 *
 * Not structuredClone(): store values are Vue/Pinia reactive Proxies, and cloning a Proxy throws
 * "DataCloneError: could not be cloned". Everything the dashboard edits arrives as JSON and is
 * posted back as JSON, so a JSON round-trip is both sufficient and proxy-safe.
 */
const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const formatData = (data: string) => {
  return new Date(data).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Base URL for the API. Empty means "same origin", which is the production setup where Express
 * serves the frontend build alongside the API. In development VITE_SERVER_URL points at the
 * separately-running backend.
 */
const getServerUrl = (): string =>
  ((import.meta.env.VITE_SERVER_URL as string | undefined) || '').replace(/\/+$/, '');

export {
  validateProjectTagsRules,
  githubWebsiteRules,
  deepClone,
  nameRules,
  longTextRules,
  websiteRules,
  antiBotRules,
  sectionHeading,
  formatData,
  emailRules,
  getServerUrl,
}