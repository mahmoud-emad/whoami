import type { SiteConfig } from '../types';

/**
 * The shape a fresh `config.json` is created with, and the source `readConfig` backfills against.
 *
 * Key order is preserved from the original CommonJS server because this literal is what gets
 * serialised to disk on first boot — reordering it would churn every operator's config.json.
 */
export const defaultConfig: SiteConfig = {
  server: {
    host: 'localhost',
    port: 3000,
  },
  configuration: {
    githubURL: '',
    adminDashboard: true,
    multipleThemes: true,
    enableSearch: true,
    searchModels: ['projects', 'guestbooks', 'articles', 'posts'],
    // Guestbook spam gate. The answer used to be hardcoded to the original owner's handle,
    // which meant nobody else could pass their own form.
    antiBot: {
      enabled: true,
      question: '',
      answer: '',
      example: '',
    },
  },
  // Set by the first-run wizard when it is completed or skipped. Present in the defaults so it is
  // a real config key: POST /settings only accepts keys that already exist, and `deepBackfill`
  // adds it to installs that predate it (as `false`, which is correct — they were configured by
  // hand, and the emptiness check in the dashboard keeps the wizard away from them).
  setupCompleted: false,
  theme: {
    defaultTheme: 'light',
    // Palettes were 23 hex literals inside plugins/vuetify.ts. They live here so an owner can
    // recolour the site without touching code. Keep them in step with BOOT_DARK_COLORS and
    // BOOT_LIGHT_COLORS there, which is what the very first frame paints with.
    dark: {
      background: '#14110F',
      'text-color': '#F2EDE7',
      'border-color': '#403830',
      'gray-color': '#A79E95',
      'link-color': '#E5C9A3',
      'box-bg-color': '#1C1815',
      'link-hover-color': '#E0A458',
      'front-end-bg-color': '#33241A',
      'back-end-bg-color': '#2A2A1C',
      form: '#1A1613',
      primary: '#E0A458',
      info: '#A8B89A',
      success: '#93C08A',
      error: '#E08A72',
    },
    light: {
      background: '#FDFCFA',
      'text-color': '#1A1613',
      'border-color': '#D9D1C5',
      'gray-color': '#6B6259',
      'link-color': '#8A4F1B',
      'box-bg-color': '#FFFFFF',
      'link-hover-color': '#9A5A1C',
      'front-end-bg-color': '#F5E6D3',
      'back-end-bg-color': '#EDE9DA',
      form: '#F7F4EF',
      primary: '#9A5A1C',
      info: '#46603D',
      success: '#3F6B34',
      error: '#9A3B23',
    },
  },
  // IndieWeb. A webring is a reciprocal-link network: joining puts the site in other people's
  // "next/previous" navigation, which is the point of it for discoverability. The ring exposes
  // bare /previous and /next endpoints and works out which member sent a visitor from the HTTP
  // referrer, so there is no per-site slug or key to configure. Register the site at baseUrl
  // first; until the ring knows the domain the links just bounce to the ring's own index.
  indieweb: {
    webring: {
      enabled: false,
      name: 'IndieWeb Webring',
      baseUrl: 'https://xn--sr8hvo.ws',
    },
  },
  // Document head. index.html had no title, description or link-preview tags at all.
  meta: {
    title: '',
    description: '',
    siteUrl: '',
    ogImage: '',
    faviconUrl: '',
    twitterHandle: '',
  },
  security: {
    debug: false,
    // Never stores the signature itself — only a scrypt hash and its salt. Seeded on first
    // boot from ADMIN_SIGNATURE, or randomly generated and printed once to the server log.
    adminSignature: {
      salt: '',
      hash: '',
    },
  },
  profile: {
    fullName: '',
    role: '',
    bio: '',
    welcomeMessages: [],
    resumeUrl: '',
    brand: {
      displayName: '',
      handle: '',
      handleUrl: '',
      logoUrl: '',
      copyrightOwner: '',
      copyrightYear: new Date().getFullYear(),
      navItems: [
        { link: '/', name: '❄️ About', title: 'About me', show: true },
        { link: '/contact', name: '📞 Contact', title: 'Contact me', show: true },
        { link: '/projects', name: '🎨 Projects', title: 'See my projects', show: true },
        { link: '/blog', name: '✍️ Blog', title: 'See my blog', show: true },
        { link: '/guestbook', name: '🧁 Guestbook', title: 'Write me a guestbook', show: true },
        { link: '/more', name: '🌏 More', title: 'Wanna to see more?', show: true },
      ],
    },
    problemSolving: {
      enabled: true,
      description: '',
      repoUrl: '',
    },
    socials: {
      email: '',
      signalUrl: '',
      githubUrl: '',
      linkedinUrl: '',
      xUrl: '',
      timezone: '',
    },
    contact: {
      intro: '',
      elsewhereIntro: '',
      emailLabel: '',
      emailDescription: '',
      signalLabel: '',
      signalDescription: '',
      githubLabel: '',
      linkedinLabel: '',
      xLabel: '',
    },
    // Drives the "More" page. Everything here is editable from the admin dashboard so the
    // page only ever advertises things that actually exist — cards used to be hardcoded and
    // pointed at pages that had never been built.
    more: {
      intro: '',
      // Cards: { title, description, linkText, link, show }
      cards: [],
      shoeboxIntro: '',
      // Small links: { name, link, show }
      shoebox: [],
    },
    // Work history. Was a hardcoded array inside ExperienceSection.vue.
    // { org, title, where, period, active, points[], show }
    experience: [],
    // Heading, intro, visibility and order for each home-page section.
    sections: {
      intro: { title: '', emoji: '', intro: '', show: true, order: 1 },
      experience: { title: 'Experience', emoji: '⚙️', intro: '', show: true, order: 2 },
      projects: { title: 'Selected Work', emoji: '🎨', intro: '', show: true, order: 3 },
      openSource: { title: 'Open Source', emoji: '🌟', intro: '', show: true, order: 4 },
      problemSolving: { title: 'Problem Solving', emoji: '🧠', intro: '', show: true, order: 5 },
      articles: { title: 'Articles', emoji: '📝', intro: '', show: true, order: 6 },
    },
    // Heading and intro copy for the standalone pages.
    pages: {
      contact: { title: 'Contact', intro: '' },
      projects: { title: 'Projects', intro: '' },
      blog: { title: 'Blog', intro: '' },
      guestbook: { title: 'Guestbook', intro: '' },
      guestbookNotice: { title: '', intro: '' },
      search: { title: 'Search', intro: '' },
      notFound: { title: 'This page does not exist yet.', intro: '' },
    },
    // Contact channels. Replaces the five hardcoded blocks in Contact.vue.
    // { kind, label, url, description, icon, featured, show }
    channels: [],
  },
};
