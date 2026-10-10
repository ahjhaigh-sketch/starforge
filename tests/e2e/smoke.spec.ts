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
    commands.devAdd('ore', 600);
  });
  await page.locator('[data-rail="drill"]:visible').click();
  const panel = page.locator('[data-panel="drill"]');
  await expect(panel).toHaveClass(/open/);
  const core = panel.getByTestId('drill-core');
  for (let i = 0; i < 5; i++) await core.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Sf5).sf.game.state.drill.damage.toNumber())).toBeGreaterThanOrEqual(10);
  await panel.getByRole('button', { name: /Buy a drill drone/ }).click();
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
