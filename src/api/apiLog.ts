/**
 * Every HTTP call as one block into the test's output (prefix "INFO api") — the same layout as the
 * Java templates' `ApiLoggingFilter`: the request — method, URL, headers, form params, pretty body —
 * and the response — status, time, headers, pretty body — between lines of `_`. A failed test's
 * output then shows what was sent and answered, no debugger needed. One message per call, so
 * parallel tests don't interleave. Credentials are masked: the credential headers, and body / form
 * fields named like a password, secret or token. A body over MAX_BODY characters is cut (an HTML
 * page, a big list).
 *
 * The callers build an `ApiCall` from what they sent and got (`ApiClient` over Playwright's request
 * context; `loggedFetch` for raw fetch calls such as the login) and pass it to `logApiCall`.
 */

export const SEPARATOR = "_".repeat(100);
export const MAX_BODY = 20_000;
const SECRET_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);
const SECRET_NAME = /^.*(password|passwd|secret|token|api_?key).*$/i;
const SECRET_JSON_FIELD = /("[^"]*(password|passwd|secret|token|api_?key)[^"]*"\s*:\s*)"[^"]*"/gi;

export type HeaderList = Iterable<readonly [name: string, value: string]>;

/** one call as it went: what was sent, what came back and how long it took */
export interface ApiCall {
  readonly method: string;
  /** the full URL */
  readonly url: string;
  readonly requestHeaders: HeaderList;
  /** as sent — a form (Content-Type application/x-www-form-urlencoded) is logged field by field */
  readonly requestBody?: string;
  readonly status: number;
  readonly ms: number;
  readonly responseHeaders: HeaderList;
  readonly responseBody: string;
}

export function logApiCall(call: ApiCall): void {
  console.info(`INFO api${apiLogEntry(call)}`);
}

/** a fetch, timed and logged; the response's body stays readable for the caller */
export async function loggedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const requestBody = bodyText(init.body);
  const started = performance.now();
  const response = await fetch(url, init);
  const ms = Math.round(performance.now() - started);
  const sent = new Headers(init.headers);
  if (init.body instanceof URLSearchParams && !sent.has("content-type")) {
    sent.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8"); // as fetch adds it
  }
  logApiCall({
    method: init.method ?? "GET",
    url,
    requestHeaders: sent,
    requestBody,
    status: response.status,
    ms,
    responseHeaders: response.headers,
    responseBody: await response.clone().text(),
  });
  return response;
}

/** the block of one call */
export function apiLogEntry(call: ApiCall): string {
  const sent = [...call.requestHeaders];
  const contentType = sent.find(([name]) => name.toLowerCase() === "content-type")?.[1] ?? "";
  const body = call.requestBody ?? "";
  const requestBody =
    body && contentType.includes("application/x-www-form-urlencoded")
      ? formParams(new URLSearchParams(body))
      : bodyBlock(pretty(body));
  return [
    "\n",
    SEPARATOR,
    `\nREQUEST: ${call.method} ${call.url}\n`,
    headers(sent),
    requestBody,
    `RESPONSE: ${call.status} (${call.ms} ms)\n`,
    headers(call.responseHeaders),
    bodyBlock(pretty(call.responseBody)),
    SEPARATOR,
  ].join("");
}

function headers(list: HeaderList): string {
  return [...list]
    .map(([name, value]) => `${name}: ${masked(SECRET_HEADERS.has(name.toLowerCase()), value)}\n`)
    .join("");
}

function formParams(params: URLSearchParams): string {
  return [...params]
    .map(([name, value]) => `form: ${name}=${masked(SECRET_NAME.test(name), value)}\n`)
    .join("");
}

function masked(secret: boolean, value: string): string {
  return secret ? "***" : value;
}

/** JSON indented (4 spaces, as REST Assured's prettifier); anything else as it came */
function pretty(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 4);
    } catch {
      return text;
    }
  }
  return text;
}

/** the body, its secret fields masked and cut at MAX_BODY; "" when there is none */
function bodyBlock(body: string): string {
  if (!body) return "";
  let safe = body.replace(SECRET_JSON_FIELD, '$1"***"');
  if (safe.length > MAX_BODY) {
    safe = `${safe.slice(0, MAX_BODY)}\n… (${safe.length - MAX_BODY} more characters)`;
  }
  return `${safe}\n`;
}

/** a fetch body as text — a stream or binary is not logged */
function bodyText(body: RequestInit["body"]): string | undefined {
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  return undefined;
}
