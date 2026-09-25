/**
 * Parameter contracts authored in C++ (#1057).
 *
 * A handler registered with a spec declares its parameters once, at its
 * `RegisterHandler` call. The bridge publishes every spec in
 * `get_bridge_capabilities.handlerSpecs`; `npm run specs:record` writes that to
 * `tests/golden/handler-specs.json`, and `npm run specs:generate` turns the
 * recording into `src/tools/specs/<category>.generated.ts`: the zod entries and
 * the `Params:` clause of every spec'd action.
 *
 * The advertised surface always comes from the recording, whether or not an
 * editor is connected, so the startup contract never depends on which editor
 * answered. A connected editor whose live specs differ from the recording is
 * reported as drift by `project(get_status)`.
 */
import { z } from "zod";
import { bp, type ActionEffect, type BridgeActionSpec } from "./types.js";
import { ROUTING_PARAM_NAMES } from "./routing-params.js";

/** Wire types a spec can declare. Mirrors EMCPParamType in HandlerRegistry.h. */
export const PARAM_TYPES = ["string", "number", "integer", "boolean", "object", "array", "vec3", "rotator", "any"] as const;
export type ParamType = (typeof PARAM_TYPES)[number];

/** One declared parameter, as the bridge publishes it. */
export interface ParamSpec {
  name: string;
  type: ParamType;
  required: boolean;
  description: string;
  /** Other names the registry renames to `name` before the handler runs. */
  aliases?: string[];
  /** Element type of an `array` parameter. */
  items?: ParamType;
}

/** One handler's contract. */
export interface HandlerSpec {
  category?: string;
  params: ParamSpec[];
}

/** Every spec'd handler, keyed by bridge method. */
export type HandlerSpecs = Record<string, HandlerSpec>;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Why a set of specs cannot generate a surface, one line per problem. Mirrors
 * FMCPHandlerRegistry::ValidateParamSpecs, and refuses the dispatcher's routing
 * names for the same reason: a parameter called `action` would land on top of
 * the parameter that selects the action.
 */
export function specProblems(specs: HandlerSpecs): string[] {
  const routing = new Set(ROUTING_PARAM_NAMES);
  const problems: string[] = [];
  for (const [method, spec] of Object.entries(specs)) {
    if (!IDENTIFIER.test(method)) problems.push(`${method}: not a method name`);
    if (!Array.isArray(spec?.params)) {
      problems.push(`${method}: params is not an array`);
      continue;
    }
    const seen = new Set<string>();
    for (const param of spec.params) {
      const names = [param.name, ...(param.aliases ?? [])];
      for (const name of names) {
        if (typeof name !== "string" || !IDENTIFIER.test(name)) {
          problems.push(`${method}: '${String(name)}' is not an identifier`);
        } else if (routing.has(name)) {
          problems.push(`${method}: '${name}' is a routing name the dispatcher consumes`);
        } else if (seen.has(name)) {
          problems.push(`${method}: '${name}' is declared twice`);
        }
        seen.add(name);
      }
      if (!PARAM_TYPES.includes(param.type)) problems.push(`${method}.${param.name}: unknown type '${param.type}'`);
      if (param.items !== undefined) {
        if (param.type !== "array") problems.push(`${method}.${param.name}: items on a non-array`);
        else if (!PARAM_TYPES.includes(param.items)) problems.push(`${method}.${param.name}: unknown item type '${param.items}'`);
      }
      if (typeof param.required !== "boolean") problems.push(`${method}.${param.name}: required is not a boolean`);
      if (typeof param.description !== "string") problems.push(`${method}.${param.name}: description is not a string`);
    }
  }
  return problems;
}

/**
 * Build the action declaration for a spec'd bridge method: the summary a person
 * wrote, then the generated `Params:` clause. There is no mapParams, because the
 * spec names are the bridge names and renames are the registry's aliases.
 */
export function makeSpecBp(clauses: Readonly<Record<string, string>>) {
  return (effect: ActionEffect, summary: string, bridge: string): BridgeActionSpec => {
    const clause = clauses[bridge];
    if (clause === undefined) {
      throw new Error(
        `No recorded parameter spec for bridge method '${bridge}'. Register it with a spec in C++, `
        + "then run npm run specs:record and npm run specs:generate.",
      );
    }
    return bp(effect, `${summary} ${clause}`, bridge);
  };
}

/**
 * A type signature for a zod schema that ignores descriptions, so two
 * declarations of one key can be compared for what they accept.
 */
export function zodSignature(schema: z.ZodTypeAny): string {
  const def = schema._def as { typeName?: string; checks?: Array<{ kind: string }> };
  switch (def.typeName) {
    case "ZodOptional":
      return `${zodSignature((schema as z.ZodOptional<z.ZodTypeAny>).unwrap())}?`;
    case "ZodNullable":
      return `${zodSignature((schema as z.ZodNullable<z.ZodTypeAny>).unwrap())}|null`;
    case "ZodString":
      return "string";
    case "ZodNumber":
      return def.checks?.some((c) => c.kind === "int") ? "integer" : "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodUnknown":
    case "ZodAny":
      return "any";
    case "ZodArray":
      return `array<${zodSignature((schema as z.ZodArray<z.ZodTypeAny>).element)}>`;
    case "ZodRecord":
      return `record<${zodSignature((schema as z.ZodRecord).valueSchema)}>`;
    case "ZodObject": {
      const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
      return `{${Object.keys(shape).sort().map((k) => `${k}:${zodSignature(shape[k])}`).join(",")}}`;
    }
    case "ZodUnion":
      return (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>).options.map(zodSignature).join("|");
    default:
      return def.typeName ?? "unknown";
  }
}

/** What a connected editor's specs say about the recording this server was built from. */
export interface HandlerSpecDrift {
  /** False when the editor published no specs, so nothing was compared. */
  checked: boolean;
  /** Methods whose live contract differs from the recording, or that only one side has. */
  drifted: string[];
}

function canonical(spec: HandlerSpec | undefined): string {
  if (!spec) return "";
  return JSON.stringify(
    spec.params.map((p) => [p.name, p.type, p.required, p.description, [...(p.aliases ?? [])], p.items ?? null]),
  );
}

/**
 * Compare a live `handlerSpecs` answer against the recording. A difference
 * means the surface this server advertises for those actions was generated
 * from a contract the running plugin no longer has.
 */
export function compareHandlerSpecs(recorded: HandlerSpecs, live: unknown): HandlerSpecDrift {
  if (!live || typeof live !== "object" || Array.isArray(live)) return { checked: false, drifted: [] };
  const liveSpecs = live as HandlerSpecs;
  const methods = new Set([...Object.keys(recorded), ...Object.keys(liveSpecs)]);
  const drifted = [...methods].filter((m) => canonical(recorded[m]) !== canonical(liveSpecs[m])).sort();
  return { checked: true, drifted };
}
