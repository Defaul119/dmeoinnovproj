import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/types';

export type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

// Successful responses are kept for the session: the snapshot is frozen, so a timeline
// fetched once never changes, and going back never shows a second loading state.
const cache = new Map<string, unknown>();

export function clearRequestCache(): void {
  cache.clear();
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError(0, { status: 'network', message: err instanceof Error ? err.message : 'Unknown error' });
}

function initial<T>(key: string | null): RequestState<T> {
  if (key === null) return { status: 'idle' };
  if (cache.has(key)) return { status: 'success', data: cache.get(key) as T };
  return { status: 'loading' };
}

/** Loads `fetcher()` whenever `key` changes. A null key means "nothing to load" (idle). */
export function useRequest<T>(key: string | null, fetcher: () => Promise<T>): RequestState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  // State remembers which key it belongs to, so a new key never shows the previous key's result.
  const [state, setState] = useState<{ key: string | null; value: RequestState<T> }>(() => ({ key, value: initial(key) }));

  useEffect(() => {
    if (key === null || cache.has(key)) {
      setState({ key, value: initial(key) });
      return;
    }
    let cancelled = false;
    setState({ key, value: { status: 'loading' } });
    fetcher().then(
      (data) => {
        cache.set(key, data);
        if (!cancelled) setState({ key, value: { status: 'success', data } });
      },
      (err: unknown) => {
        if (!cancelled) setState({ key, value: { status: 'error', error: toApiError(err) } });
      },
    );
    return () => {
      cancelled = true;
    };
    // fetcher is recreated every render; the key alone identifies the request.
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const value = state.key === key ? state.value : initial<T>(key);
  return { ...value, retry };
}

/** Run a one-off request outside render (form submits). */
export async function runRequest<T>(fetcher: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  try {
    return { ok: true, data: await fetcher() };
  } catch (err) {
    return { ok: false, error: toApiError(err) };
  }
}
