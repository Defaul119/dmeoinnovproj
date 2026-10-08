import type { Direction } from '../api/types';

const SATS_PER_BTC = 100_000_000;

/** '1,204.00042100 BTC'. Always 8 decimals so amounts line up in monospace columns. */
export function formatBtc(sats: number, opts: { signed?: boolean } = {}): string {
  const sign = sats < 0 ? '−' : opts.signed && sats > 0 ? '+' : '';
  const abs = Math.abs(Math.round(sats));
  const whole = Math.floor(abs / SATS_PER_BTC).toLocaleString('en-US');
  const frac = String(abs % SATS_PER_BTC).padStart(8, '0');
  return `${sign}${whole}.${frac} BTC`;
}

/** Shorter BTC figure for prose: '0.0421 BTC', '12.5 BTC', '0.00000546 BTC'. */
export function formatBtcShort(sats: number): string {
  const btc = Math.abs(sats) / SATS_PER_BTC;
  if (btc === 0) return '0 BTC';
  const digits = btc >= 1 ? 2 : Math.min(8, Math.max(4, 1 - Math.floor(Math.log10(btc)) + 2));
  return `${Number(btc.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: 8 })} BTC`;
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** Gap length in words: '35 min', '22 hours', '3.5 days', '75 days'. */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) {
    const h = hours < 10 ? Number(hours.toFixed(1)) : Math.round(hours);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  const days = hours / 24;
  return `${days < 10 ? Number(days.toFixed(1)) : Math.round(days)} days`;
}

export function formatRatio(r: number): string {
  if (r >= 100) return `${Math.round(r).toLocaleString('en-US')}×`;
  if (r >= 10) return `${r.toFixed(0)}×`;
  if (r >= 0.1) return `${r.toFixed(1)}×`;
  return `${r.toFixed(3)}×`;
}

export function formatZ(z: number): string {
  const s = Math.abs(z) >= 10 ? Math.abs(z).toFixed(0) : Math.abs(z).toFixed(1);
  return `${z < 0 ? '−' : '+'}${s}`;
}

/** 'bc1qyzcv…m9n8qa' — keep both ends, which is what people compare by eye. */
export function shortAddress(address: string, head = 8, tail = 6): string {
  return address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function shortTxid(txid: string): string {
  return `${txid.slice(0, 10)}…${txid.slice(-6)}`;
}

export const DIRECTION_LABEL: Record<Direction, string> = {
  in: 'In',
  out: 'Out',
  none: 'No net change',
};
