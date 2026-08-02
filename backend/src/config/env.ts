import crypto from 'node:crypto';

import { createSignatureRecord, MIN_SIGNATURE_LENGTH } from '../auth/signature';
import { log } from '../lib/logger';
import type { SiteConfig } from '../types';
import { readConfig, writeConfig } from './store';
import { IS_PRODUCTION } from './runtime';

// ---------------------------------------------------------------------------
// Configuration bootstrap
//
// The rule this whole section implements: ENV SEEDS, THE DASHBOARD OWNS.
//
//   * Environment variables exist so a fresh clone can be brought up unattended — first boot
//     writes them into config.json and they are never consulted for that field again.
//   * Every later edit happens in the admin dashboard and is authoritative. A redeploy with a
//     stale .env must therefore NEVER clobber what the owner typed into the dashboard, which is
//     why the seeder only ever fills fields that are still empty.
//
// The startup order is: validate (fail fast) -> seed (fill blanks) -> listen.
// ---------------------------------------------------------------------------

// A zone is valid if Intl accepts it. Intl throws RangeError for anything that is not a real
// IANA identifier, which is the cheapest correct check available without pulling in a tz database.
export const isValidTimezone = (zone: unknown): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: String(zone) });
    return true;
  } catch {
    return false;
  }
};

export const isValidUrl = (value: unknown): boolean => {
  try {
    const parsed = new URL(String(value));
    return Boolean(parsed.protocol && parsed.host);
  } catch {
    return false;
  }
};

export const envValue = (name: string): string => {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
};

// Boolean-ish spellings accepted for flag variables. The environment only ever hands over
// strings, so "1", "true", "yes" and "on" all mean on and everything listed as off means off.
export const TRUTHY_ENV = new Set(['1', 'true', 'yes', 'on']);
export const FALSY_ENV = new Set(['0', 'false', 'no', 'off']);
export const isBooleanEnv = (value: string): boolean => {
  const lowered = value.trim().toLowerCase();
  return TRUTHY_ENV.has(lowered) || FALSY_ENV.has(lowered);
};

/** One row of {@link ENV_SPEC}. `validate` returns the problem text, or null when the value is fine. */
export interface EnvSpecEntry {
  name: string;
  required: boolean;
  describe: string;
  validate?: (_value: string) => string | null;
}

// Every variable this server understands, documented here so the startup banner and the
// .env examples cannot drift apart. `required: true` means required in production only.
export const ENV_SPEC: EnvSpecEntry[] = [
  {
    name: 'ADMIN_SIGNATURE',
    required: true,
    describe: 'the admin password used to log into the dashboard (min 8 characters)',
    // Only checked when a value is present; emptiness is handled by the required rule.
    validate: (value) =>
      value.length >= MIN_SIGNATURE_LENGTH ? null : `must be at least ${MIN_SIGNATURE_LENGTH} characters`,
  },
  { name: 'SITE_OWNER', required: true, describe: 'your display name, e.g. "Ada Lovelace"' },
  {
    name: 'SITE_URL',
    required: true,
    describe: 'the public URL of the site, e.g. "https://example.com"',
    validate: (value) => (isValidUrl(value) ? null : 'must be an absolute URL, e.g. https://example.com'),
  },
  { name: 'SITE_ROLE', required: false, describe: 'job title shown under your name' },
  { name: 'SITE_HANDLE', required: false, describe: 'short handle, e.g. "@ada"' },
  { name: 'SITE_EMAIL', required: false, describe: 'public contact email' },
  { name: 'SITE_GITHUB', required: false, describe: 'GitHub profile URL' },
  { name: 'SITE_LINKEDIN', required: false, describe: 'LinkedIn profile URL' },
  { name: 'SITE_X', required: false, describe: 'X/Twitter profile URL' },
  {
    name: 'SITE_TIMEZONE',
    required: false,
    describe: 'IANA timezone, e.g. "Africa/Cairo"',
    validate: (value) => (isValidTimezone(value) ? null : 'is not a valid IANA timezone (e.g. Europe/Berlin)'),
  },
  { name: 'SITE_DESCRIPTION', required: false, describe: 'one-line site description used for SEO' },
  { name: 'ANTIBOT_QUESTION', required: false, describe: 'guestbook anti-bot question' },
  { name: 'ANTIBOT_ANSWER', required: false, describe: 'guestbook anti-bot answer (never exposed publicly)' },
  {
    name: 'WEBRING_ENABLED',
    required: false,
    describe: '1 to show the IndieWeb webring links in the footer',
    validate: (value) => (isBooleanEnv(value) ? null : 'must be one of 1/0, true/false, yes/no, on/off'),
  },
];

/** Reads a leaf that config.json is only expected to hold as a string, tolerating anything else. */
const readString = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Narrowing helper: plain objects only, so arrays and null never masquerade as branches. */
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

// Fail-fast validation. A misconfigured production deploy should die loudly at boot rather than
// come up half-working and serve a nameless site with an unreachable dashboard — a broken deploy
// that never starts is trivially noticed, one that starts wrong can go unnoticed for weeks.
// Development is deliberately permissive: `yarn server` must work on a fresh clone with no .env.
export const validateEnvironment = async (): Promise<void> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // PORT is checked in every environment because it is never "missing but fine": an
  // unparseable or out-of-range port silently binds somewhere unexpected or crashes deep in
  // Node's networking layer with a far less useful message than this one.
  const rawPort = envValue('PORT');
  if (rawPort) {
    const parsed = Number(rawPort);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      errors.push(`PORT — must be a whole number between 1 and 65535 (got "${rawPort}")`);
    }
  }

  // "Required" means "required to bring this site up", not "required forever".
  //
  // Every required variable exists only to SEED config.json. Once the corresponding config field
  // is populated — by an earlier boot, or by the owner editing the dashboard — demanding the
  // variable again is wrong: it would refuse to start a site that is already fully configured,
  // and would break every existing deployment the moment it upgraded to a version that added a
  // new required variable. So a variable is fatal only when config cannot already supply it.
  let configured: Record<string, boolean> = {};
  try {
    const existing = await readConfig();
    const record = asRecord(asRecord(existing.security).adminSignature);
    const profile = asRecord(existing.profile);
    const brand = asRecord(profile.brand);
    const meta = asRecord(existing.meta);
    configured = {
      ADMIN_SIGNATURE: Boolean(record.salt && record.hash),
      SITE_OWNER: Boolean((readString(profile.fullName) || readString(brand.displayName) || '').trim()),
      SITE_URL: Boolean((readString(meta.siteUrl) || '').trim()),
    };
  } catch {
    configured = {};
  }

  for (const spec of ENV_SPEC) {
    const value = envValue(spec.name);
    const target = IS_PRODUCTION && spec.required ? errors : warnings;

    if (!value) {
      // Already satisfied by config, so its absence from the environment is the steady state.
      if (configured[spec.name]) continue;
      if (spec.required) {
        target.push(`${spec.name} — missing. Set it to ${spec.describe}.`);
      }
      continue;
    }

    const problem = spec.validate ? spec.validate(value) : null;
    if (problem) {
      // An invalid value is a typo, not an omission, so it is reported in production even
      // for optional variables — silently ignoring it would hide the mistake forever.
      (IS_PRODUCTION ? errors : warnings).push(`${spec.name} — ${problem}.`);
    }
  }

  if (warnings.length) {
    log('Environment is incomplete (development mode, continuing anyway):', 'warn');
    for (const warning of warnings) log(`  • ${warning}`, 'warn');
    log('  These only matter on first boot; see .env.example.', 'warn');
  }

  if (!errors.length) return;

  log('='.repeat(72), 'error');
  log('Refusing to start: the environment is not valid for production.', 'error');
  for (const problem of errors) log(`  • ${problem}`, 'error');
  log('', 'error');
  log('Fix the variables above (see .env.production.example) and start again.', 'error');
  log('They are only read to seed backend/config.json on first boot — after that', 'error');
  log('every value is edited from the admin dashboard.', 'error');
  log('='.repeat(72), 'error');
  process.exit(1);
};

// Walk a dotted path and return whether the leaf is still "unset". Only empty strings, null and
// undefined count as unset: `false`, `0` and populated arrays are real owner choices.
export const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && !value.trim());

/** Per-variable seeding options. */
export interface SeedOptions {
  flag?: boolean;
}

// Assign only when the current value is blank. Returns true when it actually wrote, so the caller
// can report exactly which fields were seeded.
//
// `flag: true` additionally counts `false` as unset. Flag fields default to `false`, which the
// blank rule above reads as a deliberate owner choice, so without this a flag variable could
// never seed anything at all.
export const seedPath = (
  root: Record<string, unknown>,
  dottedPath: string,
  value: unknown,
  { flag = false }: SeedOptions = {},
): boolean => {
  if (isBlank(value)) return false;
  const keys = dottedPath.split('.');
  const leaf = keys.pop();
  if (leaf === undefined) return false;
  let node = root;
  for (const key of keys) {
    const child = node[key];
    if (!child || typeof child !== 'object' || Array.isArray(child)) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  const current = node[leaf];
  const unset = isBlank(current) || (flag && current === false);
  if (!unset) return false; // dashboard wins — never overwrite an owner edit
  node[leaf] = value;
  return true;
};

// Turn a flag variable into what a boolean config field holds. Anything off becomes "" rather
// than `false` so seedPath's blank check skips it: off is already the default, so there is
// nothing to seed and nothing worth reporting.
export const asFlag = (value: string): true | '' => (TRUTHY_ENV.has(value.trim().toLowerCase()) ? true : '');

/** One row of {@link ENV_SEED_MAP}: the variable, the config paths it fills and its options. */
export type EnvSeedEntry = readonly [string, readonly string[], SeedOptions?];

// env var -> config paths it seeds, plus per-variable options. One variable can feed several
// fields (a name is at once the profile name, the brand name and the copyright holder) because
// asking an operator for the same string three times in a .env file is a worse experience than
// fanning it out here.
//
// `{ flag: true }` marks a boolean field: the raw string is coerced with asFlag and `false`
// counts as unset. One caveat comes with that. Turning the webring off in the dashboard puts the
// field back to `false`, so a WEBRING_ENABLED=1 still sitting in the environment seeds it on
// again at the next boot. Drop the variable once the site is up, as with every other seed.
export const ENV_SEED_MAP: EnvSeedEntry[] = [
  ['SITE_OWNER', ['profile.fullName', 'profile.brand.displayName', 'profile.brand.copyrightOwner', 'meta.title']],
  ['SITE_ROLE', ['profile.role']],
  ['SITE_HANDLE', ['profile.brand.handle']],
  ['SITE_EMAIL', ['profile.socials.email']],
  ['SITE_GITHUB', ['profile.socials.githubUrl', 'configuration.githubURL', 'profile.brand.handleUrl']],
  ['SITE_LINKEDIN', ['profile.socials.linkedinUrl']],
  ['SITE_X', ['profile.socials.xUrl']],
  ['SITE_TIMEZONE', ['profile.socials.timezone']],
  ['SITE_URL', ['meta.siteUrl']],
  ['SITE_DESCRIPTION', ['meta.description']],
  ['ANTIBOT_QUESTION', ['configuration.antiBot.question']],
  ['ANTIBOT_ANSWER', ['configuration.antiBot.answer']],
  ['WEBRING_ENABLED', ['indieweb.webring.enabled'], { flag: true }],
];

// First-run seeding. Runs on every boot but is a no-op once the fields hold anything, so it is
// safe to leave the .env in place forever. Also makes sure an admin signature exists before the
// server accepts traffic: seeded from ADMIN_SIGNATURE when provided, otherwise generated randomly
// and printed once so the operator can log in. There is deliberately no default password.
export const bootstrapConfig = async (): Promise<void> => {
  const config = await readConfig();
  const seeded: string[] = [];

  for (const [envName, paths, options = {}] of ENV_SEED_MAP) {
    const raw = envValue(envName);
    if (!raw) continue;
    const value = options.flag ? asFlag(raw) : raw;
    for (const dottedPath of paths) {
      if (seedPath(config as Record<string, unknown>, dottedPath, value, options)) seeded.push(dottedPath);
    }
  }

  const security = asRecord(config.security);
  const record = asRecord(security.adminSignature);
  const hasSignature = Boolean(record.salt && record.hash);
  let generatedSignature = '';
  let seededFromEnv = false;

  if (!hasSignature) {
    const fromEnv = envValue('ADMIN_SIGNATURE');
    const signature = fromEnv || crypto.randomBytes(12).toString('base64url');
    seededFromEnv = Boolean(fromEnv);
    if (!seededFromEnv) generatedSignature = signature;

    config.security = { ...security, adminSignature: createSignatureRecord(signature) } as SiteConfig['security'];
    // Drop the pre-auth plaintext field if an older config.json still carries it.
    delete (config.security as Record<string, unknown>).adminFingerprintSignature;
  }

  if (seeded.length || !hasSignature) await writeConfig(config);

  if (seeded.length) {
    log(`Seeded ${seeded.length} empty config field(s) from the environment:`, 'info');
    log(`  ${seeded.join(', ')}`, 'info');
    log('  Everything already filled in was left untouched — the dashboard owns it now.', 'info');
  } else {
    log('Nothing to seed from the environment — every mapped field is already set or unset.', 'info');
  }

  if (seededFromEnv) {
    log('Admin signature seeded from ADMIN_SIGNATURE.', 'info');
  } else if (generatedSignature) {
    log('='.repeat(72), 'warn');
    log(`No admin signature was set. Generated one: ${generatedSignature}`, 'warn');
    log('Store it now. It is not recoverable and will not be printed again.', 'warn');
    log('Set ADMIN_SIGNATURE before first boot to choose your own.', 'warn');
    log('='.repeat(72), 'warn');
  }
};
