/**
 * The run's settings: JSON defaults, the CI layer, the environment's file, env vars. One frozen
 * object per run (`settings`); nothing else reads process.env.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const SettingsSchema = z.object({
  env: z.string(),
  runner: z.enum(["local", "server"]),
  ci: z.boolean(),
  base: z.object({ url: z.string().url() }),
  browser: z.object({
    name: z.enum(["chromium", "firefox", "webkit"]),
    headless: z.boolean(),
    viewport: z.tuple([z.number(), z.number()]),
  }),
  server: z.object({ url: z.string() }),
  timeouts: z.object({ action: z.number(), navigation: z.number() }),
  data: z.object({ dir: z.string() }),
});
export type Settings = Readonly<z.infer<typeof SettingsSchema>>;

type Tree = Record<string, unknown>;

/** env var → the setting it overrides (a dotted path) and how its text becomes a value */
const ENV_OVERRIDES: Record<string, [string, (v: string) => unknown]> = {
  BASE_URL: ["base.url", String],
  RUNNER: ["runner", String],
  BROWSER: ["browser.name", String],
  HEADLESS: ["browser.headless", (v) => v === "true"],
  PLAYWRIGHT_SERVER_URL: ["server.url", String],
  TIMEOUT: ["timeouts.action", Number],
};

function json(path: string): Tree {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Tree) : {};
}

function merge(base: Tree, top: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(top)) {
    const current = out[key];
    out[key] = isTree(value) && isTree(current) ? merge(current, value) : value;
  }
  return out;
}

function isTree(value: unknown): value is Tree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function set(tree: Tree, dotted: string, value: unknown): void {
  const keys = dotted.split(".");
  const leaf = keys.pop()!;
  let node = tree;
  for (const key of keys) node = (node[key] ??= {}) as Tree;
  node[leaf] = value;
}

/** Layers, later wins: application.json, application-ci.json (CI=true), resources/env/<env>.json, env vars. */
export function loadSettings(environ: NodeJS.ProcessEnv = process.env): Settings {
  const ci = ["1", "true", "yes"].includes((environ.CI ?? "").toLowerCase());
  let tree = json(resolve(ROOT, "config/application.json"));
  if (ci) tree = merge(tree, json(resolve(ROOT, "config/application-ci.json")));
  const env = environ.TEST_ENV ?? (tree.env as string | undefined) ?? "dev";
  const envFile = resolve(ROOT, `resources/env/${env}.json`);
  if (!existsSync(envFile)) throw new Error(`No environment '${env}': ${envFile} is missing`);
  tree = merge(tree, json(envFile));
  for (const [variable, [dotted, parse]] of Object.entries(ENV_OVERRIDES)) {
    const value = environ[variable];
    if (value) set(tree, dotted, parse(value));
  }
  return Object.freeze(SettingsSchema.parse({ ...tree, env, ci }));
}

export const settings = loadSettings();
