/**
 * The app's login over raw HTTP — the browser and the API start signed in, only the login-flow test
 * uses the form (qa-core:login-rules, qa-ts:login-strategies). Cookies are kept by hand in a plain
 * map, redirects followed by hand (`redirect: "manual"`): cookie-jar libraries rewrite or duplicate
 * cookies. Sessions are cached per user and purpose (browser / api — apart: one-shot flash messages)
 * for the worker, renewed after SESSION_TTL_MS. A test that logs out ends a cached session.
 *
 * ONBOARD: the login of THIS app. The shape below is a server-rendered form with a CSRF field
 * (Laravel, proven on lab11): GET the form → its token, POST → a redirect NOT back to the login page =
 * signed in, GET the target once, GET a page for the CSRF token the app's XHRs send. Change the
 * paths, the field names, the success check and where the CSRF token comes from (or drop it).
 */
import { settings } from "../config/settings.js";
import type { User } from "../data/users.js";

export type Purpose = "browser" | "api";

export interface Session {
  /** cookie name → value, as the app set them */
  readonly cookies: Readonly<Record<string, string>>;
  /** the token non-GET calls send (X-CSRF-TOKEN) — "" when the app needs none */
  readonly csrf: string;
}

const LOGIN_PATH = "login"; // ONBOARD: the login form's path
const HOME_PATH = ""; // ONBOARD: a page every signed-in user can open (it carries the CSRF meta)
const SESSION_TTL_MS = 60 * 60 * 1000; // ONBOARD: well inside the app's idle session lifetime
const cache = new Map<string, { session: Session; at: number }>();

export async function sessionFor(user: User, purpose: Purpose): Promise<Session> {
  const key = `${user.username}|${purpose}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < SESSION_TTL_MS) return cached.session;
  const session = await httpLogin(user);
  cache.set(key, { session, at: Date.now() });
  return session;
}

export async function httpLogin(user: User): Promise<Session> {
  const jar: Record<string, string> = {};
  const loginUrl = new URL(LOGIN_PATH, settings.base.url).href;

  const form = await send(jar, loginUrl);
  const token = /name="_token" value="([^"]+)"/.exec(await form.text())?.[1] ?? "";

  const body = new URLSearchParams({
    _token: token, // ONBOARD: the form's own field names
    email: user.username,
    password: user.password.reveal(),
  });
  const posted = await send(jar, loginUrl, { method: "POST", body });
  const target = posted.headers.get("location") ?? "";
  if (posted.status !== 302 || target.includes(LOGIN_PATH)) {
    throw new Error(`Login of ${user.username} refused: HTTP ${posted.status} → '${target}'`);
  }
  await send(jar, new URL(target, loginUrl).href); // some apps refuse an XHR before any page

  const home = await send(jar, new URL(HOME_PATH, settings.base.url).href);
  const csrf = /<meta name="csrf-token" content="([^"]+)"/.exec(await home.text())?.[1] ?? "";
  if (home.status !== 200) {
    throw new Error(`No session after the login of ${user.username}: HTTP ${home.status}`);
  }
  return { cookies: { ...jar }, csrf };
}

async function send(
  jar: Record<string, string>,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookie = Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    headers: { ...(cookie ? { Cookie: cookie } : {}), Accept: "text/html" },
  });
  for (const line of response.headers.getSetCookie()) {
    const [pair = ""] = line.split(";");
    const at = pair.indexOf("=");
    const name = pair.slice(0, at).trim();
    const value = pair.slice(at + 1).trim();
    if (!name) continue;
    if (value === "deleted" || /max-age=0|expires=thu, 01 jan 1970/i.test(line)) delete jar[name];
    else jar[name] = value;
  }
  return response;
}
