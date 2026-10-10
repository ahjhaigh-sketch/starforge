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

test('panels pop open one at a time and close with Esc', async ({ page }) => {
  const errors = watchErrors(page);
  await page.getByRole('button', { name: 'Open a panel' }).click();
  const hello = page.locator('[data-panel="hello"]');
  await expect(hello).toHaveClass(/open/);
  await expect(page.locator('.scrim')).toHaveClass(/open/);
  // opening settings closes hello: only one panel at a time
  await page.evaluate(() => (document.querySelector('[aria-label="Open settings"]') as HTMLButtonElement).click());
  await expect(page.locator('[data-panel="settings"]')).toHaveClass(/open/);
  await expect(hello).not.toHaveClass(/open/);
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
  await page.getByRole('button', { name: 'Open settings' }).click();
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
