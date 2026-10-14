import { defineConfig } from '@playwright/test';

// PW_CHROMIUM points at an existing Chromium when the bundled one isn't
// installed (cloud sandboxes, CI images). Locally, leave it unset.
const executablePath = process.env.PW_CHROMIUM || undefined;
// PORT matches scripts/serve.mjs, for when something else already holds 4173.
const port = process.env.PORT || 4173;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${port}`, launchOptions: { executablePath } },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: true,
  },
});
