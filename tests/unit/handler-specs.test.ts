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
import { renderAll } from "../../scripts/lib/handler-spec-gen.mjs";
import { makeSpecBp, specProblems, type HandlerSpec, type HandlerSpecs } from "../../src/handler-spec.js";
import { ROUTING_PARAM_NAMES } from "../../src/routing-params.js";
import { handlerSpecs } from "../../src/tools/specs/animation.generated.js";
import { RECORDED_HANDLER_SPECS } from "../../src/tools/specs/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAPSHOT = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "golden", "handler-specs.json"), "utf8")) as {
  handlerCount: number;
  handlers: HandlerSpecs;
};

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

