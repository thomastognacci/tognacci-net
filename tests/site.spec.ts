import { expect, test } from '@playwright/test';

test('renders the identity and real contact destinations without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Thomas Tognacci✳',
  );
  await expect(page.locator('[data-object="email"]')).toHaveAttribute(
    'href',
    'mailto:thomas@tognacci.net',
  );
  await expect(page.locator('[data-object="linkedin"]')).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/thomas-tognacci',
  );
  await expect(page.locator('[data-object="github"]')).toHaveAttribute(
    'href',
    'https://github.com/thomastognacci',
  );
  await expect(page.locator('.fallback-object').first()).toBeVisible();
  await page.getByRole('link', { name: 'About me', exact: true }).click();
  await expect(page).toHaveURL(/#about$/);
  await context.close();
});

test('motion control persists and respects the system preference', async ({
  page,
}) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Pause motion' });
  await button.click();
  await expect(
    page.getByRole('button', { name: 'Resume motion' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Resume motion' }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(
    page.getByRole('button', { name: 'Reduced motion' }),
  ).toBeDisabled();
  await expect(page.locator('html')).toHaveClass(/motion-paused/);
});

for (const width of [375, 768, 1440]) {
  test(`layout and 3D enhancement at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/scene-ready/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const links = page.locator('[data-object]');
    for (const link of await links.all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.width).toBeGreaterThan(44);
      await link.focus();
      await expect(link).toBeFocused();
    }
    await page.screenshot({
      path: `test-results/site-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test('keeps usable fallback links when WebGL is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith('webgl')) return null;
      return Reflect.apply(getContext, this, [type, ...args]);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Pause motion' }),
  ).toBeVisible();
  await expect(page.locator('.fallback-object').first()).toBeVisible();
  await expect(page.locator('[data-object="email"]')).toHaveAttribute(
    'href',
    'mailto:thomas@tognacci.net',
  );
});

test('uses only one animation loop and pauses it', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame.bind(window);
    const pending = new Set<number>();
    Object.assign(window, { framePeak: 0 });
    window.requestAnimationFrame = (callback) => {
      const id = original((time) => {
        pending.delete(id);
        callback(time);
      });
      pending.add(id);
      const state = window as typeof window & { framePeak: number };
      state.framePeak = Math.max(state.framePeak, pending.size);
      return id;
    };
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/scene-ready/);
  await page.getByRole('button', { name: 'Pause motion' }).click();
  expect(
    await page.evaluate(
      () => (window as typeof window & { framePeak: number }).framePeak,
    ),
  ).toBe(1);
});

test('stars follow the pointer and stop when motion is paused or reduced', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const stars = page.locator('.starfield');
  await expect(
    page.getByRole('button', { name: 'Pause motion' }),
  ).toBeVisible();
  await page.mouse.move(1100, 250);
  await expect
    .poll(() =>
      stars.evaluate((element) =>
        parseFloat(getComputedStyle(element).translate),
      ),
    )
    .toBeGreaterThan(3);
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await page.mouse.move(100, 100);
  await expect
    .poll(() =>
      stars.evaluate((element) => getComputedStyle(element).translate),
    )
    .toBe('0px');
  await page.getByRole('button', { name: 'Resume motion' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(1200, 700);
  await expect
    .poll(() =>
      stars.evaluate((element) => getComputedStyle(element).translate),
    )
    .toBe('none');
});
