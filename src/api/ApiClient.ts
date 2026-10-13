/**
 * The app's HTTP routes as one user — its own session (apart from the browser's), the headers the
 * app's own XHRs send, responses validated by zod (a changed contract fails at the call). Resource
 * clients take it: `new OrdersApi(api).create(…)` in src/api/<area>/.
 * ONBOARD: the headers this app's XHRs send (devtools → a request of the app → its headers).
 */
import { request, type APIRequestContext, type APIResponse } from "@playwright/test";
import type { z } from "zod";
import { sessionFor } from "../auth/session.js";
import { settings } from "../config/settings.js";
import type { User } from "../data/users.js";
import type { FormFields } from "./htmlForm.js";

export class ApiClient {
  private constructor(private readonly context: APIRequestContext) {}

  static async as(user: User): Promise<ApiClient> {
    const session = await sessionFor(user, "api");
    const { hostname } = new URL(settings.base.url);
    const context = await request.newContext({
      baseURL: settings.base.url,
      extraHTTPHeaders: {
        ...(session.csrf ? { "X-CSRF-TOKEN": session.csrf } : {}),
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
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
    return new ApiClient(context);
  }

  async getJson<S extends z.ZodType>(path: string, schema: S): Promise<z.infer<S>> {
    return schema.parse(await (await this.ok(this.context.get(path))).json());
  }

  async getHtml(path: string): Promise<string> {
    return (await this.ok(this.context.get(path, { headers: { Accept: "text/html" } }))).text();
  }

  async postJson<S extends z.ZodType>(path: string, body: unknown, schema: S): Promise<z.infer<S>> {
    const response = await this.ok(this.context.post(path, { data: body }));
    return schema.parse(response.status() === 204 ? {} : await response.json());
  }

  /** posts a page's form (`formFields`) as the browser does; returns where the app redirects to —
   * a new record's id is usually in that URL */
  async submitForm(path: string, fields: FormFields): Promise<string> {
    const form = new FormData();
    for (const [name, value] of fields) form.append(name, value);
    const response = await this.context.post(path, {
      form,
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
