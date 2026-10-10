import { describe, expect, it } from 'vitest';
import { D } from '../../src/engine/decimal';
import { decodeEnvelope, encodeEnvelope, SAVE_PREFIX } from '../../src/engine/save/codec';
import { exportSave, importSave, KEYS, loadFromSlots, memoryStore, saveToSlots } from '../../src/engine/save/store';
import { createInitialState, SAVE_VERSION } from '../../src/engine/state';
import { toPlain } from '../../src/engine/save/serialize';

function sample() {
  const s = createInitialState(1_700_000_000_000, 42);
  s.currencies.stardust = D('1.2345e678');
  s.totals.run.stardust = D(12345.5);
  s.totals.all.stardust = D('ee12');
  s.stats.taps = 321;
  s.playtime = 99.5;
  s.settings.notation = 'scientific';
  return s;
}

describe('save codec', () => {
  it('round-trips the whole state, Decimals included', () => {
    const s = sample();
    const exported = exportSave(s, 123);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.code.startsWith(SAVE_PREFIX)).toBe(true);
    const back = importSave(exported.code).state;
    expect(back.currencies.stardust!.eq(s.currencies.stardust!)).toBe(true);
    expect(back.totals.all.stardust!.eq(D('ee12'))).toBe(true);
    expect(back.totals.run.stardust!.toNumber()).toBe(12345.5);
    expect(back.stats.taps).toBe(321);
    expect(back.settings.notation).toBe('scientific');
    expect(back.rng).toEqual(s.rng);
  });

  it('rejects a save code with one character flipped', () => {
    const exported = exportSave(sample());
    if (!exported.ok) throw new Error('export failed');
    const code = exported.code;
    const i = code.length - 12;
    const flipped = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1);
    expect(() => importSave(flipped)).toThrow();
    expect(() => importSave('hello there')).toThrow(/isn't a Starforge save/);
  });

  it('refuses to export a state with a broken number', () => {
    const s = sample();
    s.currencies.stardust = D(NaN);
    expect(exportSave(s).ok).toBe(false);
    const s2 = sample();
    s2.playtime = Infinity;
    expect(exportSave(s2).ok).toBe(false);
  });

  it('fills in fields that older saves did not have', () => {
    const s = sample() as unknown as Record<string, unknown>;
    delete (s.settings as Record<string, unknown>).showToasts;
    const code = encodeEnvelope({ v: SAVE_VERSION, t: 1, d: JSON.parse(JSON.stringify({ ...(toPlain(s) as object), currencies: { stardust: 'D:5' }, totals: { run: {}, all: {} } })) });
    const back = importSave(code).state;
    expect(back.settings.showToasts).toBe(true);
    expect(back.currencies.stardust!.toNumber()).toBe(5);
  });
});

describe('A/B save slots', () => {
  it('alternates slots and loads the newest valid one', () => {
    const kv = memoryStore();
    const s = sample();
    const r1 = saveToSlots(kv, s, 1000);
    s.stats.taps = 999;
    const r2 = saveToSlots(kv, s, 2000);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.slot).not.toBe(r2.slot);
    const loaded = loadFromSlots(kv);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.state.stats.taps).toBe(999);
  });

  it('falls back to the other slot when the latest one is corrupted, keeping a copy', () => {
    const kv = memoryStore();
    const s = sample();
    saveToSlots(kv, s, 1000); // slot A, taps 321
    s.stats.taps = 999;
    saveToSlots(kv, s, 2000); // slot B, taps 999
    kv.set(KEYS.slotB, kv.get(KEYS.slotB)!.slice(0, -20) + 'xxxxxxxxxxxxxxxxxxxx');
    const loaded = loadFromSlots(kv, 5);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') expect(loaded.state.stats.taps).toBe(321);
    expect([...kv.data.keys()].some((k) => k.startsWith(KEYS.corruptPrefix))).toBe(true);
  });

  it('never overwrites the good slot with a bad save', () => {
    const kv = memoryStore();
    const s = sample();
    saveToSlots(kv, s, 1000);
    const goodA = kv.get(KEYS.slotA);
    s.currencies.stardust = D(NaN);
    const r = saveToSlots(kv, s, 2000);
    expect(r.ok).toBe(false);
    expect(kv.get(KEYS.slotA)).toBe(goodA);
    expect(kv.get(KEYS.slotB)).toBeNull();
  });

  it('refuses saves from a newer build without loading an older slot', () => {
    const kv = memoryStore();
    saveToSlots(kv, sample(), 1000);
    const env = decodeEnvelope(kv.get(KEYS.slotA)!);
    kv.set(KEYS.slotB, encodeEnvelope({ ...env, v: SAVE_VERSION + 1, t: 9999 }));
    expect(loadFromSlots(kv).status).toBe('newer');
  });

  it('reports empty and fully corrupt storage', () => {
    const kv = memoryStore();
    expect(loadFromSlots(kv).status).toBe('empty');
    kv.set(KEYS.slotA, 'STARFORGE1:garbage');
    expect(loadFromSlots(kv).status).toBe('corrupt');
  });

  it('uses only starforge: keys', () => {
    const kv = memoryStore();
    saveToSlots(kv, sample(), 1);
    for (const k of kv.data.keys()) expect(k.startsWith('starforge:')).toBe(true);
  });
});
