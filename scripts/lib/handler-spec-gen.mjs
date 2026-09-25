// Rendering the generated category modules from tests/golden/handler-specs.json
// (#1057). Shared by scripts/generate-handler-specs.mjs, which writes them, and
// tests/unit/handler-specs.test.ts, which asserts the checked-in files are what
// the recording renders to. Run under tsx, so the validation is the server's own.

import { specProblems, clauseItems, renderChoice } from "../../src/handler-spec.js";

const ZOD_BY_TYPE = {
  string: "z.string()",
  number: "z.number()",
  integer: "z.number().int()",
  boolean: "z.boolean()",
  object: "z.record(z.unknown())",
  array: "z.array(z.unknown())",
  vec3: "z.object({ x: z.number(), y: z.number(), z: z.number() })",
  rotator: "z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() })",
  color: "z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number().optional() })",
  any: "z.unknown()",
};

function baseExpression(type, name) {
  const expr = ZOD_BY_TYPE[type];
  if (!expr) throw new Error(`unknown parameter type '${type}' on '${name}'`);
  return expr;
}

/** An object with declared fields, each described. */
function fieldsExpression(fields, name) {
  const entries = fields.map((f) => {
    const base = f.type === "array" ? `z.array(${baseExpression(f.items ?? "any", `${name}.${f.name}`)})` : baseExpression(f.type, `${name}.${f.name}`);
    return `${f.name}: ${base}${f.required ? "" : ".optional()"}.describe(${JSON.stringify(f.description)})`;
  });
  return `z.object({ ${entries.join(", ")} })`;
}

/**
 * The zod expression a parameter renders to, without optionality. The written
 * twin of paramZod in src/handler-spec.ts: a literal, an object or array
 * element with declared fields, the alternative types of a union, then null.
 */
export function zodExpression(param) {
  let expr;
  if (param.literal !== undefined) expr = `z.literal(${JSON.stringify(param.literal)})`;
  else if (param.type === "array") {
    expr = `z.array(${param.fields ? fieldsExpression(param.fields, param.name) : baseExpression(param.items ?? "any", param.name)})`;
  } else if (param.type === "object" && param.fields) expr = fieldsExpression(param.fields, param.name);
  else expr = baseExpression(param.type, param.name);
  if (param.orTypes?.length) {
    expr = `z.union([${[expr, ...param.orTypes.map((t) => baseExpression(t, param.name))].join(", ")}])`;
  }
  return param.nullable ? `${expr}.nullable()` : expr;
}

/**
 * The `Params:` clause for one handler, in the grammar parseParams reads:
 * required names bare, optional ones with `?`, aliases as `(or alias)`, and a
 * choice where its first member is declared, written as renderChoice writes it
 * (`actorLabel OR actorPath`, `at least one of labelPrefix/tag`).
 */
export function paramsClause(spec) {
  if (spec.params.length === 0) return "Params: none";
  const items = clauseItems(spec).map((item) => {
    if (item.kind === "choice") return renderChoice(item.choice, spec.params);
    const p = item.param;
    const aliases = p.aliases?.length ? ` (${p.aliases.map((a) => `or ${a}`).join(", ")})` : "";
    return `${p.name}${p.required ? "" : "?"}${aliases}`;
  });
  return `Params: ${items.join(", ")}`;
}

/**
 * One zod entry per key across a category. A key several handlers declare must
 * accept the same thing in every one of them, because the category's shape is
 * shared; the descriptions are merged, naming which handlers each belongs to
 * when they differ.
 */
function categoryKeys(handlers) {
  const keys = new Map();
  const claim = (key, expr, description, method) => {
    const entry = keys.get(key);
    if (!entry) {
      keys.set(key, { expr, descriptions: new Map([[description, [method]]]) });
      return;
    }
    if (entry.expr !== expr) {
      throw new Error(`'${key}' is declared as ${entry.expr} and as ${expr} (${method}); one category key has one type`);
    }
    const owners = entry.descriptions.get(description);
    if (owners) owners.push(method);
    else entry.descriptions.set(description, [method]);
  };
  for (const [method, spec] of handlers) {
    for (const param of spec.params) {
      const expr = zodExpression(param);
      claim(param.name, expr, param.description, method);
      for (const alias of param.aliases ?? []) claim(alias, expr, `Alias for ${param.name}`, method);
    }
  }
  return [...keys.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => {
    const described = [...entry.descriptions.entries()];
    const description = described.length === 1
      ? described[0][0]
      : described.map(([text, owners]) => `${text} (${owners.join(", ")})`).join(". ");
    return { key, expr: entry.expr, description };
  });
}

/** Handlers of one category, sorted by method. */
export function handlersByCategory(snapshot) {
  const problems = specProblems(snapshot.handlers ?? {});
  if (problems.length > 0) throw new Error(`handler-specs.json cannot generate a surface:\n  ${problems.join("\n  ")}`);
  const out = new Map();
  for (const method of Object.keys(snapshot.handlers).sort()) {
    const spec = snapshot.handlers[method];
    const category = spec.category;
    if (!category) throw new Error(`${method}: no category, so no module to generate it into`);
    if (!out.has(category)) out.set(category, []);
    out.get(category).push([method, spec]);
  }
  return out;
}

const HEADER = `// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).`;

/** The generated module for one category. */
export function renderCategoryModule(category, handlers) {
  const specs = Object.fromEntries(handlers);
  const clauses = handlers.map(([method, spec]) => `  ${method}: ${JSON.stringify(paramsClause(spec))},`);
  const keys = categoryKeys(handlers).map(
    ({ key, expr, description }) => `  ${key}: ${expr}.optional().describe(${JSON.stringify(description)}),`,
  );
  return `${HEADER}
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd ${category} handler. */
export const handlerSpecs: HandlerSpecs = ${JSON.stringify(specs, null, 2)};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
${clauses.join("\n")}
};

/** Every key the spec'd ${category} handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
${keys.join("\n")}
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses, handlerSpecs);
`;
}

/** The index that gathers every category's recorded specs. */
export function renderIndexModule(categories) {
  const imports = categories.map((c) => `import { handlerSpecs as ${c} } from "./${c}.generated.js";`);
  return `${HEADER}
import type { HandlerSpecs } from "../../handler-spec.js";
${imports.join("\n")}

/** Every recorded handler spec, across categories. */
export const RECORDED_HANDLER_SPECS: HandlerSpecs = {
${categories.map((c) => `  ...${c},`).join("\n")}
};
`;
}

/** Every generated file, as relative path to contents. */
export function renderAll(snapshot) {
  const byCategory = handlersByCategory(snapshot);
  const categories = [...byCategory.keys()].sort();
  const files = new Map();
  for (const category of categories) {
    files.set(`src/tools/specs/${category}.generated.ts`, renderCategoryModule(category, byCategory.get(category)));
  }
  files.set("src/tools/specs/index.ts", renderIndexModule(categories));
  return files;
}
