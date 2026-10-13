/**
 * The users tests log in as — rows of resources/data/user-data.json, one per role. The password is a
 * Secret: printing, logging or serialising a user never shows it; only the login reads it.
 */
import { inspect } from "node:util";
import { z } from "zod";
import { loadData } from "./loader.js";

export class Secret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  reveal(): string {
    return this.#value;
  }

  toString(): string {
    return "***";
  }

  toJSON(): string {
    return "***";
  }

  [inspect.custom](): string {
    return "***";
  }
}

export const User = z.object({
  username: z.string(),
  password: z.string().transform((value) => new Secret(value)),
});
export type User = z.infer<typeof User>;

/** the roles of user-data.json (lower case). ONBOARD: the app's roles; `unknown` = a fresh
 * unregistered email per load, for the negative login test */
export type Role = "admin" | "unknown";

export function loadUser(role: Role): User {
  return loadData(User, "user-data.json", role);
}
