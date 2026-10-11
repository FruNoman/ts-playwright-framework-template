/**
 * Example pages — Selenium's public test form (base.url in resources/env/dev.json). Template repo
 * only: onboarding deletes tests/example/ and resources/data/web-form-data.json.
 */
import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../../src/pages/BasePage.js";

export class SubmittedPage extends BasePage {
  protected readonly path = "submitted-form.html";
  private readonly messageText: Locator;

  constructor(page: Page) {
    super(page);
    this.messageText = page.locator("#message");
  }

  protected override ready(): Locator {
    return this.messageText;
  }

  async message(): Promise<string> {
    return (await this.messageText.innerText()).trim();
  }
}

export class WebFormPage extends BasePage {
  protected readonly path = "web-form.html";
  private readonly text: Locator;
  private readonly options: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.text = page.locator("[name=my-text]");
    this.options = page.locator("[name=my-select]");
    this.submitButton = page.getByRole("button", { name: "Submit" });
  }

  protected override ready(): Locator {
    return this.submitButton;
  }

  async typeText(value: string): Promise<this> {
    await this.text.fill(value);
    return this;
  }

  async chooseOption(label: string): Promise<this> {
    await this.options.selectOption({ label });
    return this;
  }

  async typedText(): Promise<string> {
    return this.text.inputValue();
  }

  async optionValue(): Promise<string> {
    return this.options.inputValue();
  }

  async submit(): Promise<SubmittedPage> {
    await this.submitButton.click();
    return new SubmittedPage(this.page).waitLoaded();
  }
}
