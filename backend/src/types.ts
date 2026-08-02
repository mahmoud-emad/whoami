import type { Request } from 'express';

export interface SignatureRecord {
  salt: string;
  hash: string;
}

export interface AntiBotConfig {
  enabled: boolean;
  question: string;
  answer: string;
}

export type SearchModel = 'projects' | 'guestbooks' | 'articles' | 'posts';

/**
 * The runtime config. Deliberately loose in the leaves: `deepBackfill` merges new default keys into
 * an existing file on read, so a config on disk may legitimately be older than this shape and the
 * code must tolerate missing branches rather than assume them.
 */
export interface SiteConfig {
  server: { host: string; port: number };
  configuration: {
    githubURL: string;
    adminDashboard: boolean;
    multipleThemes: boolean;
    enableSearch: boolean;
    searchModels: SearchModel[];
    antiBot: AntiBotConfig;
  };
  theme: Record<string, unknown>;
  meta: Record<string, string>;
  indieweb: Record<string, unknown>;
  /**
   * Set once the owner has been through (or skipped) the first-run wizard. Persisted rather than
   * kept in the browser so it survives a different machine, and so a restored blank config puts
   * the wizard back — that install really is unconfigured again.
   */
  setupCompleted?: boolean;
  security: {
    debug: boolean;
    adminSignature: SignatureRecord;
    /**
     * Salt for the anonymous vote hash. Generated on the first vote rather than shipped as a
     * default: it has to differ per install, or the same IP would hash identically everywhere.
     * Deliberately separate from `adminSignature.salt`, which protects a password.
     */
    voteSalt?: string;
  };
  profile: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DbRecord {
  id?: number;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Database {
  guestbooks: DbRecord[];
  posts: DbRecord[];
  projects: DbRecord[];
  articles: DbRecord[];
  [key: string]: DbRecord[];
}

/** Express request narrowed to what this codebase actually reads off it. */
export type ApiRequest = Request;
