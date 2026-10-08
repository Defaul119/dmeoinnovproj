// In-browser stand-in for the FastAPI back end. Same endpoints, same response shapes and
// the same error codes (400 invalid, 404 unsupported, 422 insufficient history), plus a
// configurable delay and a simulated network failure so every state can be shown.

import { segwitEncode, validateAddress } from '../../lib/address';
import { dayKey, isDayKey } from '../../lib/dates';
import { LIMITATION_LINE, settings, type FeatureId } from '../../lib/settings';
import {
  ApiError,
  type AddressSummary,
  type AddressesResponse,
  type ComparisonBasis,
  type DayResponse,
  type ExplorerApi,
  type FeatureDetail,
  type FeatureRole,
  type LookupResponse,
  type MethodInfo,
  type SnapshotInfo,
  type TimelineResponse,
  type TransactionCore,
  type TransactionDetail,
} from '../types';
import { SNAPSHOT_DATE, generateIllustrativeData, type IllustrativeAddress } from './generate';
import { scoreAddress, type ComparisonWindow, type ScoredTx } from './scoring';

const SATS = 100_000_000;
const iso = (unix: number) => new Date(unix * 1000).toISOString();

/** Mutable so the prototype tools (and tests) can change behaviour at run time. */
export const mockControls = {
  latencyMs: 600,
  offline: false,
};

interface Entry {
  info: IllustrativeAddress;
  txs: ScoredTx[];
  byTxid: Map<string, ScoredTx>;
  byDay: Map<string, ScoredTx[]>;
  summary: AddressSummary;
}

const METHOD: MethodInfo = {
  id: 'baseline-robust-z',
  name: 'Robust z-score baseline',
  flagAbsZ: settings.baseline.flagAbsZ,
  contributingAbsZ: settings.baseline.contributingAbsZ,
  note: 'Prototype placeholder. Assignment 2 compares this baseline with a trained model and fixes the final method and thresholds.',
};

let db: Map<string, Entry> | null = null;

function getDb(): Map<string, Entry> {
  if (db) return db;
  db = new Map();
  for (const info of generateIllustrativeData()) {
    const txs = scoreAddress(info.txs);
    const byDay = new Map<string, ScoredTx[]>();
    for (const tx of txs) {
      const key = dayKey(iso(tx.time));
      byDay.set(key, [...(byDay.get(key) ?? []), tx]);
    }
    const history = txs.some((t) => t.scored) ? 'sufficient' : 'insufficient';
    db.set(info.address, {
      info,
      txs,
      byTxid: new Map(txs.map((t) => [t.txid, t])),
      byDay,
      summary: {
        address: info.address,
        firstSeen: iso(txs[0].time),
        lastSeen: iso(txs[txs.length - 1].time),
        txCount: txs.length,
        scoredCount: txs.filter((t) => t.scored).length,
        flaggedCount: txs.filter((t) => t.flagged).length,
        history,
      },
    });
  }
  return db;
}

function snapshotInfo(): SnapshotInfo {
  return {
    snapshotDate: SNAPSHOT_DATE,
    source: settings.source.name,
    sourceUrl: settings.source.apiDocs,
    illustrative: true,
    dayTimeZone: 'UTC',
    addressCount: getDb().size,
    method: METHOD,
  };
}

function respond<T>(work: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mockControls.offline) {
        reject(new ApiError(0, { status: 'network', message: 'The explorer service did not respond.' }));
        return;
      }
      try {
        resolve(work());
      } catch (err) {
        reject(err);
      }
    }, mockControls.latencyMs);
  });
}

/** Valid and in the snapshot, or throws the matching 400 / 404. */
function requireAddress(input: string): Entry {
  const check = validateAddress(input);
  if (!check.ok) throw new ApiError(400, { status: 'invalid', message: check.message, hint: check.hint });
  const entry = getDb().get(check.address);
  if (!entry) {
    throw new ApiError(404, {
      status: 'unsupported',
      message: "This is a valid Bitcoin address, but it isn't in the snapshot, so there is no history to show.",
      examples: [...getDb().values()]
        .filter((e) => e.summary.history === 'sufficient')
        .slice(0, 3)
        .map((e) => e.info.address),
    });
  }
  return entry;
}

function core(entry: Entry, tx: ScoredTx): TransactionCore {
  return {
    txid: tx.txid,
    address: entry.info.address,
    time: iso(tx.time),
    blockHeight: tx.blockHeight,
    direction: tx.netSats > 0 ? 'in' : tx.netSats < 0 ? 'out' : 'none',
    receivedSats: tx.receivedSats,
    sentSats: tx.sentSats,
    netSats: tx.netSats,
    sourceUrl: null, // illustrative transactions have no public record to link to
  };
}

function role(z: number | null): FeatureRole {
  if (z === null) return 'no-comparison';
  if (Math.abs(z) >= METHOD.flagAbsZ) return 'flag';
  if (Math.abs(z) >= METHOD.contributingAbsZ) return 'contributing';
  return 'within-usual';
}

const FEATURE_TEXT: Record<FeatureId, { name: string; description: string }> = {
  F1: { name: 'Size', description: 'Amount this address moved in the transaction' },
  F2: { name: 'Burst', description: "The address's transactions in the 7 days before this one" },
  F3: { name: 'Gap', description: "Time since the address's previous transaction" },
  F4: { name: 'Relative size', description: "Amount divided by the address's usual amount in the comparison window" },
};

function featureDetails(tx: ScoredTx): FeatureDetail[] {
  const value: Record<FeatureId, number | null> = {
    F1: Math.abs(tx.netSats) / SATS,
    F2: tx.features.F2,
    F3: tx.features.F3,
    F4: tx.features.F4,
  };
  return (['F1', 'F2', 'F3', 'F4'] as FeatureId[]).map((id) => ({
    id,
    ...FEATURE_TEXT[id],
    value: value[id],
    usual: id === 'F1' && tx.usual.F1 !== null ? tx.usual.F1 / SATS : tx.usual[id],
    z: tx.z[id],
    role: role(tx.z[id]),
  }));
}

function windowText(w: ComparisonWindow): string {
  const days = settings.features.comparisonWindowDays;
  const kind = w.direction === 'in' ? 'incoming ' : w.direction === 'out' ? 'outgoing ' : '';
  const plural = (n: number) => `${n} ${kind}transaction${n === 1 ? '' : 's'}`;
  if (w.extended) {
    return `This address's last ${plural(w.count)} before this one. The ${days} days before it held only ${w.countInWindowDays}, so the comparison reaches further back.`;
  }
  return `This address's ${plural(w.count)} in the ${days} days before this one.`;
}

function comparisonBases(tx: ScoredTx): ComparisonBasis[] {
  const bases: ComparisonBasis[] = [];
  const add = (features: FeatureId[], label: string, w: ComparisonWindow | null) => {
    if (w) bases.push({ features, label, description: windowText(w), txCount: w.count, start: iso(w.start), end: iso(w.end) });
  };
  add(['F1', 'F4'], 'Size and relative size', tx.sizeWindow);
  add(['F2', 'F3'], 'Burst and gap', tx.timingWindow);
  return bases;
}

function firstScoredDate(entry: Entry): string | null {
  const first = entry.txs.find((t) => t.scored);
  return first ? dayKey(iso(first.time)) : null;
}

export const mockApi: ExplorerApi = {
  listAddresses() {
    return respond<AddressesResponse>(() => ({
      snapshot: snapshotInfo(),
      addresses: [...getDb().values()].map((e) => e.summary),
    }));
  },

  lookup(address) {
    return respond<LookupResponse>(() => {
      const entry = requireAddress(address);
      return { status: 'supported', address: entry.info.address, summary: entry.summary };
    });
  },

  timeline(address) {
    return respond<TimelineResponse>(() => {
      const entry = requireAddress(address);
      const days = [...entry.byDay.entries()].map(([date, txs]) => ({
        date,
        txCount: txs.length,
        flaggedCount: txs.filter((t) => t.flagged).length,
      }));
      const first = entry.txs[0];
      const last = entry.txs[entry.txs.length - 1];
      return {
        address: entry.info.address,
        snapshot: snapshotInfo(),
        range: { start: days[0].date, end: days[days.length - 1].date },
        days,
        totals: {
          txCount: entry.summary.txCount,
          scoredCount: entry.summary.scoredCount,
          flaggedCount: entry.summary.flaggedCount,
          flaggedDays: days.filter((d) => d.flaggedCount > 0).length,
        },
        history: {
          status: entry.summary.history,
          txCount: entry.txs.length,
          spanDays: Math.round((last.time - first.time) / 86_400),
          required: { minTx: settings.features.minHistoryTx, minSpanDays: settings.features.minHistorySpanDays },
          firstScoredDate: firstScoredDate(entry),
        },
      };
    });
  },

  day(address, date) {
    return respond<DayResponse>(() => {
      const entry = requireAddress(address);
      if (!isDayKey(date)) {
        throw new ApiError(400, { status: 'invalid', message: 'Dates use the form YYYY-MM-DD.', hint: 'Pick a day from the timeline instead.' });
      }
      return {
        address: entry.info.address,
        date,
        transactions: (entry.byDay.get(date) ?? []).map((tx) => ({
          txid: tx.txid,
          time: iso(tx.time),
          direction: tx.netSats > 0 ? 'in' : tx.netSats < 0 ? 'out' : 'none',
          netSats: tx.netSats,
          status: !tx.scored ? 'not-scored' : tx.flagged ? 'flagged' : 'not-flagged',
        })),
      };
    });
  },

  transaction(txid, address) {
    return respond<TransactionDetail>(() => {
      const entry = requireAddress(address);
      const tx = entry.byTxid.get(txid.toLowerCase());
      if (!tx) {
        throw new ApiError(404, { status: 'not_found', message: 'This transaction is not in the snapshot for this address.' });
      }
      if (!tx.scored) {
        throw new ApiError(422, {
          status: 'insufficient_history',
          message: 'Not enough earlier history to score this transaction.',
          transaction: core(entry, tx),
          history: {
            earlierTx: tx.earlierCount,
            spanDays: Math.floor(tx.historySpanDays),
            required: { minTx: settings.features.minHistoryTx, minSpanDays: settings.features.minHistorySpanDays },
          },
          firstScoredDate: firstScoredDate(entry),
        });
      }
      return {
        ...core(entry, tx),
        scored: true,
        flagged: tx.flagged,
        score: tx.score,
        method: METHOD,
        features: featureDetails(tx),
        comparison: comparisonBases(tx),
        limitation: LIMITATION_LINE,
      };
    });
  },
};

/** Profiles of the illustrative addresses, for the prototype tools panel and the tests. */
export function illustrativeProfiles(): Array<{ address: string; profile: string; history: 'sufficient' | 'insufficient' }> {
  return [...getDb().values()].map((e) => ({ address: e.info.address, profile: e.info.profile, history: e.summary.history }));
}

/** Ready-made inputs for walkthroughs and screenshots: each one triggers a specific state. */
export function prototypeExamples() {
  const entries = [...getDb().values()];
  const main = entries.find((e) => e.summary.history === 'sufficient')!;
  const short = entries.find((e) => e.summary.history === 'insufficient')!;
  const last = main.info.address.slice(-1);
  const flaggedTx = main.txs.filter((t) => t.flagged).sort((a, b) => b.score - a.score)[0];
  const shortTx = short.txs[short.txs.length - 1];
  const ref = (e: Entry, t: ScoredTx) => ({ address: e.info.address, date: dayKey(iso(t.time)), txid: t.txid });
  return {
    /** A supported address with its last character changed: fails the checksum (invalid). */
    typo: main.info.address.slice(0, -1) + (last === 'q' ? 'p' : 'q'),
    /** A valid, correctly checksummed address that is not in the snapshot (unsupported). */
    unsupported: segwitEncode(0, Uint8Array.from({ length: 20 }, (_, i) => (i * 73 + 29) % 256)),
    mainAddress: main.info.address,
    shortHistory: short.info.address,
    /** The most unusual transaction of the first address. */
    flagged: ref(main, flaggedTx),
    /** A transaction of a short-history address (422 insufficient history). */
    notScored: ref(short, shortTx),
  };
}
