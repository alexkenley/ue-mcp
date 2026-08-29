/**
 * The live parameter schema for one action (T2).
 *
 * `project(search_tools)` finds an action by keyword but hands back only its
 * prose. An agent that has located `asset.set_property` still has to guess
 * whether the path parameter is `assetPath`, `path` or `asset`, and a guess
 * that is wrong does not fail loudly: a category's zod shape strips keys it
 * does not declare, so a misspelled parameter reaches the handler as
 * `undefined` and the call returns a plausible-looking result for a mutation
 * that never happened.
 *
 * This module answers the question directly, from three independent sources:
 *
 *   documented  the `Params:` clause authored in the action's description
 *   forwards    the keys the action's `mapParams` closure actually reads
 *   declared    the category's zod shape, which is what the wire accepts
 *
 * `declared` is the only one of the three that is load-bearing at runtime, so
 * a name present in either of the other two and absent from it is a silent
 * drop rather than a documentation nit. `schemaDrift()` reports exactly those,
 * and a unit test gates the whole surface on it.
 */
import { z } from "zod";
import type { ActionSpec, ToolDef } from "./types.js";
import { classifyActionClass, type ActionClass } from "./action-class.js";

export interface ParamSchema {
  name: string;
  /** Wire type, unwrapped through optional/default/nullable. */
  type: string;
  required: boolean;
  description?: string;
  /** Allowed values, when the parameter is an enum or a union of literals. */
  enumValues?: string[];
  /** Default applied by the schema when the caller omits the parameter. */
  default?: unknown;
  /**
   * Where this name was found. A parameter missing `declared` is stripped
   * before the handler sees it, whatever the description promises.
   */
  sources: Array<"documented" | "forwards" | "declared">;
}

export interface ActionSchema {
  tool: string;
  action: string;
  description: string;
  /** The C++ bridge method this dispatches to, when it dispatches to one. */
  bridge?: string;
  /** True when the action runs in the server process with no editor call. */
  local: boolean;
  /** Longer wait this action declares for itself, in milliseconds. */
  timeoutMs?: number;
  /**
   * Whether this observes the editor or changes it (#817's taxonomy).
   *
   * MCP's own readOnlyHint is per TOOL, and every tool here is a category
   * holding both reads and mutations, so the manifest cannot carry this. A
   * harness that wants to auto-approve reads and prompt on writes reads it
   * from here instead of maintaining its own list.
   *
   *   read    observes; landing it in the wrong editor changes nothing
   *   mutate  may change the editor, its project on disk, or its process
   *   unknown decided by a parameter (an arbitrary python string, a wrapped
   *           tool name), and therefore gated exactly like mutate
   */
  class: ActionClass;
  params: ParamSchema[];
  /**
   * Names promised by the description or read by `mapParams` that the category
   * does not declare. Passing one of these has no effect.
   */
  drift: string[];
}

/* ── zod introspection ─────────────────────────────────────────────── */

interface ZodDef {
  typeName?: string;
  innerType?: z.ZodTypeAny;
  schema?: z.ZodTypeAny;
  type?: z.ZodTypeAny;
  values?: unknown[];
  options?: z.ZodTypeAny[];
  defaultValue?: () => unknown;
  valueType?: z.ZodTypeAny;
}

function defOf(schema: z.ZodTypeAny): ZodDef {
  return (schema as unknown as { _def: ZodDef })._def ?? {};
}

/**
 * Peel the wrappers that only change optionality, keeping the first
 * description and default found on the way in. The description belongs to
 * whichever wrapper `.describe()` was called on, which for the prevailing
 * `z.string().optional().describe(...)` spelling is the outer one.
 */
function unwrap(schema: z.ZodTypeAny): {
  inner: z.ZodTypeAny;
  optional: boolean;
  description?: string;
  default?: unknown;
} {
  let cur = schema;
  let optional = false;
  let description = cur.description;
  let dflt: unknown;
  // Bounded: the wrapper chains in this codebase are two or three deep, and a
  // cycle would otherwise hang the server rather than fail a call.
  for (let i = 0; i < 16; i++) {
    const def = defOf(cur);
    const name = def.typeName;
    if (name === "ZodOptional" || name === "ZodNullable") {
      optional = true;
    } else if (name === "ZodDefault") {
      optional = true;
      if (dflt === undefined && typeof def.defaultValue === "function") dflt = def.defaultValue();
    } else if (name !== "ZodEffects" && name !== "ZodBranded" && name !== "ZodReadonly") {
      break;
    }
    const next = def.innerType ?? def.schema;
    if (!next) break;
    cur = next;
    description = description ?? cur.description;
  }
  return { inner: cur, optional, description, default: dflt };
}

/** A short, agent-readable name for a zod type. */
function typeName(schema: z.ZodTypeAny): string {
  const def = defOf(schema);
  switch (def.typeName) {
    case "ZodString": return "string";
    case "ZodNumber": return "number";
    case "ZodBoolean": return "boolean";
    case "ZodUnknown": case "ZodAny": return "any";
    case "ZodEnum": return "enum";
    case "ZodLiteral": return "literal";
    case "ZodRecord": return "object";
    case "ZodObject": return "object";
    case "ZodArray": {
      const el = def.type;
      return el ? `${typeName(unwrap(el).inner)}[]` : "array";
    }
    case "ZodUnion": {
      const opts = def.options ?? [];
      const names = [...new Set(opts.map((o) => typeName(unwrap(o).inner)))];
      return names.join("|") || "union";
    }
    default: return def.typeName ? def.typeName.replace(/^Zod/, "").toLowerCase() : "unknown";
  }
}

/** Allowed values for an enum, or a union made entirely of string literals. */
function enumValues(schema: z.ZodTypeAny): string[] | undefined {
  const def = defOf(schema);
  if (def.typeName === "ZodEnum" && Array.isArray(def.values)) {
    return def.values.map((v) => String(v));
  }
  if (def.typeName === "ZodUnion" && Array.isArray(def.options)) {
    const literals: string[] = [];
    for (const opt of def.options) {
      const od = defOf(unwrap(opt).inner);
      if (od.typeName !== "ZodLiteral") return undefined;
      literals.push(String((od as unknown as { value: unknown }).value));
    }
    return literals.length > 0 ? literals : undefined;
  }
  return undefined;
}

/* ── description parsing ───────────────────────────────────────────── */

/** Words that open a commentary segment rather than name a parameter. */
const PROSE_LEADERS =
  /^(default|max|min|e|i|g|or|and|either|one|two|the|a|an|at|no|not|see|note|use|used|uses|takes|accepts|same|plus|only|required|optional|omit|omitted|pass|passing|when|where|with|without|for|from|to|into|per|so|then|this|that|these|those|it|its|each|every|any|all|both|call|calls|after|before|since|because|exactly|shaped|otherwise|instead|also|first|last|next|returns?|values?)$/i;

/** Cut a clause at the first match of `stop` that is not inside brackets. */
function cutAtDepthZero(text: string, stop: RegExp): string {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      stop.lastIndex = i;
      const m = stop.exec(text);
      if (m && m.index === i) return text.slice(0, i);
    }
  }
  return text;
}

/**
 * Pull parameter names out of the `Params:` clause every action description
 * in this repo carries.
 *
 * The clause is prose, not a grammar: it carries types in parentheses,
 * defaults, issue numbers, alternatives joined by `OR`, and nested optional
 * groups spelled `(+ recursive?, default true)`. Only the leading identifier
 * of each comma-separated segment is a parameter name; everything inside
 * parentheses is commentary, except a `(+ ...)` group, which is a real list of
 * further parameters.
 */
export function parseParamsClause(description: string): Array<{ name: string; optional: boolean }> {
  const at = description.search(/\bParams:/);
  if (at < 0) return [];
  let clause = description.slice(at + "Params:".length);

  // The clause runs until the prose resumes. Two things end it: a `Returns`
  // section, whose names are result fields rather than parameters, and a
  // sentence break, after which the description is explaining rather than
  // listing. Both are only terminators at depth zero, so `(e.g. 'foot_l')`
  // and `{op:'set'}` stay attached to the parameter they document.
  clause = cutAtDepthZero(clause, /\.\s+|\bReturns\b|\bReturn:/g);
  // A trailing issue reference is not part of the list.
  clause = clause.replace(/\(#[\d/#\s,]+\)\s*$/, "").trim();
  if (/^none\b/i.test(clause)) return [];

  const found: Array<{ name: string; optional: boolean }> = [];
  const seen = new Set<string>();
  const add = (name: string, optional: boolean): void => {
    if (PROSE_LEADERS.test(name)) return;
    if (seen.has(name)) return;
    seen.add(name);
    found.push({ name, optional });
  };
  const push = (raw: string): void => {
    // `at least one of a/b/c` and `exactly one of x/y` introduce a choice
    // between real parameters, so the quantifier is dropped and the list
    // behind it is read.
    const segment = raw.replace(/^\s*(?:at least|exactly|either|any)\s+(?:one|two)?\s*(?:of)?\s*/i, "");
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*(?:\/[A-Za-z_][A-Za-z0-9_]*)*)(\[\])?(\?)?/.exec(segment);
    if (!m) return;
    const optional = m[3] === "?";
    // `target/targetLabel` documents two spellings of one parameter, and both
    // are real: the handler accepts either.
    for (const alias of m[1].split("/")) add(alias, optional);
  };

  // Split on commas that are not inside parentheses or brackets, so
  // `(string[], default 3)` stays with its parameter.
  const segments: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < clause.length; i++) {
    const c = clause[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) {
      segments.push(clause.slice(start, i));
      start = i + 1;
    }
  }
  segments.push(clause.slice(start));

  for (const segment of segments) {
    // `a? (...) OR b? (...)` documents two independent parameters.
    for (const alt of segment.split(/\bOR\b/)) {
      push(alt);
      // A `(+ x?, y?)` group lists further parameters rather than commentary.
      for (const group of alt.matchAll(/\(\+([^)]*)\)/g)) {
        for (const sub of group[1].split(",")) push(sub);
      }
    }
  }
  return found;
}

/**
 * The parameter keys an action's `mapParams` closure reads.
 *
 * Reading the compiled source is the only way to see this: `mapParams` is an
 * opaque function by the time the registry is built. It is a best-effort
 * signal - a closure that spreads its argument reads everything and shows
 * nothing here - so it only ever adds names, never removes them.
 */
export function forwardedParams(spec: ActionSpec): string[] {
  // A bridge action maps its parameters through `mapParams`; a local one
  // reads them out of its handler's second argument. Both are the same
  // question - which keys does this action look at - so both are scanned.
  const fn = spec.mapParams ?? spec.handler;
  if (!fn) return [];
  let src: string;
  try {
    src = fn.toString();
  } catch {
    return [];
  }
  const names = new Set<string>();

  // Bind the scan to the closure's own parameter, so `arr.length` and
  // `Array.isArray` are not mistaken for parameters the action reads.
  // For a handler that is `(ctx, p) => ...`, the bag is the second argument.
  const argsMatch = /^\s*(?:async\s*)?\(?\s*([^)=]*?)\s*\)?\s*=>/.exec(src);
  const argNames = (argsMatch?.[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));
  const bagName = spec.mapParams ? argNames[0] : argNames[1];
  if (bagName) {
    const bag = bagName.replace(/\$/g, "\\$");
    // The prevailing spelling is `(p) => ({ x: p.x, y: p.y ?? p.path })`.
    // Match the accessor rather than the key, so an alias like
    // `p.assetPath ?? p.path` reports both spellings the action accepts.
    for (const m of src.matchAll(new RegExp(`\\b${bag}\\.([A-Za-z_][A-Za-z0-9_]*)\\b`, "g"))) {
      names.add(m[1]);
    }
    for (const m of src.matchAll(new RegExp(`\\b${bag}\\[\\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\\s*\\]`, "g"))) {
      names.add(m[1]);
    }
  }

  // Destructuring in the parameter position: `({ assetPath, save })`, or
  // `(ctx, { assetPath })` for a local handler.
  const destructured = spec.mapParams
    ? /^\s*\(?\s*\{([^{}]*)\}/.exec(src)
    : /^\s*(?:async\s*)?\([^,)]*,\s*\{([^{}]*)\}/.exec(src);
  if (destructured) {
    for (const part of destructured[1].split(",")) {
      const key = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?::|=|$)/.exec(part);
      if (key) names.add(key[1]);
    }
  }
  names.delete("action");
  return [...names];
}

/* ── the schema itself ─────────────────────────────────────────────── */

/** Routing instructions the dispatcher consumes and strips before a handler
 *  ever sees them. They are real wire parameters, so they are reported, but
 *  they are never counted as drift against an action's own documentation. */
const ROUTING_PARAMS: ReadonlySet<string> = new Set(["action", "timeoutMs", "select", "omit", "editor", "toEditor"]);

/** Build the full schema for one action of one tool. */
export function actionSchema(tool: ToolDef, action: string): ActionSchema {
  const spec = tool.actions[action];
  if (!spec) {
    throw new Error(
      `Unknown action '${action}' on tool '${tool.name}'. Available: ${Object.keys(tool.actions).join(", ")}`,
    );
  }
  const description = spec.description ?? "";
  const documented = parseParamsClause(description);
  const forwards = new Set(forwardedParams(spec));
  const documentedByName = new Map(documented.map((d) => [d.name, d]));

  const params: ParamSchema[] = [];
  const covered = new Set<string>();

  for (const [name, schema] of Object.entries(tool.schema)) {
    if (name === "action") continue;
    const { inner, optional, description: paramDoc, default: dflt } = unwrap(schema);
    const doc = documentedByName.get(name);
    const sources: ParamSchema["sources"] = ["declared"];
    if (doc) sources.unshift("documented");
    if (forwards.has(name)) sources.splice(sources.length - 1, 0, "forwards");

    // A category's shape is one flat bag shared by all its actions, so most of
    // its keys belong to some other action. Report the ones this action uses,
    // plus the routing parameters, which every action accepts.
    if (!doc && !forwards.has(name) && !ROUTING_PARAMS.has(name)) continue;
    covered.add(name);
    params.push({
      name,
      type: typeName(inner),
      // The description's `?` marker wins: it is per-action, whereas the
      // category shape has to declare nearly everything optional to let its
      // other actions through.
      required: doc ? !doc.optional : !optional,
      description: paramDoc,
      enumValues: enumValues(inner),
      default: dflt,
      sources,
    });
  }

  const drift: string[] = [];
  const noteDrift = (name: string): void => {
    // Routing parameters are consumed by the dispatcher, and two of them are
    // injected into the shape only while this server drives more than one
    // editor, so their absence from a single-editor graph is not drift.
    if (ROUTING_PARAMS.has(name)) return;
    if (covered.has(name) || name in tool.schema || drift.includes(name)) return;
    drift.push(name);
  };
  for (const { name } of documented) noteDrift(name);
  for (const name of forwards) noteDrift(name);

  params.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    tool: tool.name,
    action,
    description,
    bridge: spec.bridge,
    local: !spec.bridge,
    timeoutMs: spec.timeoutMs,
    class: classifyActionClass(tool.name, action).class,
    params,
    drift,
  };
}

/**
 * Resolve an action reference to the tools that provide it.
 *
 * Accepts `tool.action`, `tool:action`, `tool action`, or a bare action name,
 * which may be provided by more than one category (`list`, `save`, `create`).
 * All matches come back so the caller can disambiguate rather than being
 * handed whichever one sorted first.
 */
export function resolveActionRef(
  ref: string,
  tools: ToolDef[],
): Array<{ tool: ToolDef; action: string }> {
  const trimmed = (ref ?? "").trim();
  if (!trimmed) return [];
  const split = /^([A-Za-z_][A-Za-z0-9_]*)\s*[.: ]\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(trimmed);
  if (split) {
    const [, toolName, actionName] = split;
    const tool = tools.find((t) => t.name === toolName.toLowerCase());
    if (tool && tool.actions[actionName]) return [{ tool, action: actionName }];
    // A bare action name containing a dot is not a thing, so fall through only
    // when the qualified form found nothing at all.
    if (tool) return [];
  }
  const out: Array<{ tool: ToolDef; action: string }> = [];
  for (const tool of tools) {
    if (tool.actions[trimmed]) out.push({ tool, action: trimmed });
  }
  return out;
}

/** Close spellings for an action name that did not resolve. */
export function suggestActions(ref: string, tools: ToolDef[], limit = 8): string[] {
  const needle = (ref ?? "").trim().toLowerCase().replace(/^[a-z_]+[.:]/, "");
  if (!needle) return [];
  const scored: Array<{ label: string; score: number }> = [];
  for (const tool of tools) {
    for (const action of Object.keys(tool.actions)) {
      const score = similarity(needle, action.toLowerCase());
      if (score > 0) scored.push({ label: `${tool.name}.${action}`, score });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((s) => s.label);
}

/**
 * How close two action names are, on 0..1.
 *
 * Substring containment dominates, because the realistic miss is a caller who
 * remembers part of the name (`bones` for `list_skeleton_bones`) rather than
 * one who transposes two letters. Edit distance catches the typo case below
 * that, and anything under a third of the name matching scores zero so the
 * suggestion list stays short enough to read.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (b.includes(a)) return 0.9 * (a.length / b.length) + 0.05;
  if (a.includes(b)) return 0.85 * (b.length / a.length);
  const distance = editDistance(a, b);
  const longest = Math.max(a.length, b.length);
  const closeness = 1 - distance / longest;
  return closeness >= 0.6 ? closeness * 0.8 : 0;
}

function editDistance(a: string, b: string): number {
  // Two rows rather than the full matrix: this runs over every action name on
  // the surface for every miss.
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/**
 * The closest spellings to a missed action name, out of a plain name list.
 *
 * Separate from `suggestActions` because the dispatcher has only its own
 * category's keys at the point it fails, and importing the whole graph there
 * would tie a per-call error path to the session registry.
 */
export function nearestActions(ref: string, available: string[], limit = 5): string[] {
  const needle = (ref ?? "").trim().toLowerCase();
  if (!needle) return [];
  return available
    .map((a) => ({ a, score: similarity(needle, a.toLowerCase()) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || x.a.localeCompare(y.a))
    .slice(0, limit)
    .map((x) => x.a);
}

/**
 * Every action on the surface, with the drift each one carries. Used by the
 * schema-drift unit test and by `project(describe_action)` when it is asked
 * for a whole category rather than one action.
 */
export function allActionSchemas(tools: ToolDef[]): ActionSchema[] {
  const out: ActionSchema[] = [];
  for (const tool of tools) {
    for (const action of Object.keys(tool.actions)) {
      out.push(actionSchema(tool, action));
    }
  }
  return out;
}
