/** The framework's own wiring — no app needed. A project drops tests/framework once its cases cover it. */
import { expect, test } from "../../src/fixtures.js";
import { loadSettings } from "../../src/config/settings.js";
import { resolvePlaceholders } from "../../src/data/placeholders.js";

test("a test starts with a fresh context", async ({ page }) => {
  expect(await page.context().cookies()).toEqual([]);
  await page.context().addCookies([{ name: "left", value: "behind", url: "https://example.org" }]);
});

test("another test starts with a fresh context too", async ({ page }) => {
  expect(await page.context().cookies(), "no cookie of the test before").toEqual([]);
});

test("locators wait for what the action produces", async ({ page }) => {
  await page.setContent(`<button id="next">Next</button><div id="step">Define</div>
    <script>document.getElementById('next').onclick = () =>
      setTimeout(() => document.getElementById('step').textContent = 'Specifications', 500)</script>`);

  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.locator("#step")).toHaveText("Specifications");
});

test("settings layers and placeholders", () => {
  const fromEnv = loadSettings({ BASE_URL: "https://stage.example/", HEADLESS: "false" });

  expect.soft(fromEnv.base.url).toBe("https://stage.example/");
  expect.soft(fromEnv.browser.headless).toBe(false);
  expect.soft(loadSettings({ CI: "true" }).timeouts.action, "the CI layer").toBe(20);
  expect.soft(resolvePlaceholders("{{text:6}}")).toMatch(/^[a-z]{6}$/);
  expect.soft(resolvePlaceholders("{{today}}")).toBe(new Date().toISOString().slice(0, 10));
});
