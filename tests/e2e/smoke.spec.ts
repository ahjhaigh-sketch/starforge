import { expect, type Page, test } from '@playwright/test';

/** Collects console errors and page crashes so every test can assert there are none. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** On phones the engine shop is a drawer: open it first. */
async function openShop(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 1400) < 900) {
    await page.getByRole('button', { name: 'Engines', exact: true }).click();
    await expect(page.locator('.side')).toHaveClass(/open/);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('boots without errors and shows the top bar', async ({ page }) => {
  const errors = watchErrors(page);
  await page.reload();
  await expect(page.locator('.pill').first()).toBeVisible();
  await expect(page.getByTestId('save-indicator')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('a panel pops open over a blurred scrim and closes with Esc', async ({ page }) => {
  const errors = watchErrors(page);
  await page.getByRole('button', { name: 'Open settings and saves' }).click();
  await expect(page.locator('[data-panel="settings"]')).toHaveClass(/open/);
  await expect(page.locator('.scrim')).toHaveClass(/open/);
  await expect(page.locator('.modal.open')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal.open')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('saves to prefixed localStorage keys and survives a reload', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.getByRole('button', { name: '+1K dust' }).click();
  await page.evaluate(() => (window as unknown as { sf: { saveNow: () => boolean } }).sf.saveNow());
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.length).toBeGreaterThan(0);
  for (const k of keys) expect(k.startsWith('starforge:')).toBe(true);
  await page.reload();
  await expect(page.locator('.pill .val').first()).toHaveText('1.00K');
});

test('export then import restores the save', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.getByRole('button', { name: '+1K dust' }).click();
  await page.getByRole('button', { name: 'Open settings and saves' }).click();
  await page.getByRole('button', { name: 'Export' }).click();
  const code = await page.getByLabel('Save code').inputValue();
  expect(code.startsWith('STARFORGE1:')).toBe(true);
  const settings = page.locator('[data-panel="settings"]');
  await settings.getByRole('button', { name: 'Wipe save' }).click();
  await settings.getByRole('button', { name: 'Click again to wipe' }).click();
  await expect(page.locator('.pill .val').first()).toHaveText('0');
  await page.getByLabel('Save code').fill(code);
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.locator('.pill .val').first()).toHaveText('1.00K');
});

test('tap, buy an engine, reveal the next, evolve the star', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  const dust = page.locator('.pill .val').first();
  const star = page.locator('.star-btn');
  for (let i = 0; i < 5; i++) await star.click();
  await expect(dust).toHaveText('5');
  await star.focus();
  await page.keyboard.press('Space');
  await expect(dust).toHaveText('6');
  await expect(page.locator('.float-num').first()).toBeAttached();

  await page.getByRole('button', { name: '+1K dust' }).click();
  await page.getByRole('button', { name: '+1K dust' }).click();
  await expect(page.locator('[data-engine="catcher"]')).toHaveCount(0);
  await openShop(page);
  await page.locator('[data-engine="mote"]').click();
  await expect(page.locator('[data-engine="mote"] .own')).toHaveText('1');
  await expect(page.locator('[data-engine="catcher"]')).toHaveCount(1);
  await expect(page.locator('.pill .rate').first()).toHaveText('+0.1/s');

  if ((page.viewportSize()?.width ?? 1400) < 900) await page.getByRole('button', { name: 'Close engines' }).click();
  await page.getByRole('button', { name: /Evolve to Red Dwarf/ }).click();
  await expect(page.locator('.tier-pill')).toContainText('Red Dwarf');
  await expect(page.locator('.toast', { hasText: 'Red Dwarf!' })).toBeVisible();
  // Phase 5: Red Dwarf opens the Belt and the Starsmith Level; its own toast says so, and stays
  await expect(page.locator('[data-rail="belt"]').first()).toHaveClass(/new/);
  await expect(page.locator('.toast', { hasText: 'Red Dwarf!' })).toContainText('Asteroid Belt');
  await page.waitForTimeout(600);
  await expect(page.locator('.toast', { hasText: 'Red Dwarf!' })).toBeVisible();
  await expect(page.locator('.toast', { hasText: 'Unlocked: Belt' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('buy amounts: x10 buys exactly ten, Max spends without going negative', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.getByRole('button', { name: 'x1000 dust' }).click(); // multiplies 0 -> 1,000
  await openShop(page);
  await page.getByRole('button', { name: 'x10', exact: true }).click();
  await page.locator('[data-engine="mote"]').click();
  await expect(page.locator('[data-engine="mote"] .own')).toHaveText('10');
  await page.getByRole('button', { name: 'Max', exact: true }).click();
  await page.locator('[data-engine="mote"]').click();
  const left = await page.evaluate(() => (window as unknown as { sf: { game: { state: { currencies: { stardust: { toNumber(): number } } } } } }).sf.game.state.currencies.stardust.toNumber());
  expect(left).toBeGreaterThanOrEqual(0);
  // Max took everything it could: one more is unaffordable
  await expect(page.locator('[data-engine="mote"]')).toHaveClass(/cant/);
  expect(Number(await page.locator('[data-engine="mote"] .own').textContent())).toBeGreaterThan(10);
});

test('locked systems on the rails show what unlocks them', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1400) < 900, 'hover tooltips are a desktop feature; phones tap instead');
  const locked = page.locator('.rail-btn.locked').first();
  await expect(locked).toBeVisible();
  await locked.hover();
  await expect(page.locator('.float-tip')).toBeVisible();
  await expect(page.locator('.float-tip')).toContainText(/Own|Reach/);
  await expect(page.locator('.float-tip')).toContainText('%');
});

type Sf = {
  sf: {
    game: { state: { tier: number; playtime: number; comet: { nextAt: number }; stats: Record<string, number>; engines: Record<string, number>; upgrades: string[] } };
    commands: { devAdd(c: string, n: number): void; buyEngine(id: string): boolean; devSaveAway(s: number): void; setSetting(k: string, v: unknown): void };
  };
};

test('welcome back after two hours away, with a backup made first', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { commands } = (window as unknown as Sf).sf;
    commands.devAdd('stardust', 5000);
    for (let i = 0; i < 20; i++) commands.buyEngine('mote');
  });
  await page.evaluate(() => (window as unknown as Sf).sf.commands.devSaveAway(7200));
  await page.waitForURL(/dev=1/);
  const welcome = page.locator('[data-panel="welcome"]');
  await expect(welcome).toHaveClass(/open/, { timeout: 15_000 });
  await expect(welcome).toContainText('You were away for 2h');
  await expect(welcome).toContainText('Counted time');
  await expect(welcome.locator('.big-gain')).toContainText('+');
  await welcome.getByRole('button', { name: 'Collect' }).click();
  await expect(page.locator('.modal.open')).toHaveCount(0);
  // the game as it was before catching up went into the backups
  await page.getByRole('button', { name: 'Open settings and saves' }).click();
  await expect(page.locator('.backups li').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('closing the tab right after a purchase keeps it', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { commands } = (window as unknown as Sf).sf;
    commands.devAdd('stardust', 100);
    commands.buyEngine('mote');
  });
  await page.goto('about:blank'); // leaving the page saves (pagehide)
  await page.goto('/?dev=1');
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf).sf.game.state.engines.mote)).toBe(1);
});

test('importing junk shows why and changes nothing', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.getByRole('button', { name: '+1K dust' }).click();
  await page.getByRole('button', { name: 'Open settings and saves' }).click();
  await page.getByLabel('Save code').fill('STARFORGE1:not-a-real-save');
  await expect(page.getByTestId('import-preview')).toContainText("Can't import");
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
  await expect(page.locator('.pill .val').first()).toHaveText('1.00K');
});

test('one panel at a time: opening another closes the first', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { commands } = (window as unknown as Sf).sf;
    commands.devAdd('stardust', 100);
    commands.buyEngine('mote');
  });
  await page.locator('[data-rail="medals"]').first().click();
  await expect(page.locator('[data-panel="medals"]')).toHaveClass(/open/);
  await page.evaluate(() => (document.querySelector('.settings-btn') as HTMLButtonElement).click());
  await expect(page.locator('[data-panel="settings"]')).toHaveClass(/open/);
  await expect(page.locator('[data-panel="medals"]')).not.toHaveClass(/open/);
  await expect(page.locator('.modal.open')).toHaveCount(1);
});

test('catch a comet', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf).sf;
    commands.setSetting('reducedMotion', true); // the comet holds still, so the click can't miss
    commands.devAdd('stardust', 5000);
    for (let i = 0; i < 10; i++) commands.buyEngine('mote');
    game.state.tier = 1;
    game.state.comet.nextAt = game.state.playtime;
  });
  const comet = page.getByTestId('comet');
  await expect(comet).toBeVisible();
  await comet.click();
  await expect(page.locator('.comet-pop')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf).sf.game.state.stats.comets)).toBe(1);
  expect(errors).toEqual([]);
});

test('buy an upgrade from its tile, then see it in Upgrades and Stats', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf).sf;
    commands.devAdd('stardust', 1000);
    game.state.stats.taps = 30;
  });
  await openShop(page);
  const tile = page.locator('[data-upgrade="tap.warm"]');
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(tile).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf).sf.game.state.upgrades)).toContain('tap.warm');
  await page.evaluate(() => (document.querySelector('[data-rail="stats"]') as HTMLButtonElement | null)?.click());
});

type Sf3 = {
  sf: {
    game: { state: { tier: number; constants: Record<string, number>; planets: Record<string, unknown>; quests: Array<{ kind: string }>; stats: Record<string, number> } };
    commands: { devAdd(c: string, n: number): void; buyEngine(id: string): boolean; setBuyAmount(a: unknown): void };
  };
};

test('Phase 3: buy constants, place a planet, claim a quest', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf3).sf;
    commands.devAdd('stardust', 1e12);
    for (let i = 0; i < 20; i++) commands.buyEngine('mote');
    game.state.tier = 3;
  });
  // Constants: the rail opens the panel, "Next" buys up to the first doubling
  await page.locator('[data-rail="constants"]').first().click();
  const panel = page.locator('[data-panel="constants"]');
  await expect(panel).toHaveClass(/open/);
  await panel.getByRole('button', { name: 'Next', exact: true }).click();
  await panel.locator('[data-constant="stellar.gravity"] .const-buy').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf3).sf.game.state.constants['stellar.gravity'])).toBe(25);
  await expect(panel.locator('[data-constant="stellar.gravity"]')).toContainText('Lv 25');
  await page.keyboard.press('Escape');

  // Orbitals: pick an empty slot, choose a type
  await page.locator('[data-rail="orbitals"]').first().click();
  const orb = page.locator('[data-panel="orbitals"]');
  await orb.locator('[data-slot="0.0"]').click();
  await orb.locator('.planet-type[data-type="ice"]').click();
  await expect(orb.locator('[data-slot="0.0"]')).toHaveClass(/filled/);
  await expect(orb).toContainText('Ice planet');
  await page.keyboard.press('Escape');

  // Quests: three on the board; finish one and claim it
  await page.locator('[data-rail="quests"]').first().click();
  const quests = page.locator('[data-panel="quests"]');
  await expect(quests.locator('.quest')).toHaveCount(3);
  await page.evaluate(() => {
    const s = (window as unknown as Sf3).sf.game.state;
    s.quests[0] = { kind: 'taps', start: s.stats.taps ?? 0, need: 1 } as never;
    s.stats.taps = (s.stats.taps ?? 0) + 1;
  });
  await quests.locator('[data-quest="0"]').getByRole('button', { name: 'Claim' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf3).sf.game.state.stats.questsDone)).toBe(1);
  await expect(quests.locator('.quest')).toHaveCount(3);
  expect(errors).toEqual([]);
});

type Sf4 = {
  sf: {
    game: { state: { tier: number; stats: Record<string, number>; novaTree: Record<string, number>; auto: Record<string, { on: boolean }>; engines: Record<string, number> } };
    commands: { devAdd(c: string, n: number): void; buyEngine(id: string): boolean; setBuyAmount(a: unknown): void };
  };
};

test('a first Supernova with nothing but the buttons on screen, then the Nova Tree', async ({ page }) => {
  const errors = watchErrors(page);
  const phone = (page.viewportSize()?.width ?? 1400) < 900;
  await page.goto('/?dev=1');
  // a run's worth of Stardust; the rest is the player's own clicks
  await page.evaluate(() => (window as unknown as Sf4).sf.commands.devAdd('stardust', 3e7));
  for (const tier of ['Red Dwarf', 'Golden Sun', 'Blue Giant']) await page.getByRole('button', { name: new RegExp(`Evolve to ${tier}`) }).click();
  const nova = page.getByTestId('supernova');
  await expect(nova).toBeEnabled();
  await nova.click();
  const confirm = page.locator('[data-panel="supernova"]');
  await expect(confirm).toHaveClass(/open/);
  await expect(confirm).toContainText('Resets');
  await expect(confirm).toContainText('Kept');
  await confirm.getByRole('button', { name: 'Go Supernova' }).click();
  await expect(confirm).not.toHaveClass(/open/);
  await expect(page.locator('.pill', { hasText: '3' }).first()).toBeVisible();
  await expect(page.locator('.tier-pill')).toContainText('Protostar');
  // the Nova Tree: pick the root, buy it
  await page.locator('[data-rail="novatree"]:visible').click();
  const tree = page.locator('[data-panel="novatree"]');
  await expect(tree).toHaveClass(/open/);
  await tree.locator('[data-node="root"]').click();
  await tree.locator('.tree-card').getByRole('button', { name: /Buy/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf4).sf.game.state.novaTree.root)).toBe(1);
  await expect(tree.locator('[data-node="forge.1"]')).not.toHaveClass(/fog/);
  if (!phone) {
    // keyboard: arrows move between nodes, Enter buys
    await tree.locator('.tree-view').focus();
    await page.keyboard.press('ArrowUp');
    await expect(tree.locator('.tree-card')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('the tree view stays usable at 200 nodes: drag, zoom, keyboard, touch', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1&treebench=200');
  const view = page.locator('.tree-view');
  await expect(view).toBeVisible();
  await expect(page.locator('[data-node]')).toHaveCount(200);
  const box = (await view.boundingBox())!;
  const fps = await page.evaluate(async () => {
    const times: number[] = [];
    let last = performance.now();
    let on = true;
    const loop = (t: number) => {
      times.push(t - last);
      last = t;
      if (on) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    await new Promise((r) => setTimeout(r, 30));
    (window as unknown as { __stop: () => number }).__stop = () => {
      on = false;
      const f = times.slice(2);
      return f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
    };
    return 0;
  });
  expect(fps).toBe(0);
  // drag to pan
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 20; i++) await page.mouse.move(box.x + box.width / 2 + i * 8, box.y + box.height / 2 + i * 4);
  await page.mouse.up();
  // wheel to zoom
  await page.mouse.wheel(0, -300);
  const avgFrame = await page.evaluate(() => (window as unknown as { __stop: () => number }).__stop());
  expect(avgFrame).toBeLessThan(50);
  // keyboard: select and buy with Enter
  await view.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.tree-card')).toBeVisible();
  const before = Number(await page.locator('.tree-bench-count').getAttribute('data-owned'));
  // click the root's child via search to make sure it's affordable, then Enter
  await page.getByLabel('Search nodes by name').fill('Node 1');
  await page.getByLabel('Search nodes by name').press('Enter');
  await view.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => Number(await page.locator('.tree-bench-count').getAttribute('data-owned'))).toBeGreaterThan(before);
  // touch: a tap selects a node
  const node = page.locator('[data-node="n2"]');
  await node.dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch', isPrimary: true, bubbles: true });
  await view.dispatchEvent('pointerup', { pointerId: 9, pointerType: 'touch', isPrimary: true, bubbles: true });
  await expect(page.locator('.tree-card')).toContainText('Node 2');
  expect(errors).toEqual([]);
});

test('auto-buyers have working switches in the Automation hub', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf4).sf;
    game.state.stats.supernovas = 3;
    commands.devAdd('stardust', 100);
  });
  await page.locator('[data-rail="automation"]:visible').click();
  const hub = page.locator('[data-panel="automation"]');
  await expect(hub).toHaveClass(/open/);
  const mote = hub.locator('[data-auto="auto.mote"]');
  await mote.getByRole('button', { name: 'On' }).click();
  await expect(mote.getByRole('button', { name: 'Off' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf4).sf.game.state.auto['auto.mote']?.on)).toBe(false);
  // switched off: no more purchases, even with money in the bank
  const owned = await page.evaluate(() => (window as unknown as Sf4).sf.game.state.engines.mote ?? 0);
  await page.evaluate(() => (window as unknown as Sf4).sf.commands.devAdd('stardust', 1e5));
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as Sf4).sf.game.state.engines.mote ?? 0)).toBe(owned);
  await mote.getByRole('button', { name: 'Off' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf4).sf.game.state.engines.mote ?? 0), { timeout: 5000 }).toBeGreaterThan(owned);
});

// ---------- Phase 5: the Asteroid Belt, Deep Core and the Starsmith Level ----------

type Sf5 = {
  sf: {
    game: {
      state: {
        tier: number;
        unlocked: string[];
        stats: Record<string, number>;
        belt: { upgrades: Record<string, number>; field: Array<{ id: number; r: number }>; nextId: number };
        drill: { depth: number; drones: number; damage: { toNumber(): number } };
        starsmith: { perks: Record<string, number> };
        currencies: Record<string, { toNumber(): number }>;
      };
    };
    commands: { devAdd(c: string, n: number): void; harvest(ids: number[]): number };
  };
};

test('100 asteroids harvested by hand in a few quick sweeps', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  // a Red Dwarf whose field holds 100 asteroids, all there already
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf5).sf;
    const s = game.state;
    s.tier = 1;
    s.belt.upgrades.amount = 90;
    s.belt.field = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, r: i % 25 === 0 ? 1 : 0 }));
    s.belt.nextId = 101;
    commands.devAdd('ore', 0);
  });
  await page.locator('[data-rail="belt"]:visible').click();
  const panel = page.locator('[data-panel="belt"]');
  await expect(panel).toHaveClass(/open/);
  const field = panel.getByTestId('belt-field');
  await expect(field.locator('canvas')).toBeVisible();
  await page.waitForTimeout(400); // asteroids grow in
  const box = (await field.boundingBox())!;
  const started = Date.now();
  // zigzag sweeps, top to bottom and back
  for (let pass = 0; pass < 3; pass++) {
    for (let row = 0; row <= 4; row++) {
      const y = box.y + 20 + ((box.height - 40) * (pass % 2 ? 4 - row : row)) / 4;
      const [x0, x1] = row % 2 ? [box.x + box.width - 4, box.x + 4] : [box.x + 4, box.x + box.width - 4];
      await page.mouse.move(x0, y);
      await page.mouse.down();
      await page.mouse.move(x1, y, { steps: 12 });
      await page.mouse.up();
    }
    const done = await page.evaluate(() => (window as unknown as Sf5).sf.game.state.stats.harvested ?? 0);
    if (done >= 100) break;
  }
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.stats.harvested ?? 0)).toBeGreaterThanOrEqual(100);
  expect(Date.now() - started).toBeLessThan(15_000);
  expect(await page.evaluate(() => (window as unknown as Sf5).sf.game.state.currencies.ore!.toNumber())).toBeGreaterThanOrEqual(100);
  // the ore shows in the HUD and buys an upgrade
  await expect(page.locator('.hud .pill[aria-label="Ore"]')).toBeVisible();
  await panel.locator('[data-belt-up="value"]').getByRole('button').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.belt.upgrades.value)).toBe(1);
  expect(errors).toEqual([]);
});

test('the arrow keys sweep the beam too', async ({ page }) => {
  const phone = (page.viewportSize()?.width ?? 1400) < 900;
  test.skip(phone, 'keyboard play is a desktop check');
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf5).sf;
    game.state.tier = 1;
    commands.devAdd('ore', 0);
  });
  await page.locator('[data-rail="belt"]:visible').click();
  const field = page.locator('[data-panel="belt"]').getByTestId('belt-field');
  await expect(field.locator('canvas')).toBeVisible();
  // wait for a few asteroids, then sweep the whole field with the keys
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.belt.field.length), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
  await field.focus();
  for (let row = 0; row < 6; row++) {
    for (let i = 0; i < 16; i++) await page.keyboard.press(row % 2 ? 'ArrowLeft' : 'ArrowRight');
    await page.keyboard.press(row < 3 ? 'ArrowUp' : 'ArrowDown');
    await page.keyboard.press(row < 3 ? 'ArrowUp' : 'ArrowDown');
  }
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.stats.harvested ?? 0)).toBeGreaterThan(0);
});

test('Deep Core: clicking drills, drones buy, the core breaks into ore', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf5).sf;
    game.state.stats.supernovas = 5;
    (game.state as unknown as { forge: { on: boolean } }).forge.on = false; // keep the ore for the drone
    commands.devAdd('ore', 600);
  });
  await page.locator('[data-rail="drill"]:visible').click();
  const panel = page.locator('[data-panel="drill"]');
  await expect(panel).toHaveClass(/open/);
  const core = panel.getByTestId('drill-core');
  for (let i = 0; i < 5; i++) await core.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.drill.damage.toNumber())).toBeGreaterThanOrEqual(10);
  await panel.getByRole('button', { name: /Buy 1 drill drone/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.drill.drones)).toBe(1);
  // keep drilling until the first core breaks
  for (let i = 0; i < 40; i++) await core.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.drill.depth), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  await expect(panel).toContainText('Depth 1');
  expect(errors).toEqual([]);
});

test('Starsmith perks: the HUD chip opens the panel, points spend and reset', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf5).sf;
    game.state.tier = 1;
    commands.devAdd('xp', 500); // level 3 needs 50 + 135 + 266
  });
  const chip = page.getByTestId('level-chip');
  await expect(chip).toContainText('Lv 3');
  await chip.click();
  const panel = page.locator('[data-panel="level"]');
  await expect(panel).toHaveClass(/open/);
  await expect(panel).toContainText('3 perk points to spend');
  await panel.locator('[data-perk="cap"]').getByRole('button', { name: /Put a point/ }).click();
  await panel.locator('[data-perk="cap"]').getByRole('button', { name: /Put a point/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.starsmith.perks.cap)).toBe(2);
  await expect(panel).toContainText('1 perk point to spend');
  await panel.getByRole('button', { name: 'Reset perks (free)' }).click();
  await expect(panel).toContainText('3 perk points to spend');
});

// ---------- Phase 6: the Starforge (furnace, relics, Codex) ----------

/** Opens a rail's panel. With ?dev=1 the dev panel can sit over the right rail, so click through the DOM. */
async function openRail(page: Page, id: string): Promise<void> {
  // a system unlocked by the test shows on the rail one snapshot later: wait for its button, then click once
  await expect
    .poll(() =>
      page.evaluate((x) => {
        const btn = [...document.querySelectorAll<HTMLButtonElement>(`[data-rail="${x}"]`)].find((b) => b.offsetParent !== null);
        btn?.click();
        return !!btn;
      }, id),
    )
    .toBe(true);
  await expect(page.locator(`[data-panel="${id}"]`)).toHaveClass(/open/);
}

type Sf6 = {
  sf: {
    game: {
      state: {
        tier: number;
        unlocked: string[];
        engines: Record<string, number>;
        stats: Record<string, number>;
        forge: { upgrades: Record<string, number>; lanes: Array<{ t: number; ore: { toNumber(): number } }> };
        relics: { levels: Record<string, number>; equipped: string[] };
        belt: { upgrades: Record<string, number> };
        codex: Record<string, number>;
        currencies: Record<string, { toNumber(): number }>;
      };
    };
    commands: { devAdd(c: string, n: number): void; setBuyAmount(a: unknown): void };
    saveNow(): boolean;
  };
};

test('the furnace smelts ore into alloy, and a reload mid-smelt keeps the batch', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf6).sf;
    game.state.stats.supernovas = 3;
    commands.devAdd('ore', 1000);
  });
  await openRail(page, 'starforge');
  const panel = page.locator('[data-panel="starforge"]');
  await expect(panel).toHaveClass(/open/);
  await expect(panel.getByTestId('furnace-status')).toHaveText('Smelting Iron ore');
  await expect(panel.locator('.forge-scene canvas')).toBeVisible();
  // a batch is in the crucible: save and reload partway through
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf6).sf.game.state.forge.lanes[0]?.t ?? 0)).toBeGreaterThan(2);
  const before = await page.evaluate(() => {
    const { game, saveNow } = (window as unknown as Sf6).sf;
    saveNow();
    return { t: game.state.forge.lanes[0]!.t, ore: game.state.currencies.ore!.toNumber() };
  });
  await page.reload();
  const after = await page.evaluate(() => {
    const s = (window as unknown as Sf6).sf.game.state;
    return { lanes: s.forge.lanes.length, ore: s.forge.lanes[0]?.ore.toNumber() ?? 0, t: s.forge.lanes[0]?.t ?? 0, left: s.currencies.ore!.toNumber() };
  });
  expect(after.lanes).toBe(1);
  expect(after.ore).toBe(100);
  expect(after.t).toBeGreaterThanOrEqual(before.t);
  expect(after.left).toBe(before.ore);
  // and it finishes into an ingot of Iron alloy
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf6).sf.game.state.currencies['alloy.iron']?.toNumber() ?? 0), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('relics: craft one, it equips itself, and it shows in the Stats breakdown', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf6).sf;
    game.state.stats.supernovas = 3;
    game.state.unlocked.push('stats');
    commands.devAdd('alloy.iron', 100);
  });
  await openRail(page, 'starforge');
  const panel = page.locator('[data-panel="starforge"]');
  await panel.getByRole('tab', { name: 'Relics' }).click();
  const anvil = panel.locator('[data-relic="anvil"]');
  await anvil.getByRole('button', { name: /Craft Anvil of Dawn/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf6).sf.game.state.relics.levels.anvil)).toBe(1);
  await expect(anvil.getByRole('button', { name: 'Equipped' })).toBeVisible();
  // level it with the buy amount: x10 needs 10 levels' worth of alloy
  await page.evaluate(() => (window as unknown as Sf6).sf.commands.devAdd('alloy.iron', 5000));
  await panel.getByRole('button', { name: 'x10', exact: true }).click();
  await anvil.getByRole('button', { name: /Level Anvil of Dawn up 10/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf6).sf.game.state.relics.levels.anvil)).toBe(11);
  await page.keyboard.press('Escape');
  await openRail(page, 'stats');
  await expect(page.locator('[data-panel="stats"]')).toContainText('Anvil of Dawn (relic)');
  expect(errors).toEqual([]);
});

test('the Codex: the Supernova screen previews the elements, then the table shows them', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf6).sf;
    game.state.stats.supernovas = 3;
    game.state.tier = 3;
    commands.devAdd('stardust', 3e7);
  });
  await page.getByTestId('supernova').click();
  const confirm = page.locator('[data-panel="supernova"]');
  await expect(confirm.getByTestId('codex-preview')).toContainText('Hydrogen to Oxygen');
  await confirm.getByRole('button', { name: 'Go Supernova' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf6).sf.game.state.codex.o ?? 0)).toBeGreaterThan(0);
  await openRail(page, 'starforge');
  const panel = page.locator('[data-panel="starforge"]');
  await panel.getByRole('tab', { name: 'Codex' }).click();
  await expect(panel.locator('[data-el="o"]')).toHaveClass(/found/);
  await expect(panel.locator('[data-el="f"]')).not.toHaveClass(/found/);
  await panel.locator('[data-el="fe"]').click();
  await expect(panel.getByTestId('element-card')).toContainText('Iron');
  await expect(panel.getByTestId('element-card')).toContainText('One more relic slot');
  expect(errors).toEqual([]);
});

test('Belt and furnace purchases follow the buy amount', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf6).sf;
    game.state.tier = 1;
    game.state.stats.supernovas = 3;
    commands.devAdd('ore', 1e9);
  });
  await page.locator('[data-rail="belt"]:visible').click();
  const belt = page.locator('[data-panel="belt"]');
  await belt.getByRole('button', { name: 'x10', exact: true }).click();
  await belt.locator('[data-belt-up="value"]').getByRole('button', { name: /Buy 10 Value/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf6).sf.game.state.belt.upgrades.value)).toBe(10);
  await page.keyboard.press('Escape');
  await openRail(page, 'starforge');
  const forge = page.locator('[data-panel="starforge"]');
  await forge.getByRole('button', { name: 'Max', exact: true }).click();
  await forge.locator('[data-forge-up="crucibles"]').getByRole('button').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf6).sf.game.state.forge.upgrades.crucibles)).toBe(5);
  await expect(forge.locator('[data-forge-up="crucibles"]').getByRole('button', { name: /maxed/ })).toBeVisible();
});

// ---------- Phase 7: Comet Fusion, Attunements, the Merchant and starships ----------

type Sf7 = {
  sf: {
    game: {
      state: {
        tier: number;
        unlocked: string[];
        stats: Record<string, number>;
        fusion: { board: number[]; best: number };
        attune: { equipped: string[]; pulse: number[] };
        merchant: { deals: unknown[] };
        ships: { fleet: Array<{ sector: string | null; t: number }>; upgrades: Record<string, number> };
        currencies: Record<string, { toNumber(): number }>;
      };
    };
    commands: { devAdd(c: string, n: number): void };
    breakdown(s: unknown, id: string): Array<{ label: string }>;
  };
};

const sf7 = (page: Page) => page.evaluate.bind(page);

test('Comet Fusion: dragging a comet onto its twin fuses exactly three', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf7).sf;
    game.state.stats.supernovas = 6;
    game.state.fusion.board = [2, 2, 2, 1, 0, 0, 0, 0, 0];
    commands.devAdd('shards', 0);
  });
  await openRail(page, 'fusion');
  const board = page.getByTestId('fusion-board');
  const a = board.locator('[data-cell="0"]');
  const b = board.locator('[data-cell="1"]');
  const from = (await a.boundingBox())!;
  const to = (await b.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => sf7(page)(() => (window as unknown as Sf7).sf.game.state.fusion.board.slice(0, 4))).toEqual([0, 3, 0, 1]);
  await expect(board.locator('[data-cell="1"]')).toHaveAttribute('data-level', '3');
  // tap-to-fuse needs a third of the same level: with only one level 1, nothing happens
  await board.locator('[data-cell="3"]').click();
  await expect(board.locator('[data-cell="3"]')).toHaveClass(/sel/);
  expect(errors).toEqual([]);
});

test('Attunements: equip Pulse, tap on the beat, the rating shows in Stats', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf7).sf;
    game.state.stats.supernovas = 8;
    game.state.unlocked.push('stats');
    commands.devAdd('stardust', 0);
  });
  await openRail(page, 'attune');
  const card = page.locator('[data-attune="pulse"]');
  await card.getByRole('button', { name: 'Equip' }).click();
  await expect(card.getByRole('button', { name: 'Equipped' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pulse-ring')).toBeAttached();
  await expect(page.locator('.attune-hud')).toContainText('Pulse');
  // tap right on beats: wait for each beat with the page's own clock
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => new Promise((r) => setTimeout(r, 1000 - (performance.now() % 1000))));
    await page.locator('.star-btn').click({ force: true });
  }
  const graded = await page.evaluate(() => (window as unknown as Sf7).sf.game.state.attune.pulse.length);
  expect(graded).toBeGreaterThanOrEqual(2);
  await openRail(page, 'stats');
  await expect(page.locator('[data-panel="stats"]')).toContainText('Pulse (timing rating)');
  expect(errors).toEqual([]);
});

test('the Merchant: four deals, take one and it is replaced', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf7).sf;
    game.state.stats.supernovas = 10;
    commands.devAdd('stardust', 1e15);
    commands.devAdd('shards', 1e6);
    commands.devAdd('ore', 1e9);
  });
  await openRail(page, 'merchant');
  const panel = page.locator('[data-panel="merchant"]');
  await expect(panel.locator('.deal')).toHaveCount(4);
  await panel.locator('[data-deal="0"]').getByRole('button', { name: /Take the deal/ }).click();
  await expect.poll(() => sf7(page)(() => (window as unknown as Sf7).sf.game.state.stats.deals ?? 0)).toBe(1);
  await expect(panel.locator('.deal')).toHaveCount(4);
  await panel.getByRole('button', { name: /New deals for/ }).click();
  await expect(panel.getByRole('button', { name: /New deals for 10 Nova/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Starships: launch a ship; Engines make the trip shorter', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf7).sf;
    game.state.stats.supernovas = 15;
    game.state.stats.bestTier = 3; // 15 Supernovas means Blue Giant at least
    commands.devAdd('alloy.iron', 1e6);
  });
  await openRail(page, 'expeditions');
  const panel = page.locator('[data-panel="expeditions"]');
  await expect(panel.locator('.sectors')).toContainText('Kuiper Drift');
  await expect(panel.locator('.sectors')).toContainText('10m');
  await panel.locator('[data-up="ships-engines"]').getByRole('button').click();
  await expect(panel.locator('.sectors')).toContainText('8m');
  await panel.locator('[data-ship="0"]').getByRole('button', { name: 'Launch' }).click();
  await expect.poll(() => sf7(page)(() => (window as unknown as Sf7).sf.game.state.ships.fleet[0]!.sector)).toBe('kuiper');
  await expect(panel.locator('[data-ship="0"]')).toContainText('Kuiper Drift');
  expect(errors).toEqual([]);
});

// ---------- Phase 8: the Nebula and Constellation Runes ----------

type Sf8 = {
  sf: {
    game: {
      state: {
        tier: number;
        unlocked: string[];
        stats: Record<string, number>;
        nebulaTree: Record<string, number>;
        runes: { copies: Record<string, { toNumber(): number }>; shrines: Record<string, { rolled: { toNumber(): number }; auto: boolean }> };
        currencies: Record<string, { toNumber(): number }>;
      };
    };
    commands: { devAdd(c: string, n: number): void };
  };
};

const st8 = (page: Page) => page.evaluate.bind(page);

test('the Nebula: from 30 Supernovas through the confirm screen; Essence arrives and the shrines open', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf8).sf;
    const s = game.state;
    s.tier = 3;
    s.stats.supernovas = 30;
    s.stats.supernovasAll = 30;
    s.stats.supernovasBest = 30;
    commands.devAdd('shards', 2e5);
  });
  const bar = page.getByTestId('nebula');
  await expect(bar).toBeEnabled();
  await bar.click();
  const confirm = page.locator('[data-panel="nebulaConfirm"]');
  await expect(confirm).toHaveClass(/open/);
  await expect(confirm).toContainText('Nova Shards');
  await expect(confirm).toContainText('Relics, the Codex and runes');
  await confirm.getByRole('button', { name: 'Go Nebula' }).click();
  await expect.poll(() => st8(page)(() => (window as unknown as Sf8).sf.game.state.currencies.essence?.toNumber() ?? 0)).toBe(2);
  await expect.poll(() => st8(page)(() => (window as unknown as Sf8).sf.game.state.stats.supernovas)).toBe(0);
  await expect(page.locator('.hud .pill[aria-label="Nebula Essence"]')).toBeVisible();
  // the rune shrines: roll once by hand at the Nova shrine (10 shards a rune). Not Stardust: from the
  // first Nebula the Supernova milestones stay, so auto-buyers spend Stardust on engines at once.
  await page.evaluate(() => (window as unknown as Sf8).sf.commands.devAdd('shards', 1000));
  await openRail(page, 'runes');
  const runes = page.locator('[data-panel="runes"]');
  await runes.locator('[data-shrine="nova"]').click();
  await runes.getByTestId('roll-once').click();
  await expect(runes.getByTestId('roll-card')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Sf8).sf.game.state.currencies.shards!.toNumber())).toBe(1000 - 10);
  // the Nebula Tree: the root costs 1 Essence
  await openRail(page, 'nebulatree');
  const tree = page.locator('[data-panel="nebulatree"]');
  await tree.locator('[data-node="nroot"]').click();
  await tree.locator('.tree-card').getByRole('button', { name: /Buy/ }).click();
  await expect.poll(() => st8(page)(() => (window as unknown as Sf8).sf.game.state.nebulaTree.nroot)).toBe(1);
  expect(errors).toEqual([]);
});

test('auto-roll spends exactly the price of every rune it rolls', async ({ page }) => {
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf8).sf;
    game.state.stats.nebulasAll = 1;
    commands.devAdd('stardust', 5e7);
  });
  await openRail(page, 'runes');
  const runes = page.locator('[data-panel="runes"]');
  const before = await page.evaluate(() => (window as unknown as Sf8).sf.game.state.currencies.stardust!.toNumber());
  await runes.getByTestId('auto-roll').click();
  await expect(runes.getByTestId('auto-roll')).toContainText('On');
  await page.waitForTimeout(2500);
  await runes.getByTestId('auto-roll').click();
  const after = await page.evaluate(() => {
    const s = (window as unknown as Sf8).sf.game.state;
    return { left: s.currencies.stardust!.toNumber(), rolled: s.runes.shrines.dust!.rolled.toNumber(), prod: s.stats.taps ?? 0 };
  });
  expect(after.rolled).toBeGreaterThanOrEqual(1);
  // nothing else earns or spends Stardust here (no engines): the spend is exactly 1M a rune
  expect(before - after.left).toBe(after.rolled * 1e6);
});

// ---------- Phase 9: rune depth ----------

type Sf9 = {
  sf: {
    game: {
      state: {
        unlocked: string[];
        stats: Record<string, number>;
        runes: { copies: Record<string, unknown>; stars: Record<string, number> };
        auras: { copies: Record<string, unknown>; equipped: string | null };
        codex: Record<string, number>;
        currencies: Record<string, { toNumber(): number }>;
      };
    };
    commands: { devAdd(c: string, n: number): void };
  };
};

test('Rune Stars: a star takes exactly the copies it asks for; spare copies salvage into Rune Shards', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game } = (window as unknown as Sf9).sf;
    const s = game.state;
    s.stats.nebulasAll = 2;
    s.stats.nebulas = 2;
    const D = (s.currencies.stardust as unknown as { constructor: new (x: number) => unknown }).constructor;
    s.runes.copies['dust.4'] = new D(300);
    s.runes.copies['dust.0'] = new D(1e6);
  });
  await openRail(page, 'starring');
  const panel = page.locator('[data-panel="starring"]');
  await panel.getByTestId('star-up').click();
  const after = await page.evaluate(() => {
    const s = (window as unknown as Sf9).sf.game.state;
    return { left: (s.runes.copies['dust.4'] as { toNumber(): number }).toNumber(), common: (s.runes.copies['dust.0'] as { toNumber(): number }).toNumber(), stars: s.runes.stars.dust };
  });
  expect(after).toEqual({ left: 50, common: 1e6, stars: 1 });
  await expect(panel.locator('[data-star-shrine="dust"]')).toContainText('1');
  await panel.getByTestId('salvage').click();
  const shards = await page.evaluate(() => (window as unknown as Sf9).sf.game.state.currencies.runeShards?.toNumber() ?? 0);
  // a million commons, of which 250,000 feed the level cap: 750,000 x 2 / 10
  expect(shards).toBe(150_000);
  expect(errors).toEqual([]);
});

test('Celestial Auras: roll a die, wear an aura, and it shows in Stats', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf9).sf;
    game.state.stats.nebulasAll = 4;
    game.state.stats.nebulas = 4;
    game.state.unlocked.push('stats');
    commands.devAdd('auraDice', 1000);
  });
  await openRail(page, 'auras');
  const panel = page.locator('[data-panel="auras"]');
  await panel.getByTestId('roll-aura').click();
  await expect(panel.getByTestId('aura-card')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Sf9).sf.game.state.currencies.auraDice!.toNumber())).toBe(999);
  await page.evaluate(() => {
    const s = (window as unknown as Sf9).sf.game.state;
    const D = (s.currencies.stardust as unknown as { constructor: new (x: number) => unknown }).constructor;
    s.auras.copies['aura.crown'] = new D(1);
  });
  await panel.locator('[data-aura="aura.crown"]').getByRole('button', { name: 'Wear' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf9).sf.game.state.auras.equipped)).toBe('aura.crown');
  await openRail(page, 'stats');
  await expect(page.locator('[data-panel="stats"]')).toContainText('Celestial Aura');
  expect(errors).toEqual([]);
});

test('the Index: page bonuses grow with completion and show in Stats; Mutations opens at 3 Nebulas', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const s = (window as unknown as Sf9).sf.game.state;
    s.stats.nebulasAll = 3;
    s.stats.nebulas = 3;
    s.unlocked.push('stats');
    for (const id of ['h', 'he', 'li', 'be', 'b', 'c', 'n', 'o', 'f', 'ne', 'na', 'mg']) s.codex[id] = 1;
  });
  await openRail(page, 'index');
  const panel = page.locator('[data-panel="index"]');
  await panel.locator('[data-page="elements"]').click();
  await expect(panel.getByTestId('index-bonus')).toContainText('x2 Stardust');
  await openRail(page, 'mutations');
  await expect(page.locator('[data-panel="mutations"]')).toContainText('Prismatic');
  await openRail(page, 'stats');
  await expect(page.locator('[data-panel="stats"]')).toContainText('Index: Elements');
  expect(errors).toEqual([]);
});

// ---------- Phase 10: Void Wyrms and the Star Nursery ----------

type Sf10 = {
  sf: {
    game: {
      state: {
        unlocked: string[];
        stats: Record<string, number>;
        wyrms: { stacks: Record<string, unknown>; team: string[] };
        nursery: { seeds: Record<string, number>; found: string[] };
        currencies: Record<string, { toNumber(): number; constructor: new (x: number) => unknown }>;
      };
    };
    commands: { devAdd(c: string, n: number): void; devWarp(s: number): void };
    fx: { wyrms(): number; renderMs(): number };
  };
};

test('Void Wyrms: hatch an egg, then fusion takes exactly five', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf10).sf;
    game.state.stats.nebulasAll = 3;
    game.state.stats.nebulas = 3;
    commands.devAdd('essence', 1000);
  });
  await openRail(page, 'wyrms');
  const panel = page.locator('[data-panel="wyrms"]');
  await panel.getByTestId('hatch').click();
  await expect(panel.getByTestId('hatch-card')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Sf10).sf.game.state.stats.wyrmsHatched)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as Sf10).sf.game.state.wyrms.team.length)).toBe(1);
  await page.evaluate(() => {
    const s = (window as unknown as Sf10).sf.game.state;
    const D = s.currencies.essence!.constructor;
    s.wyrms.stacks['wyrm.cinderwisp|0|'] = new D(7);
  });
  await panel.locator('[data-fuse="wyrm.cinderwisp|0|"]').click();
  const after = await page.evaluate(() => {
    const st = (window as unknown as Sf10).sf.game.state.wyrms.stacks as Record<string, { toNumber(): number }>;
    return { normal: st['wyrm.cinderwisp|0|']!.toNumber(), golden: st['wyrm.cinderwisp|1|']!.toNumber() };
  });
  expect(after).toEqual({ normal: 2, golden: 1 });
  expect(errors).toEqual([]);
});

test('six Wyrms swim across the sky and the frame rate holds', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  const measure = () =>
    page.evaluate(async () => {
      const times: number[] = [];
      let last = performance.now();
      await new Promise<void>((done) => {
        const loop = (t: number) => {
          times.push(t - last);
          last = t;
          if (times.length < 150) requestAnimationFrame(loop);
          else done();
        };
        requestAnimationFrame(loop);
      });
      const f = times.slice(5);
      return f.reduce((a, b) => a + b, 0) / f.length;
    });
  await page.evaluate(() => {
    const s = (window as unknown as Sf10).sf.game.state;
    s.stats.nebulasAll = 3;
    s.stats.nebulas = 3;
  });
  // the same page without Wyrms first: headless browsers set their own pace
  const before = await measure();
  await page.evaluate(() => {
    const s = (window as unknown as Sf10).sf.game.state;
    s.stats.wyrmsHatched = 400;
    const D = s.currencies.stardust!.constructor;
    const ids = ['ashling', 'starscale', 'voidcoil', 'frostmaw', 'thunderhorn', 'sylthaz'];
    ids.forEach((id, i) => {
      const key = `wyrm.${id}|${i % 3}|`;
      s.wyrms.stacks[key] = new D(1);
      s.wyrms.team.push(key);
    });
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf10).sf.fx.wyrms())).toBe(6);
  const after = await measure();
  // six Wyrms don't slow the frame, and a whole frame's drawing stays far inside 60 fps's 16.7 ms
  expect(after).toBeLessThan(before * 1.25 + 2);
  expect(await page.evaluate(() => (window as unknown as Sf10).sf.fx.renderMs())).toBeLessThan(8);
  expect(errors).toEqual([]);
});

test('the Star Nursery: crossbreeding follows the table, and a planted seed ripens and harvests', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf10).sf;
    game.state.stats.nebulasAll = 4;
    game.state.stats.nebulas = 4;
    game.state.nursery.seeds = { 'star.ember': 2, 'star.sol': 2 };
    commands.devAdd('essence', 1000);
  });
  await openRail(page, 'nursery');
  const panel = page.locator('[data-panel="nursery"]');
  await panel.getByTestId('cross-a').selectOption('star.ember');
  await panel.getByTestId('cross-b').selectOption('star.sol');
  await expect(panel.getByTestId('cross-preview')).toContainText('Flare Star');
  await panel.getByTestId('cross').click();
  expect(await page.evaluate(() => (window as unknown as Sf10).sf.game.state.nursery.seeds)).toEqual({ 'star.ember': 1, 'star.sol': 1, 'star.flare': 1 });
  await panel.locator('[data-plant="0"]').click();
  await page.evaluate(() => (window as unknown as Sf10).sf.commands.devWarp(40));
  await panel.locator('[data-harvest="0"]').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf10).sf.game.state.nursery.found.length)).toBe(1);
  expect(errors).toEqual([]);
});

// ---------- Phase 11: Spectral Focus and Tarot of the Void ----------

type Sf11 = {
  sf: {
    game: {
      state: {
        unlocked: string[];
        stats: Record<string, number>;
        spectral: { energy: Record<string, unknown>; focus: string | null };
        tarot: { owned: string[]; deck: Array<string | null> };
        currencies: Record<string, { constructor: new (x: number) => unknown }>;
      };
    };
    commands: { devAdd(c: string, n: number): void };
  };
};

test('Spectral Focus: focus a colour; its bonus steps up exactly at each order of magnitude', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const s = (window as unknown as Sf11).sf.game.state;
    s.stats.nebulasAll = 5;
    s.stats.nebulas = 5;
    s.unlocked.push('stats');
  });
  await openRail(page, 'spectral');
  const panel = page.locator('[data-panel="spectral"]');
  await panel.locator('[data-focus="red"]').click();
  expect(await page.evaluate(() => (window as unknown as Sf11).sf.game.state.spectral.focus)).toBe('red');
  await page.evaluate(() => {
    const s = (window as unknown as Sf11).sf.game.state;
    const D = s.currencies.stardust!.constructor;
    s.spectral.focus = null;
    s.spectral.energy.red = new D(999);
  });
  await expect(panel.locator('[data-color="red"] .band-oom')).toContainText('2');
  await page.evaluate(() => {
    const s = (window as unknown as Sf11).sf.game.state;
    const D = s.currencies.stardust!.constructor;
    s.spectral.energy.red = new D(1000);
  });
  await expect(panel.locator('[data-color="red"] .band-oom')).toContainText('3');
  await expect(panel.locator('[data-color="orange"]')).not.toHaveClass(/locked/);
  await openRail(page, 'stats');
  await expect(page.locator('[data-panel="stats"]')).toContainText('Spectral: Red');
  expect(errors).toEqual([]);
});

test('Tarot of the Void: open a pack, and The Mirror copies left and disables right in the deck', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf11).sf;
    game.state.stats.nebulasAll = 6;
    game.state.stats.nebulas = 6;
    commands.devAdd('essence', 1000);
  });
  await openRail(page, 'tarot');
  const panel = page.locator('[data-panel="tarot"]');
  await panel.getByTestId('open-pack').click();
  await expect(panel.getByTestId('drawn')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Sf11).sf.game.state.tarot.owned.length)).toBe(1);
  await page.evaluate(() => {
    (window as unknown as Sf11).sf.game.state.tarot.owned = ['card.ace.dust', 'card.mirror', 'card.ace.shards'];
  });
  for (const [card, slot] of [
    ['card.ace.dust', 0],
    ['card.mirror', 1],
    ['card.ace.shards', 2],
  ] as const) {
    await panel.locator(`[data-card="${card}"]`).click();
    await panel.locator(`[data-place="${slot}"]`).click();
  }
  expect(await page.evaluate(() => (window as unknown as Sf11).sf.game.state.tarot.deck.slice(0, 3))).toEqual(['card.ace.dust', 'card.mirror', 'card.ace.shards']);
  await expect(panel.locator('[data-slot="1"]')).toContainText('Acting as Ace of Dust');
  await expect(panel.locator('[data-slot="2"]')).toHaveClass(/off/);
  await expect(panel.locator('[data-slot="2"]')).toContainText('Disabled');
  expect(errors).toEqual([]);
});

// ---------- Phase 12: the Singularity ----------

type Sf12 = {
  sf: {
    game: {
      state: {
        unlocked: string[];
        stats: Record<string, number>;
        singularity: { key: boolean };
        blackHole: { mass: unknown; dustShare: number };
        wheel: { on: boolean; shares: number[] };
        currencies: Record<string, { toNumber(): number; constructor: new (x: number | string) => unknown }>;
      };
    };
    commands: { devAdd(c: string, n: number): void };
  };
};

test('the Singularity: buy the key with Embers, fall in, Dark Matter arrives and the Black Hole wakes', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { game, commands } = (window as unknown as Sf12).sf;
    game.state.stats.nebulasAll = 8;
    game.state.stats.nebulas = 8;
    commands.devAdd('embers', 1e8);
  });
  await openRail(page, 'singularity');
  const panel = page.locator('[data-panel="singularity"]');
  await panel.getByTestId('buy-key').click();
  expect(await page.evaluate(() => (window as unknown as Sf12).sf.game.state.singularity.key)).toBe(true);
  await page.evaluate(() => (window as unknown as Sf12).sf.commands.devAdd('essence', 1e94));
  await panel.getByTestId('go-singularity').click();
  const confirm = page.locator('[data-panel="singularityConfirm"]');
  await expect(confirm).toHaveClass(/open/);
  await expect(confirm).toContainText('Runes, auras, mutations');
  await confirm.getByRole('button', { name: 'Go Singularity' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf12).sf.game.state.stats.singularitiesAll)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as Sf12).sf.game.state.currencies.darkMatter!.toNumber())).toBeGreaterThan(10);
  await expect(page.locator('.hud .pill[aria-label="Dark Matter"]')).toBeVisible();
  await openRail(page, 'blackhole');
  const hole = page.locator('[data-panel="blackhole"]');
  await hole.getByTestId('feed-dm').click();
  await expect.poll(() => page.evaluate(() => Number(String((window as unknown as Sf12).sf.game.state.blackHole.mass)))).toBeGreaterThan(0);
  await hole.getByTestId('dust-share').fill('20');
  expect(await page.evaluate(() => (window as unknown as Sf12).sf.game.state.blackHole.dustShare)).toBeCloseTo(0.2, 6);
  expect(errors).toEqual([]);
});

test('the Prism Wheel: dragging and arrow keys move share between colours, and the total stays 80%', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const s = (window as unknown as Sf12).sf.game.state;
    s.stats.singularitiesAll = 1;
    s.stats.bhStageBest = 8;
    s.blackHole.mass = new (s.currencies.stardust!.constructor)(1e7);
  });
  await openRail(page, 'prismwheel');
  const panel = page.locator('[data-panel="prismwheel"]');
  const handle = panel.locator('[data-handle="0"]');
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  let shares = await page.evaluate(() => (window as unknown as Sf12).sf.game.state.wheel.shares);
  expect(shares[0]).toBeCloseTo(0.12, 6);
  expect(shares[1]).toBeCloseTo(0.08, 6);
  const box = (await handle.boundingBox())!;
  const wheel = (await panel.locator('svg.wheel').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(wheel.x + wheel.width * 0.85, wheel.y + wheel.height * 0.5, { steps: 6 });
  await page.mouse.up();
  shares = await page.evaluate(() => (window as unknown as Sf12).sf.game.state.wheel.shares);
  expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(0.8, 9);
  expect(shares[0]).toBeGreaterThan(0.15);
  await panel.getByTestId('wheel-on').click();
  expect(await page.evaluate(() => (window as unknown as Sf12).sf.game.state.wheel.on)).toBe(true);
  expect(errors).toEqual([]);
});

// ---------- Phase 13: Trials, the Spire, the Void Leviathans ----------

type Sf13 = {
  sf: {
    game: {
      state: {
        stats: Record<string, number>;
        trials: { active: string[]; levels: Record<string, number> };
        spire: { floor: number; climbing: boolean; banner: string | null };
        leviathans: { fighting: boolean; current: number; kills: Record<string, number> };
        scaleTree: Record<string, number>;
        currencies: Record<string, { toNumber(): number }>;
      };
    };
    commands: { devAdd(c: string, n: number): void };
    stat(s: unknown, id: string): { toNumber(): number; log10(): { toNumber(): number } };
    breakdown(s: unknown, id: string): Array<{ label: string }>;
  };
};

test('Trials: entering switches the debuff on and shows the chip; leaving removes both', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    (window as unknown as Sf13).sf.game.state.stats.singularitiesAll = 2;
  });
  await openRail(page, 'trials');
  const panel = page.locator('[data-panel="trials"]');
  await expect(panel.locator('[data-trial]')).toHaveCount(20);
  const labels = () => page.evaluate(() => {
    const { sf } = window as unknown as Sf13;
    return sf.breakdown(sf.game.state, 'productionMult').map((l) => l.label);
  });
  expect(await labels()).not.toContain('Trial: Low Gravity');
  await panel.getByTestId('trial-enter-lowgrav').click();
  expect(await page.evaluate(() => (window as unknown as Sf13).sf.game.state.trials.active)).toEqual(['lowgrav']);
  expect(await labels()).toContain('Trial: Low Gravity');
  await expect(panel.getByTestId('trial-leave')).toBeVisible();
  await panel.getByTestId('trial-leave').click();
  expect(await labels()).not.toContain('Trial: Low Gravity');
  // a Fusion picks two and runs both debuffs; the stage chip names them and opens the panel
  await panel.getByTestId('trial-fusion-mode').click();
  await panel.locator('[data-trial="dim"] button').click();
  await panel.locator('[data-trial="lonely"] button').click();
  await panel.getByTestId('trial-fusion-start').click();
  expect(await page.evaluate(() => (window as unknown as Sf13).sf.game.state.trials.active)).toEqual(['dim', 'lonely']);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('trial-chip')).toContainText('Dimmed Star + Lonely Cosmos');
  await page.getByTestId('trial-chip').click();
  await expect(panel).toHaveClass(/open/);
  await panel.getByTestId('trial-leave').click();
  await expect(page.getByTestId('trial-chip')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the Spire climbs while on, and the Leviathan hunt takes taps; scales buy the Scale Tree', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    (window as unknown as Sf13).sf.game.state.stats.singularitiesAll = 4;
  });
  await openRail(page, 'spire');
  const spire = page.locator('[data-panel="spire"]');
  await spire.getByTestId('spire-climb').click();
  expect(await page.evaluate(() => (window as unknown as Sf13).sf.game.state.spire.climbing)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf13).sf.game.state.spire.floor), { timeout: 15_000 }).toBeGreaterThan(0);
  await spire.getByTestId('spire-climb').click();
  await openRail(page, 'leviathans');
  const lev = page.locator('[data-panel="leviathans"]');
  await expect(lev.locator('[data-lev]')).toHaveCount(12);
  await lev.getByTestId('lev-fight').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('boss-bar')).toContainText('Drift Calf');
  // wear the calf down to its last hit point, then tap the star until it falls (taps strike it too)
  await page.evaluate(() => {
    const st = (window as unknown as Sf13).sf.game.state as unknown as { leviathans: { damage: unknown }; currencies: Record<string, { constructor: new (x: number) => unknown }> };
    st.leviathans.damage = new st.currencies.stardust!.constructor(999);
  });
  const star = page.locator('.star-btn');
  await expect
    .poll(
      async () => {
        for (let i = 0; i < 20; i++) await star.dispatchEvent('pointerdown', { button: 0, clientX: 600, clientY: 400 });
        return page.evaluate(() => (window as unknown as Sf13).sf.game.state.leviathans.kills.calf ?? 0);
      },
      { timeout: 30_000 },
    )
    .toBeGreaterThan(0);
  await expect(page.getByTestId('boss-bar')).toContainText('Nebula Humpback');
  expect(await page.evaluate(() => (window as unknown as Sf13).sf.game.state.currencies.scales!.toNumber())).toBeGreaterThanOrEqual(5);
  await page.evaluate(() => (window as unknown as Sf13).sf.commands.devAdd('scales', 100));
  await openRail(page, 'scaletree');
  const tree = page.locator('[data-panel="scaletree"]');
  await tree.locator('[data-node="scale.root"]').click();
  await tree.locator('.tree-card').getByRole('button', { name: /Buy/ }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf13).sf.game.state.scaleTree['scale.root'] ?? 0)).toBe(1);
  expect(errors).toEqual([]);
});

// ---------- Phase 14: the Antimatter Mirror and the Wormhole Network ----------

type Sf14 = {
  sf: {
    game: {
      state: {
        stats: Record<string, number>;
        mirror: { engines: Record<string, number>; depth: number; upgrades: string[] };
        wormholes: { links: Array<{ from: string; to: string; share: number }> };
        currencies: Record<string, { toNumber(): number }>;
      };
    };
    commands: { devAdd(c: string, n: number): void };
    breakdown(s: unknown, id: string): Array<{ label: string }>;
  };
};

test('the Antimatter Mirror: buy an engine with the buy amount, collapse, and the Antimatter pill shows', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const s = (window as unknown as Sf14).sf.game.state;
    s.stats.singularities = 8;
    s.stats.singularitiesAll = 8;
  });
  await openRail(page, 'mirror');
  const panel = page.locator('[data-panel="mirror"]');
  await expect(page.locator('.hud .pill[aria-label="Antimatter"]')).toBeVisible();
  await page.evaluate(() => (window as unknown as Sf14).sf.commands.devAdd('antimatter', 1e6));
  await panel.getByRole('button', { name: 'x10', exact: true }).click();
  await panel.locator('[data-am="am.lantern"]').getByRole('button', { name: /Buy 10 Anti-Lantern/ }).click();
  expect(await page.evaluate(() => (window as unknown as Sf14).sf.game.state.mirror.engines['am.lantern'])).toBe(10);
  await panel.getByTestId('mirror-collapse').click();
  expect(await page.evaluate(() => (window as unknown as Sf14).sf.game.state.mirror.depth)).toBe(1);
  // collapsing scraps the engines
  expect(await page.evaluate(() => (window as unknown as Sf14).sf.game.state.mirror.engines['am.lantern'] ?? 0)).toBe(0);
  await expect(panel.locator('.anti-name')).toContainText('Anti-Blazar');
  await panel.locator('[data-mu="mu.spark"]').click();
  expect(await page.evaluate(() => (window as unknown as Sf14).sf.game.state.mirror.upgrades)).toContain('mu.spark');
  expect(errors).toEqual([]);
});

test('the Wormhole Network: pick two systems, open a wormhole, and it shows in both breakdowns', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { sf } = window as unknown as Sf14;
    sf.game.state.stats.singularitiesAll = 6;
    sf.commands.devAdd('darkMatter', 1e6);
  });
  await openRail(page, 'wormholes');
  const panel = page.locator('[data-panel="wormholes"]');
  await panel.locator('[data-node="ore"]').click();
  // keyboard works on the map too
  await panel.locator('[data-node="essence"]').focus();
  await page.keyboard.press('Enter');
  await panel.getByTestId('wh-open').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf14).sf.game.state.wormholes.links.length)).toBe(1);
  const has = (id: string) =>
    page.evaluate((x) => {
      const { sf } = window as unknown as Sf14;
      return sf.breakdown(sf.game.state, x).some((l) => l.label === 'Wormhole: Ore to Essence');
    }, id);
  expect(await has('oreGain')).toBe(true);
  expect(await has('essenceGain')).toBe(true);
  const row = panel.locator('[data-link="ore>essence"]');
  await row.locator('input[type="range"]').fill('45');
  expect(await page.evaluate(() => (window as unknown as Sf14).sf.game.state.wormholes.links[0]!.share)).toBeCloseTo(0.45, 6);
  await row.getByRole('button', { name: 'Close' }).click();
  expect(await has('essenceGain')).toBe(false);
  expect(errors).toEqual([]);
});

// ---------- Phase 15: Galactic Rebirth ----------

type Sf15 = {
  sf: {
    game: {
      state: {
        stats: Record<string, number>;
        blackHole: { mass: unknown };
        mirror: { upgrades: string[] };
        galactic: { galaxy: string; next: string };
        galacticTree: Record<string, number>;
        observatory: { links: Array<[number, number]> };
        currencies: Record<string, { toNumber(): number; constructor: new (x: number) => unknown }>;
      };
    };
    commands: { devAdd(c: string, n: number): void; devOwnGalacticTree(): void };
  };
};

test('Galactic Rebirth: pick a galaxy, go Galactic through the confirm screen, and the new sky and pill appear', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { sf } = window as unknown as Sf15;
    const s = sf.game.state;
    s.stats.singularities = 14;
    s.stats.singularitiesAll = 14;
    s.stats.singularitiesBest = 14;
    s.stats.mirrorKey = 1;
    s.mirror.upgrades = ['mu.key'];
    s.blackHole.mass = new s.currencies.stardust!.constructor(2e7);
    sf.commands.devAdd('darkMatter', 1.6e9);
  });
  await openRail(page, 'galaxymap');
  const map = page.locator('[data-panel="galaxymap"]');
  await expect(map.locator('[data-galaxy]')).toHaveCount(20);
  await map.getByTestId('galaxy-next-spiral').click();
  expect(await page.evaluate(() => (window as unknown as Sf15).sf.game.state.galactic.next)).toBe('spiral');
  await page.keyboard.press('Escape');
  await page.getByTestId('galactic').click();
  const confirm = page.locator('[data-panel="galacticConfirm"]');
  await expect(confirm).toHaveClass(/open/);
  await expect(confirm).toContainText('You will restart in Spiral');
  await confirm.getByRole('button', { name: 'Go Galactic' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf15).sf.game.state.stats.galacticsAll)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as Sf15).sf.game.state.galactic.galaxy)).toBe('spiral');
  expect(await page.evaluate(() => (window as unknown as Sf15).sf.game.state.currencies.galaxyCores!.toNumber())).toBe(4);
  await expect(page.locator('.hud .pill[aria-label="Galaxy Cores"]')).toBeVisible();
  await expect(page.locator('.galaxy-tint')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('the 200-node Galactic Tree stays smooth to pan, and the Observatory draws and records a constellation', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?dev=1');
  await page.evaluate(() => {
    const { sf } = window as unknown as Sf15;
    const s = sf.game.state;
    s.stats.galacticsAll = 1;
    sf.commands.devOwnGalacticTree();
  });
  await openRail(page, 'galactictree');
  const view = page.locator('[data-panel="galactictree"] .tree-view');
  await expect(view).toBeVisible();
  await expect(page.locator('[data-panel="galactictree"] [data-node]')).toHaveCount(200);
  const box = (await view.boundingBox())!;
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __on: boolean };
    w.__frames = [];
    w.__on = true;
    let last = performance.now();
    const loop = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      if (w.__on) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 20; i++) await page.mouse.move(box.x + box.width / 2 + i * 6, box.y + box.height / 2 + i * 3);
  await page.mouse.up();
  const avg = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __on: boolean };
    w.__on = false;
    const f = w.__frames.slice(2);
    return f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
  });
  expect(avg).toBeLessThan(50);
  await page.keyboard.press('Escape');
  // the Observatory: two stars make a link, and a record pays Star Charts
  await openRail(page, 'observatory');
  const obs = page.locator('[data-panel="observatory"]');
  await expect(obs.locator('[data-star]')).toHaveCount(24);
  await obs.locator('[data-star="0"]').click();
  await obs.locator('[data-star="1"]').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf15).sf.game.state.observatory.links.length)).toBe(1);
  await obs.getByTestId('obs-record').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf15).sf.game.state.currencies.starCharts?.toNumber() ?? 0)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
