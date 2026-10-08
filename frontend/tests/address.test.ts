import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { base58CheckEncode, segwitEncode, validateAddress, type AddressKind } from '../src/lib/address';

// Real mainnet addresses collected by the D1 check (scripts/d1_check.py) from a recent block.
const samplesPath = join(__dirname, '..', '..', 'data', 'd1', 'address-samples.json');
const TYPE_TO_KIND: Record<string, AddressKind> = {
  p2pkh: 'p2pkh',
  p2sh: 'p2sh',
  v0_p2wpkh: 'p2wpkh',
  v0_p2wsh: 'p2wsh',
  v1_p2tr: 'p2tr',
};
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

describe('validateAddress', () => {
  test.runIf(existsSync(samplesPath))('accepts every real address from the D1 sample, with the right type', () => {
    const { byType } = JSON.parse(readFileSync(samplesPath, 'utf8')) as { byType: Record<string, string[]> };
    let checked = 0;
    for (const [type, addresses] of Object.entries(byType)) {
      const kind = TYPE_TO_KIND[type];
      if (!kind) continue;
      for (const a of addresses) {
        const r = validateAddress(a);
        expect(r, a).toMatchObject({ ok: true, kind });
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  test('accepts the genesis block address', () => {
    expect(validateAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toMatchObject({ ok: true, kind: 'p2pkh' });
  });

  test('round-trips addresses it encodes', () => {
    const bytes = (n: number, s: number) => Uint8Array.from({ length: n }, (_, i) => (i * 17 + s) & 255);
    expect(validateAddress(segwitEncode(0, bytes(20, 1)))).toMatchObject({ ok: true, kind: 'p2wpkh' });
    expect(validateAddress(segwitEncode(0, bytes(32, 2)))).toMatchObject({ ok: true, kind: 'p2wsh' });
    expect(validateAddress(segwitEncode(1, bytes(32, 3)))).toMatchObject({ ok: true, kind: 'p2tr' });
    expect(validateAddress(base58CheckEncode(0x00, bytes(20, 4)))).toMatchObject({ ok: true, kind: 'p2pkh' });
    expect(validateAddress(base58CheckEncode(0x05, bytes(20, 5)))).toMatchObject({ ok: true, kind: 'p2sh' });
  });

  test('catches every single-character typo in a bc1 address', () => {
    const good = segwitEncode(0, Uint8Array.from({ length: 20 }, (_, i) => i * 7));
    for (let pos = 4; pos < good.length; pos++) {
      for (const ch of CHARSET) {
        if (ch === good[pos]) continue;
        const typo = good.slice(0, pos) + ch + good.slice(pos + 1);
        expect(validateAddress(typo).ok, typo).toBe(false);
      }
    }
  });

  test('catches typos in legacy addresses', () => {
    const good = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    for (const pos of [1, 5, 12, 20, 33]) {
      const typo = good.slice(0, pos) + (good[pos] === 'x' ? 'y' : 'x') + good.slice(pos + 1);
      const r = validateAddress(typo);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/checksum/);
    }
  });

  test('bc1 addresses: upper case is fine, mixed case is not', () => {
    const good = segwitEncode(0, Uint8Array.from({ length: 20 }, (_, i) => i));
    expect(validateAddress(good.toUpperCase())).toMatchObject({ ok: true, address: good });
    const mixed = good.slice(0, 10) + good.slice(10).toUpperCase();
    expect(validateAddress(mixed)).toMatchObject({ ok: false, message: expect.stringMatching(/mixes upper- and lower-case/) });
  });

  test('explains common mistakes with a specific message', () => {
    const msg = (s: string) => {
      const r = validateAddress(s);
      return r.ok ? 'ok' : r.message;
    };
    expect(msg('')).toBe('Enter a Bitcoin address.');
    expect(msg('   ')).toBe('Enter a Bitcoin address.');
    expect(msg('bc1q abc')).toMatch(/spaces/);
    expect(msg('0x52908400098527886E0F7030069857D2E4169EE7')).toMatch(/Ethereum/);
    expect(msg('tb1qw508d6qejxtdg4c5r56hfjn3gye7jn8xyr0kud')).toMatch(/test-network/);
    expect(msg('hello')).toBe('This is not a Bitcoin address.');
    expect(msg('1A1zP1eP5QGefi2DMPTfTL5SLmv7Div0Na')).toMatch(/"0" can't appear/);
    expect(msg('bc1qbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')).toMatch(/"b" can't appear/);
  });

  test('surrounding spaces from a paste are ignored', () => {
    expect(validateAddress('  1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa \n')).toMatchObject({ ok: true });
  });
});
