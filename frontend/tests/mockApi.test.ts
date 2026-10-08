// The mock must honour the same contract the FastAPI back end will (report §2.6, FR-05):
// 400 invalid, 404 unsupported/not found, 422 insufficient history, and consistent totals.
import { describe, expect, test } from 'vitest';
import { illustrativeProfiles, mockApi, mockControls, prototypeExamples } from '../src/api/mock/mockApi';
import { ApiError, type ApiErrorBody } from '../src/api/types';
import { reasonsFor } from '../src/lib/explain';
import { LIMITATION_LINE, settings } from '../src/lib/settings';

async function failure(p: Promise<unknown>): Promise<{ status: number; body: ApiErrorBody }> {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    return { status: (err as ApiError).status, body: (err as ApiError).body };
  }
  throw new Error('expected the request to fail');
}

const ex = prototypeExamples();

describe('lookup (POST /api/lookup)', () => {
  test('400 for an invalid address', async () => {
    const r = await failure(mockApi.lookup(ex.typo));
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ status: 'invalid', message: expect.stringMatching(/checksum/) });
  });

  test('404 with supported examples for a valid address outside the snapshot (AC-02)', async () => {
    const r = await failure(mockApi.lookup(ex.unsupported));
    expect(r.status).toBe(404);
    if (r.body.status !== 'unsupported') throw new Error('wrong body');
    expect(r.body.examples.length).toBeGreaterThanOrEqual(2);
    const { addresses } = await mockApi.listAddresses();
    for (const e of r.body.examples) expect(addresses.map((a) => a.address)).toContain(e);
  });

  test('supported, including an upper-case bc1 address', async () => {
    const r = await mockApi.lookup(ex.mainAddress.toUpperCase());
    expect(r).toMatchObject({ status: 'supported', address: ex.mainAddress });
  });
});

describe('every address in the snapshot', () => {
  const addresses = illustrativeProfiles();

  test('the snapshot is labelled illustrative and names its source and date', async () => {
    const { snapshot } = await mockApi.listAddresses();
    expect(snapshot).toMatchObject({ illustrative: true, source: settings.source.name, dayTimeZone: 'UTC' });
    expect(snapshot.addressCount).toBe(addresses.length);
  });

  test.each(addresses.map((a) => [a.address] as const))('AC-01 timeline is complete and consistent: %s', async (address) => {
    const summary = (await mockApi.listAddresses()).addresses.find((a) => a.address === address)!;
    const tl = await mockApi.timeline(address);
    expect(tl.range.start).toBe(tl.days[0].date);
    expect(tl.range.end).toBe(tl.days[tl.days.length - 1].date);
    expect(tl.days.map((d) => d.date)).toEqual([...tl.days.map((d) => d.date)].sort());
    expect(tl.days.reduce((s, d) => s + d.txCount, 0)).toBe(summary.txCount);
    expect(tl.days.reduce((s, d) => s + d.flaggedCount, 0)).toBe(summary.flaggedCount);
    expect(tl.totals.flaggedDays).toBe(tl.days.filter((d) => d.flaggedCount > 0).length);
    expect(tl.history.status).toBe(summary.history);
  });

  test.each(addresses.map((a) => [a.address] as const))('AC-03 / FR-04 every flagged transaction explains itself: %s', async (address) => {
    const tl = await mockApi.timeline(address);
    for (const d of tl.days.filter((x) => x.flaggedCount > 0)) {
      const day = await mockApi.day(address, d.date);
      for (const row of day.transactions.filter((t) => t.status === 'flagged')) {
        const tx = await mockApi.transaction(row.txid, address);
        expect(tx.flagged).toBe(true);
        expect(tx.limitation).toBe(LIMITATION_LINE);
        expect(tx.comparison.length).toBeGreaterThan(0);
        expect(tx.comparison.every((b) => b.txCount > 0 && b.description.length > 0)).toBe(true);
        expect(reasonsFor(tx.features).reasons.length).toBeGreaterThan(0);
        expect(tx.features.some((f) => f.role === 'flag')).toBe(true);
      }
    }
  });
});

describe('day (GET /api/addresses/{address}/transactions?date=)', () => {
  test('400 for a malformed date', async () => {
    const r = await failure(mockApi.day(ex.mainAddress, '14-08-2026'));
    expect(r.status).toBe(400);
  });

  test('an empty list for a day without transactions', async () => {
    const day = await mockApi.day(ex.mainAddress, '2020-01-01');
    expect(day.transactions).toEqual([]);
  });

  test('404 for an address outside the snapshot', async () => {
    expect((await failure(mockApi.day(ex.unsupported, ex.flagged.date))).status).toBe(404);
  });
});

describe('transaction (GET /api/transactions/{txid}?address=)', () => {
  test('422 with the transaction facts when there is not enough history', async () => {
    const r = await failure(mockApi.transaction(ex.notScored.txid, ex.notScored.address));
    expect(r.status).toBe(422);
    if (r.body.status !== 'insufficient_history') throw new Error('wrong body');
    expect(r.body.transaction.txid).toBe(ex.notScored.txid);
    expect(r.body.history.required).toEqual({ minTx: 10, minSpanDays: 14 });
    expect(r.body.history.earlierTx).toBeLessThan(10);
  });

  test('404 for a transaction that does not belong to the address', async () => {
    const r = await failure(mockApi.transaction('0'.repeat(64), ex.mainAddress));
    expect(r).toMatchObject({ status: 404, body: { status: 'not_found' } });
  });

  test('FR-03: amount and direction add up', async () => {
    const tx = await mockApi.transaction(ex.flagged.txid, ex.flagged.address);
    expect(tx.netSats).toBe(tx.receivedSats - tx.sentSats);
    expect(tx.direction).toBe(tx.netSats > 0 ? 'in' : tx.netSats < 0 ? 'out' : 'none');
  });
});

test('a network failure surfaces as status 0', async () => {
  mockControls.offline = true;
  const r = await failure(mockApi.listAddresses());
  expect(r).toMatchObject({ status: 0, body: { status: 'network' } });
});
