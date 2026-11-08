/** The API call log (src/api/apiLog.ts) — the Java templates' layout, secrets masked; no app, no network. */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "../../src/fixtures.js";
import { apiLogEntry, loggedFetch, MAX_BODY, SEPARATOR } from "../../src/api/apiLog.js";

test("a call is one block between two separator lines, credentials masked", () => {
  const entry = apiLogEntry({
    method: "POST",
    url: "https://app.example/api/login?next=%2Fhome",
    requestHeaders: [
      ["Authorization", "Bearer abc.def"],
      ["Content-Type", "application/x-www-form-urlencoded"],
    ],
    requestBody: "email=lab%40example.com&password=s3cret&remember=on",
    status: 200,
    ms: 42,
    responseHeaders: [
      ["content-type", "application/json"],
      ["set-cookie", "session=xyz; Path=/; HttpOnly"],
    ],
    responseBody: '{"user":{"id":7,"name":"Lab"},"token":"t0k3n"}',
  });
  console.info(`INFO api${entry}`); // the example block in the test's output

  expect(entry).toBe(
    [
      "",
      SEPARATOR,
      "REQUEST: POST https://app.example/api/login?next=%2Fhome",
      "Authorization: ***",
      "Content-Type: application/x-www-form-urlencoded",
      "form: email=lab@example.com",
      "form: password=***",
      "form: remember=on",
      "RESPONSE: 200 (42 ms)",
      "content-type: application/json",
      "set-cookie: ***",
      "{",
      '    "user": {',
      '        "id": 7,',
      '        "name": "Lab"',
      "    },",
      '    "token": "***"',
      "}",
      SEPARATOR,
    ].join("\n"),
  );
  expect(SEPARATOR).toBe("_".repeat(100));
});

test("a JSON request body is pretty and masked; a long body is cut; an empty one is left out", () => {
  const entry = apiLogEntry({
    method: "PUT",
    url: "https://app.example/api/notes/1",
    requestHeaders: [["Content-Type", "application/json"]],
    requestBody: '{"apiKey":"k","text":"hi"}',
    status: 200,
    ms: 3,
    responseHeaders: [],
    responseBody: "x".repeat(MAX_BODY + 5),
  });

  expect
    .soft(entry)
    .toContain('{\n    "apiKey": "***",\n    "text": "hi"\n}\nRESPONSE: 200 (3 ms)\n');
  expect.soft(entry).toContain(`\n${"x".repeat(MAX_BODY)}\n… (5 more characters)\n${SEPARATOR}`);
  expect
    .soft(
      apiLogEntry({
        method: "DELETE",
        url: "https://app.example/api/notes/1",
        requestHeaders: [],
        status: 204,
        ms: 1,
        responseHeaders: [],
        responseBody: "",
      }),
    )
    .toBe(
      `\n${SEPARATOR}\nREQUEST: DELETE https://app.example/api/notes/1\nRESPONSE: 204 (1 ms)\n${SEPARATOR}`,
    );
});

test.describe("a raw fetch (the login's)", () => {
  let server: Server;
  let base: string;

  test.beforeAll(async () => {
    server = createServer((req, res) => {
      res.setHeader("Set-Cookie", ["session=abc; HttpOnly", "remember=1"]);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ path: req.url, accessToken: "secret-value" }));
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  test.afterAll(async () => {
    await new Promise((done) => server.close(done));
  });

  test("is logged as one message, timed, and its body stays readable", async () => {
    const logged: unknown[][] = [];
    const info = console.info;
    console.info = (...args: unknown[]) => void logged.push(args);
    let response: Response;
    try {
      response = await loggedFetch(`${base}/login`, {
        method: "POST",
        headers: { Cookie: "session=old", Accept: "text/html" },
        body: new URLSearchParams({ email: "lab@example.com", password: "s3cret" }),
      });
    } finally {
      console.info = info;
    }

    expect(logged, "one message per call").toHaveLength(1);
    const message = String(logged[0]?.[0]);
    console.info(message);
    expect
      .soft(message)
      .toMatch(new RegExp(`^INFO api\\n${SEPARATOR}\\nREQUEST: POST ${base}/login\\n`));
    expect.soft(message).toContain("\ncookie: ***\n");
    expect.soft(message).toContain("\nform: email=lab@example.com\nform: password=***\n");
    expect.soft(message).toMatch(/\nRESPONSE: 200 \(\d+ ms\)\n/);
    expect.soft(message).toContain("\nset-cookie: ***\nset-cookie: ***\n");
    expect.soft(message).toContain('\n    "accessToken": "***"\n');
    expect.soft(message).not.toContain("s3cret");
    expect.soft(message).not.toContain("secret-value");
    expect.soft(message.endsWith(`\n${SEPARATOR}`)).toBe(true);
    expect.soft(await response.json(), "the caller still reads the body").toEqual({
      path: "/login",
      accessToken: "secret-value",
    });
  });
});
