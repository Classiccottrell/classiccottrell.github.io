import { defineConfig } from '@playwright/test';

// PW_CHROMIUM points at an existing Chromium when the bundled one isn't
// installed (cloud sandboxes, CI images). Locally, leave it unset.
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4173', launchOptions: { executablePath } },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: true,
  },
});
