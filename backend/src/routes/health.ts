import express from 'express';
import type { Request, Response, Router } from 'express';

/**
 * Supported Endpoints
 * 🔒 marks endpoints that require a bearer token from POST /auth/login.
 */
export const endpoints: Record<string, string> = {
  '/': 'Home',
  '/auth/login (POST)': 'Exchange the admin signature for a bearer token',
  '/auth/logout (POST)': '🔒 Invalidate the current token',
  '/auth/session (GET)': 'Report whether the supplied token is still valid',
  '/auth/signature (POST)': '🔒 Change the admin signature',
  '/search (GET)': 'Search the collections listed in configuration.searchModels (?q=…)',
  '/settings (GET)': 'Public site settings (never includes credentials)',
  '/settings (POST)': '🔒 Update site settings',
  '/guestbooks (GET)': 'List guestbook entries with pagination & sorting',
  '/guestbooks (POST)': 'Add a new guestbook entry',
  '/guestbooks/:id (PUT)': '🔒 Update guestbook entry by ID',
  '/guestbooks/:id (DELETE)': '🔒 Delete guestbook entry by ID',
  '/projects (GET)': 'List projects',
  '/projects (POST)': '🔒 Add a new project',
  '/projects/:id (PUT)': '🔒 Update project by ID',
  '/projects/:id (DELETE)': '🔒 Delete project by ID',
  '/articles (GET)': 'List articles',
  '/articles (POST)': '🔒 Add a new article',
  '/articles/:id (PUT)': '🔒 Update article by ID',
  '/articles/:id (DELETE)': '🔒 Delete article by ID',
  '/posts (GET)': 'List blog posts',
  '/posts (POST)': '🔒 Add a new blog post',
  '/posts/:id (PUT)': '🔒 Update blog post by ID',
  '/posts/:id (DELETE)': '🔒 Delete blog post by ID',
  '/upload (POST)': '🔒 Upload a file (JPEG/PNG/GIF/PDF, ≤5MB)',
  '/uploads (GET)': '🔒 List uploaded files',
  '/uploads/:filename (DELETE)': '🔒 Delete an uploaded file by filename',
};

export interface ApiInfo {
  status: string;
  healthy: boolean;
  api: string;
  endpoints: Record<string, string>;
}

// Endpoints
export const apiInfo = (): ApiInfo => ({
  status: '200 OK',
  healthy: true,
  api: 'Portfolio API',
  endpoints,
});

export const healthRouter: Router = express.Router();

// Always available, and what the frontend's heartbeat polls.
healthRouter.get('/health', (_req: Request, res: Response): void => {
  res.json(apiInfo());
});

// Index of the API itself, at /api.
healthRouter.get('/', (_req: Request, res: Response): void => {
  res.json(apiInfo());
});
