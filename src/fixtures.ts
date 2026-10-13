/**
 * The project's fixtures — `import { test, expect } from "../src/fixtures.js"` in every spec (an
 * area's fixtures file extends this one). Playwright Test gives `page` (a fresh context per test),
 * `request`; this adds:
 * - `user` (option): the role whose session cookies the context gets before the first page — null =
 *   logged out (login-flow tests, a protected page's negative). ONBOARD: the default role once the
 *   login (src/auth/session.ts) works; null until then.
 * - `api`: the app's routes as the default role, a session apart from the browser's.
 * - `switchVariant` (option) + an auto fixture: an environment-wide switch set for the test and
 *   restored after; tests that use it carry `@switch` and run in the serial project. ONBOARD: how
 *   this app reads and sets a switch — or delete it when the app has none.
 * ONBOARD: the app's data and texts as fixtures; API preconditions that clean up after `use`. Fixtures
 * set up in the order of the test's arguments: a precondition the page must load comes first.
 */
import { test as base, expect } from "@playwright/test";
import { ApiClient } from "./api/ApiClient.js";
import { sessionFor } from "./auth/session.js";
import { settings, type Settings } from "./config/settings.js";
import { loadUser, type Role } from "./data/users.js";

type Options = {
  user: Role | null;
  switchVariant: boolean | undefined;
};

type Fixtures = {
  settings: Settings;
  api: ApiClient;
  switchState: void;
};

const DEFAULT_ROLE: Role = "admin"; // ONBOARD: the role `api` and most tests use

export const test = base.extend<Options & Fixtures>({
  user: [null, { option: true }], // ONBOARD: DEFAULT_ROLE once the login works
  switchVariant: [undefined, { option: true }],

  // eslint-disable-next-line no-empty-pattern
  settings: async ({}, use) => {
    await use(settings);
  },

  context: async ({ context, user }, use) => {
    if (user) {
      const session = await sessionFor(loadUser(user), "browser");
      await context.addCookies(
        Object.entries(session.cookies).map(([name, value]) => ({
          name,
          value,
          url: settings.base.url, // host-only, as apps set session cookies
          httpOnly: true,
          secure: settings.base.url.startsWith("https"),
          sameSite: "Lax" as const,
        })),
      );
    }
    await use(context);
  },

  // eslint-disable-next-line no-empty-pattern
  api: async ({}, use) => {
    const api = await ApiClient.as(loadUser(DEFAULT_ROLE));
    await use(api);
    await api.dispose();
  },

  // auto, but lazy: it builds nothing unless the test set `switchVariant` — an auto fixture that
  // depended on `api` or `page` would log in or open a browser for every test
  switchState: [
    async ({ switchVariant }, use) => {
      if (switchVariant === undefined) return use();
      const before = await readSwitch();
      try {
        await setSwitch(switchVariant);
        await use();
      } finally {
        await setSwitch(before);
      }
    },
    { auto: true },
  ],
});

// ONBOARD: the app's switch (a settings route through ApiClient); a project with several switches
// keeps them in src/api/config/ and names the switch in the option
function readSwitch(): Promise<boolean> {
  return Promise.reject(new Error("ONBOARD: read the environment switch"));
}
function setSwitch(on: boolean): Promise<void> {
  return Promise.reject(new Error(`ONBOARD: set the environment switch to ${String(on)}`));
}

export { expect };
