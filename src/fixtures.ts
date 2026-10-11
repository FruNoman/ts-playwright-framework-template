/**
 * The project's fixtures — `import { test, expect } from "../src/fixtures.js"` in every spec.
 * Playwright Test gives `page` (a fresh context per test), `request`; this adds the settings and
 * the entry pages. ONBOARD: the login (`page` logged in before the test — login-strategies), the
 * app's data and texts as fixtures, API preconditions as fixtures with cleanup after `use`.
 */
import { test as base, expect } from "@playwright/test";
import { settings, type Settings } from "./config/settings.js";

type Fixtures = {
  settings: Settings;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  settings: async ({}, use) => {
    await use(settings);
  },
});

export { expect };
