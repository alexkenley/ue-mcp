/**
 * The spec'd surface is the recording's surface (#1057).
 *
 * A handler registered with a parameter spec declares its parameters in C++
 * and nowhere else. tests/golden/handler-specs.json is the recording of those
 * specs, and src/tools/specs/ is generated from it. These hold the chain
 * together from the recording down to what a client is handed: the generated
 * modules are exactly what the recording renders to, every action on a spec'd
 * method takes its Params clause from the spec and forwards its bag untouched,
 * a key the category shares with hand-written actions accepts the same thing
 * on both sides, and no spec can claim a name the dispatcher owns.
 *
 * Whether the recording still matches the plugin is asked of a live editor in
 * tests/live/handler-specs.test.ts, and whether each handler reads exactly
 * what its spec declares is the C++ suite's UE.MCP.Bridge.HandlerSpec.Contract.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { renderAll, paramsClause } from "../../scripts/lib/handler-spec-gen.mjs";
import { readCategory } from "../../scripts/lib/tool-source.mjs";
import { readRegistrations } from "../../scripts/audit-handler-conventions.mjs";
import {
  compareHandlerSpecs,
  makeSpecBp,
  specProblems,
  zodSignature,
  type HandlerSpec,
  type HandlerSpecs,
} from "../../src/handler-spec.js";
import { ROUTING_PARAM_NAMES } from "../../src/routing-params.js";
import { parseParams, actionSchema } from "../../src/action-schema.js";
import { animationTool } from "../../src/tools/animation.js";
import { ALL_TOOLS } from "../../src/tools.js";
import type { ToolDef } from "../../src/types.js";
import { schema as specSchema, handlerSpecs } from "../../src/tools/specs/animation.generated.js";
import { RECORDED_HANDLER_SPECS } from "../../src/tools/specs/index.js";
import { deployedPlugin, checkBridgeParity } from "../../src/bridge-parity.js";
import type { BridgeCapabilities } from "../../src/bridge.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAPSHOT = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "golden", "handler-specs.json"), "utf8")) as {
  handlerCount: number;
  handlers: HandlerSpecs;
};

/** Actions of a tool that dispatch to a spec'd bridge method. */
function specdActions(tool: ToolDef = animationTool): Array<[string, { bridge: string; description: string; mapParams?: unknown }]> {
  const out: Array<[string, { bridge: string; description: string; mapParams?: unknown }]> = [];
  for (const [name, spec] of Object.entries(tool.actions)) {
    if (spec.kind === "bridge" && SNAPSHOT.handlers[spec.bridge]) {
      out.push([name, { bridge: spec.bridge, description: spec.description ?? "", mapParams: spec.mapParams }]);
    }
  }
  return out;
}

/**
 * describe_action reports a spec'd action's parameters from its spec: each
 * declared name once, required exactly when the spec says, its aliases on it
 * rather than as separate parameters or a choice between spellings.
 */
function expectDescribedFromSpec(tool: ToolDef, action: string, method: string): void {
  const schema = actionSchema(tool, action);
  const declared = SNAPSHOT.handlers[method].params;
  const aliases = new Set(declared.flatMap((p) => p.aliases ?? []));
  for (const param of declared) {
    const entry = schema.params.find((p) => p.name === param.name);
    expect(entry, `${action}.${param.name}`).toBeDefined();
    expect(entry?.required, `${action}.${param.name} required`).toBe(param.required);
    expect(entry?.aliases, `${action}.${param.name} aliases`).toEqual(param.aliases?.length ? param.aliases : undefined);
    expect(entry?.alternativeGroup, `${action}.${param.name} is not a choice`).toBeUndefined();
  }
  for (const entry of schema.params) expect(aliases.has(entry.name), `${action}: alias ${entry.name} listed as a parameter`).toBe(false);
  expect(schema.alternatives, action).toBeUndefined();
}

describe("the recording", () => {
  it("is well formed and counts itself", () => {
    expect(specProblems(SNAPSHOT.handlers)).toEqual([]);
    expect(SNAPSHOT.handlerCount).toBe(Object.keys(SNAPSHOT.handlers).length);
    expect(Object.keys(SNAPSHOT.handlers)).toEqual(Object.keys(SNAPSHOT.handlers).sort());
  });

  it("refuses every routing name, as a name and as an alias", () => {
    for (const routing of ROUTING_PARAM_NAMES) {
      const asName: HandlerSpecs = { probe: { params: [{ name: routing, type: "string", required: false, description: "" }] } };
      const asAlias: HandlerSpecs = {
        probe: { params: [{ name: "probeName", type: "string", required: false, description: "", aliases: [routing] }] },
      };
      expect(specProblems(asName).join("\n")).toContain("routing name");
      expect(specProblems(asAlias).join("\n")).toContain("routing name");
      expect(() => renderAll({ handlers: { probe: { category: "animation", ...asName.probe } } })).toThrow(/routing name/);
    }
  });

  it("refuses a name declared twice and an item type off an array", () => {
    const twice: HandlerSpecs = {
      probe: {
        params: [
          { name: "a", type: "string", required: false, description: "" },
          { name: "b", type: "string", required: false, description: "", aliases: ["a"] },
        ],
      },
    };
    expect(specProblems(twice).join("\n")).toContain("declared twice");
    const items: HandlerSpecs = { probe: { params: [{ name: "a", type: "string", required: false, description: "", items: "number" }] } };
    expect(specProblems(items).join("\n")).toContain("items on a non-array");
  });

  it("refuses one category key declared with two types", () => {
    const clash = {
      handlers: {
        one: { category: "animation", params: [{ name: "k", type: "string", required: false, description: "" }] },
        two: { category: "animation", params: [{ name: "k", type: "number", required: false, description: "" }] },
      },
    };
    expect(() => renderAll(clash)).toThrow(/one category key has one type/);
  });
});

describe("the generated modules", () => {
  it("are exactly what the recording renders to", () => {
    const files = renderAll(SNAPSHOT);
    const specsDir = path.join(ROOT, "src", "tools", "specs");
    expect(fs.readdirSync(specsDir).map((f) => `src/tools/specs/${f}`).sort()).toEqual([...files.keys()].sort());
    for (const [rel, contents] of files) {
      const onDisk = fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
      expect(onDisk, `${rel} is stale: run npm run specs:generate`).toBe(contents);
    }
  });

  it("carry the recording verbatim", () => {
    const animation = Object.fromEntries(
      Object.entries(SNAPSHOT.handlers).filter(([, spec]) => (spec as HandlerSpec).category === "animation"),
    );
    expect(handlerSpecs).toEqual(animation);
    expect(RECORDED_HANDLER_SPECS).toEqual(SNAPSHOT.handlers);
  });

  it("refuses to declare an action for a method with no recorded spec", () => {
    const specBp = makeSpecBp({ known_method: "Params: none" });
    expect(specBp("read", "Read it.", "known_method").description).toBe("Read it. Params: none");
    expect(() => specBp("read", "Read it.", "unrecorded_method")).toThrow(/No recorded parameter spec/);
  });
});

describe("the animation surface", () => {
  it("has spec'd actions to check", () => {
    expect(specdActions().length).toBeGreaterThanOrEqual(15);
  });

  it("takes each spec'd action's Params clause from its spec, and renames nothing in TS", () => {
    for (const [action, spec] of specdActions()) {
      const clause = paramsClause(SNAPSHOT.handlers[spec.bridge]);
      expect(spec.description.endsWith(` ${clause}`), `${action}: description does not end with its generated clause`).toBe(true);
      expect(spec.mapParams, `${action}: a spec'd action forwards its bag as sent; renames are aliases in the spec`).toBeUndefined();
    }
  });

  it("documents every declared name and alias, and nothing else", () => {
    const known = new Set(Object.keys(animationTool.schema));
    for (const [action, spec] of specdActions()) {
      const declared = SNAPSHOT.handlers[spec.bridge].params.flatMap((p) => [p.name, ...(p.aliases ?? [])]).sort();
      const documented = parseParams(spec.description, known).params.map((p) => p.name).sort();
      expect(documented, action).toEqual(declared);
    }
  });

  it("describes each spec'd action's parameters as its spec declares them", () => {
    for (const [action, spec] of specdActions()) expectDescribedFromSpec(animationTool, action, spec.bridge);
  });

  it("declares every spec'd key, with one type wherever the category also declares it by hand", () => {
    for (const [key, generated] of Object.entries(specSchema)) {
      const advertised = animationTool.schema[key];
      expect(advertised, `${key} is advertised`).toBeDefined();
      expect(zodSignature(advertised as z.ZodTypeAny), key).toBe(zodSignature(generated as z.ZodTypeAny));
    }
  });

  it("never lets a spec'd key replace a routing parameter", () => {
    for (const routing of ROUTING_PARAM_NAMES) expect(Object.keys(specSchema)).not.toContain(routing);
    // The dispatch parameter is still the one categoryTool authored.
    expect(animationTool.schema.action.description).toMatch(/^Action to perform/);
  });

  it("reads the same in the source the audits parse as it does at runtime", () => {
    const parsed = readCategory(path.join(ROOT, "src", "tools", "animation.ts"));
    expect(parsed).not.toBeNull();
    const byName = new Map(parsed!.actions.map((a: { name: string; description: string }) => [a.name, a.description]));
    for (const [action, spec] of specdActions()) {
      expect(byName.get(action), action).toBe(spec.description);
    }
  });
});

/** What zodSignature reports for the key a spec'd parameter generates. */
function specSignature(type: string, items?: string): string {
  const base: Record<string, string> = {
    string: "string",
    number: "number",
    integer: "integer",
    boolean: "boolean",
    object: "record<any>",
    vec3: "{x:number,y:number,z:number}",
    rotator: "{pitch:number,roll:number,yaw:number}",
    any: "any",
  };
  return `${type === "array" ? `array<${base[items ?? "any"]}>` : base[type]}?`;
}

/**
 * Whether a key a tool advertises accepts what a spec declares for it. A key
 * the tool shares with its own category must match exactly (checked per
 * category below); a key another category's handler declares only has to be
 * accepted, and an integer is a number.
 */
function accepts(advertised: string, declared: string): boolean {
  return advertised === declared || (advertised === "number?" && declared === "integer?");
}

/** Every action, in any tool, that dispatches each spec'd method, as tool.action. */
const DISPATCHERS = new Map<string, string[]>();
for (const tool of ALL_TOOLS) {
  for (const [action, spec] of specdActions(tool)) {
    DISPATCHERS.set(spec.bridge, [...(DISPATCHERS.get(spec.bridge) ?? []), `${tool.name}.${action}`]);
  }
}

/** The C++ function each registered method runs, as FClass::Function. */
const HANDLER_FUNCTIONS = new Map(
  [...(readRegistrations() as Map<string, { method: string; className: string | null }>)].map(
    ([method, reg]) => [method, `${reg.className}::${reg.method}`],
  ),
);

/**
 * The dispatched spec'd method a spec'd method is a C++ alias of: a second
 * RegisterHandler call binding the same function under an older spelling,
 * kept so the old name does not become "Unknown method".
 */
function aliasOf(method: string): string | undefined {
  const fn = HANDLER_FUNCTIONS.get(method);
  if (!fn) return undefined;
  for (const [other, otherFn] of HANDLER_FUNCTIONS) {
    if (other !== method && otherFn === fn && SNAPSHOT.handlers[other] && DISPATCHERS.has(other)) return other;
  }
  return undefined;
}

/**
 * Actions that dispatch another category's spec'd method but still carry a
 * hand-written clause, because the recording lacks names they advertise. The
 * RegisterHandler spec already declares those names as aliases; once
 * specs:record picks them up, convert the action to that category's specBp
 * and delete its entry here. The last test below fails when that is due.
 */
const HAND_WRITTEN_CROSS_TOOL: ReadonlyMap<string, string> = new Map([]);

// Every other recorded category is held to the same surface rules as the pilot.
const OTHER_CATEGORIES = [...new Set(Object.values(SNAPSHOT.handlers).map((s) => s.category as string))]
  .filter((c) => c !== "animation")
  .sort();

describe.each(OTHER_CATEGORIES)("the %s category", (category) => {
  const tool = ALL_TOOLS.find((t) => t.name === category)!;
  const methods = Object.entries(SNAPSHOT.handlers).filter(([, s]) => s.category === category);

  it("is a tool, and every spec'd method is dispatched by an action or is a C++ alias of one that is", () => {
    expect(tool, category).toBeDefined();
    for (const [method] of methods) {
      expect(DISPATCHERS.has(method) || aliasOf(method) !== undefined, `${method}: no action dispatches it`).toBe(true);
    }
  });

  it("declares every spec'd key, with one type wherever the category also declares it by hand", () => {
    for (const [method, spec] of methods) {
      for (const param of spec.params) {
        for (const key of [param.name, ...(param.aliases ?? [])]) {
          const advertised = tool.schema[key];
          expect(advertised, `${method}: ${key} is advertised`).toBeDefined();
          expect(zodSignature(advertised as z.ZodTypeAny), `${method}: ${key}`).toBe(specSignature(param.type, param.items));
        }
      }
    }
  });

  it("keeps the dispatch parameter categoryTool authored", () => {
    expect(tool.schema.action.description).toMatch(/^Action to perform/);
  });
});

// Every tool that dispatches a spec'd method, whichever category registered it.
const SPEC_TOOLS = ALL_TOOLS.filter((t) => t.name !== "animation" && specdActions(t).length > 0).map((t) => t.name).sort();

describe.each(SPEC_TOOLS)("the %s tool", (toolName) => {
  const tool = ALL_TOOLS.find((t) => t.name === toolName)!;
  const actions = specdActions(tool).filter(([action]) => !HAND_WRITTEN_CROSS_TOOL.has(`${toolName}.${action}`));

  it("takes each spec'd action's Params clause from its spec, and renames nothing in TS", () => {
    for (const [action, spec] of actions) {
      const clause = paramsClause(SNAPSHOT.handlers[spec.bridge]);
      expect(spec.description.endsWith(` ${clause}`), `${action}: description does not end with its generated clause`).toBe(true);
      expect(spec.mapParams, `${action}: a spec'd action forwards its bag as sent; renames are aliases in the spec`).toBeUndefined();
    }
  });

  it("documents every declared name and alias, and nothing else", () => {
    const known = new Set(Object.keys(tool.schema));
    for (const [action, spec] of actions) {
      const declared = SNAPSHOT.handlers[spec.bridge].params.flatMap((p) => [p.name, ...(p.aliases ?? [])]).sort();
      const documented = parseParams(spec.description, known).params.map((p) => p.name).sort();
      expect(documented, action).toEqual(declared);
    }
  });

  it("describes each spec'd action's parameters as its spec declares them", () => {
    for (const [action, spec] of actions) expectDescribedFromSpec(tool, action, spec.bridge);
  });

  it("advertises every key its spec'd actions declare, accepting what the spec declares", () => {
    for (const [action, spec] of actions) {
      for (const param of SNAPSHOT.handlers[spec.bridge].params) {
        for (const key of [param.name, ...(param.aliases ?? [])]) {
          const advertised = tool.schema[key];
          expect(advertised, `${action}: ${key} is advertised`).toBeDefined();
          const signature = zodSignature(advertised as z.ZodTypeAny);
          expect(accepts(signature, specSignature(param.type, param.items)), `${action}: ${key} is ${signature}`).toBe(true);
        }
      }
    }
  });

  it("reads the same in the source the audits parse as it does at runtime", () => {
    const parsed = readCategory(path.join(ROOT, "src", "tools", `${toolName}.ts`));
    expect(parsed).not.toBeNull();
    const byName = new Map(parsed!.actions.map((a: { name: string; description: string }) => [a.name, a.description]));
    for (const [action, spec] of actions) {
      expect(byName.get(action), action).toBe(spec.description);
    }
  });
});


describe("drift against a connected editor", () => {
  const recorded: HandlerSpecs = {
    one: { category: "animation", params: [{ name: "assetPath", type: "string", required: true, description: "d", aliases: ["path"] }] },
  };

  it("compares nothing when the plugin published no specs", () => {
    expect(compareHandlerSpecs(recorded, undefined)).toEqual({ checked: false, drifted: [] });
  });

  it("names a method whose contract changed, appeared or vanished", () => {
    expect(compareHandlerSpecs(recorded, recorded).drifted).toEqual([]);
    const changed = { one: { ...recorded.one, params: [{ ...recorded.one.params[0], required: false }] } };
    expect(compareHandlerSpecs(recorded, changed).drifted).toEqual(["one"]);
    expect(compareHandlerSpecs(recorded, { ...recorded, two: { params: [] } }).drifted).toEqual(["two"]);
    expect(compareHandlerSpecs(recorded, {}).drifted).toEqual(["one"]);
  });

  it("is reported by project(get_status) only when there is some", () => {
    const caps = (handlerSpecs: unknown): BridgeCapabilities =>
      ({ actions: ["one"], actionCount: 1, handlerSpecs } as unknown as BridgeCapabilities);
    const parity = checkBridgeParity([], caps(recorded));
    expect(deployedPlugin(caps(recorded), parity, recorded)).toBeUndefined();
    const drifted = deployedPlugin(caps({}), parity, recorded);
    expect(drifted?.handlerSpecDrift).toEqual(["one"]);
    expect(drifted?.handlerSpecWarning).toContain("specs:record");
  });
});
