export type ProjectType = {
  id?: number,
  createdAt?: string,
  status?: string,
  title: string,
  link: string,
  tags: string[],
  description: string,
  background: string,
  type: 'project' | 'Open Source',
}

export type ArticleType = {
  id?: number,
  title: string,
  link: string,
  createdAt?: string,
  isPinClicked?: boolean,
  description?: string,
}

export type GuestBookType = {
  id?: number,
  name: string;
  message: string;
  createdAt?: string;
  website?: string;
};

export type NavItem = {
  link: string,
  name: string,
  title: string,
  show: boolean,
}

export type BrandType = {
  displayName: string,
  handle: string,
  handleUrl: string,
  logoUrl: string,
  copyrightOwner: string,
  copyrightYear: number,
  navItems: NavItem[],
}

export type ProfileType = {
  fullName: string,
  role: string,
  bio: string,
  welcomeMessages: string[],
  resumeUrl: string,
  brand: BrandType,
  problemSolving: {
    enabled: boolean,
    description: string,
    repoUrl: string,
  },
  socials: {
    email: string,
    signalUrl: string,
    githubUrl: string,
    linkedinUrl: string,
    xUrl: string,
    timezone: string,
  },
  contact: {
    intro: string,
    elsewhereIntro: string,
    emailLabel: string,
    emailDescription: string,
    signalLabel: string,
    signalDescription: string,
    githubLabel: string,
    linkedinLabel: string,
    xLabel: string,
  },
  more: MoreType,
  experience: ExperienceRole[],
  sections: SectionsConfig,
  pages: PagesConfig,
  channels: ContactChannel[],
}

export type MoreCard = {
  title: string,
  description: string,
  linkText: string,
  link: string,
  show: boolean,
}

export type MoreShoeboxItem = {
  name: string,
  link: string,
  show: boolean,
}

/** Content of the "More" page. Empty lists mean the section is not rendered at all. */
export type MoreType = {
  intro: string,
  cards: MoreCard[],
  shoeboxIntro: string,
  shoebox: MoreShoeboxItem[],
}

/** One role in the work history. `active` drives the RUNNING/STOPPED marker. */
export type ExperienceRole = {
  org: string,
  title: string,
  where: string,
  period: string,
  active: boolean,
  points: string[],
  show: boolean,
}

/** Heading, intro copy, visibility and position for one home-page section. */
export type SectionConfig = {
  title: string,
  emoji: string,
  intro: string,
  show: boolean,
  order: number,
}

export type SectionsConfig = {
  intro: SectionConfig,
  experience: SectionConfig,
  projects: SectionConfig,
  openSource: SectionConfig,
  problemSolving: SectionConfig,
  articles: SectionConfig,
}

/** Heading and intro paragraph for a standalone page. */
export type PageCopy = {
  title: string,
  intro: string,
}

export type PagesConfig = {
  contact: PageCopy,
  projects: PageCopy,
  blog: PageCopy,
  guestbook: PageCopy,
  guestbookNotice: PageCopy,
  search: PageCopy,
  notFound: PageCopy,
}

/**
 * A contact channel. Replaces the five hardcoded blocks so an owner can list Mastodon, Bluesky,
 * a personal site or anything else without editing the template.
 */
export type ContactChannel = {
  kind: string,
  label: string,
  url: string,
  description: string,
  icon: string,
  featured: boolean,
  show: boolean,
}

/** Palette for one theme. Keys mirror the Vuetify theme colours the components consume. */
export type ThemeColors = {
  background: string,
  'text-color': string,
  'border-color': string,
  'gray-color': string,
  'link-color': string,
  'box-bg-color': string,
  'link-hover-color': string,
  'front-end-bg-color': string,
  'back-end-bg-color': string,
  form: string,
  /**
   * Vuetify's own accent, behind every `color="primary"` button, tab and switch — sixty-odd of them.
   * It used to be left at Vuetify's factory blue, which meant recolouring the site changed the page
   * but not a single control on it.
   */
  primary: string,
  /**
   * `type="info"` alerts — the explanatory note at the top of every dashboard form. Also Vuetify's
   * factory blue until now. Deliberately a different hue from `primary` so a note does not look
   * like something you can press. `error`, `success` and `warning` keep Vuetify's own colours,
   * because red, green and orange carry meaning that a palette should not reassign.
   */
  info: string,
}

/**
 * IndieWeb webring membership. A webring links member sites to each other, so being in one is a
 * discovery channel rather than decoration. There is no per-site slug: the ring works out which
 * member you are from the HTTP referrer, so the bare /previous and /next endpoints are enough.
 */
export type WebringConfig = {
  enabled: boolean,
  name: string,
  baseUrl: string,
}

export type IndieWebConfig = {
  webring: WebringConfig,
}

/** Document head. Drives <title>, description and link previews. */
export type SiteMeta = {
  title: string,
  description: string,
  siteUrl: string,
  ogImage: string,
  faviconUrl: string,
  twitterHandle: string,
}

export type SettingsType = {
  server: {
    port: number,
    host: string,
  },
  configuration: {
    githubURL: string,
    adminDashboard: boolean,
    multipleThemes: boolean,
    enableSearch: boolean,
    searchModels: Array<'projects' | 'guestbooks' | 'articles' | 'posts'>,
    antiBot: {
      enabled: boolean,
      question: string,
      answer: string,
    },
  },
  theme: {
    defaultTheme: 'dark' | 'light',
    dark: ThemeColors,
    light: ThemeColors,
  },
  meta: SiteMeta,
  indieweb: IndieWebConfig,
  // The admin signature lives on the server as a scrypt hash and is never sent to the browser.
  // Changing it goes through POST /auth/signature, not through the settings payload.
  security: {
    debug: boolean,
  },
  profile: ProfileType,
}

/** Anonymous up/down votes on a post. `mine` is what the requesting reader has already cast. */
export type PostReactions = {
  up: number,
  down: number,
  mine: 'up' | 'down' | null,
}

export type PostType = {
  id?: number,
  title: string,
  content: string,
  createdAt?: string,
  /** Served with the listing so the counts do not need one request per card. Never sent back. */
  reactions?: PostReactions,
}

export type NavLink = {
  path: string,
  text: string,
  emoji: string,
  title: string,
  show: boolean,
}