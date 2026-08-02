import crypto from 'node:crypto';
import express from 'express';
import type { Request, Response, Router } from 'express';
import { readDatabase, writeDatabase } from '../db';
import { readConfig, writeConfig } from '../config/store';
import { log } from '../lib/logger';
import type { Database, DbRecord } from '../types';

/** `catch` binds `unknown` under `strict`, so the original's `error.message` needs unwrapping. */
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const reactionsRouter: Router = express.Router();

export type Vote = 'up' | 'down';

/** One row per (post, voter). Storing the vote rather than a counter is what makes it changeable. */
interface ReactionRecord extends DbRecord {
  postId: number;
  voter: string;
  vote: Vote;
}

/**
 * Per-IP write throttle. Reading is unlimited; casting is not, because the endpoint is public and
 * a loop over one post would otherwise be free. Deliberately generous — a reader changing their
 * mind a few times is normal, a script is not.
 */
const WINDOW_MS = 60 * 1000;
const MAX_VOTES_PER_WINDOW = 20;
const voteWindows = new Map<string, { count: number, resetAt: number }>();

const overVoteLimit = (ip: string): boolean => {
  const now = Date.now();
  const entry = voteWindows.get(ip);
  if (!entry || now > entry.resetAt) {
    voteWindows.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_VOTES_PER_WINDOW;
};

/**
 * Salt for the voter hash, generated once and kept in config.
 *
 * Votes are anonymous, and an unsalted hash of an IP address is not: the space is small enough to
 * enumerate, so a leaked database would be a list of who voted on what. Salted, the stored value
 * is meaningless outside this install. Deliberately NOT the admin signature's salt — that one
 * protects a password and has no business being reused.
 */
let cachedSalt: string | null = null;
const voterSalt = async (): Promise<string> => {
  if (cachedSalt) return cachedSalt;
  const config = await readConfig();
  const existing = config.security?.voteSalt || '';
  if (existing) {
    cachedSalt = existing;
    return existing;
  }
  const generated = crypto.randomBytes(16).toString('hex');
  config.security = { ...config.security, voteSalt: generated };
  await writeConfig(config);
  cachedSalt = generated;
  log('Generated a salt for anonymous post votes', 'info');
  return generated;
};

/**
 * Who is voting, as far as this site is concerned.
 *
 * There are no accounts, so the IP is the only identity available. It is hashed with the salt and
 * the post id, which means the stored value cannot be reversed to an address and cannot be
 * correlated across posts either. This is a courtesy limit, not a security control: anyone
 * determined to vote twice can change address, and that is an acceptable trade for not asking a
 * reader to create an account before they can say they liked something.
 */
const voterId = async (req: Request, postId: number): Promise<string> =>
  crypto.createHash('sha256').update(`${await voterSalt()}:${postId}:${req.ip || 'unknown'}`).digest('hex').slice(0, 32);

/** The reactions collection, created on first use so an older db.json needs no migration. */
const reactionList = (dbData: Database): DbRecord[] => {
  if (!Array.isArray(dbData.reactions)) dbData.reactions = [];
  return dbData.reactions;
};

const isReaction = (entry: DbRecord): entry is ReactionRecord =>
  typeof entry.postId === 'number' && typeof entry.voter === 'string';

export interface Tally {
  up: number;
  down: number;
  /** What this particular reader has already cast, so the button can show it as chosen. */
  mine: Vote | null;
}

const tallyFor = (list: DbRecord[], postId: number, voter: string | null): Tally => {
  let up = 0;
  let down = 0;
  let mine: Vote | null = null;
  for (const entry of list) {
    if (!isReaction(entry) || entry.postId !== postId) continue;
    if (entry.vote === 'up') up += 1;
    else if (entry.vote === 'down') down += 1;
    if (voter && entry.voter === voter) mine = entry.vote;
  }
  return { up, down, mine };
};

/** Counts for every post at once, so a listing does not make one request per post. */
export const tallyAll = async (req: Request, dbData: Database): Promise<Record<number, Tally>> => {
  const list = reactionList(dbData);
  const result: Record<number, Tally> = {};
  for (const post of dbData.posts) {
    if (typeof post.id !== 'number') continue;
    result[post.id] = tallyFor(list, post.id, await voterId(req, post.id));
  }
  return result;
};

reactionsRouter.get('/posts/:id/reactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (Number.isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post id' });
      return;
    }
    const dbData = await readDatabase();
    res.json({ data: tallyFor(reactionList(dbData), postId, await voterId(req, postId)) });
  } catch (error) {
    log(`Failed to read reactions: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});

/**
 * Cast, change or take back a vote. `{ vote: null }` is "undo", which is what clicking the arrow
 * you already chose sends — a reaction you cannot take back is a trap.
 */
reactionsRouter.post('/posts/:id/reactions', async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (Number.isNaN(postId)) {
      res.status(400).json({ error: 'Invalid post id' });
      return;
    }

    const vote = (req.body as { vote?: unknown }).vote;
    if (vote !== 'up' && vote !== 'down' && vote !== null) {
      res.status(400).json({ error: "vote must be 'up', 'down' or null" });
      return;
    }

    if (overVoteLimit(req.ip || 'unknown')) {
      res.status(429).json({ error: 'Too many votes. Try again in a minute.' });
      return;
    }

    const dbData = await readDatabase();
    if (!dbData.posts.some((post) => post.id === postId)) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const list = reactionList(dbData);
    const voter = await voterId(req, postId);
    const index = list.findIndex((entry) => isReaction(entry) && entry.postId === postId && entry.voter === voter);

    if (vote === null) {
      if (index !== -1) list.splice(index, 1);
    } else if (index === -1) {
      list.push({ postId, voter, vote, createdAt: new Date().toISOString() });
    } else {
      list[index] = { ...list[index], vote, updatedAt: new Date().toISOString() };
    }

    await writeDatabase(dbData);
    res.json({ data: tallyFor(list, postId, voter) });
  } catch (error) {
    log(`Failed to record a reaction: ${errorMessage(error)}`, 'error');
    res.status(500).json({ error: errorMessage(error) });
  }
});
