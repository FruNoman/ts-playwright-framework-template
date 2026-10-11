/**
 * Test data from resources/data/*.json — named variants of one model, {"default": {...}, "other":
 * {...}}, validated by its zod schema; resources/data/<env>/<file> replaces the shared file whole.
 * Placeholders are resolved on every load — load once per test (a fixture) and keep the object.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { z } from "zod";
import { ROOT, settings } from "../config/settings.js";
import { resolvePlaceholders } from "./placeholders.js";

function file(name: string): string {
  const own = resolve(ROOT, settings.data.dir, settings.env, name);
  return existsSync(own) ? own : resolve(ROOT, settings.data.dir, name);
}

export function variantNames(fileName: string): string[] {
  return Object.keys(JSON.parse(readFileSync(file(fileName), "utf8")) as object);
}

export function loadData<S extends z.ZodType>(
  schema: S,
  fileName: string,
  variant = "default",
): z.infer<S> {
  const variants = JSON.parse(resolvePlaceholders(readFileSync(file(fileName), "utf8"))) as Record<
    string,
    unknown
  >;
  if (!(variant in variants)) {
    throw new Error(`No variant '${variant}' in ${fileName}: ${Object.keys(variants).join(", ")}`);
  }
  return schema.parse(variants[variant]);
}
