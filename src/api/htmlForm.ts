/**
 * A server-rendered form as the browser would submit it: every named input (checkboxes and radios
 * only when checked), each select's selected option (else its first), textareas — in page order,
 * repeated names kept. The app's forms carry server-made hidden fields (`_token`, pre-allocated ids,
 * `mrn`), so a replay posts the page's own form with only the test's fields changed.
 */
export type FormFields = [name: string, value: string][];

export function formFields(html: string, action: RegExp): FormFields {
  // from the target's own opening tag: an earlier form without its </form> would swallow it
  const open = [...html.matchAll(/<form\b([^>]*)>/g)].find(([, attrs]) =>
    action.test(attr(attrs ?? "", "action") ?? ""),
  );
  if (!open) {
    const actions = [...html.matchAll(/<form\b([^>]*)>/g)].map(([, attrs]) =>
      attr(attrs ?? "", "action"),
    );
    throw new Error(`No form with action ${String(action)} — the page has: ${actions.join(", ")}`);
  }
  const start = open.index + open[0].length;
  const end = html.indexOf("</form>", start);
  const body = html.slice(start, end < 0 ? undefined : end);
  const fields: FormFields = [];
  const controls = /<input\b([^>]*)>|<(select|textarea)\b([^>]*)>([\s\S]*?)<\/\2>/g;
  for (const [, inputAttrs, pairTag, pairAttrs, inner = ""] of body.matchAll(controls)) {
    const tag = pairTag ?? "input";
    const attrs = inputAttrs ?? pairAttrs ?? "";
    const name = attr(attrs, "name");
    if (!name || /\bdisabled\b/.test(attrs)) continue;
    if (tag === "input") {
      const type = (attr(attrs, "type") ?? "text").toLowerCase();
      if (["submit", "button", "file", "image", "reset"].includes(type)) continue;
      if ((type === "checkbox" || type === "radio") && !/\bchecked\b/.test(attrs)) continue;
      fields.push([name, decode(attr(attrs, "value") ?? (type === "checkbox" ? "on" : ""))]);
    } else if (tag === "select") {
      const options = [...inner.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)];
      const chosen = options.find(([, a]) => /\bselected\b/.test(a ?? "")) ?? options[0];
      if (chosen)
        fields.push([name, decode(attr(chosen[1] ?? "", "value") ?? chosen[2]?.trim() ?? "")]);
    } else {
      fields.push([name, decode(inner)]);
    }
  }
  return fields;
}

/** the fields with `values` replacing the first field of each name (added when missing) */
export function withValues(
  fields: FormFields,
  values: Record<string, string | number>,
): FormFields {
  const out: FormFields = fields.map(([name, value]) => [name, value]);
  for (const [name, value] of Object.entries(values)) {
    const at = out.findIndex(([n]) => n === name);
    if (at >= 0) out[at] = [name, String(value)];
    else out.push([name, String(value)]);
  }
  return out;
}

function attr(attrs: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(
    attrs,
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
