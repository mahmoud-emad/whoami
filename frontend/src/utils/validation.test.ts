import { describe, expect, it } from 'vitest';

import {
  emailRules,
  emojiRules,
  fileRules,
  githubWebsiteRules,
  handleRules,
  hexColorRules,
  imageUrlRules,
  integerRules,
  linkRules,
  nameRules,
  signatureRules,
  tagsRules,
  timezoneRules,
  twitterHandleRules,
  urlRules,
  yearRules,
  type Rule,
} from './validation';

/** Run a rule set the way Vuetify does: the first failure wins. */
const check = (rules: Rule[], value: unknown): true | string => {
  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) return result;
  }
  return true;
};

const accepts = (rules: Rule[], value: unknown) => expect(check(rules, value)).toBe(true);
const rejects = (rules: Rule[], value: unknown) => expect(check(rules, value)).not.toBe(true);

describe('the optional-by-default convention', () => {
  it('lets a blank value through every optional rule', () => {
    accepts(urlRules(), '');
    accepts(emailRules(), '');
    accepts(hexColorRules(), '   ');
    accepts(timezoneRules(), undefined);
  });

  it('rejects a blank value once required is set', () => {
    rejects(urlRules({ required: true }), '');
    rejects(nameRules({ required: true }), '   ');
  });
});

describe('urlRules', () => {
  it('accepts absolute http and https addresses', () => {
    accepts(urlRules(), 'https://example.com');
    accepts(urlRules(), 'http://example.com/path?query=1#hash');
  });

  // The regex this replaced accepted a bare domain, which then rendered as a relative link
  // pointing back at the owner's own site.
  it('rejects a scheme-less domain', () => {
    rejects(urlRules(), 'example.com');
  });

  // ...and rejected these, which are all perfectly ordinary.
  it('accepts long TLDs, localhost and ports', () => {
    accepts(urlRules(), 'https://example.technology');
    accepts(urlRules(), 'http://localhost:3000');
    accepts(urlRules(), 'http://127.0.0.1:8080');
  });

  it('rejects script-bearing schemes', () => {
    rejects(urlRules(), 'javascript:alert(1)');
    rejects(urlRules(), 'data:text/html,<script>alert(1)</script>');
    rejects(urlRules(), 'vbscript:msgbox');
    rejects(urlRules(), '  JavaScript:alert(1)');
  });

  it('only allows a relative path when asked', () => {
    rejects(urlRules(), '/lists');
    accepts(linkRules(), '/lists');
    accepts(imageUrlRules(), '/uploads/preview.png');
  });

  it('honours a host allowlist, ignoring www', () => {
    accepts(githubWebsiteRules(), 'https://github.com/ada');
    accepts(githubWebsiteRules(), 'https://www.github.com/ada');
    rejects(githubWebsiteRules(), 'https://gitlab.com/ada');
    // A lookalike host must not pass by substring match, which is how the old check worked.
    rejects(githubWebsiteRules(), 'https://notgithub.com/ada');
  });
});

describe('emailRules', () => {
  it('accepts ordinary addresses', () => {
    accepts(emailRules(), 'ada@example.com');
    accepts(emailRules(), 'ada.lovelace+tag@mail.example.co.uk');
  });

  it('rejects the mistakes people actually make', () => {
    rejects(emailRules(), 'ada@example');
    rejects(emailRules(), 'ada example@x.com');
    rejects(emailRules(), 'ada@@example.com');
    rejects(emailRules(), 'ada@example.');
  });
});

describe('small formats', () => {
  it('validates hex colours with and without alpha', () => {
    accepts(hexColorRules(), '#1d6fa5');
    accepts(hexColorRules(), '1d6fa5cc');
    rejects(hexColorRules(), 'blue');
    rejects(hexColorRules(), '#12345');
  });

  it('validates IANA timezones through Intl', () => {
    accepts(timezoneRules(), 'Europe/Berlin');
    accepts(timezoneRules(), 'America/Sao_Paulo');
    rejects(timezoneRules(), 'Mars/Olympus');
  });

  it('validates handles', () => {
    accepts(handleRules(), '@ada');
    accepts(handleRules(), 'ada.lovelace');
    rejects(handleRules(), 'ada lovelace');
  });

  it('caps an X handle at 15 characters', () => {
    accepts(twitterHandleRules(), '@ada');
    rejects(twitterHandleRules(), '@abcdefghijklmnop');
  });

  it('counts emoji by code point', () => {
    accepts(emojiRules(), '🎨');
    accepts(emojiRules(), '🇪🇬');
    rejects(emojiRules(), '🎨🎨🎨🎨🎨');
  });
});

describe('numbers', () => {
  it('bounds integers', () => {
    accepts(integerRules({ min: 1, max: 9 }), '5');
    rejects(integerRules({ min: 1, max: 9 }), '0');
    rejects(integerRules({ min: 1, max: 9 }), '99');
    rejects(integerRules(), '1.5');
    rejects(integerRules(), 'five');
  });

  it('allows next year but not a far-future year', () => {
    const nextYear = new Date().getFullYear() + 1;
    accepts(yearRules(), String(nextYear));
    rejects(yearRules(), String(nextYear + 5));
  });
});

describe('collections', () => {
  it('caps the tag count and each tag length', () => {
    accepts(tagsRules(), ['a', 'b', 'c', 'd']);
    rejects(tagsRules(), ['a', 'b', 'c', 'd', 'e']);
    rejects(tagsRules(), ['x'.repeat(30)]);
  });
});

describe('fileRules', () => {
  const file = (type: string, size: number) => {
    const f = new File(['x'], 'logo', { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('accepts an image within the limit', () => {
    accepts(fileRules(), file('image/png', 1024));
  });

  it('rejects the wrong type and anything oversized', () => {
    rejects(fileRules(), file('application/pdf', 1024));
    rejects(fileRules(), file('image/png', 6 * 1024 * 1024));
  });
});

describe('signatureRules', () => {
  it('enforces the minimum length when setting a new signature', () => {
    rejects(signatureRules(), 'short');
    accepts(signatureRules(), 'longenough');
  });

  // An existing signature may predate the minimum, and telling somebody their password is too
  // short while they are trying to use it helps nobody.
  it('skips the length check when logging in', () => {
    accepts(signatureRules({ forLogin: true }), 'short');
    rejects(signatureRules({ forLogin: true }), '');
  });
});
