/**
 * Pages: the test talks to a page, never to its locators. Locators are created once in the
 * constructor (lazy, resolved on every use); one method per user action — `return this` when it
 * stays, the next page (loaded) when it leads there. Playwright waits before every action; a
 * state is awaited with `expect(...)`. Locator order: getByTestId, getByRole + name, getByLabel,
 * getByPlaceholder, getByText (only for the text that is the thing), CSS last.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { settings } from "../config/settings.js";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export abstract class BasePage {
  /**
   * the page's URL relative to base.url (no leading slash). A URL with an id: declare
   * `protected readonly path: string` and set it in the constructor — a getter clashes with the field
   * Playwright's TS transform emits ("Cannot set property path … which has only a getter", lab11 2026-10-13)
   */
  protected abstract readonly path: string;

  constructor(protected readonly page: Page) {}

  url(): string {
    return settings.base.url + this.path;
  }

  /** what shows once the page is usable — override when the URL isn't enough */
  protected ready(): Locator | undefined {
    return undefined;
  }

  async open(): Promise<this> {
    await this.page.goto(this.url());
    return this.waitLoaded();
  }

  async waitLoaded(): Promise<this> {
    await expect(this.page).toHaveURL(new RegExp(`^${escape(this.url())}`));
    const ready = this.ready();
    if (ready) await expect(ready).toBeVisible();
    return this;
  }
}
