import process from 'node:process';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4325', browserName: 'chromium' },
  webServer: {
    command: 'npm run preview -- --port 4325 --ignore-lock',
    // Keep Astro in the foreground so Playwright owns the server lifecycle.
    env: { ASTRO_PREVIEW_BACKGROUND: '1' },
    url: 'http://127.0.0.1:4325',
    reuseExistingServer: !process.env.CI,
  },
});
