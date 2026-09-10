import process from 'node:process';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4325' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    {
      name: 'webkit-mobile',
      use: { browserName: 'webkit' },
      grep: /mobile touch interactions/,
      grepInvert: /native touch swipe starting on an icon/,
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4325 --ignore-lock',
    // Keep Astro in the foreground so Playwright owns the server lifecycle.
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
    url: 'http://127.0.0.1:4325',
    reuseExistingServer: !process.env.CI,
  },
});
