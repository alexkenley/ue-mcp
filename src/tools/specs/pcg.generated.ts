// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd pcg handler. */
export const handlerSpecs: HandlerSpecs = {
  "add_pcg_node": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "nodeType",
        "type": "string",
        "required": true,
        "description": "PCG settings class of the node to add"
      },
      {
        "name": "posX",
        "type": "number",
        "required": false,
        "description": "Graph editor X position for the new node"
      },
      {
        "name": "posY",
        "type": "number",
        "required": false,
        "description": "Graph editor Y position for the new node"
      }
    ]
  },
  "connect_pcg_nodes": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "sourceNode",
        "type": "string",
        "required": true,
        "description": "Node the edge leaves",
        "aliases": [
          "sourceNodeName"
        ]
      },
      {
        "name": "sourcePin",
        "type": "string",
        "required": false,
        "description": "Output pin label. connect_nodes defaults to the first output pin, disconnect_nodes to any",
        "aliases": [
          "sourcePinLabel"
        ]
      },
      {
        "name": "targetNode",
        "type": "string",
        "required": true,
        "description": "Node the edge enters",
        "aliases": [
          "targetNodeName"
        ]
      },
      {
        "name": "targetPin",
        "type": "string",
        "required": false,
        "description": "Input pin label. connect_nodes defaults to the first input pin, disconnect_nodes to any",
        "aliases": [
          "targetPinLabel"
        ]
      }
    ]
  },
  "disconnect_pcg_nodes": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "sourceNode",
        "type": "string",
        "required": true,
        "description": "Node the edge leaves",
        "aliases": [
          "sourceNodeName"
        ]
      },
      {
        "name": "targetNode",
        "type": "string",
        "required": true,
        "description": "Node the edge enters",
        "aliases": [
          "targetNodeName"
        ]
      },
      {
        "name": "sourcePin",
        "type": "string",
        "required": false,
        "description": "Output pin label. connect_nodes defaults to the first output pin, disconnect_nodes to any",
        "aliases": [
          "sourcePinLabel"
        ]
      },
      {
        "name": "targetPin",
        "type": "string",
        "required": false,
        "description": "Input pin label. connect_nodes defaults to the first input pin, disconnect_nodes to any",
        "aliases": [
          "targetPinLabel"
        ]
      }
    ]
  },
  "export_pcg_graph": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "includeSettings",
        "type": "boolean",
        "required": false,
        "description": "Include per-node editable settings in the response (default true)"
      }
    ]
  },
  "get_pcg_components": {
    "category": "pcg",
    "params": []
  },
  "import_pcg_graph": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "nodes",
        "type": "array",
        "required": true,
        "description": "[{name, class, posX?, posY?, settings?}]",
        "items": "object"
      },
      {
        "name": "connections",
        "type": "array",
        "required": false,
        "description": "[{from, fromPin?, to, toPin?}]",
        "items": "object"
      },
      {
        "name": "replace",
        "type": "boolean",
        "required": false,
        "description": "Wipe existing user nodes first (default false)"
      }
    ]
  },
  "list_pcg_graphs": {
    "category": "pcg",
    "params": [
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the 'nextCursor' from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "integer",
        "required": false,
        "description": "Rows to return on this page (default 200, max 2000)"
      }
    ]
  },
  "read_pcg_graph": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_pcg_node_settings": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "nodeName",
        "type": "string",
        "required": true,
        "description": "Engine name of the node, as read_graph reports it"
      }
    ]
  },
  "remove_pcg_node": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "nodeName",
        "type": "string",
        "required": true,
        "description": "Engine name of the node, as read_graph reports it"
      }
    ]
  },
  "set_pcg_node_settings": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "nodeName",
        "type": "string",
        "required": true,
        "description": "Engine name of the node, as read_graph reports it"
      },
      {
        "name": "settings",
        "type": "object",
        "required": false,
        "description": "{propertyPath: value}; dotted paths and nested structs supported"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": false,
        "description": "One property to write instead of a settings object"
      },
      {
        "name": "propertyValue",
        "type": "string",
        "required": false,
        "description": "The value for propertyName, as UE export text"
      }
    ],
    "choices": [
      {
        "mode": "exactlyOne",
        "branches": [
          [
            "settings"
          ],
          [
            "propertyName",
            "propertyValue"
          ]
        ]
      }
    ]
  },
  "set_static_mesh_spawner_meshes": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "nodeName",
        "type": "string",
        "required": true,
        "description": "Engine name of the node, as read_graph reports it"
      },
      {
        "name": "entries",
        "type": "array",
        "required": true,
        "description": "Array of {mesh, weight?} entries",
        "items": "object"
      },
      {
        "name": "replace",
        "type": "boolean",
        "required": false,
        "description": "Overwrite existing MeshEntries (default true)"
      }
    ]
  },
  "unwrap_pcg_instance_nodes": {
    "category": "pcg",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "PCGGraph asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "nodeName",
        "type": "string",
        "required": false,
        "description": "Only this node (default: every node in the graph)"
      }
    ]
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  add_pcg_node: "Params: assetPath (or path), nodeType, posX?, posY?",
  connect_pcg_nodes: "Params: assetPath (or path), sourceNode (or sourceNodeName), sourcePin? (or sourcePinLabel), targetNode (or targetNodeName), targetPin? (or targetPinLabel)",
  disconnect_pcg_nodes: "Params: assetPath (or path), sourceNode (or sourceNodeName), targetNode (or targetNodeName), sourcePin? (or sourcePinLabel), targetPin? (or targetPinLabel)",
  export_pcg_graph: "Params: assetPath (or path), includeSettings?",
  get_pcg_components: "Params: none",
  import_pcg_graph: "Params: assetPath (or path), nodes, connections?, replace?",
  list_pcg_graphs: "Params: cursor?, limit?",
  read_pcg_graph: "Params: assetPath (or path)",
  read_pcg_node_settings: "Params: assetPath (or path), nodeName",
  remove_pcg_node: "Params: assetPath (or path), nodeName",
  set_pcg_node_settings: "Params: assetPath (or path), nodeName, settings OR propertyName + propertyValue",
  set_static_mesh_spawner_meshes: "Params: assetPath (or path), nodeName, entries, replace?",
  unwrap_pcg_instance_nodes: "Params: assetPath (or path), nodeName?",
};

/** Every key the spec'd pcg handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  assetPath: z.string().optional().describe("PCGGraph asset path"),
  connections: z.array(z.record(z.unknown())).optional().describe("[{from, fromPin?, to, toPin?}]"),
  cursor: z.string().optional().describe("Resume a paged read: pass back the 'nextCursor' from the previous page, unmodified"),
  entries: z.array(z.record(z.unknown())).optional().describe("Array of {mesh, weight?} entries"),
  includeSettings: z.boolean().optional().describe("Include per-node editable settings in the response (default true)"),
  limit: z.number().int().optional().describe("Rows to return on this page (default 200, max 2000)"),
  nodeName: z.string().optional().describe("Engine name of the node, as read_graph reports it (read_pcg_node_settings, remove_pcg_node, set_pcg_node_settings, set_static_mesh_spawner_meshes). Only this node (default: every node in the graph) (unwrap_pcg_instance_nodes)"),
  nodes: z.array(z.record(z.unknown())).optional().describe("[{name, class, posX?, posY?, settings?}]"),
  nodeType: z.string().optional().describe("PCG settings class of the node to add"),
  path: z.string().optional().describe("Alias for assetPath"),
  posX: z.number().optional().describe("Graph editor X position for the new node"),
  posY: z.number().optional().describe("Graph editor Y position for the new node"),
  propertyName: z.string().optional().describe("One property to write instead of a settings object"),
  propertyValue: z.string().optional().describe("The value for propertyName, as UE export text"),
  replace: z.boolean().optional().describe("Wipe existing user nodes first (default false) (import_pcg_graph). Overwrite existing MeshEntries (default true) (set_static_mesh_spawner_meshes)"),
  settings: z.record(z.unknown()).optional().describe("{propertyPath: value}; dotted paths and nested structs supported"),
  sourceNode: z.string().optional().describe("Node the edge leaves"),
  sourceNodeName: z.string().optional().describe("Alias for sourceNode"),
  sourcePin: z.string().optional().describe("Output pin label. connect_nodes defaults to the first output pin, disconnect_nodes to any"),
  sourcePinLabel: z.string().optional().describe("Alias for sourcePin"),
  targetNode: z.string().optional().describe("Node the edge enters"),
  targetNodeName: z.string().optional().describe("Alias for targetNode"),
  targetPin: z.string().optional().describe("Input pin label. connect_nodes defaults to the first input pin, disconnect_nodes to any"),
  targetPinLabel: z.string().optional().describe("Alias for targetPin"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses, handlerSpecs);
