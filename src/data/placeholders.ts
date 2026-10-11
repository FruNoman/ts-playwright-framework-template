/**
 * Placeholders of the test-data JSON — every occurrence gets its own value:
 *   {{today}} {{tomorrow}} {{yesterday}} {{inDays:N}} — an ISO date (2026-10-11)
 *   {{random:N}} N digits, no leading zero · {{text:N}} N letters · {{uuid}} · {{timestamp}}
 *   {{uniqueTimestamp}} never twice in a run — with the worker's index, unique across workers
 *   {{<name>}} of a registered resolver
 */
import { randomUUID } from "node:crypto";

const resolvers = new Map<string, () => string>();
let lastStamp = 0;

export function registerResolver(name: string, resolve: () => string): void {
  resolvers.set(name, resolve);
}

export function uniqueTimestamp(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return `${lastStamp}${process.env.TEST_PARALLEL_INDEX ?? ""}`;
}

function isoDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const letters = (n: number) =>
  Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(
    "",
  );
const digits = (n: number) =>
  String(1 + Math.floor(Math.random() * 9)) +
  Array.from({ length: n - 1 }, () => Math.floor(Math.random() * 10)).join("");

export function resolvePlaceholders(text: string): string {
  let out = text;
  for (const [name, resolve] of resolvers) out = out.replaceAll(`{{${name}}}`, () => resolve());
  return out
    .replace(/\{\{today\}\}/g, () => isoDate(0))
    .replace(/\{\{tomorrow\}\}/g, () => isoDate(1))
    .replace(/\{\{yesterday\}\}/g, () => isoDate(-1))
    .replace(/\{\{inDays:(-?\d+)\}\}/g, (_, n: string) => isoDate(Number(n)))
    .replace(/\{\{random:(\d+)\}\}/g, (_, n: string) => digits(Number(n)))
    .replace(/\{\{text:(\d+)\}\}/g, (_, n: string) => letters(Number(n)))
    .replace(/\{\{uuid\}\}/g, () => randomUUID())
    .replace(/\{\{timestamp\}\}/g, () => String(Date.now()))
    .replace(/\{\{uniqueTimestamp\}\}/g, () => uniqueTimestamp());
}
