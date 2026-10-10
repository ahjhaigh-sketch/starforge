import { strFromU8, strToU8, unzlibSync, zlibSync } from 'fflate';

/** Identifies the game AND the encoding version of a save code. */
export const SAVE_PREFIX = 'STARFORGE1:';

export class SaveFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveFormatError';
  }
}

export interface Envelope {
  /** Save schema version. */
  v: number;
  /** Wall-clock ms when it was written. */
  t: number;
  /** The plain (Decimal-tagged) state. */
  d: unknown;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** "STARFORGE1:" + base64url(zlib(JSON)). zlib's checksum makes a damaged code fail loudly. */
export function encodeEnvelope(env: Envelope): string {
  const json = JSON.stringify(env);
  return SAVE_PREFIX + bytesToBase64Url(zlibSync(strToU8(json), { level: 6 }));
}

export function decodeEnvelope(code: string): Envelope {
  const text = code.trim();
  if (!text.startsWith(SAVE_PREFIX)) throw new SaveFormatError("That text isn't a Starforge save.");
  let json: string;
  try {
    json = strFromU8(unzlibSync(base64UrlToBytes(text.slice(SAVE_PREFIX.length))));
  } catch {
    throw new SaveFormatError('That save code is damaged and can’t be read.');
  }
  let env: unknown;
  try {
    env = JSON.parse(json);
  } catch {
    throw new SaveFormatError('That save code is damaged and can’t be read.');
  }
  const e = env as Partial<Envelope>;
  if (typeof e?.v !== 'number' || typeof e?.t !== 'number' || typeof e?.d !== 'object' || e.d === null) {
    throw new SaveFormatError('That save code is missing parts.');
  }
  return e as Envelope;
}
