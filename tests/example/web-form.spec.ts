/** Example tests on Selenium's public test form — pages over locators, data from JSON, soft checks. */
import { expect, test } from "./fixtures.js";

test("inputs keep what is typed", async ({ webFormPage, webFormData }) => {
  await webFormPage.typeText(webFormData.text);
  await webFormPage.chooseOption(webFormData.option);

  expect.soft(await webFormPage.typedText(), "typed text").toBe(webFormData.text);
  expect.soft(await webFormPage.optionValue(), "the option's value").toBe(webFormData.optionValue);
});

test("submit", async ({ webFormPage, webFormData }) => {
  await webFormPage.typeText(webFormData.text);
  const submittedPage = await webFormPage.submit();

  expect(await submittedPage.message(), "the confirmation page's message").toBe(
    webFormData.message,
  );
});
