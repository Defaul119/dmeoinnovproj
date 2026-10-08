// Hash-based routes, so every screen and state has a URL (back button works, screenshots
// and usability tasks can start anywhere) and the app needs no server-side routing.
//
//   #/                                      Screen 1  address selection   (?q=<text> prefills and checks the lookup box)
//   #/address/<address>                     Screen 2  daily timeline
//   #/address/<address>/day/<YYYY-MM-DD>    Screen 3  day's transactions
//   #/address/<address>/day/<date>/tx/<txid>          ...with one transaction open

import { useSyncExternalStore } from 'react';

export type Route =
  | { screen: 'select'; query: string | null }
  | { screen: 'timeline'; address: string }
  | { screen: 'day'; address: string; date: string; txid: string | null }
  | { screen: 'not-found'; path: string };

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0) {
    return { screen: 'select', query: new URLSearchParams(search).get('q') };
  }
  if (parts[0] === 'address' && parts.length === 2) {
    return { screen: 'timeline', address: parts[1] };
  }
  if (parts[0] === 'address' && parts[2] === 'day' && (parts.length === 4 || (parts.length === 6 && parts[4] === 'tx'))) {
    return { screen: 'day', address: parts[1], date: parts[3], txid: parts[5] ?? null };
  }
  return { screen: 'not-found', path };
}

export const paths = {
  select: () => '#/',
  timeline: (address: string) => `#/address/${encodeURIComponent(address)}`,
  day: (address: string, date: string) => `#/address/${encodeURIComponent(address)}/day/${date}`,
  tx: (address: string, date: string, txid: string) =>
    `#/address/${encodeURIComponent(address)}/day/${date}/tx/${txid}`,
};

export function navigate(hash: string, opts: { replace?: boolean } = {}): void {
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseRoute(hash);
}
