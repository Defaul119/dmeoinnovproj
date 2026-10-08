// Bitcoin mainnet address validation, run in the browser before any API call (FR-05).
// Checks the real checksums (Base58Check for 1…/3…, Bech32/Bech32m for bc1…), so a
// typo is reported as "invalid" instead of being sent off and coming back "unsupported".
// References: BIP 173 (Bech32), BIP 350 (Bech32m).

import { sha256 } from './sha256';

export type AddressKind = 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'segwit';

export type AddressCheck =
  | { ok: true; address: string; kind: AddressKind }
  | { ok: false; message: string; hint: string };

export const KIND_LABEL: Record<AddressKind, string> = {
  p2pkh: 'Legacy (P2PKH)',
  p2sh: 'Script (P2SH)',
  p2wpkh: 'SegWit (P2WPKH)',
  p2wsh: 'SegWit script (P2WSH)',
  p2tr: 'Taproot (P2TR)',
  segwit: 'SegWit (future version)',
};

const FORMAT_HINT = 'Bitcoin addresses start with 1, 3 or bc1. Check for a missing or extra character, or pick an address from the list.';

function invalid(message: string, hint = FORMAT_HINT): AddressCheck {
  return { ok: false, message, hint };
}

export function validateAddress(input: string): AddressCheck {
  const value = input.trim();
  if (value === '') {
    return invalid('Enter a Bitcoin address.', 'Paste an address, or pick one from the list below.');
  }
  if (/\s/.test(value)) {
    return invalid('Bitcoin addresses never contain spaces.');
  }
  const lower = value.toLowerCase();
  if (/^0x[0-9a-f]{40}$/.test(lower)) {
    return invalid('This looks like an Ethereum address.', 'The explorer only covers Bitcoin. Bitcoin addresses start with 1, 3 or bc1.');
  }
  if (lower.startsWith('tb1') || lower.startsWith('bcrt1')) {
    return invalid('This is a Bitcoin test-network address.', 'The explorer only covers the main Bitcoin network, whose addresses start with 1, 3 or bc1.');
  }
  if (lower.startsWith('bc1')) {
    return checkSegwit(value);
  }
  if (value[0] === '1' || value[0] === '3' || value[0] === 'm' || value[0] === 'n' || value[0] === '2') {
    return checkBase58(value);
  }
  return invalid('This is not a Bitcoin address.');
}

// ---------------------------------------------------------------- Base58Check

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Decode(s: string): Uint8Array | null {
  let n = 0n;
  for (const ch of s) {
    const digit = BASE58.indexOf(ch);
    if (digit < 0) return null;
    n = n * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.push(Number(n & 0xffn));
    n >>= 8n;
  }
  for (const ch of s) {
    if (ch !== '1') break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

export function base58Encode(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let out = '';
  while (n > 0n) {
    out = BASE58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out;
}

const doubleSha = (b: Uint8Array) => sha256(sha256(b));

export function base58CheckEncode(version: number, payload: Uint8Array): string {
  const body = new Uint8Array(1 + payload.length);
  body[0] = version;
  body.set(payload, 1);
  const checksum = doubleSha(body).slice(0, 4);
  const full = new Uint8Array(body.length + 4);
  full.set(body);
  full.set(checksum, body.length);
  return base58Encode(full);
}

function checkBase58(value: string): AddressCheck {
  if (value.length < 26 || value.length > 35) {
    return invalid(`This address has ${value.length} characters; legacy Bitcoin addresses have 26 to 35.`);
  }
  const bad = [...value].find((ch) => !BASE58.includes(ch));
  if (bad) {
    const why = '0OIl'.includes(bad) ? ' (0, O, I and l are never used, to avoid confusion)' : '';
    return invalid(`The character "${bad}" can't appear in this kind of address${why}.`);
  }
  const bytes = base58Decode(value);
  const typo = 'This address fails its checksum, so it probably contains a typo.';
  // A wrong decoded length is also what a single mistyped character usually produces.
  if (!bytes || bytes.length !== 25) return invalid(typo);
  const body = bytes.slice(0, 21);
  const checksum = doubleSha(body).slice(0, 4);
  if (!checksum.every((b, i) => b === bytes[21 + i])) return invalid(typo);
  if (body[0] === 0x00) return { ok: true, address: value, kind: 'p2pkh' };
  if (body[0] === 0x05) return { ok: true, address: value, kind: 'p2sh' };
  if (body[0] === 0x6f || body[0] === 0xc4) {
    return invalid('This is a Bitcoin test-network address.', 'The explorer only covers the main Bitcoin network, whose addresses start with 1, 3 or bc1.');
  }
  return invalid('This is not a Bitcoin address.');
}

// ------------------------------------------------------------- Bech32 / Bech32m

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

function polymod(values: number[]): number {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GENERATOR[i];
  }
  return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
  const codes = [...hrp].map((c) => c.charCodeAt(0));
  return [...codes.map((c) => c >> 5), 0, ...codes.map((c) => c & 31)];
}

function convertBits(data: number[], from: number, to: number, pad: boolean): number[] | null {
  let acc = 0;
  let bits = 0;
  const out: number[] = [];
  const maxv = (1 << to) - 1;
  for (const value of data) {
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      out.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) out.push((acc << (to - bits)) & maxv);
  } else if (bits >= from || ((acc << (to - bits)) & maxv) !== 0) {
    return null;
  }
  return out;
}

export function segwitEncode(version: number, program: Uint8Array, hrp = 'bc'): string {
  const data = [version, ...(convertBits([...program], 8, 5, true) ?? [])];
  const constant = version === 0 ? BECH32_CONST : BECH32M_CONST;
  const mod = polymod([...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0]) ^ constant;
  const checksum = Array.from({ length: 6 }, (_, i) => (mod >>> (5 * (5 - i))) & 31);
  return hrp + '1' + [...data, ...checksum].map((d) => CHARSET[d]).join('');
}

function checkSegwit(value: string): AddressCheck {
  if (value !== value.toLowerCase() && value !== value.toUpperCase()) {
    return invalid('This address mixes upper- and lower-case letters, which bc1 addresses never do.');
  }
  const address = value.toLowerCase();
  if (address.length < 14 || address.length > 90) {
    return invalid(`This address has ${address.length} characters; bc1 addresses have 42 or 62.`);
  }
  const body = address.slice(3);
  const bad = [...body].find((ch) => !CHARSET.includes(ch));
  if (bad) {
    const why = '1bio'.includes(bad) ? ' (after "bc1", the characters 1, b, i and o are never used)' : '';
    return invalid(`The character "${bad}" can't appear in a bc1 address${why}.`);
  }
  const data = [...body].map((ch) => CHARSET.indexOf(ch));
  const check = polymod([...hrpExpand('bc'), ...data]);
  const version = data[0];
  const expected = version === 0 ? BECH32_CONST : BECH32M_CONST;
  if (check !== expected) {
    return invalid('This address fails its checksum, so it probably contains a typo.');
  }
  const program = convertBits(data.slice(1, -6), 5, 8, false);
  if (!program || version > 16 || program.length < 2 || program.length > 40) {
    return invalid('This bc1 address is not a valid SegWit address.');
  }
  if (version === 0) {
    if (program.length === 20) return { ok: true, address, kind: 'p2wpkh' };
    if (program.length === 32) return { ok: true, address, kind: 'p2wsh' };
    return invalid('This bc1q address has the wrong length.');
  }
  if (version === 1 && program.length === 32) return { ok: true, address, kind: 'p2tr' };
  return { ok: true, address, kind: 'segwit' };
}
