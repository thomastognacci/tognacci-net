import { expect, test } from '@playwright/test';

test('renders the identity and real contact destinations without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Thomas Tognacci',
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
  await expect(page.locator('.header-social-link')).toHaveCount(3);
  await expect(page.locator('.monogram i')).toHaveCount(0);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    '/favicon.svg',
  );
  await expect(
    page.locator('.header-social-link[href^="mailto:"]'),
  ).toBeVisible();
  await expect(page.locator('.text-link')).toHaveText('thomas@tognacci.net');
  await expect(page.locator('.hello-link')).toHaveCount(0);
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
    if (width === 1440)
      expect(
        await page
          .locator('.hero')
          .evaluate((element) => getComputedStyle(element).minHeight),
      ).toBe('0px');
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

test('icons can be thrown, remain in the document and reset without opening links', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/scene-ready/);
  const icon = page.locator('[data-object="linkedin"]');
  await page.evaluate(() => {
    Object.assign(window, { linkActivations: 0 });
    document.addEventListener('click', (event) => {
      if ((event.target as Element).closest('[data-object]')) {
        if (!event.defaultPrevented)
          (window as typeof window & { linkActivations: number })
            .linkActivations++;
        event.preventDefault();
      }
    });
  });
  const home = (await icon.boundingBox())!;
  await page.mouse.move(home.x + home.width / 2, home.y + home.height / 2);
  await page.mouse.down();
  await page.mouse.move(1100, 220, { steps: 12 });
  // Keep the final move and release together so slow CI rendering cannot
  // make the throw stale and intentionally zero its velocity.
  await icon.evaluate((element) => {
    for (const type of ['pointermove', 'pointerup'])
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons: type === 'pointermove' ? 1 : 0,
          clientX: 1110,
          clientY: 210,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
  });
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Reset positions' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { linkActivations: number }).linkActivations,
    ),
  ).toBe(0);
  const release = (await icon.boundingBox())!;
  await page.mouse.move(640, 890);
  await expect
    .poll(async () => {
      const current = (await icon.boundingBox())!;
      return Math.hypot(current.x - release.x, current.y - release.y);
    })
    .toBeGreaterThan(4);
  // The link follows the same projected body hull used by wall collisions.
  expect(
    await icon.evaluate(
      (element) =>
        new Promise<boolean>((resolve) => {
          const end = performance.now() + 500;
          const sample = () => {
            const rect = element.getBoundingClientRect();
            if (
              rect.left < -1 ||
              rect.top + scrollY < -1 ||
              rect.right > document.documentElement.clientWidth + 1 ||
              rect.bottom + scrollY > document.documentElement.scrollHeight + 1
            )
              return resolve(false);
            if (performance.now() >= end) return resolve(true);
            requestAnimationFrame(sample);
          };
          sample();
        }),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Pause motion' }).click();
  const paused = (await icon.boundingBox())!;
  await page.mouse.move(640, 890);
  await expect
    .poll(async () => (await icon.boundingBox())!.x)
    .toBeCloseTo(paused.x, 1);
  await page.setViewportSize({ width: 375, height: 600 });
  await expect
    .poll(() =>
      icon.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.x >= -1 &&
          rect.y + scrollY >= -1 &&
          rect.right <= 376 &&
          rect.bottom + scrollY <= document.documentElement.scrollHeight + 1
        );
      }),
    )
    .toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Reset positions' }).click();
  await expect(
    page.getByRole('button', { name: 'Reset positions' }),
  ).toBeHidden();
  await expect
    .poll(async () => Math.abs((await icon.boundingBox())!.x - home.x))
    .toBeLessThan(15);
  await icon.click();
  await icon.press('Enter');
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { linkActivations: number }).linkActivations,
    ),
  ).toBe(2);
});

test('dragged icons push their neighbours and transfer momentum', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/scene-ready/);
  const source = page.locator('[data-object="linkedin"]');
  const target = page.locator('[data-object="github"]');
  const start = (await source.boundingBox())!;
  const targetHome = (await target.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    targetHome.x + targetHome.width / 2 - 20,
    targetHome.y + targetHome.height / 2,
    { steps: 18 },
  );
  await expect
    .poll(async () => (await target.boundingBox())!.x - targetHome.x)
    .toBeGreaterThan(35);
  await page.mouse.up();
  await page.mouse.move(640, 890);
  const afterContact = (await target.boundingBox())!;
  await expect
    .poll(async () =>
      Math.abs((await target.boundingBox())!.x - afterContact.x),
    )
    .toBeGreaterThan(8);
  await page.getByRole('button', { name: 'Reset positions' }).click();
  await expect
    .poll(async () => Math.abs((await target.boundingBox())!.x - targetHome.x))
    .toBeLessThan(15);
});

test('icons stay above controls and stay put after a motionless release', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/scene-ready/);
  const icon = page.locator('[data-object="linkedin"]');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  const control = (await page.locator('#motion-toggle').boundingBox())!;
  const source = (await icon.boundingBox())!;
  await page.mouse.move(
    source.x + source.width / 2,
    source.y + source.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    control.x + control.width / 2,
    control.y + control.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
  expect(
    await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest('[data-object]')
          ?.getAttribute('data-object'),
      { x: control.x + control.width / 2, y: control.y + control.height / 2 },
    ),
  ).toBe('linkedin');
  // Use the keyboard because the icon intentionally covers the button.
  await page.locator('#motion-toggle').focus();
  await page.locator('#motion-toggle').press('Enter');
  expect(
    await icon.evaluate(
      (element) =>
        new Promise<boolean>((resolve) => {
          const initial = element.getBoundingClientRect();
          const x = initial.x + initial.width / 2;
          const y = initial.y + initial.height / 2;
          const end = performance.now() + 800;
          function sample() {
            const rect = element.getBoundingClientRect();
            if (
              Math.hypot(
                rect.x + rect.width / 2 - x,
                rect.y + rect.height / 2 - y,
              ) > 1
            )
              return resolve(false);
            if (performance.now() > end) return resolve(true);
            requestAnimationFrame(sample);
          }
          sample();
        }),
    ),
  ).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Reset positions' }),
  ).toBeVisible();
});

test('hover does not stop a thrown icon', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/scene-ready/);
  const icon = page.locator('[data-object="linkedin"]');
  const start = (await icon.boundingBox())!;
  // Grab below centre so this path also exercises gesture-derived spin.
  await page.mouse.move(
    start.x + start.width / 2,
    start.y + start.height * 0.7,
  );
  await page.mouse.down();
  await page.mouse.move(850, 200, { steps: 10 });
  // Dispatch the final move and release in one browser task so a slow software
  // renderer cannot turn the throw into an intentionally motionless release.
  await icon.evaluate((element) => {
    for (const type of ['pointermove', 'pointerup'])
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons: type === 'pointermove' ? 1 : 0,
          clientX: 860,
          clientY: 200,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
  });
  await page.mouse.up();
  const released = (await icon.boundingBox())!;
  await page.mouse.move(
    released.x + released.width / 2,
    released.y + released.height / 2,
  );
  const hovered = (await icon.boundingBox())!;
  await expect
    .poll(async () => {
      const current = (await icon.boundingBox())!;
      return Math.hypot(
        current.x + current.width / 2 - (hovered.x + hovered.width / 2),
        current.y + current.height / 2 - (hovered.y + hovered.height / 2),
      );
    })
    .toBeGreaterThan(8);
});

test('displaced icons remain anchored to the document during scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/scene-ready/);
  await page.getByRole('button', { name: 'Pause motion' }).click();
  const icon = page.locator('[data-object="linkedin"]');
  const start = (await icon.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(300, 180, { steps: 10 });
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: 'Reset positions' }),
  ).toBeVisible();
  const documentY = await icon.evaluate(
    (element) => element.getBoundingClientRect().y + scrollY,
  );
  await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await expect
    .poll(() =>
      icon.evaluate((element) => element.getBoundingClientRect().y + scrollY),
    )
    .toBeCloseTo(documentY, 0);
  expect((await icon.boundingBox())!.y).toBeLessThan(documentY - 200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect
    .poll(() => icon.evaluate((element) => element.getBoundingClientRect().y))
    .toBeCloseTo(documentY, 0);
});

test('the bottom wall is the stable bottom of the full document', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/scene-ready/);
  await page.getByRole('button', { name: 'Pause motion' }).click();
  const icon = page.locator('[data-object="linkedin"]');
  const start = (await icon.boundingBox())!;
  const initialHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  const maxScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  expect(maxScroll).toBeGreaterThan(0);

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.evaluate(() =>
    window.scrollTo({ top: 10_000, behavior: 'instant' }),
  );
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeCloseTo(maxScroll, 0);
  await icon.evaluate((element) => {
    for (const type of ['pointermove', 'pointerup'])
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons: type === 'pointermove' ? 1 : 0,
          clientX: 640,
          clientY: 10_000,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
  });
  await page.mouse.up();
  // Finish with an in-viewport drag so every browser delivers the wall contact;
  // coordinates outside the viewport may be clipped by the automation driver.
  const nearBottom = (await icon.boundingBox())!;
  await page.mouse.move(
    nearBottom.x + nearBottom.width / 2,
    nearBottom.y + nearBottom.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(640, 719, { steps: 6 });
  await page.mouse.up();

  await expect
    .poll(() =>
      icon.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return Math.abs(
          rect.bottom + scrollY - document.documentElement.scrollHeight,
        );
      }),
    )
    .toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    initialHeight,
  );
});

test.describe('mobile touch interactions', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  test('mobile renders the interactive scene with a low-cost canvas', async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/scene-ready/);
    await expect(page.locator('html')).toHaveClass(/scene-mobile/);
    await expect(page.locator('html')).not.toHaveClass(/mobile-static/);
    const canvas = page.locator('#scene canvas');
    await expect(canvas).toHaveCount(1);
    const rendering = await canvas.evaluate((element: HTMLCanvasElement) => {
      const context =
        element.getContext('webgl2') ?? element.getContext('webgl');
      const scissor = context?.getParameter(context.SCISSOR_BOX) as
        Int32Array | undefined;
      return {
        width: element.width,
        height: element.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        pixelRatio: devicePixelRatio,
        documentHeight: document.documentElement.scrollHeight,
        contentHeight: Math.ceil(
          Math.max(
            document.querySelector('main')!.getBoundingClientRect().bottom,
            document.querySelector('.universe')!.getBoundingClientRect().bottom,
          ) + scrollY,
        ),
        cssHeight: element.clientHeight,
        scissor: scissor ? Array.from(scissor) : null,
        antialias: context?.getContextAttributes()?.antialias,
      };
    });
    expect(rendering.width).toBeGreaterThanOrEqual(
      rendering.viewportWidth * 2.95,
    );
    expect(rendering.width).toBeLessThanOrEqual(rendering.viewportWidth * 3);
    expect(rendering.height).toBeLessThanOrEqual(rendering.documentHeight * 3);
    expect(rendering.documentHeight).toBeLessThanOrEqual(
      rendering.contentHeight + 1,
    );
    expect(rendering.cssHeight).toBe(rendering.documentHeight);
    expect(rendering.scissor).not.toBeNull();
    expect(rendering.scissor![2]).toBeLessThanOrEqual(rendering.width);
    expect(rendering.scissor![3]).toBeLessThanOrEqual(rendering.height);
    expect(rendering.scissor![3]).toBeGreaterThanOrEqual(
      (rendering.viewportHeight + 96) * rendering.pixelRatio,
    );
    const shiftedViewport = await page.evaluate(() => {
      if (!visualViewport) return null;
      const pageTop = 120;
      Object.defineProperties(visualViewport, {
        pageTop: { configurable: true, value: pageTop },
        height: { configurable: true, value: innerHeight },
      });
      visualViewport.dispatchEvent(new Event('resize'));
      return {
        minimumScissorHeight: (pageTop + innerHeight + 96) * devicePixelRatio,
      };
    });
    expect(shiftedViewport).not.toBeNull();
    await expect
      .poll(() =>
        canvas.evaluate((element: HTMLCanvasElement) => {
          const context =
            element.getContext('webgl2') ?? element.getContext('webgl');
          return (
            context?.getParameter(context.SCISSOR_BOX) as Int32Array | undefined
          )?.[3];
        }),
      )
      .toBeGreaterThanOrEqual(shiftedViewport!.minimumScissorHeight);
    expect(rendering.antialias).toBe(true);
    expect(requests.filter((url) => /\/icons\/.+\.png$/.test(url))).toEqual([]);
    await expect(page.locator('#motion-toggle')).toBeVisible();
    await expect(page.locator('#reset-positions')).toBeHidden();
    const mobilePolish = await page.evaluate(() => ({
      heroBottom: document.querySelector('.hero')!.getBoundingClientRect()
        .bottom,
      viewportHeight: innerHeight,
      firstNameWeight: getComputedStyle(document.querySelector('h1')!)
        .fontWeight,
      lastNameWeight: getComputedStyle(document.querySelector('.last-name')!)
        .fontWeight,
      sparkSelection: getComputedStyle(document.querySelector('.spark')!)
        .userSelect,
    }));
    expect(mobilePolish.heroBottom).toBeCloseTo(mobilePolish.viewportHeight, 0);
    expect(Number(mobilePolish.firstNameWeight)).toBeLessThan(
      Number(mobilePolish.lastNameWeight),
    );
    expect(mobilePolish.sparkSelection).toBe('none');
  });

  test('mobile loads the static icons only when WebGL is unavailable', async ({
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
    await expect(page.locator('html')).toHaveClass(/mobile-static/);
    await expect(page.locator('html')).not.toHaveClass(/scene-ready/);
    await expect(page.locator('#scene canvas')).toHaveCount(0);
    await expect
      .poll(() =>
        page
          .locator('.mobile-static-object img')
          .evaluateAll((images) =>
            images.every(
              (image) => (image as HTMLImageElement).naturalWidth > 1,
            ),
          ),
      )
      .toBe(true);
    await expect(page.locator('#motion-toggle')).toBeHidden();
  });

  test('a mobile tap opens the link once without moving it', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const link = page.locator('[data-object="github"]');
    const before = await link.boundingBox();
    const popupPromise = page.waitForEvent('popup');
    await link.tap();
    const popup = await popupPromise;
    await popup.close();
    await expect.poll(async () => link.boundingBox()).toEqual(before);
  });

  test('a mobile drag gesture moves an icon without scrolling or opening the link', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const icon = page.locator('[data-object="linkedin"]');
    const start = (await icon.boundingBox())!;
    const initialDocumentPosition = await icon.evaluate((element) => ({
      x: element.getBoundingClientRect().x,
      y: element.getBoundingClientRect().y + scrollY,
    }));
    const initialScroll = await page.evaluate(() => scrollY);
    const popups: unknown[] = [];
    page.on('popup', (popup) => popups.push(popup));
    const x = start.x + start.width / 2;
    const y = start.y + start.height / 2;
    if (browserName === 'chromium') {
      // Playwright exposes native touch swipes only through Chromium's CDP.
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y - step * 15 }],
        });
      }
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    } else {
      // WebKit uses trusted pointer input; the preceding test covers touch taps.
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let step = 1; step <= 8; step++) {
        await page.mouse.move(x, y - step * 15);
      }
      await page.mouse.up();
    }
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(initialScroll);
    expect(popups).toHaveLength(0);
    await expect
      .poll(() =>
        icon.evaluate((element) => element.getBoundingClientRect().y + scrollY),
      )
      .toBeLessThan(initialDocumentPosition.y - 50);
    await expect(page.locator('#reset-positions')).toBeVisible();
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 375, height: 667 },
  ]) {
    test(`native scrolling keeps icon document positions at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('#motion-toggle')).toBeVisible();
      expect(
        await page
          .locator('#motion-toggle')
          .evaluate(
            (element) => getComputedStyle(element.parentElement!).position,
          ),
      ).toBe('relative');
      const positions = await page
        .locator('[data-object]')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y + scrollY };
          }),
        );
      await page.evaluate(() =>
        window.scrollTo({ top: 250, behavior: 'instant' }),
      );
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(100);
      await expect
        .poll(() =>
          page.locator('[data-object]').evaluateAll(
            (elements, expected) =>
              elements.length !== expected.length
                ? Infinity
                : Math.max(
                    ...elements.map((element, index) => {
                      const target = expected[index];
                      const rect = element.getBoundingClientRect();
                      return Math.max(
                        Math.abs(rect.x - target.x),
                        Math.abs(rect.y + scrollY - target.y),
                      );
                    }),
                  ),
            positions,
          ),
        )
        .toBeLessThan(0.1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
});
