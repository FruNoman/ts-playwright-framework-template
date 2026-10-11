/**
 * Playwright Test — the runner is the framework here: parallel workers, a fresh context per test,
 * traces/screenshots of failures, reporters. Values from the layered settings (src/config).
 */
import { defineConfig, devices } from "@playwright/test";
import { settings } from "./src/config/settings.js";

const [width, height] = settings.browser.viewport;
const deviceOf = {
  chromium: "Desktop Chrome",
  firefox: "Desktop Firefox",
  webkit: "Desktop Safari",
};

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  workers: process.env.TESTS_THREADS ? Number(process.env.TESTS_THREADS) : 4,
  timeout: 300_000, // a hung test fails alone
  expect: { timeout: settings.timeouts.action * 1000 },
  outputDir: "build/test-results/artifacts", // per failed test: trace.zip, screenshot, error-context
  reporter: [
    ["list"],
    ["html", { outputFolder: "build/reports/html", open: "never" }],
    ["junit", { outputFile: "build/test-results/junit.xml" }],
  ],
  use: {
    baseURL: settings.base.url,
    headless: settings.browser.headless,
    viewport: { width, height },
    actionTimeout: settings.timeouts.action * 1000,
    navigationTimeout: settings.timeouts.navigation * 1000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // runner: server → a `playwright run-server` (docker-compose.playwright.yml, same version)
    connectOptions: settings.runner === "server" ? { wsEndpoint: settings.server.url } : undefined,
  },
  projects: [
    {
      name: settings.browser.name,
      use: { ...devices[deviceOf[settings.browser.name]], viewport: { width, height } },
    },
  ],
});
