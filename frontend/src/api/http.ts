// The real client, used once the FastAPI back end exists (Assignment 3).
// Every non-2xx answer becomes an ApiError carrying the back end's JSON body, so the
// screens handle 400 / 404 / 422 exactly as they do with the mock.

import { ApiError, type ApiErrorBody, type ExplorerApi } from './types';

export function createHttpApi(baseUrl: string): ExplorerApi {
  const base = baseUrl.replace(/\/$/, '');

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, {
        ...init,
        headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
      });
    } catch {
      throw new ApiError(0, { status: 'network', message: 'The explorer service did not respond.' });
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const fallback: ApiErrorBody = { status: 'network', message: `The explorer service answered with error ${response.status}.` };
      throw new ApiError(response.status, body && typeof body.status === 'string' ? (body as ApiErrorBody) : fallback);
    }
    return body as T;
  }

  const enc = encodeURIComponent;
  return {
    listAddresses: () => request('/api/addresses'),
    lookup: (address) => request('/api/lookup', { method: 'POST', body: JSON.stringify({ address }) }),
    timeline: (address) => request(`/api/addresses/${enc(address)}/timeline`),
    day: (address, date) => request(`/api/addresses/${enc(address)}/transactions?date=${enc(date)}`),
    transaction: (txid, address) => request(`/api/transactions/${enc(txid)}?address=${enc(address)}`),
  };
}
