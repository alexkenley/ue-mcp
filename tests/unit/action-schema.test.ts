/**
 * The advertised parameter surface has to match the accepted one.
 *
 * A category's zod shape is one flat bag shared by every action in it, and an
 * MCP tool call is validated against that bag with unknown keys stripped. So a
 * parameter an action documents, or reads out of its own `mapParams`, but
 * which the category never declares, does not fail: it arrives at the handler
 * as `undefined`. The call then returns a perfectly ordinary success for a
 * mutation that never happened, which is the single worst failure shape this
 * server has, because nothing downstream can detect it.
 *
 * These tests hold three properties over the whole surface:
 *
 *   1. every action documents its parameters at all,
 *   2. every documented or forwarded parameter is actually declared, and
 *   3. `describe_action` can answer for any of them.
 *
 * A new action that breaks any of the three fails here rather than in an
 * agent session six weeks later.
 */
import { describe, it, expect } from "vitest";
import { ALL_TOOLS } from "../../src/tools.js";
import { requiresExplicitEditor } from "../../src/action-class.js";
import {
  actionSchema,
  allActionSchemas,
  forwardedParams,
  nearestActions,
  parseParamsClause,
  resolveActionRef,
  similarity,
  suggestActions,
} from "../../src/action-schema.js";

describe("action parameter schema", () => {
  it("declares every parameter it documents or forwards", () => {
    const offenders = allActionSchemas(ALL_TOOLS)
      .filter((a) => a.drift.length > 0)
      .map((a) => `${a.tool}.${a.action}: ${a.drift.join(", ")}`);

    expect(
      offenders,
      "These actions document or read a parameter their category never declares.\n"
        + "The MCP layer strips undeclared keys, so passing one has NO effect and the\n"
        + "call still reports success. Declare it in the category's extraSchema, or\n"
        + "stop documenting/reading it:\n  " + offenders.join("\n  "),
    ).toEqual([]);
  });

  it("documents parameters on every action", () => {
    const undocumented: string[] = [];
    for (const tool of ALL_TOOLS) {
      for (const [action, spec] of Object.entries(tool.actions)) {
        const description = spec.description ?? "";
        if (!/\bParams:/.test(description)) undocumented.push(`${tool.name}.${action}`);
      }
    }
    expect(
      undocumented,
      "Every action's description must carry a `Params:` clause listing what it\n"
        + "takes, or `Params: none`. It is the only per-action parameter documentation\n"
        + "the surface has - the zod shape is per category, not per action:\n  "
        + undocumented.join("\n  "),
    ).toEqual([]);
  });

  it("agrees with itself about whether a parameter is required", () => {
    // A parameter the description marks required must not be declared with a
    // schema default, which would silently make it optional.
    const contradictions: string[] = [];
    for (const schema of allActionSchemas(ALL_TOOLS)) {
      for (const param of schema.params) {
        if (param.required && param.default !== undefined) {
          contradictions.push(`${schema.tool}.${schema.action}.${param.name}`);
        }
      }
    }
    expect(contradictions).toEqual([]);
  });
});

describe("parseParamsClause", () => {
  it("reads a plain list, with optionality from the ? marker", () => {
    expect(parseParamsClause("Does a thing. Params: assetPath, propertyName, save?")).toEqual([
      { name: "assetPath", optional: false },
      { name: "propertyName", optional: false },
      { name: "save", optional: true },
    ]);
  });

  it("treats a parenthesised aside as commentary, not as parameters", () => {
    expect(parseParamsClause("Params: query (space-separated keywords), limit? (default 20)")).toEqual([
      { name: "query", optional: false },
      { name: "limit", optional: true },
    ]);
  });

  it("stops at the Returns clause, whose names are result fields", () => {
    const names = parseParamsClause("Params: assetPath. Returns min, max, boxExtent, meshKind").map((p) => p.name);
    expect(names).toEqual(["assetPath"]);
  });

  it("stops where the description resumes prose", () => {
    const names = parseParamsClause(
      "Params: path (relative to Source/), content. After editing, call live_coding_compile.",
    ).map((p) => p.name);
    expect(names).toEqual(["path", "content"]);
  });

  it("reads both sides of an OR alternative", () => {
    const names = parseParamsClause("Params: assetPaths? (string[]) OR directory?, classNames?").map((p) => p.name);
    expect(names).toEqual(["assetPaths", "directory", "classNames"]);
  });

  it("reads a nested (+ ...) group as further parameters", () => {
    const names = parseParamsClause("Params: directory? (+ recursive?, default true), limit?").map((p) => p.name);
    expect(names).toEqual(["directory", "recursive", "limit"]);
  });

  it("reads a slash alias as both spellings, since the resolver accepts both", () => {
    const names = parseParamsClause("Params: target/targetLabel (actor label) OR targetPath").map((p) => p.name);
    expect(names).toEqual(["target", "targetLabel", "targetPath"]);
  });

  it("looks past an 'at least one of' quantifier to the parameters behind it", () => {
    const names = parseParamsClause("Params: properties, at least one of actorLabels/labelPrefix, dryRun?").map((p) => p.name);
    expect(names).toContain("actorLabels");
    expect(names).toContain("labelPrefix");
    expect(names).not.toContain("at");
  });

  it("reads `Params: none` as no parameters rather than as a parameter named none", () => {
    expect(parseParamsClause("Reads the thing. Params: none (#204)")).toEqual([]);
  });

  it("returns nothing when there is no clause at all", () => {
    expect(parseParamsClause("Just a description.")).toEqual([]);
  });
});

describe("forwardedParams", () => {
  it("reads the keys a mapParams closure pulls off its bag", () => {
    const names = forwardedParams({ bridge: "x", mapParams: (p) => ({ a: p.alpha, b: p.beta }) });
    expect(names.sort()).toEqual(["alpha", "beta"]);
  });

  it("reports both spellings of an alias", () => {
    const names = forwardedParams({ bridge: "x", mapParams: (p) => ({ assetPath: p.assetPath ?? p.path }) });
    expect(names.sort()).toEqual(["assetPath", "path"]);
  });

  it("does not mistake a method call for a parameter", () => {
    // `arr.length` and `Array.isArray` are not parameters, and reporting them
    // would put permanent false entries in the drift guard above.
    const names = forwardedParams({
      bridge: "x",
      mapParams: (p) => ({ n: Array.isArray(p.items) ? (p.items as unknown[]).length : 0 }),
    });
    expect(names).toEqual(["items"]);
  });

  it("reads a local handler's second argument", () => {
    const names = forwardedParams({ handler: async (_ctx, p) => p.slotName });
    expect(names).toEqual(["slotName"]);
  });

  it("is empty for an action that takes no parameters", () => {
    expect(forwardedParams({ bridge: "x" })).toEqual([]);
  });
});

describe("actionSchema", () => {
  it("reports the bridge method and required parameters of a real action", () => {
    const asset = ALL_TOOLS.find((t) => t.name === "asset")!;
    const schema = actionSchema(asset, "set_property");

    expect(schema.bridge).toBe("set_asset_property");
    expect(schema.local).toBe(false);
    expect(schema.drift).toEqual([]);

    const byName = new Map(schema.params.map((p) => [p.name, p]));
    expect(byName.get("assetPath")?.required).toBe(true);
    expect(byName.get("propertyName")?.required).toBe(true);
    expect(byName.get("save")?.required).toBe(false);
    expect(byName.get("save")?.type).toBe("boolean");
  });

  it("marks a server-side action as local", () => {
    const project = ALL_TOOLS.find((t) => t.name === "project")!;
    expect(actionSchema(project, "search_tools").local).toBe(true);
  });

  it("offers the routing parameters every action accepts", () => {
    const project = ALL_TOOLS.find((t) => t.name === "project")!;
    const names = actionSchema(project, "search_tools").params.map((p) => p.name);
    expect(names).toContain("timeoutMs");
  });

  it("refuses an action the tool does not have", () => {
    const asset = ALL_TOOLS.find((t) => t.name === "asset")!;
    expect(() => actionSchema(asset, "no_such_action")).toThrow(/Unknown action/);
  });
});

describe("resolveActionRef", () => {
  it("resolves a qualified name to exactly one action", () => {
    const hits = resolveActionRef("asset.set_property", ALL_TOOLS);
    expect(hits).toHaveLength(1);
    expect(hits[0].tool.name).toBe("asset");
  });

  it("accepts a colon separator as well as a dot", () => {
    expect(resolveActionRef("asset:set_property", ALL_TOOLS)).toHaveLength(1);
  });

  it("returns every category providing a bare name", () => {
    const hits = resolveActionRef("save", ALL_TOOLS);
    expect(hits.length).toBeGreaterThan(1);
  });

  it("returns nothing for a name no category has", () => {
    expect(resolveActionRef("definitely_not_an_action", ALL_TOOLS)).toEqual([]);
  });

  it("does not fall back to a bare match when the category was named and lacks it", () => {
    // `asset.list_layers` must not resolve to `landscape.list_layers`: the
    // caller named a category, and quietly serving another one's action would
    // hand back a schema for a call that cannot be made.
    expect(resolveActionRef("asset.list_layers", ALL_TOOLS)).toEqual([]);
  });
});

describe("suggestions", () => {
  it("puts the intended action first for a one-character typo", () => {
    expect(suggestActions("asset.set_propery", ALL_TOOLS)[0]).toBe("asset.set_property");
  });

  it("finds an action from a truncated name", () => {
    expect(suggestActions("sculp", ALL_TOOLS)).toContain("landscape.sculpt");
  });

  it("ranks a containing name above an unrelated one", () => {
    expect(similarity("sculpt", "sculpt")).toBe(1);
    expect(similarity("sculp", "sculpt")).toBeGreaterThan(similarity("sculp", "select_actors"));
  });

  it("scores nothing for names with no real overlap", () => {
    expect(similarity("zzzz", "sculpt")).toBe(0);
  });

  it("nearestActions works off a plain name list", () => {
    expect(nearestActions("scul", ["sculpt", "paint_layer", "create"])).toEqual(["sculpt"]);
  });

  it("returns nothing rather than noise for an empty reference", () => {
    expect(nearestActions("", ["sculpt"])).toEqual([]);
    expect(suggestActions("", ALL_TOOLS)).toEqual([]);
  });
});

describe("action class", () => {
  it("labels a read as read and a mutation as mutate", () => {
    const asset = ALL_TOOLS.find((t) => t.name === "asset")!;
    expect(actionSchema(asset, "read_properties").class).toBe("read");
    expect(actionSchema(asset, "set_property").class).toBe("mutate");
    expect(actionSchema(asset, "delete").class).toBe("mutate");
  });

  it("labels every action on the surface", () => {
    // `unknown` is a real answer for an action whose effect a parameter
    // decides, but it must be a deliberate one, not a gap.
    for (const schema of allActionSchemas(ALL_TOOLS)) {
      expect(["read", "mutate", "unknown"], `${schema.tool}.${schema.action}`).toContain(schema.class);
    }
  });

  it("says unknown for an action whose effect a parameter decides", () => {
    // What editor(invoke_function) does is chosen by the UFUNCTION named in
    // its parameters, so the honest label is unknown. It is gated exactly
    // like a mutation, which is why the honest label costs nothing.
    const editor = ALL_TOOLS.find((t) => t.name === "editor")!;
    expect(actionSchema(editor, "invoke_function").class).toBe("unknown");
    expect(requiresExplicitEditor(actionSchema(editor, "invoke_function").class)).toBe(true);
  });

  it("gates arbitrary python as a mutation rather than leaving it unlabelled", () => {
    const editor = ALL_TOOLS.find((t) => t.name === "editor")!;
    expect(actionSchema(editor, "execute_python").class).toBe("mutate");
  });
});
