import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { sha256 } from '../src/lib/sha256';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const nodeSha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

describe('sha256', () => {
  test('known vectors', () => {
    expect(hex(sha256(new Uint8Array()))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hex(sha256(new TextEncoder().encode('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('matches Node for every length across the padding boundaries', () => {
    for (let n = 0; n <= 200; n++) {
      const data = Uint8Array.from({ length: n }, (_, i) => (i * 31 + n) & 255);
      expect(hex(sha256(data))).toBe(nodeSha(data));
    }
  });
});
