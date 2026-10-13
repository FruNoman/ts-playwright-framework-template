/** The login/API building blocks that need no app — a project keeps them until its own tests cover the layers. */
import { inspect } from "node:util";
import { expect, test } from "../../src/fixtures.js";
import { formFields, withValues } from "../../src/api/htmlForm.js";
import { loadUser, Secret } from "../../src/data/users.js";

test("a password never shows when a user is printed", () => {
  const user = loadUser("unknown");

  expect.soft(user.password).toBeInstanceOf(Secret);
  expect.soft(JSON.stringify(user)).not.toContain("wrong-password");
  expect.soft(inspect(user)).not.toContain("wrong-password");
  expect.soft(String(user.password)).toBe("***");
  expect.soft(user.password.reveal(), "only the login reads it").toBe("wrong-password");
  expect.soft(user.username, "a fresh unknown email per load").toMatch(/^nobody_\d+@example\.com$/);
});

test("a server form is replayed with only the test's fields changed", () => {
  const html = `<form action="#"><input name="q"></form>
    <form method="post" action="https://app.example/clients">
      <input type="hidden" name="_token" value="t0k3n"><input name="mrn" value="26-1">
      <input name="first"><input type="checkbox" name="vip"><input type="checkbox" name="active" checked>
      <select name="state"><option value="AL">AL</option><option value="IL" selected>IL</option></select>
      <textarea name="note">kept</textarea><input type="submit" name="go" value="Save">
    </form>`;

  const fields = withValues(formFields(html, /\/clients$/), { first: "Lab", extra: 1 });

  expect(fields).toEqual([
    ["_token", "t0k3n"],
    ["mrn", "26-1"],
    ["first", "Lab"],
    ["active", "on"],
    ["state", "IL"],
    ["note", "kept"],
    ["extra", "1"],
  ]);
});

test("a test without a switch variant sets nothing", ({ switchVariant }) => {
  expect(switchVariant, "the switch fixture stays idle").toBeUndefined();
});
