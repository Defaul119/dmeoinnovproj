import { afterEach, describe, expect, test } from 'vitest';
import { generateIllustrativeData } from '../src/api/mock/generate';
import { median, robustZ, scoreAddress, type RawTx } from '../src/api/mock/scoring';
import { settings } from '../src/lib/settings';

const DAY = 86_400;
const data = generateIllustrativeData();
const scored = data.map((a) => ({ ...a, result: scoreAddress(a.txs) }));
const originalSizeComparison = settings.features.sizeComparison;
afterEach(() => {
  (settings.features as { sizeComparison: string }).sizeComparison = originalSizeComparison;
});

function tx(i: number, time: number, receivedSats: number, sentSats = 0): RawTx {
  return { txid: i.toString(16).padStart(64, '0'), time, blockHeight: 900_000 + i, receivedSats, sentSats };
}

/** Seeded pick so the test checks the same transactions every run. */
function pick<T>(items: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  let s = seed;
  const pool = [...items];
  while (out.length < n && pool.length) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    out.push(pool.splice(s % pool.length, 1)[0]);
  }
  return out;
}

describe('helpers', () => {
  test('median of odd and even samples', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  test('robust z never divides by zero on a constant history', () => {
    const r = robustZ(5, [2, 2, 2, 2, 2], 1);
    expect(r.z).toBe(3);
    expect(Number.isFinite(r.z)).toBe(true);
  });
});

describe('DR-02: time-safe features', () => {
  test('recomputing F1–F4 from earlier records only gives identical values (20 per address)', () => {
    for (const a of scored) {
      const sortedRaw = [...a.txs].sort((x, y) => x.time - y.time || x.txid.localeCompare(y.txid));
      const sample = pick(a.result.filter((t) => t.scored), 20, 30049);
      for (const target of sample) {
        // Only records up to the target's time: nothing later can influence it.
        const history = sortedRaw.filter((t) => t.time <= target.time);
        const again = scoreAddress(history).find((t) => t.txid === target.txid)!;
        expect(again.features).toEqual(target.features);
        expect(again.z).toEqual(target.z);
        expect(again.flagged).toBe(target.flagged);
      }
    }
  });

  test('transactions in the same block are not part of each other\'s history', () => {
    const base = Array.from({ length: 12 }, (_, i) => tx(i, 1_700_000_000 + i * 2 * DAY, 100_000));
    const t = 1_700_000_000 + 30 * DAY;
    const result = scoreAddress([...base, tx(100, t, 100_000), tx(101, t, 100_000)]);
    const [a, b] = result.slice(-2);
    expect(a.earlierCount).toBe(12);
    expect(b.earlierCount).toBe(12);
    expect(a.features.F3).toBe(b.features.F3);
  });
});

describe('minimum history', () => {
  test('a transaction is scored only with 10+ earlier transactions over 14+ days', () => {
    for (const a of scored) {
      for (const t of a.result) {
        const enough = t.earlierCount >= settings.features.minHistoryTx && t.historySpanDays >= settings.features.minHistorySpanDays;
        expect(t.scored).toBe(enough);
        if (!t.scored) expect(t.flagged).toBe(false);
      }
    }
  });

  test('the short-history addresses have nothing scored', () => {
    const short = scored.filter((a) => a.txs.length < 10);
    expect(short.length).toBeGreaterThanOrEqual(2);
    for (const a of short) expect(a.result.some((t) => t.scored)).toBe(false);
  });
});

describe('flags on the illustrative data', () => {
  test('sanity rule: no address has more than 20% of its scored transactions flagged', () => {
    for (const a of scored) {
      const n = a.result.filter((t) => t.scored).length;
      const f = a.result.filter((t) => t.flagged).length;
      if (n) expect(f / n).toBeLessThanOrEqual(settings.sanity.maxFlaggedShare);
    }
  });

  test('every address with enough history has at least one flag to demonstrate', () => {
    for (const a of scored.filter((x) => x.result.some((t) => t.scored))) {
      expect(a.result.some((t) => t.flagged), a.profile).toBe(true);
    }
  });

  test('the planted patterns are caught', () => {
    const byProfile = (word: string) => scored.find((a) => a.profile.includes(word))!.result;

    const spike = byProfile('one large payment').reduce((m, t) => (t.receivedSats > m.receivedSats ? t : m));
    expect(spike.flagged).toBe(true);
    expect(spike.z.F1!).toBeGreaterThanOrEqual(3.5);

    const dormant = byProfile('80 days');
    const wake = dormant.reduce((m, t) => ((t.features.F3 ?? 0) > (m.features.F3 ?? 0) ? t : m));
    expect(wake.features.F3! / 24).toBeGreaterThan(75);
    expect(wake.flagged).toBe(true);
    expect(wake.z.F3!).toBeGreaterThanOrEqual(3.5);

    const dust = byProfile('dust').find((t) => t.receivedSats === 546)!;
    expect(dust.flagged).toBe(true);
    expect(dust.z.F1!).toBeLessThanOrEqual(-3.5);

    const weekly = byProfile('Weekly');
    expect(weekly.filter((t) => t.flagged && (t.z.F3 ?? 0) <= -3.5).length).toBeGreaterThanOrEqual(2);
  });
});

describe('CR-04: size compared within the same direction', () => {
  // Collect 11 small payments, then sweep them all out; repeat.
  const history: RawTx[] = [];
  let i = 0;
  let time = 1_700_000_000;
  for (let cycle = 0; cycle < 8; cycle++) {
    for (let k = 0; k < 11; k++) history.push(tx(i++, (time += DAY), 100_000 + ((k * 7919) % 20_000)));
    history.push(tx(i++, (time += DAY), 0, 1_200_000 + cycle * 1_000));
  }
  const sweeps = (r: ReturnType<typeof scoreAddress>) => r.filter((t) => t.netSats < 0 && t.scored);

  test('with "same-direction", routine sweeps out are not flagged once there are enough earlier sweeps', () => {
    (settings.features as { sizeComparison: string }).sizeComparison = 'same-direction';
    const later = sweeps(scoreAddress(history)).slice(settings.features.minComparisonValues);
    expect(later.length).toBeGreaterThan(0);
    expect(later.every((t) => !t.flagged)).toBe(true);
  });

  test('with "all" (report §2.3 as written), every sweep is flagged', () => {
    (settings.features as { sizeComparison: string }).sizeComparison = 'all';
    const s = sweeps(scoreAddress(history));
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((t) => t.flagged)).toBe(true);
  });
});
