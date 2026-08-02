import fs from 'node:fs/promises';
import { CONFIG_FILE_PATH } from './paths';
import { defaultConfig } from './defaults';
import { log } from '../lib/logger';
import type { SiteConfig } from '../types';

/**
 * `deepBackfill` walks arbitrary JSON shapes, so it cannot lean on `SiteConfig`. This guard is the
 * single place "is this a plain object I should recurse into?" is decided — arrays are explicitly
 * excluded because they are copied wholesale rather than merged element by element.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Recursively add any keys present in defaults but missing from target. Arrays and primitives
 * are copied as-is when missing; objects recurse. Returns true if anything was added.
 */
export const deepBackfill = (target: unknown, defaults: unknown): boolean => {
  if (!isPlainObject(target)) return false;
  // The original iterated `Object.entries(defaults)` unguarded; a non-object here has no keys to
  // backfill either way, so returning early is behaviourally identical and keeps the types honest.
  if (!isPlainObject(defaults)) return false;

  let mutated = false;
  for (const [key, value] of Object.entries(defaults)) {
    const valueIsPlainObject = isPlainObject(value);
    const targetIsPlainObject = isPlainObject(target[key]);

    if (!(key in target)) {
      // Deep-copy via JSON (not structuredClone) to match the original exactly: defaults are pure
      // JSON, and the copy keeps the stored config from aliasing the module-level defaults object.
      target[key] =
        valueIsPlainObject || Array.isArray(value) ? (JSON.parse(JSON.stringify(value)) as unknown) : value;
      mutated = true;
    } else if (valueIsPlainObject && targetIsPlainObject) {
      if (deepBackfill(target[key], value)) mutated = true;
    }
  }
  return mutated;
};

/** Create config.json from the defaults if it does not exist yet. */
export const initializeConfig = async (): Promise<void> => {
  try {
    await fs.access(CONFIG_FILE_PATH);
    log('Config exists', 'info');
  } catch {
    log('Config does not exist, creating it...', 'info');
    await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(defaultConfig, null, 2));
  }
};

export const writeConfig = async (config: SiteConfig): Promise<void> => {
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
};

/**
 * Read config from disk; transparently backfill missing keys from defaults (handles nested
 * additions like profile.brand without breaking older config.json files).
 */
export const readConfig = async (): Promise<SiteConfig> => {
  const data = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
  const parsed = JSON.parse(data || JSON.stringify(defaultConfig)) as SiteConfig;
  if (deepBackfill(parsed, defaultConfig)) await writeConfig(parsed);
  return parsed;
};

/**
 * THE redaction layer. This is the single place secrets are removed before a config is sent to a
 * browser — every response that carries config must pass through it.
 *
 * Strip everything the public site has no business seeing. `debug` is kept because the frontend
 * reads it; the signature hash and salt never leave the server. The anti-bot answer is stripped
 * for the same reason: the question has to reach the form, the answer must not — a secret that is
 * shipped to the client is not a secret, and that is precisely what made the old hardcoded
 * frontend check useless against a bot that reads the bundle.
 *
 * The returned value is deliberately narrower than `SiteConfig` at runtime (no
 * `security.adminSignature`, no `configuration.antiBot.answer`); the assertion below is what lets
 * the redacted shape keep the config's type for callers, and removing those two branches is the
 * whole point of this function.
 */
export const publicConfig = (config: SiteConfig): SiteConfig => {
  const configuration = config?.configuration ?? ({} as SiteConfig['configuration']);
  const antiBot = configuration.antiBot ?? ({} as SiteConfig['configuration']['antiBot']);
  return {
    ...config,
    configuration: {
      ...configuration,
      antiBot: {
        enabled: Boolean(antiBot.enabled),
        question: typeof antiBot.question === 'string' ? antiBot.question : '',
        // The example describes the shape of the answer, never the answer, so it is public.
        example: typeof antiBot.example === 'string' ? antiBot.example : '',
        // `answer` is intentionally absent. Do not add it back.
      },
    },
    security: { debug: Boolean(config.security && config.security.debug) },
  } as SiteConfig;
};
