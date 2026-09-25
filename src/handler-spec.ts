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
export const PARAM_TYPES = ["string", "number", "integer", "boolean", "object", "array", "vec3", "rotator", "color", "any"] as const;
export type ParamType = (typeof PARAM_TYPES)[number];

/** One field of an object parameter, or of each element of an array of objects. */
export interface ParamField {
  name: string;
  type: ParamType;
  required: boolean;
  description: string;
  /** Element type of an `array` field. */
  items?: ParamType;
}

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
  /** JSON null is a value of its own, such as "clear the reference". */
  nullable?: boolean;
  /** Further types the value may take instead of `type`. */
  orTypes?: ParamType[];
  /** The one value the parameter accepts. */
  literal?: boolean | string | number;
  /** The shape of an `object` parameter, or of each element of an array of objects. */
  fields?: ParamField[];
}

/** How many branches of a choice a call supplies. Mirrors EMCPChoiceMode. */
export const CHOICE_MODES = ["exactlyOne", "atLeastOne"] as const;
export type ChoiceMode = (typeof CHOICE_MODES)[number];

/**
 * A required choice between parameters. Each branch is a set of names that go
 * together: `settings OR propertyName + propertyValue` has the branches
 * `[["settings"], ["propertyName", "propertyValue"]]`. Every name is a
 * declared, optional parameter; the group is what is required.
 */
export interface ParamChoice {
  mode: ChoiceMode;
  branches: string[][];
}

/** One handler's contract. */
export interface HandlerSpec {
  category?: string;
  params: ParamSpec[];
  /** Required choices between the declared parameters. */
  choices?: ParamChoice[];
  /**
   * Why the C++ contract test does not call this handler: its contract values
   * would reach a create, spawn, save or run. The surface is generated from it
   * like any other; tests/unit/handler-spec-exempt.test.ts holds the handler
   * source to it instead.
   */
  contractExempt?: string;
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
      problems.push(...shapeProblems(method, param));
    }
    problems.push(...choiceProblems(method, spec));
    if (spec.contractExempt !== undefined && (typeof spec.contractExempt !== "string" || spec.contractExempt.trim() === "")) {
      problems.push(`${method}: a contract exemption needs a reason`);
    }
  }
  return problems;
}

/** Mirrors FMCPHandlerRegistry::ValidateValueShape. */
function shapeProblems(method: string, param: ParamSpec): string[] {
  const at = `${method}.${param.name}`;
  const problems: string[] = [];
  if (param.nullable !== undefined && param.nullable !== true) problems.push(`${at}: nullable is written only as true`);
  const orTypes = param.orTypes ?? [];
  orTypes.forEach((orType, index) => {
    if (!PARAM_TYPES.includes(orType)) problems.push(`${at}: unknown alternative type '${orType}'`);
    else if (orType === "any" || param.type === "any") problems.push(`${at}: a union with any, which already accepts everything`);
    else if (orType === "array") problems.push(`${at}: array as an alternative type; declare it as the parameter's own type`);
    else if (orType === param.type) problems.push(`${at}: its own type listed as an alternative`);
    else if (orTypes.indexOf(orType) !== index) problems.push(`${at}: an alternative type listed twice`);
  });
  if (param.literal !== undefined) {
    const fits = (param.type === "boolean" && typeof param.literal === "boolean")
      || (param.type === "string" && typeof param.literal === "string")
      || ((param.type === "number" || param.type === "integer") && typeof param.literal === "number");
    if (!fits) problems.push(`${at}: a literal that is not a value of its type`);
    if (orTypes.length > 0) problems.push(`${at}: both a literal and a union`);
  }
  if (param.fields !== undefined) {
    const objectShaped = param.type === "object" || (param.type === "array" && param.items === "object");
    if (!objectShaped) problems.push(`${at}: fields on something that is neither an object nor an array of objects`);
    const seen = new Set<string>();
    for (const field of param.fields) {
      if (typeof field.name !== "string" || !IDENTIFIER.test(field.name)) problems.push(`${at}: field '${String(field.name)}' is not an identifier`);
      else if (seen.has(field.name)) problems.push(`${at}: field '${field.name}' is declared twice`);
      seen.add(field.name);
      if (!PARAM_TYPES.includes(field.type)) problems.push(`${at}.${field.name}: unknown type '${field.type}'`);
      if (field.items !== undefined && field.type !== "array") problems.push(`${at}.${field.name}: items on a non-array`);
      if (typeof field.required !== "boolean") problems.push(`${at}.${field.name}: required is not a boolean`);
      if (typeof field.description !== "string") problems.push(`${at}.${field.name}: description is not a string`);
    }
  }
  return problems;
}

/**
 * Mirrors FMCPHandlerRegistry::ValidateHandlerSpec's choice rules, plus one the
 * clause grammar needs: an `at least one of a/b` group keeps collecting the bare
 * names that follow it, so a required parameter may not come right after one.
 */
function choiceProblems(method: string, spec: HandlerSpec): string[] {
  if (spec.choices === undefined) return [];
  if (!Array.isArray(spec.choices)) return [`${method}: choices is not an array`];
  const problems: string[] = [];
  const byName = new Map(spec.params.map((p) => [p.name, p]));
  const chosen = new Set<string>();
  spec.choices.forEach((choice, index) => {
    if (!CHOICE_MODES.includes(choice.mode)) problems.push(`${method}: choice ${index} has an unknown mode '${choice.mode}'`);
    if (!Array.isArray(choice.branches) || choice.branches.length < 2) {
      problems.push(`${method}: choice ${index} offers fewer than two branches`);
      return;
    }
    for (const branch of choice.branches) {
      if (!Array.isArray(branch) || branch.length === 0) {
        problems.push(`${method}: choice ${index} has an empty branch`);
        continue;
      }
      for (const name of branch) {
        const param = byName.get(name);
        if (!param) problems.push(`${method}: choice ${index} names '${name}', which is not a declared parameter`);
        else if (param.required) problems.push(`${method}: '${name}' is required and also a side of choice ${index}`);
        if (chosen.has(name)) problems.push(`${method}: '${name}' appears in more than one branch or choice`);
        chosen.add(name);
      }
    }
  });
  if (problems.length > 0) return problems;
  const items = clauseItems(spec);
  items.forEach((item, index) => {
    const next = items[index + 1];
    if (item.kind === "choice" && item.choice.mode === "atLeastOne" && next?.kind === "param"
      && next.param.required && !next.param.aliases?.length) {
      problems.push(
        `${method}: required '${next.param.name}' follows an at-least-one choice, and the clause would read it as one `
        + "more branch; declare it before the choice's first member",
      );
    }
  });
  return problems;
}

/** The items of a Params clause, in spec order: a choice sits where its first member is declared. */
type ClauseItem = { kind: "param"; param: ParamSpec } | { kind: "choice"; choice: ParamChoice };

export function clauseItems(spec: HandlerSpec): ClauseItem[] {
  const choiceOf = new Map<string, ParamChoice>();
  for (const choice of spec.choices ?? []) for (const branch of choice.branches) for (const name of branch) choiceOf.set(name, choice);
  const placed = new Set<ParamChoice>();
  const items: ClauseItem[] = [];
  for (const param of spec.params) {
    const choice = choiceOf.get(param.name);
    if (!choice) items.push({ kind: "param", param });
    else if (!placed.has(choice)) {
      placed.add(choice);
      items.push({ kind: "choice", choice });
    }
  }
  return items;
}

/**
 * Why a call's parameters do not satisfy the spec's choices, or undefined when
 * they do. A name counts as supplied under any of its aliases, since the
 * registry resolves them only after this check, and a null counts as supplied.
 */
export function choiceViolation(
  spec: { params: readonly ParamSpec[]; choices?: readonly ParamChoice[] },
  supplied: Readonly<Record<string, unknown>>,
): string | undefined {
  if (!spec.choices?.length) return undefined;
  const aliases = new Map(spec.params.map((p) => [p.name, p.aliases ?? []]));
  const given = (name: string): boolean =>
    [name, ...(aliases.get(name) ?? [])].some((key) => Object.prototype.hasOwnProperty.call(supplied, key) && supplied[key] !== undefined);
  for (const choice of spec.choices) {
    const rendered = renderChoice(choice, spec.params);
    const touched = choice.branches.filter((branch) => branch.some(given));
    if (touched.length === 0) {
      return `needs ${rendered}, and none was given`;
    }
    if (choice.mode === "exactlyOne" && touched.length > 1) {
      return `takes one side of ${rendered}, and got ${touched.map((b) => b.filter(given).join(" + ")).join(" and ")}`;
    }
    for (const branch of touched) {
      const missing = branch.filter((name) => !given(name));
      if (missing.length > 0) {
        return `got ${branch.filter(given).join(" + ")} without ${missing.join(" + ")}; ${branch.join(" + ")} go together in ${rendered}`;
      }
    }
  }
  return undefined;
}

/** A name as a clause writes it: with its aliases as `(or alias)`. */
function clauseName(param: ParamSpec | undefined, name: string): string {
  const aliases = param?.aliases?.length ? ` (${param.aliases.map((a) => `or ${a}`).join(", ")})` : "";
  return `${name}${aliases}`;
}

/**
 * One choice as the Params clause writes it. `exactlyOne` joins its branches
 * with OR (`actorLabel OR actorPath`); `atLeastOne` is quantified
 * (`at least one of labelPrefix/tag`), with OR between branches only when a
 * branch holds more than one name. Names inside a branch join with ` + `.
 */
export function renderChoice(choice: ParamChoice, params: readonly ParamSpec[]): string {
  const byName = new Map(params.map((p) => [p.name, p]));
  const branch = (names: string[]): string => names.map((n) => clauseName(byName.get(n), n)).join(" + ");
  if (choice.mode === "exactlyOne") return choice.branches.map(branch).join(" OR ");
  const single = choice.branches.every((b) => b.length === 1);
  return `at least one of ${choice.branches.map(branch).join(single ? "/" : " OR ")}`;
}

/**
 * Build the action declaration for a spec'd bridge method: the summary a person
 * wrote, then the generated `Params:` clause. There is no mapParams, because the
 * spec names are the bridge names and renames are the registry's aliases. The
 * action carries the spec itself, so describe_action reports it verbatim.
 */
export function makeSpecBp(clauses: Readonly<Record<string, string>>, specs: HandlerSpecs = {}) {
  return (effect: ActionEffect, summary: string, bridge: string): BridgeActionSpec => {
    const clause = clauses[bridge];
    if (clause === undefined) {
      throw new Error(
        `No recorded parameter spec for bridge method '${bridge}'. Register it with a spec in C++, `
        + "then run npm run specs:record and npm run specs:generate.",
      );
    }
    const action = bp(effect, `${summary} ${clause}`, bridge);
    const spec = specs[bridge];
    if (!spec) return action;
    return spec.choices?.length
      ? { ...action, paramSpec: spec.params, paramChoices: spec.choices }
      : { ...action, paramSpec: spec.params };
  };
}

const ZOD_BASE: Record<ParamType, () => z.ZodTypeAny> = {
  string: () => z.string(),
  number: () => z.number(),
  integer: () => z.number().int(),
  boolean: () => z.boolean(),
  object: () => z.record(z.unknown()),
  array: () => z.array(z.unknown()),
  vec3: () => z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotator: () => z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }),
  color: () => z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number().optional() }),
  any: () => z.unknown(),
};

function fieldsZod(fields: readonly ParamField[]): z.ZodTypeAny {
  return z.object(Object.fromEntries(fields.map((f) => {
    const base = f.type === "array" ? z.array(ZOD_BASE[f.items ?? "any"]()) : ZOD_BASE[f.type]();
    return [f.name, (f.required ? base : base.optional()).describe(f.description)];
  })));
}

/**
 * The zod schema one declared parameter accepts, without optionality or its
 * description. The runtime twin of the expression scripts/lib/handler-spec-gen.mjs
 * writes into a generated module; tests/unit/handler-specs.test.ts holds the two
 * to one signature.
 */
export function paramZod(param: ParamSpec): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  if (param.literal !== undefined) base = z.literal(param.literal);
  else if (param.type === "array") base = z.array(param.fields ? fieldsZod(param.fields) : ZOD_BASE[param.items ?? "any"]());
  else if (param.type === "object" && param.fields) base = fieldsZod(param.fields);
  else base = ZOD_BASE[param.type]();
  if (param.orTypes?.length) {
    base = z.union([base, ...param.orTypes.map((t) => ZOD_BASE[t]())] as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  }
  return param.nullable ? base.nullable() : base;
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
    case "ZodLiteral":
      return `literal<${JSON.stringify((schema as z.ZodLiteral<unknown>).value)}>`;
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
  return JSON.stringify([
    spec.params.map((p) => [
      p.name, p.type, p.required, p.description, [...(p.aliases ?? [])], p.items ?? null,
      p.nullable ?? false, [...(p.orTypes ?? [])], p.literal ?? null,
      (p.fields ?? []).map((f) => [f.name, f.type, f.required, f.description, f.items ?? null]),
    ]),
    (spec.choices ?? []).map((c) => [c.mode, c.branches]),
    spec.contractExempt ?? null,
  ]);
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
