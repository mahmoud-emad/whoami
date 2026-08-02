import express from 'express';
import type { Request, Response, Router } from 'express';
import { readConfig } from '../config/store';
import { readDatabase } from '../db';
import { log } from '../lib/logger';
import type { DbRecord, SearchModel } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// ---------------------------------------------------------------------------
// Search
//
// Public. Honours the two settings the admin dashboard already exposed but that nothing was
// reading: `enableSearch` turns it off entirely, and `searchModels` decides which collections
// are looked at.
// ---------------------------------------------------------------------------
export const SEARCH_FIELDS: Record<SearchModel, string[]> = {
  projects: ['title', 'description', 'tags'],
  articles: ['title', 'description'],
  posts: ['title', 'content'],
  guestbooks: ['name', 'message'],
};
export const SEARCH_MAX_PER_MODEL = 20;
export const SEARCH_MAX_QUERY = 100;

// Match against a whitelist of fields per collection so a query can never reach a field that
// was never meant to be public.
export const entryMatches = (entry: DbRecord, fields: string[], needle: string): boolean =>
  fields.some((field) => {
    const value = entry[field];
    if (typeof value === 'string') return value.toLowerCase().includes(needle);
    if (Array.isArray(value)) {
      return value.some((v) => typeof v === 'string' && v.toLowerCase().includes(needle));
    }
    return false;
  });

export const searchRouter: Router = express.Router();

searchRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const configData = await readConfig();
    if (!configData.configuration || !configData.configuration.enableSearch) {
      res.status(403).json({ error: 'Search is turned off' });
      return;
    }

    const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!raw) {
      res.json({ query: '', total: 0, results: {} });
      return;
    }
    const needle = raw.slice(0, SEARCH_MAX_QUERY).toLowerCase();

    // The stored list is owner-editable JSON, so it is read as plain strings and each entry is
    // only trusted once SEARCH_FIELDS confirms it names a searchable collection.
    const enabled: string[] = Array.isArray(configData.configuration.searchModels)
      ? (configData.configuration.searchModels as string[])
      : [];

    const dbData = await readDatabase();
    const results: Record<string, DbRecord[]> = {};
    let total = 0;

    for (const model of enabled) {
      const fields: string[] | undefined = SEARCH_FIELDS[model as SearchModel];
      const collection = dbData[model];
      if (!fields || !Array.isArray(collection)) continue;

      const hits = collection
        .filter((entry) => entry && entryMatches(entry, fields, needle))
        .slice(0, SEARCH_MAX_PER_MODEL);

      if (hits.length) {
        results[model] = hits;
        total += hits.length;
      }
    }

    res.json({ query: raw, total, results, searched: enabled });
  } catch (error) {
    log(`Search failed: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: 'Search failed' });
  }
});
