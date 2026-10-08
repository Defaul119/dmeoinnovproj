// Picks the data source. The prototype runs on the in-browser mock with illustrative data;
// Assignment 3 sets VITE_API_MODE=http (see frontend/.env.example) to use the FastAPI back end.

import { createHttpApi } from './http';
import { mockApi } from './mock/mockApi';
import type { ExplorerApi } from './types';

export const API_MODE: 'mock' | 'http' = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';

export const api: ExplorerApi =
  API_MODE === 'http' ? createHttpApi(import.meta.env.VITE_API_BASE ?? 'http://localhost:8000') : mockApi;
