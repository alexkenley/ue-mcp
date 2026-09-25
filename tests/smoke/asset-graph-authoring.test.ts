// asset graph authoring (#1059) on a SoundCue: a schema-driven EdGraph that
// every editor has, so the generic path is exercised without Mutable.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callBridge, disconnectBridge, getBridge, TEST_PREFIX } from "../setup.js";
import type { EditorBridge } from "../../src/bridge.js";

interface Pin { name: string; pinId: string; direction: string; linkCount?: number }
interface Node { name: string; nodeGuid: string; path: string; class: string; pins?: Pin[] }

let bridge: EditorBridge;
const assetName = `SC_GraphAuthoring_${process.pid}`;
const assetPath = `${TEST_PREFIX}/${assetName}`;

async function readNodes(): Promise<Node[]> {
  const read = await callBridge(bridge, "read_asset_graph", { assetPath });
  expect(read.ok, read.error).toBe(true);
  const graphs = (read.result as { graphs?: { nodes?: Node[] }[] }).graphs ?? [];
  return graphs.flatMap((g) => g.nodes ?? []);
}

beforeAll(async () => {
  bridge = await getBridge();
}, 60_000);

afterAll(async () => {
  await callBridge(bridge, "delete_asset", { assetPath, force: true }).catch(() => {});
  disconnectBridge();
});

describe("asset - graph authoring through the schema", () => {
  it("adds, connects, disconnects and removes a node", async () => {
    await callBridge(bridge, "delete_asset", { assetPath, force: true }).catch(() => {});
    const created = await callBridge(bridge, "create_sound_cue", { name: assetName, packagePath: TEST_PREFIX });
    expect(created.ok, created.error).toBe(true);

    const root = (await readNodes()).find((n) => n.class === "SoundCueGraphNode_Root");
    expect(root, "the cue has a root node").toBeDefined();
    const rootInput = root!.pins!.find((p) => p.direction === "input")!;
    expect(rootInput).toBeDefined();

    const added = await callBridge(bridge, "add_graph_node", {
      assetPath, nodeClass: "SoundNodeAttenuation", posX: -300, posY: 0, save: false,
    });
    expect(added.ok, added.error).toBe(true);
    const add = added.result as { nodeGuid: string; nodePath: string; createdVia: string; pins: Pin[] };
    expect(add.createdVia).toBe("schema_action");
    const output = add.pins.find((p) => p.direction === "output")!;
    expect(output, "the new node has an output pin").toBeDefined();

    const connected = await callBridge(bridge, "connect_graph_pins", {
      assetPath, sourceNode: add.nodeGuid, sourcePinId: output.pinId, targetPinId: rootInput.pinId, save: false,
    });
    expect(connected.ok, connected.error).toBe(true);
    expect((connected.result as { rollback?: { method: string } }).rollback?.method).toBe("disconnect_graph_pins");

    const again = await callBridge(bridge, "connect_graph_pins", {
      assetPath, sourcePinId: output.pinId, targetPinId: rootInput.pinId, save: false,
    });
    expect(again.ok, again.error).toBe(true);
    expect((again.result as { existed?: boolean }).existed).toBe(true);

    const disconnected = await callBridge(bridge, "disconnect_graph_pins", {
      assetPath, sourcePinId: output.pinId, targetPinId: rootInput.pinId, save: false,
    });
    expect(disconnected.ok, disconnected.error).toBe(true);
    expect((disconnected.result as { brokenCount?: number }).brokenCount).toBe(1);

    const removed = await callBridge(bridge, "remove_graph_node", { assetPath, node: add.nodePath, save: false });
    expect(removed.ok, removed.error).toBe(true);
    expect((await readNodes()).some((n) => n.nodeGuid === add.nodeGuid)).toBe(false);
  });

  it("lists the schema's actions when nothing spawns the class", async () => {
    const r = await callBridge(bridge, "add_graph_node", { assetPath, nodeClass: "Actor", save: false });
    expect(r.ok).toBe(false);
  });

  it("compile_customizable_object refuses a non-CustomizableObject", async () => {
    const r = await callBridge(bridge, "compile_customizable_object", { assetPath });
    expect(r.ok).toBe(false);
    expect(r.error ?? "").toMatch(/Mutable plugin not available|not a CustomizableObject/);
  });
});
