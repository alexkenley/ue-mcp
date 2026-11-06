import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { levelTool } from "../../src/tools/level.js";
import { blueprintTool } from "../../src/tools/blueprint.js";
import { REGISTERED_HANDLER_TIMEOUT_SECONDS } from "../../src/bridge/bridge-timeouts.js";
import { handlerParamReads, readAllSources } from "../../scripts/lib/handler-param-reads.mjs";
import { readRegistrations } from "../../scripts/audit-handler-conventions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
type RecordedParam = { name: string; type: string; required: boolean; items?: string; enum?: string[]; minimum?: number; maximum?: number };
const SNAPSHOT = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "golden", "handler-specs.json"), "utf8")) as {
  handlers: Record<string, { category: string; params: RecordedParam[]; choices?: Array<{ mode: string; branches: string[][] }> }>;
};
const HANDLERS = path.join(ROOT, "plugin", "ue_mcp_bridge", "Source", "UE_MCP_Bridge", "Private", "Handlers");
const read = (...parts: string[]) => fs.readFileSync(path.join(HANDLERS, ...parts), "utf8");
const MESH_USES_CPP = read("Blueprint", "BlueprintHandlers_MeshUses.cpp");
const WP_CPP = read("Level", "LevelHandlers_WorldPartition.cpp");
const SHARED_H = read("HandlerStaticMeshUse.h");

type Seen = Array<{ method: string; params: Record<string, unknown> }>;
function fakeCtx(seen: Seen) {
  return {
    bridge: {
      isConnected: true,
      call: async (method: string, params: Record<string, unknown>) => { seen.push({ method, params }); return { success: true }; },
      getTarget: () => ({ projectPath: null, port: 0, portSource: "default", verified: true }),
      connect: async () => {},
      retargetProject: () => ({}),
    },
    project: {},
  } as never;
}

const SURFACE = [
  { tool: levelTool, action: "find_static_mesh_uses", method: "find_static_mesh_uses", category: "level", timeout: 300 },
  { tool: levelTool, action: "list_data_layers", method: "list_data_layers", category: "level", timeout: undefined },
  { tool: blueprintTool, action: "find_static_mesh_uses", method: "find_blueprint_static_mesh_uses", category: "blueprint", timeout: 600 },
] as const;
const MESH_ACTIONS = SURFACE.filter((s) => s.action === "find_static_mesh_uses");

describe("mesh uses and data layers: the advertised surface", () => {
  it("records each handler in its category, as a read", () => {
    for (const s of SURFACE) {
      expect(SNAPSHOT.handlers[s.method]?.category, s.method).toBe(s.category);
      const action = s.tool.actions[s.action] as { bridge?: string; effect?: string };
      expect(action.bridge, `${s.category}.${s.action}`).toBe(s.method);
      expect(action.effect, `${s.category}.${s.action}`).toBe("read");
    }
  });

  it("takes meshPaths or meshPathPrefix, at least one, on both mesh actions", () => {
    for (const s of MESH_ACTIONS) {
      const spec = SNAPSHOT.handlers[s.method];
      expect(spec.choices, s.method).toEqual([{ mode: "atLeastOne", branches: [["meshPaths"], ["meshPathPrefix"]] }]);
      const params = Object.fromEntries(spec.params.map((p) => [p.name, p]));
      expect(params.meshPaths, s.method).toMatchObject({ type: "array", items: "string", required: false });
      expect(params.minTiltDegrees, s.method).toMatchObject({ type: "number", minimum: 0, maximum: 180 });
      expect(params.sortBy, s.method).toMatchObject({ type: "string", enum: ["path", "tilt"] });
      expect(params.maxResults?.type, s.method).toBe("integer");
    }
    expect(SNAPSHOT.handlers.find_blueprint_static_mesh_uses.params.map((p) => p.name)).toEqual(expect.arrayContaining(["assetPaths", "directory", "recursive", "maxBlueprints"]));
    expect(SNAPSHOT.handlers.find_static_mesh_uses.params.map((p) => p.name)).toEqual(expect.arrayContaining(["bounds", "world", "pieInstance"]));
  });

  it("mirrors the C++ timeouts, so the client waits as long as the editor may take", () => {
    for (const s of SURFACE) {
      expect(REGISTERED_HANDLER_TIMEOUT_SECONDS[s.method], s.method).toBe(s.timeout);
    }
  });

  it("forwards a mesh request unchanged", async () => {
    for (const s of MESH_ACTIONS) {
      const args = { meshPaths: ["/Game/Props/SM_Crate"], minTiltDegrees: 5, sortBy: "tilt", maxResults: 10 };
      const seen: Seen = [];
      await s.tool.handler(fakeCtx(seen), { action: "find_static_mesh_uses", ...args });
      expect(seen, s.method).toEqual([{ method: s.method, params: args }]);
    }
  });

  it("refuses a request with no mesh, an unknown sort or a tilt past 180 before anything is sent", async () => {
    for (const s of MESH_ACTIONS) {
      for (const bad of [{}, { meshPaths: ["/Game/A"], sortBy: "size" }, { meshPathPrefix: "/Game/", minTiltDegrees: 181 }]) {
        const seen: Seen = [];
        await expect(s.tool.handler(fakeCtx(seen), { action: "find_static_mesh_uses", ...bad }), `${s.method} ${JSON.stringify(bad)}`).rejects.toThrow();
        expect(seen).toEqual([]);
      }
    }
  });

  it("documents the composed transform, the read-only template walk and the data layer join", () => {
    expect(blueprintTool.actions.find_static_mesh_uses.description).toContain("composed up its attach chain");
    expect(blueprintTool.actions.find_static_mesh_uses.description).toContain("without creating override templates");
    expect(levelTool.actions.find_static_mesh_uses.description).toContain("WORLD transform");
    expect(levelTool.actions.list_actor_descs.description).toContain("dataLayerInstances");
    expect(levelTool.actions.list_data_layers.description).toContain("actorCount");
  });
});

describe("mesh uses and data layers: the C++ handlers", () => {
  const registrations = readRegistrations();
  const sources = readAllSources();

  it("read exactly the parameters their recorded specs declare", () => {
    for (const s of SURFACE) {
      const reads = handlerParamReads(s.method, { registrations, sources });
      expect(reads, `${s.method}: handler body not found`).not.toBeNull();
      const declared = SNAPSHOT.handlers[s.method].params.map((p) => p.name).sort();
      expect([...reads!.keys].sort(), s.method).toEqual(declared);
    }
  });

  it("walk Blueprint templates without the subobject tree, which creates override templates", () => {
    const code = MESH_USES_CPP.replace(/\/\/[^\n]*/g, "");
    expect(code).toContain("GetActualComponentTemplate(Class)");
    expect(code).toContain("GetInheritableComponentHandler(/*bCreateIfNecessary*/ false)");
    for (const mutating of ["GatherSubobjectData", "GetObjectForBlueprint", "CreateOverridenComponentTemplate", "GetInheritableComponentHandler(true)", "Modify(", "MarkPackageDirty"]) {
      expect(code, mutating).not.toContain(mutating);
    }
  });

  it("compose a template up its parents and sockets, and leave the root's own transform out of actor space", () => {
    expect(MESH_USES_CPP).toContain("Relative * ParentFrame");
    expect(MESH_USES_CPP).toContain("ParentFrame = Socket * World");
    expect(MESH_USES_CPP).toMatch(/if \(Node\.bRoot\)\s*\{\s*World = FTransform::Identity;/);
  });

  it("measure tilt from the rotation's up axis against +Z", () => {
    expect(SHARED_H).toContain("GetUpVector()");
    expect(SHARED_H).toMatch(/Acos\(FMath::Clamp\(Up\.Z, -1\.0, 1\.0\)\)/);
  });

  it("report dirtiedPackages from every new read", () => {
    for (const file of [MESH_USES_CPP, WP_CPP, read("Level", "LevelHandlers_Inspection.cpp")]) {
      expect(file).toContain('SetBoolField(TEXT("dirtiedPackages")');
    }
  });

  it("list_actor_descs reports asset paths as dataLayers, never instance names read as paths", () => {
    // An instance name such as DataLayer_1A2B is not a path; FSoftObjectPath turned it into "".
    expect(WP_CPP).not.toMatch(/FSoftObjectPath\(\s*DataLayer\w*\.ToString\(\)\s*\)/);
    expect(WP_CPP).toContain("DataLayerAssets = Instance.GetDataLayers();");
    // Reading unresolved names is an engine ensure, so the read is guarded.
    expect(WP_CPP).toMatch(/if \(Instance\.HasResolvedDataLayerInstanceNames\(\)\)\s*\{\s*DataLayerInstanceNames = Instance\.GetDataLayerInstanceNames\(\)\.ToArray\(\);/);
    expect(WP_CPP).toContain('SetArrayField(TEXT("dataLayerInstances")');
  });
});
