/**
 * The app's HTTP routes as one user — its own session (apart from the browser's), the headers the
 * app's own XHRs send, responses validated by zod (a changed contract fails at the call), every
 * call logged as one block (src/api/apiLog.ts). Resource clients take it:
 * `new OrdersApi(api).create(…)` in src/api/<area>/.
 * ONBOARD: the headers this app's XHRs send (devtools → a request of the app → its headers).
 */
import { request, type APIRequestContext, type APIResponse } from "@playwright/test";
import type { z } from "zod";
import { sessionFor } from "../auth/session.js";
import { settings } from "../config/settings.js";
import type { User } from "../data/users.js";
import { logApiCall } from "./apiLog.js";
import type { FormFields } from "./htmlForm.js";

interface Call {
  /** JSON-serialised unless a string (Playwright's `data`) */
  readonly data?: unknown;
  /** sent as application/x-www-form-urlencoded, repeated names kept */
  readonly form?: FormFields;
  readonly headers?: Record<string, string>;
  readonly maxRedirects?: number;
}

export class ApiClient {
  private constructor(
    private readonly context: APIRequestContext,
    /** what the context adds to every call — for the log (Playwright doesn't tell what it sent) */
    private readonly headers: Record<string, string>,
  ) {}

  static async as(user: User): Promise<ApiClient> {
    const session = await sessionFor(user, "api");
    const { hostname } = new URL(settings.base.url);
    const headers: Record<string, string> = {
      ...(session.csrf ? { "X-CSRF-TOKEN": session.csrf } : {}),
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    };
    const context = await request.newContext({
      baseURL: settings.base.url,
      extraHTTPHeaders: headers,
      storageState: {
        cookies: Object.entries(session.cookies).map(([name, value]) => ({
          name,
          value,
          domain: hostname,
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: settings.base.url.startsWith("https"),
          sameSite: "Lax" as const,
        })),
        origins: [],
      },
    });
    const logged = { ...headers };
    if (Object.keys(session.cookies).length > 0) logged.Cookie = "(the session)"; // masked anyway
    return new ApiClient(context, logged);
  }

  async getJson<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
    return schema.parse(await (await this.ok(this.send("GET", path))).json());
  }

  async getHtml(path: string): Promise<string> {
    return (await this.ok(this.send("GET", path, { headers: { Accept: "text/html" } }))).text();
  }

  async postJson<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>> {
    const response = await this.ok(this.send("POST", path, { data: body }));
    return schema.parse(response.status() === 204 ? {} : await response.json());
  }

  /** posts a page's form (`formFields`) as the browser does; returns where the app redirects to —
   * a new record's id is usually in that URL */
  async submitForm(path: string, fields: FormFields): Promise<string> {
    const response = await this.send("POST", path, {
      form: fields,
      headers: { Accept: "text/html" },
      maxRedirects: 0,
    });
    const location = response.headers().location ?? "";
    if (response.status() !== 302)
      throw new Error(`${path}: HTTP ${response.status()} → '${location}'`);
    return location;
  }

  async dispose(): Promise<void> {
    await this.context.dispose();
  }

  /** one call, timed and logged */
  private async send(method: string, path: string, call: Call = {}): Promise<APIResponse> {
    const url = new URL(path, settings.base.url).href;
    let body: string | undefined;
    const sent: Record<string, string> = { ...this.headers, ...call.headers };
    let form: FormData | undefined;
    if (call.form) {
      form = new FormData();
      for (const [name, value] of call.form) form.append(name, value);
      body = new URLSearchParams(call.form).toString();
      sent["Content-Type"] = "application/x-www-form-urlencoded";
    } else if (call.data !== undefined) {
      body = typeof call.data === "string" ? call.data : JSON.stringify(call.data);
      if (typeof call.data !== "string") sent["Content-Type"] = "application/json";
    }
    const started = performance.now();
    const response = await this.context.fetch(url, {
      method,
      data: call.data,
      form,
      headers: call.headers,
      maxRedirects: call.maxRedirects,
    });
    const ms = Math.round(performance.now() - started);
    logApiCall({
      method,
      url,
      requestHeaders: Object.entries(sent),
      requestBody: body,
      status: response.status(),
      ms,
      responseHeaders: response.headersArray().map(({ name, value }) => [name, value] as const),
      responseBody: await response.text(),
    });
    return response;
  }

  private async ok(call: Promise<APIResponse>): Promise<APIResponse> {
    const response = await call;
    if (!response.ok()) {
      throw new Error(
        `${response.url()}: HTTP ${response.status()} ${(await response.text()).slice(0, 200)}`,
      );
    }
    return response;
  }
}
