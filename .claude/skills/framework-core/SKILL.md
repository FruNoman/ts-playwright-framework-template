---
name: framework-core
description: The rules of this TypeScript + Playwright Test framework core (DRAFT — made real on lab12) — Playwright Test as the runner (workers, a fresh context per test, traces on failure, reporters), fixtures from src/fixtures.ts, pages over locators created in the constructor and returned by the actions that lead to them, expect() for every wait, data from JSON validated by zod, settings in layers (JSON, env file, env vars). Use whenever writing or changing pages, fixtures, tests, test data or config.
---

# Framework core — the rules (ts-playwright, draft)

Playwright Test is the framework: its runner, fixtures, `expect`, traces and reporters. The
invariants come from `qa-core` (`qa-core:test-rules`), the workflow from `qa-core` + `qa-ts` (its
skills' Playwright reference), both enabled in `.claude/settings.json`. ⚠ A basic skeleton: lab12
fills in what a real app needs (login, API, cleanup, texts) and records it here.

## Tests and fixtures

- Every spec imports `test` and `expect` from `src/fixtures.ts` (or an area's fixtures file that
  extends it) — never from `@playwright/test` directly, so the project's fixtures are always there.
- A test takes its entry page and data as fixtures (`{ webFormPage, webFormData }`); every other
  page is a local returned by the action that leads to it.
- Preconditions through the API: a fixture creates, `use`s, deletes after — also when the test
  fails (ONBOARD: the app's API via `request` or a client in `src/api/`).
- Soft checks: `expect.soft(value, "what").toBe(...)` per expectation; a hard `expect` for a
  precondition. Known bugs: `test.fail(true, "<the finding>")` — runs every time, a fix turns it
  red.
- Test names mirror the TMS: `test("C123 cancel an order", …)` / `describe` per suite; files per
  leaf suite (`tests/<suite>/<leaf>.spec.ts`).

## Pages

`BasePage(page)`: `path`, `ready()`, `open()`, `waitLoaded()`; locators created in the constructor
(private readonly), one async method per user action — `return this` or the next page,
`waitLoaded()`; reads return values or typed records. Locator order: `getByTestId`, `getByRole` +
name, `getByLabel`, `getByPlaceholder`, `getByText`, CSS last; strict mode — two matches fail.

## Waits

Playwright waits before every action; a state with `expect(...)` (it retries). No
`waitForTimeout`. **Every Playwright call is awaited** — eslint's `no-floating-promises` is an
error.

## Data, settings

- `resources/data/<name>.json` variants, `loadData(Schema, "<file>", "<variant>")` in a fixture —
  zod validates; placeholders `{{uniqueTimestamp}}`, `{{inDays:N}}` (ISO), `{{text:N}}`…
- Settings: `config/application.json` → `application-ci.json` (CI=true) → `resources/env/<env>.json`
  → env vars (`TEST_ENV`, `BASE_URL`, `RUNNER`, `BROWSER`, `HEADLESS`, `PLAYWRIGHT_SERVER_URL`,
  `TIMEOUT`, `TESTS_THREADS`).
- Runs: `npx playwright test` (local browsers: `npm run browsers`), `RUNNER=server` against
  `docker-compose.playwright.yml`; CI exactly: `docker compose -f docker-compose.playwright.yml -f
  docker-compose.ci.yml up --build --abort-on-container-exit --exit-code-from tests`.
- Evidence: `build/test-results/artifacts/<test>/` (trace.zip, screenshot, error-context.md),
  `build/reports/html/`, `build/test-results/junit.xml`.
- Style and types: `npm run check` (tsc, eslint, prettier).
