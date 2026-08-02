# Making whoami a reusable open-source portfolio

Audit of what stopped someone else cloning this repo and getting *their* portfolio, plus the plan to
fix it. Written 2026-08-01 against the live codebase. Status updated 2026-08-02.

**Where it stands: phases 1 to 3 are done bar the setup wizard, phase 4 is done bar screenshots and
the tab consolidation.** The remaining work is listed at the bottom.

## The original problem (fixed)

A fresh clone did not show an empty portfolio. It showed the original owner's.

Twelve source files carried hardcoded identity, and seven `fallbackX` constants meant the site
deliberately fell back to that identity whenever config was blank.

| File | What leaked when config was empty | Status |
| --- | --- | --- |
| `views/Contact.vue` | email, Signal link, GitHub, LinkedIn, X, timezone, all contact copy | Done — config driven |
| `components/Navbar.vue` | display name, handle, GitHub URL | Done — config driven |
| `components/home/IntroSection.vue` | name, welcome lines, bio | Done — config driven |
| `components/home/ProblemSolvingSection.vue` | repo URL, description | Done — config driven |
| `components/home/ProjectsSection.vue` | "Check out my GitHub profile" URL | Done — config driven |
| `components/home/ExperienceSection.vue` | entire work history (hardcoded array) | Done — `profile.experience[]` |
| `components/Footer.vue` | copyright owner | Done — config driven |
| `views/Projects.vue` | GitHub URL | Done — config driven |
| `utils/index.ts` | anti-bot answer | Done — moved server side |
| `router/index.ts` | owner name in 10 page titles | Done — reads `brand.displayName` |
| `forms/BrandForm.vue`, `forms/SocialsForm.vue` | placeholder examples | Done — generic placeholders |

The fallback pattern was the root cause. It was the right call for a personal site (the page never
looks broken) and exactly wrong for a template. Empty config now renders nothing, so a new owner can
see what still needs filling in.

CI enforces this. The `no-personal-data` job greps `frontend/src/` and `frontend/index.html` for the
original owner's name and handles and fails the build on a hit. As of today that grep returns
nothing.

The only remaining "fallback" in the tree is the boot palette in `plugins/vuetify.ts`, which exists
because Vuetify is created before `GET /api/settings` answers. It is colours, not identity.

## Phase 1: stop leaking identity **Done.** done

1. **Done.** **Every `fallbackX` constant deleted.** Empty config renders nothing.
2. **Done.** **Anti-bot answer made configurable and moved server side.** `configuration.antiBot.question`
   is public, `configuration.antiBot.answer` is stripped from every response and checked in the POST
   handler. This was chosen over a honeypot because it also documents itself to the visitor.
3. **Done.** **Page titles from config.** The router watches `profile.brand.displayName`.
4. **Done.** **Neutral `backend/config.example.json`** shipped, matching `defaultConfig`.
5. **Done.** **Remaining literals purged** from `Search.vue`, `BrandForm`, `SocialsForm`.

## Phase 2: configure the rest of the content **Done.** done

6. **Done.** **`profile.experience[]`**, edited in place on the home page's Experience section.
7. **Done.** **`profile.sections{}`** with a `SectionsForm`: per-section title, emoji, intro, visibility and
   order for the six home page sections.
8. **Done.** **`profile.pages{}`** with a `PagesForm`: heading and intro for Contact, Projects, Blog,
   Guestbook, Search and 404.
9. **Done.** **`profile.channels[]`**, edited in place on the Contact page. The five channel ceiling is gone.

Also landed, beyond the original list:

- **Done.** **`profile.more{}`**, edited in place on the More page, so it only advertises pages that exist.
- **Done.** **`profile.brand.navItems[]`**, so the navigation is editable.
- **Done.** **Search wired to its own settings.** `enableSearch` and `searchModels` were in the dashboard
  and read by nothing. `GET /api/search` now honours both.

## Phase 3: make it feel like a template (2 of 3)

10. **Done.** **Configurable theme.** Both palettes live in `theme.dark` / `theme.light` and Vuetify is fed
    from settings. `AppearanceForm` edits all twelve slots per palette — including Vuetify's own
    `primary` and `info`, which used to be left at the factory blue — and shows a live WCAG 2.1
    contrast readout against a 4.5:1 AA floor. The light theme's 2.68:1 body text is fixed.
11. **Done.** **Document head from config.** `useDocumentHead` owns the meta tags and favicon in the SPA,
    and the production server injects real title, description, Open Graph and Twitter tags into the
    HTML it returns so crawlers see them without running JavaScript. `MetaForm` edits them.
12. **Done.** **First-run setup wizard.** An install that has not been set up opens a three-step
    flow (identity, links, theme) instead of the tab rail, and ends by pointing at the pages where
    content is actually written. Keyed on a persisted `setupCompleted` flag rather than on the
    owner's name, because production refuses to boot without `SITE_OWNER` and would therefore
    never have shown it.

## Phase 4: repo hygiene (2 of 4)

13. **Done.** **LICENSE** (MIT), **CONTRIBUTING.md**, and issue templates (`bug_report.md`,
    `config_gap.md`).
14. **Done.** **CI**: typecheck, lint, build, `node --check` on the backend, and the no-personal-data grep.
15. **Partly.** **README** rewritten with the feature list, quick start, security model, API and scripts
    tables, and a pointer to the manual in `docs/`. **The screenshot is still a placeholder.**
16. **Done.** **Consolidate the dashboard.** 24 tabs down to nine. Everything that is content — projects,
    posts, articles, experience, contact channels, the More page, the guestbook — is edited on the
    page it appears on, so the dashboard holds only the settings that shape the whole site.

Also landed, beyond the original list:

- **Done.** **`docs/` manual**: first run, the config model, every environment variable, the dashboard
  tabs, theming and contrast, the webring, deploying, and backups.
- **Done.** **In place editing.** Signed in owners get create, edit and delete controls on the public pages
  themselves, via `components/admin/InlineActions.vue` and `EditorDialog.vue`.
- **Done.** **Admin login moved to `/admin`**, with `/admin-signature` kept as a redirect. The footer no
  longer advertises it.
- **Done.** **IndieWeb webring** support in the footer, configurable from the Site meta tab and seedable
  with `WEBRING_ENABLED`.

## What actually remains

Short and honest.

1. **Form pattern drift.** `SettingsForm.vue` still hand-rolls its feedback state instead of using
   `useFormFeedback`, and it redirects through the legacy `/admin-signature` path rather than
   `/admin`.
2. **No tests.** CI typechecks, lints, builds and builds the three images, which catches a lot for
   a project this size, but there is no test for the auth flow, the seeding rules or
   `deepBackfill`. Those three carry the most risk of a silent regression.

## Decisions that were taken

- **Anti-bot**: configurable question, not a honeypot. The answer never reaches the client.
- **Theme**: full colour configuration, with a contrast check rather than a preset list.
- **SEO**: yes, server-side meta injection. An SPA with no crawlable head was not defensible for a
  portfolio.
- **Dashboard**: consolidation deferred until after the new forms landed. They have landed, so it is
  now open.
- **Scope**: the template keeps the Guestbook and the Blog. Both are toggleable through the nav
  items and the section settings, which is close enough to opt-in.
