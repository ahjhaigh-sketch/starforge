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
  await expect(page.locator('.toast').first()).toContainText('Red Dwarf');
  await expect(page.locator('[data-rail="belt"]').first()).toHaveClass(/soon/);
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
