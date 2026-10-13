# ts-playwright-framework-template (draft)

**TypeScript + Playwright Test** — the runner as the framework: workers, a fresh context per test,
traces on failure, HTML + JUnit reports; page objects over locators, data from JSON validated by
zod, settings in layers, local browsers or a `playwright run-server`. Claude Code: the `qa-core`
and `qa-ts` plugins of [qa-automation-toolkit](https://github.com/FruNoman/qa-automation-toolkit)
(`docs/ARCHITECTURE.md`). ⚠ A basic skeleton — lab12 makes it real.

```bash
npm ci && npm run browsers         # once
npx playwright test                # everything (TESTS_THREADS workers)
npx playwright test --ui           # watch and debug
HEADLESS=false npx playwright test # see the browser
docker compose -f docker-compose.playwright.yml up -d --wait && RUNNER=server npx playwright test
npm run check                      # tsc + eslint + prettier
./scripts/walk-session.sh <user>   # a session cookie for browser walks (ONBOARD: the app's login)
```

Stage 2 of an onboarding fills the `ONBOARD:` markers of the login (`src/auth/session.ts`), the users
(`resources/data/user-data.json`), the API client's headers (`src/api/ApiClient.ts`), the switch
fixture (`src/fixtures.ts`) and the `Jenkinsfile` job name — `grep -rn "ONBOARD:" src resources Jenkinsfile`.
