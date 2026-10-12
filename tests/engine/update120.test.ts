import { beforeAll, describe, expect, it } from 'vitest';
import { registerContent } from '../../src/content';
import { D } from '../../src/engine/decimal';
import { createInitialState, gain } from '../../src/engine/state';
import { invalidateStats, resetStatRegistry, stat } from '../../src/engine/stats';
import { buyEngine, engineAdds, engineEach, engineTotal } from '../../src/engine/systems/stardust';

beforeAll(() => {
  resetStatRegistry();
  registerContent();
});

describe('1.2.0: engines show their total and what the next purchase adds', () => {
  it('"adds" is exactly what each purchase adds, milestone jumps included; "total" is owned x each', () => {
    const s = createInitialState(1_000_000, 3);
    gain(s, 'stardust', D(1e12));
    for (let n = 0; n < 30; n++) {
      const before = stat(s, 'stardustPerSec');
      const adds = engineAdds(s, 'mote', 1);
      buyEngine(s, 'mote', 1);
      invalidateStats();
      expect(stat(s, 'stardustPerSec').sub(before).sub(adds).abs().lt(1e-9)).toBe(true);
      expect(engineTotal(s, 'mote').eq(engineEach(s, 'mote').mul(n + 1))).toBe(true);
    }
    // ten at once from zero: 0.1 each, doubled at 10 owned
    const fresh = createInitialState(1_000_000, 4);
    expect(engineAdds(fresh, 'mote', 10).toNumber()).toBeCloseTo(2, 12);
    expect(engineAdds(fresh, 'mote', 9).toNumber()).toBeCloseTo(0.9, 12);
  });
});

describe('1.2.0: every symbol resolves', () => {
  it('each engine, upgrade, system and medal names real glyphs (base, badge), and no two systems or upgrades share one', async () => {
    const { ICON_SVG } = await import('../../src/ui/iconData');
    const { BADGE_SVG } = await import('../../src/ui/badgeData');
    const { ENGINES } = await import('../../src/content/engines');
    const { UPGRADES } = await import('../../src/content/upgrades');
    const { SYSTEMS } = await import('../../src/content/systems');
    const { MEDALS } = await import('../../src/content/medals');
    const check = (name: string) => {
      const head = name.split('#')[0]!;
      const [base, badge] = head.split('+');
      expect(ICON_SVG[base!], `${name}: base`).toBeDefined();
      if (badge) expect(BADGE_SVG[badge] ?? ICON_SVG[badge], `${name}: badge`).toBeDefined();
    };
    for (const x of [...ENGINES, ...UPGRADES, ...SYSTEMS, ...MEDALS]) check(x.icon);
    const unique = (list: ReadonlyArray<{ icon: string }>) => new Set(list.map((x) => x.icon)).size === list.length;
    expect(unique(SYSTEMS)).toBe(true);
    expect(unique(UPGRADES)).toBe(true);
    expect(unique(ENGINES)).toBe(true);
  });
});

describe('1.2.0: save version 21, the Merchant, auto-planets, buy all', () => {
  it('loads a real 1.1.0 save (version 20): the old 4-deal counter is cleared and a 3-deal ship docks at once', async () => {
    const { readFileSync } = await import('node:fs');
    const { importSave } = await import('../../src/engine/save/store');
    const { SAVE_VERSION } = await import('../../src/engine/state');
    const { tick } = await import('../../src/engine/tick');
    const { state } = importSave(readFileSync('tests/fixtures/save-v20.txt', 'utf8').trim());
    expect(state.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(21);
    expect(state.merchant.deals).toEqual([]);
    expect(state.merchant.nextShip).toBe(0);
    expect(state.stats.supernovasAll).toBe(12);
    tick(state, 0.05);
    expect(state.merchant.deals).toHaveLength(3);
  });

  it('auto-planets: earned at 5 Supernovas, on at a tenth of your Stardust; fills slots with types its neighbours lack, then levels the lowest', async () => {
    const { AUTO_BUYERS, autoSetting, autoUnlocked, runAutomation } = await import('../../src/engine/systems/automation');
    const { ORBITALS } = await import('../../src/content/early');
    const s = createInitialState(1_000_000, 9);
    s.tier = 6;
    const a = AUTO_BUYERS.find((x) => x.id === 'auto.planets')!;
    expect(autoUnlocked(s, a)).toBe(false);
    s.stats.supernovasAll = 5;
    expect(autoUnlocked(s, a)).toBe(true);
    expect(autoSetting(s, 'auto.planets')).toEqual({ on: true, spend: 0.1 });
    gain(s, 'stardust', D(1e30));
    for (let i = 0; i < 5; i++) runAutomation(s);
    const ring0 = ORBITALS.rings[0]!.slots;
    for (let i = 0; i < ring0; i++) {
      const p = s.planets[`0.${i}`]!;
      expect(p).toBeDefined();
      expect(p.type).not.toBe(s.planets[`0.${(i + 1) % ring0}`]!.type);
    }
    const levels = Object.values(s.planets).map((p) => p.level);
    expect(Math.min(...levels)).toBeGreaterThan(1);
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThanOrEqual(1);
  });

  it('buy all: every affordable upgrade from the first Supernova; every affordable tree node from 5; tree auto-buyers start off', async () => {
    const { buyAllUpgrades, buyAllNodes, TREE_SHOP_BY_ID, upgradeBulkOpen, treeBulkOpen } = await import('../../src/engine/systems/treeShop');
    const { autoSetting } = await import('../../src/engine/systems/automation');
    const { availableUpgrades } = await import('../../src/engine/systems/upgrades');
    const s = createInitialState(1_000_000, 10);
    expect(upgradeBulkOpen(s)).toBe(false);
    s.stats.supernovasAll = 1;
    expect(upgradeBulkOpen(s)).toBe(true);
    expect(treeBulkOpen(s)).toBe(false);
    s.stats.taps = 5000;
    gain(s, 'stardust', D(1e9));
    const before = availableUpgrades(s).length;
    expect(buyAllUpgrades(s)).toBeGreaterThan(0);
    expect(availableUpgrades(s).length).toBeLessThan(before);
    s.stats.supernovasAll = 5;
    s.stats.supernovas = 30; // the Nova Tree opens with its Supernova milestone
    gain(s, 'shards', D(1e6));
    expect(buyAllNodes(s, TREE_SHOP_BY_ID.get('novatree')!)).toBeGreaterThan(3);
    for (const id of ['novatree', 'nebulatree', 'singularitytree', 'galactictree', 'scaletree', 'starchart']) expect(autoSetting(s, `auto.${id}`).on).toBe(false);
  });
});
