import { z } from "zod";
import { categoryTool, bp, type ToolDef } from "../types.js";
import { Vec3 } from "../schemas.js";
import { PAGINATION_SCHEMA } from "../pagination.js";
import { actions as epicActions, schema as epicSchema } from "./epic/pcg.generated.js";
import { specBp, schema as specSchema } from "./specs/pcg.generated.js";

export const pcgTool: ToolDef = categoryTool(
  "pcg",
  "Procedural Content Generation: graphs, nodes, connections, execution, volumes.",
  {
    list_graphs:          specBp("read", "List PCG graphs, sorted by object path. Lists the whole project; page through it with cursor/limit.", "list_pcg_graphs"),
    read_graph:           specBp("read", "Read graph structure.", "read_pcg_graph"),
    read_node_settings:   specBp("read", "Read node settings.", "read_pcg_node_settings"),
    get_components:       specBp("read", "List PCG components in level.", "get_pcg_components"),
    get_component_details: bp("read", "Inspect PCG component. Params: actorLabel OR actorPath (#983)", "get_pcg_component_details"),
    create_graph:         bp("mutate", "Create graph. Idempotent by path: an existing graph is reported rather than replaced. Params: name, packagePath? (default /Game/PCG), onConflict? (skip|error)", "create_pcg_graph"),
    add_node:             specBp("mutate", "Add node. nodeName is a RESULT, not an input: the engine assigns the name and this action reports it back for connect_nodes and remove_node.", "add_pcg_node"),
    connect_nodes:        specBp("mutate", "Wire nodes. Returns edgeVerified=true after confirming the UPCGEdge persisted; surfaces an error if AddEdge succeeded but no edge object was instantiated (#304).", "connect_pcg_nodes"),
    disconnect_nodes:     specBp("mutate", "Remove a wired edge between two PCG nodes. Omitted pins match any pin. Returns removedEdges count (#346).", "disconnect_pcg_nodes"),
    set_node_settings:    bp("mutate", "Set node params. Pass a settings object of {propertyPath: value} (dotted paths and nested structs supported), or propertyName + propertyValue for a single write. Reports previousProperties and rolls back to them. Params: assetPath, nodeName, settings OR propertyName+propertyValue", "set_pcg_node_settings"),
    set_static_mesh_spawner_meshes: specBp("mutate", "Populate weighted MeshEntries on a PCGStaticMeshSpawner node (#145). entries=[{mesh, weight?}]; replace defaults to true.", "set_static_mesh_spawner_meshes"),
    remove_node:          specBp("mutate", "Remove node.", "remove_pcg_node"),
    unwrap_instance_nodes: specBp("mutate", "Give instance nodes (UPCGSettingsInstance wrappers, read-only in the PCG editor's details panel) their own settings object, keeping every value and edge. Settings from a shared asset are copied into the node. Nodes that already own their settings are left alone. Omit nodeName for every node in the graph (#1087).", "unwrap_pcg_instance_nodes"),
    execute:              bp("mutate", "Regenerate PCG. Params: actorLabel OR actorPath, seed? (writes the component Seed before generating) (#983)", "execute_pcg_graph"),
    force_regenerate:     bp("mutate", "Force a stuck PCG component to regenerate (clears graph ref, re-sets, cleanup+generate). Params: actorLabel OR actorPath (#146/#983)", "force_regenerate_pcg"),
    cleanup:              bp("mutate", "Cleanup a PCG component (remove spawned content). Params: actorLabel OR actorPath, removeComponents? (default true) (#146)", "cleanup_pcg", (p) => ({ actorLabel: p.actorLabel, actorPath: p.actorPath, removeComponents: p.removeComponents })),
    toggle_graph:         bp("mutate", "Toggle a PCG component's graph assignment to force reinit (no generate). Params: actorLabel OR actorPath, graphPath? (#146)", "toggle_pcg_graph", (p) => ({ actorLabel: p.actorLabel, actorPath: p.actorPath, graphPath: p.graphPath })),
    add_volume:           bp("mutate", "Place PCG volume. Idempotent by editor label when one is given. Params: graphPath, location?, extent?, label?, onConflict? (skip|error)", "add_pcg_volume"),
    import_graph:         specBp("mutate", "Bulk-author a PCG graph from JSON: nodes=[{name,class,posX?,posY?,settings?}], connections=[{from,fromPin?,to,toPin?}], replace defaults to false. One call replaces N add_node + M connect_nodes + K set_node_settings (#213).", "import_pcg_graph"),
    export_graph:         specBp("read", "Export a PCG graph as JSON; includeSettings defaults to true. Round-trip safe with import_graph (#213).", "export_pcg_graph"),
    ...epicActions,
  },
  undefined,
  {
    ...epicSchema,
    // #1057: every key a spec'd handler declares, generated from its C++
    // registration. A key listed again below is shared with hand-written
    // actions, and tests/unit/handler-specs.test.ts holds the two to one type.
    ...specSchema,
    actorLabel: z.string().optional(),
    actorPath: z.string().optional().describe("Full actor object path. The unambiguous selector, and it wins over actorLabel when both are given. Editor labels are NOT unique, and a label matching several actors is refused with the candidates rather than resolved at random (#983)"),
    name: z.string().optional(), packagePath: z.string().optional(),
    propertyName: z.string().optional().describe("set_node_settings: write ONE property instead of passing a settings object. Pair with propertyValue"),
    propertyValue: z.string().optional().describe("set_node_settings: the value for propertyName, as UE export text"),
    settings: z.record(z.unknown()).optional(),
    seed: z.number().optional().describe("execute: write the component's Seed before generating. Reported back as previousSeed so the generation can be reproduced"),
    removeComponents: z.boolean().optional().describe("cleanup: remove managed spawned components (default true)"),
    label: z.string().optional().describe("add_volume: editor label for the spawned PCG volume. Also the idempotency key - an existing actor with this label is reported rather than duplicated"),
    onConflict: z.string().optional().describe("create_graph / add_volume: skip (default, report the existing one) | error"),
    graphPath: z.string().optional(),
    location: Vec3.optional(),
    extent: Vec3.optional(),
    // cursor + limit for the paged list actions. Declared once: the MCP layer
    // strips a key the category never declares, so a paged action whose
    // category omits these silently returns page one forever.
    ...PAGINATION_SCHEMA,
  },
);
