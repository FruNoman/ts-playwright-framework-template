import { z } from "zod";
import { loadData } from "../../src/data/loader.js";
import { test as base } from "../../src/fixtures.js";
import { WebFormPage } from "./pages.js";

export const WebFormData = z.object({
  text: z.string(),
  option: z.string(),
  optionValue: z.string(),
  message: z.string(),
});
export type WebFormData = z.infer<typeof WebFormData>;

export const test = base.extend<{ webFormPage: WebFormPage; webFormData: WebFormData }>({
  webFormPage: async ({ page }, use) => {
    await use(await new WebFormPage(page).open());
  },
  // eslint-disable-next-line no-empty-pattern
  webFormData: async ({}, use) => {
    await use(loadData(WebFormData.passthrough(), "web-form-data.json"));
  },
});
export { expect } from "../../src/fixtures.js";
