import fs from 'node:fs/promises';
import { FILE_PATH } from '../config/paths';
import { log } from '../lib/logger';
import type { Database, DbRecord } from '../types';

export const defaultDB: Database = {
  guestbooks: [],
  posts: [],
  projects: [],
  articles: [],
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    await fs.access(FILE_PATH);
    log('Database exists', 'info');
  } catch {
    log('Database does not exist, creating it...', 'info');
    await fs.writeFile(FILE_PATH, JSON.stringify(defaultDB, null, 2));
  }
};

export const readDatabase = async (): Promise<Database> => {
  const data = await fs.readFile(FILE_PATH, 'utf8');
  return JSON.parse(data || JSON.stringify(defaultDB)) as Database;
};

export const writeDatabase = async (dbData: Database): Promise<void> => {
  await fs.writeFile(FILE_PATH, JSON.stringify(dbData, null, 2));
};

/** Next id is max(existing id) + 1, so deleting an entry never causes a collision later. */
export const nextId = (list: DbRecord[]): number =>
  list.reduce((max, entry) => (entry && typeof entry.id === 'number' && entry.id > max ? entry.id : max), 0) + 1;

/** Update an entry by id, preserving the server-owned id and createdAt. */
export const updateById = (list: DbRecord[], id: number, patch: DbRecord): DbRecord | null => {
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) return null;

  const { id: _ignoreId, createdAt, ...rest } = list[index];
  list[index] = {
    ...rest,
    ...patch,
    id: list[index].id,
    createdAt: createdAt || list[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  return list[index];
};
