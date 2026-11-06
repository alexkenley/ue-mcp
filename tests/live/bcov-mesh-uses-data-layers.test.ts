// @live-editor headless
/**
 * Static mesh uses with their transforms, read natively from a placed level and from Blueprint templates, and a
 * World Partition map's data layers: list_data_layers, and the data layer names list_actor_descs reports for an
 * actor that is in one. Scratch content under /Game/MCPTest/BCov/MeshUses; the map open before the file is
 * reopened afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callBridge, disconnectBridge, getBridge, TEST_PREFIX, type TestResult } from "../setup.js";
import type { EditorBridge } from "../../src/bridge/bridge.js";

const HOME = "/Game/MCP_Home";
const DIR = `${TEST_PREFIX}/BCov/MeshUses`;
const FLAT = `${DIR}/L_BCovMeshUses`;
const WP = `${DIR}/L_BCovMeshUses_WP`;
const BP = `${DIR}/BP_BCovMeshUses`;
const LAYER = "DL_BCovMeshUses";
const LAYER_ASSET = `${DIR}/${LAYER}`;
const CUBE = "/Engine/BasicShapes/Cube.Cube";

type Json = Record<string, unknown>;
const body = (r: TestResult): Json => (r.result && typeof r.result === "object" ? (r.result as Json) : {});
const succeeded = (r: TestResult): boolean => r.ok && body(r).success !== false;

let bridge: EditorBridge;
let originalMap: string | undefined;

async function call(method: string, params: Json = {}): Promise<Json> {
  const r = await callBridge(bridge, method, params);
  expect(succeeded(r), `${method}: ${r.error ?? JSON.stringify(r.result)}`).toBe(true);
  return body(r);
}

async function currentMap(): Promise<string | undefined> {
  return body(await callBridge(bridge, "get_current_level", {})).mapPackagePath as string | undefined;
}

/** Leave for the home map, then create a fresh map at path and open it. */
async function openNewMap(path: string, extra: Json = {}): Promise<Json> {
  await callBridge(bridge, "load_level", { levelPath: HOME, discardUnsaved: true });
  await callBridge(bridge, "delete_asset", { assetPath: path, force: true });
  const created = await call("create_new_level", { levelPath: path, ...extra });
  expect(await currentMap()).toBe(path);
  return created;
}

async function cube(label: string, rotation = { pitch: 0, yaw: 0, roll: 0 }): Promise<void> {
  await call("place_actor", {
    actorClass: "/Script/Engine.StaticMeshActor", label, staticMesh: CUBE, location: { x: 0, y: 0, z: 100 }, rotation,
  });
}

const rows = (out: Json, list = "components"): Json[] => (out[list] as Json[] | undefined) ?? [];

beforeAll(async () => {
  bridge = await getBridge();
  originalMap = await currentMap();
  await call("demo_go_home");
}, 300_000);

afterAll(async () => {
  if (!bridge) return;
  const back = originalMap && originalMap.startsWith("/Game/") && !originalMap.startsWith(DIR) ? originalMap : HOME;
  const restored = await callBridge(bridge, "load_level", { levelPath: back, discardUnsaved: true });
  if (!succeeded(restored)) await callBridge(bridge, "load_level", { levelPath: HOME, discardUnsaved: true });
  for (const path of [FLAT, WP, BP, LAYER_ASSET]) await callBridge(bridge, "delete_asset", { assetPath: path, force: true });
  disconnectBridge();
}, 300_000);

describe("static mesh uses with their transforms", () => {
  const TILTED = "BCov_MeshUses_Tilted";
  const UPRIGHT = "BCov_MeshUses_Upright";

  beforeAll(async () => {
    await openNewMap(FLAT);
    await cube(TILTED, { pitch: 35, yaw: 0, roll: 0 });
    await cube(UPRIGHT);

    await callBridge(bridge, "delete_asset", { assetPath: BP, force: true });
    await call("create_blueprint", { assetPath: BP, parentClass: "Actor" });
    await call("add_component", { assetPath: BP, componentClass: "StaticMeshComponent", componentName: "Mesh" });
    await call("set_blueprint_component_property", { assetPath: BP, componentName: "Mesh", propertyName: "StaticMesh", value: CUBE });
    await call("set_blueprint_component_property", {
      assetPath: BP, componentName: "Mesh", propertyName: "RelativeRotation", value: "(Pitch=25.000000,Yaw=0.000000,Roll=0.000000)",
    });
    await call("save_asset", { assetPaths: [BP], force: true });
    // The registry learns a saved package's dependencies from the file; rescan rather than wait for the watcher.
    await call("reindex_assets_fts", { directory: DIR });
  }, 300_000);

  it("level find_static_mesh_uses reports a placed mesh's world tilt and filters by it", async () => {
    const out = await call("find_static_mesh_uses", { meshPaths: [CUBE], minTiltDegrees: 10, sortBy: "tilt" });
    expect(out.loadedOnly).toBe(true);
    expect(out.dirtiedPackages).toBe(false);
    const tilted = rows(out).find((r) => r.actorLabel === TILTED);
    expect(tilted, JSON.stringify(out)).toBeDefined();
    expect(Number(tilted!.tiltDegrees)).toBeCloseTo(35, 2);
    expect(tilted!.meshPath).toBe(CUBE);
    // The upright cube is counted, not listed.
    expect(rows(out).some((r) => r.actorLabel === UPRIGHT)).toBe(false);
    expect(Number(out.belowMinTilt)).toBeGreaterThanOrEqual(1);
    expect(out.unknownMeshPaths).toEqual([]);
  }, 120_000);

  it("blueprint find_static_mesh_uses finds the template through the registry, with its tilt", async () => {
    const out = await call("find_blueprint_static_mesh_uses", { meshPaths: [CUBE], directory: DIR });
    expect(out.dirtiedPackages).toBe(false);
    expect((out.selection as Json).selectedBy).toBe("referencers");
    const row = rows(out).find((r) => String(r.blueprintPath).startsWith(BP) && r.componentName === "Mesh");
    expect(row, JSON.stringify(out)).toBeDefined();
    expect(row!.source).toBe("own");
    expect(Number(row!.tiltDegrees)).toBeCloseTo(25, 2);
    // Only Blueprints under the directory are read.
    expect(rows(out).every((r) => String(r.blueprintPath).startsWith(DIR))).toBe(true);
  }, 120_000);
});

describe("World Partition data layers", () => {
  const LABEL = "BCov_MeshUses_Layered";
  let assetPath = "";

  beforeAll(async () => {
    const created = await openNewMap(WP, { worldPartition: true });
    expect(created.worldPartition).toBe(true);
    await cube(LABEL);
    await callBridge(bridge, "delete_asset", { assetPath: LAYER_ASSET, force: true });
    // No native action authors a data layer, so the fixture does it in Python; everything asserted is read natively.
    const code = [
      "import unreal, json",
      `asset = unreal.AssetToolsHelpers.get_asset_tools().create_asset("${LAYER}", "${DIR}", unreal.DataLayerAsset, None)`,
      // A new data layer asset is a runtime layer by default; set it anyway in case the default moves.
      "try:",
      "    asset.set_editor_property('data_layer_type', unreal.DataLayerType.RUNTIME)",
      "except Exception as e:",
      "    unreal.log_warning(str(e))",
      "unreal.EditorAssetLibrary.save_loaded_asset(asset, False)",
      "layers = unreal.get_editor_subsystem(unreal.DataLayerEditorSubsystem)",
      "params = unreal.DataLayerCreationParameters()",
      "params.set_editor_property('data_layer_asset', asset)",
      "instance = layers.create_data_layer_instance(params)",
      "layers.set_data_layer_initial_runtime_state(instance, unreal.DataLayerRuntimeState.ACTIVATED)",
      `actor = [a for a in unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors() if a.get_actor_label() == "${LABEL}"][0]`,
      "added = layers.add_actor_to_data_layer(actor, instance)",
      "print(json.dumps({'asset': asset.get_path_name(), 'added': added}))",
    ].join("\n");
    const out = await call("execute_python", { code });
    const printed = JSON.parse(String(out.output ?? "").trim().split("\n").pop() ?? "{}") as Json;
    expect(printed.added, JSON.stringify(out)).toBe(true);
    assetPath = String(printed.asset);
    await call("save_level");
    // Reopened from disk, so the layer membership is read from the saved descriptors.
    await call("load_level", { levelPath: HOME });
    await call("load_level", { levelPath: WP });
  }, 300_000);

  it("list_data_layers reports the layer's asset, state and membership", async () => {
    const out = await call("list_data_layers", { includeMembers: true });
    expect(out.dirtiedPackages).toBe(false);
    const layer = (out.dataLayers as Json[]).find((l) => l.shortName === LAYER);
    expect(layer, JSON.stringify(out)).toBeDefined();
    expect(layer!.assetPath).toBe(assetPath);
    expect(layer!.type).toBe("Runtime");
    expect(layer!.isRuntime).toBe(true);
    expect(layer!.initialRuntimeState).toBe("Activated");
    expect(layer!.actorCount).toBe(1);
    expect((layer!.members as Json[]).map((m) => m.label)).toEqual([LABEL]);

    const filtered = await call("list_data_layers", { filter: "no-such-layer" });
    expect(filtered.matched).toBe(0);
  }, 120_000);

  it("list_actor_descs names the actor's data layer instead of an empty string", async () => {
    const descs = await call("list_actor_descs", { filter: LABEL });
    expect(descs.matched).toBe(1);
    const desc = (descs.actorDescs as Json[])[0];
    expect(desc.dataLayers).toEqual([assetPath]);
    const instances = desc.dataLayerInstances as Json[];
    expect(instances).toHaveLength(1);
    expect(instances[0].shortName).toBe(LAYER);
    expect(instances[0].assetPath).toBe(assetPath);
    expect(instances[0].resolved).toBe(true);

    const layers = await call("list_data_layers", { filter: LAYER });
    expect((layers.dataLayers as Json[])[0].instanceName).toBe(instances[0].instanceName);
  }, 120_000);
});
