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

export type SettingsType = {
  configuration: {
    adminDashboard: boolean,
    displayNavbarImage: boolean,
    multipleThemes: boolean,
    enableSearch: boolean,
    searchModels: Array<'projects' | 'guestbooks' | 'articles' | 'posts'>,
  },
  theme: {
    defaultTheme: 'dark' | 'light'
  },
  security: {
    debug: boolean,
    adminFingerprintSignature: string
  },
  personal: {
    fullName: string,
    email: string,
    country: string,
    resumeURL?: string,
    social: {
      github: string,
      linkedin: string
      twitter?: string,
      whatsapp?: string,
      signal?: string,
      telegram?: string
    },
  }
}

export type PostType = {
  id?: number,
  title: string,
  content: string,
  createdAt?: string
}

export type NavLink = {
  path: string,
  text: string,
  emoji: string,
  title: string,
  show: boolean,
}

export type CustomResponse<T> = {
  count?: number,
  next?: string,
  previous?: string,
  results: T,
  error?: any
}

export interface FieldGuide {
  field: string;
  description: string;
}

export interface TabDefinition {
  label: string;
  value: string;
  icon: string;
  component?: any;
  componentName: string;
  description: string;
  setupInstructions?: string;
  setupStep: number | null;
  required: boolean;
  enabled: boolean;
  introMessage?: string;
  fieldGuides?: FieldGuide[];
}