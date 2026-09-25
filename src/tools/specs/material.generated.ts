// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd material handler. */
export const handlerSpecs: HandlerSpecs = {
  "add_expression_in_function": {
    "category": "material",
    "params": [
      {
        "name": "functionPath",
        "type": "string",
        "required": true,
        "description": "MaterialFunction asset path (#463)",
        "aliases": [
          "materialFunctionPath"
        ]
      },
      {
        "name": "expressionType",
        "type": "string",
        "required": true,
        "description": "Expression type, e.g. Constant3Vector, FunctionInput, FunctionOutput, If"
      },
      {
        "name": "positionX",
        "type": "number",
        "required": false,
        "description": "Graph editor X position for a new node"
      },
      {
        "name": "positionY",
        "type": "number",
        "required": false,
        "description": "Graph editor Y position for a new node"
      },
      {
        "name": "inputName",
        "type": "string",
        "required": false,
        "description": "FunctionInput name (#463)"
      },
      {
        "name": "inputType",
        "type": "string",
        "required": false,
        "description": "FunctionInput type: Scalar|Vector2|Vector3|Vector4|Texture2D|TextureCube|StaticBool|MaterialAttributes (#463)"
      },
      {
        "name": "outputName",
        "type": "string",
        "required": false,
        "description": "FunctionOutput name"
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Fallback for inputName on a FunctionInput and outputName on a FunctionOutput"
      }
    ]
  },
  "add_material_function_expression": {
    "category": "material",
    "params": [
      {
        "name": "functionPath",
        "type": "string",
        "required": true,
        "description": "MaterialFunction asset path (#463)",
        "aliases": [
          "materialFunctionPath"
        ]
      },
      {
        "name": "expressionType",
        "type": "string",
        "required": true,
        "description": "Expression type, e.g. Constant3Vector, FunctionInput, FunctionOutput, If"
      },
      {
        "name": "positionX",
        "type": "number",
        "required": false,
        "description": "Graph editor X position for a new node"
      },
      {
        "name": "positionY",
        "type": "number",
        "required": false,
        "description": "Graph editor Y position for a new node"
      },
      {
        "name": "inputName",
        "type": "string",
        "required": false,
        "description": "FunctionInput name (#463)"
      },
      {
        "name": "inputType",
        "type": "string",
        "required": false,
        "description": "FunctionInput type: Scalar|Vector2|Vector3|Vector4|Texture2D|TextureCube|StaticBool|MaterialAttributes (#463)"
      },
      {
        "name": "outputName",
        "type": "string",
        "required": false,
        "description": "FunctionOutput name"
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Fallback for inputName on a FunctionInput and outputName on a FunctionOutput"
      }
    ]
  },
  "add_rvt_output": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "expressionName",
        "type": "string",
        "required": false,
        "description": "Node name; an existing node of that name is reused"
      },
      {
        "name": "mirrorProperties",
        "type": "boolean",
        "required": false,
        "description": "Mirror the material's own property connections into the RVT output node (default true)"
      },
      {
        "name": "positionX",
        "type": "number",
        "required": false,
        "description": "Graph editor X position for a new node"
      },
      {
        "name": "positionY",
        "type": "number",
        "required": false,
        "description": "Graph editor Y position for a new node"
      },
      {
        "name": "recompile",
        "type": "boolean",
        "required": false,
        "description": "Recompile the material after the graph edit (default true)"
      }
    ]
  },
  "add_rvt_sampler": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "rvtPath",
        "type": "string",
        "required": true,
        "description": "RuntimeVirtualTexture asset path"
      },
      {
        "name": "expressionName",
        "type": "string",
        "required": false,
        "description": "Node name; an existing node of that name is reused"
      },
      {
        "name": "connectOutputs",
        "type": "boolean",
        "required": false,
        "description": "Connect each sample output to the material property of the same name (default true)"
      },
      {
        "name": "positionX",
        "type": "number",
        "required": false,
        "description": "Graph editor X position for a new node"
      },
      {
        "name": "positionY",
        "type": "number",
        "required": false,
        "description": "Graph editor Y position for a new node"
      },
      {
        "name": "recompile",
        "type": "boolean",
        "required": false,
        "description": "Recompile the material after the graph edit (default true)"
      }
    ]
  },
  "add_rvt_volume": {
    "category": "material",
    "params": [
      {
        "name": "rvtPath",
        "type": "string",
        "required": true,
        "description": "RuntimeVirtualTexture asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Editor label for the new volume (default RVTVolume_<rvt name>)"
      },
      {
        "name": "boundsMode",
        "type": "string",
        "required": false,
        "description": "writers (cover every primitive writing into this RVT) | alignActor (match one actor's box and rotation)"
      },
      {
        "name": "boundsAlignActor",
        "type": "string",
        "required": false,
        "description": "Actor label or object path whose rotation and bounds the volume aligns to, typically the landscape"
      }
    ]
  },
  "batch_set_material_instances": {
    "category": "material",
    "params": [
      {
        "name": "instances",
        "type": "array",
        "required": true,
        "description": "[{assetPath, parentPath?, parameters?:[{name, type (scalar|vector|texture), value}]}]. value: number (scalar), {r,g,b,a} (vector), or texture path (texture) (#594)",
        "items": "object"
      }
    ]
  },
  "build_material_graph": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "materialPath"
        ]
      },
      {
        "name": "nodes",
        "type": "array",
        "required": true,
        "description": "Graph spec: [{name,class,posX,posY,...}]",
        "items": "object"
      },
      {
        "name": "propertyConnections",
        "type": "array",
        "required": false,
        "description": "[{property,from,outputIndex}]",
        "items": "object"
      }
    ]
  },
  "clear_material_instance_parameters": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "MaterialInstanceConstant asset path",
        "aliases": [
          "path",
          "materialPath"
        ]
      }
    ]
  },
  "connect_expressions_in_function": {
    "category": "material",
    "params": [
      {
        "name": "functionPath",
        "type": "string",
        "required": true,
        "description": "MaterialFunction asset path (#463)",
        "aliases": [
          "materialFunctionPath"
        ]
      },
      {
        "name": "sourceExpression",
        "type": "string",
        "required": true,
        "description": "Expression the wire leaves (name, or index inside a MaterialFunction)"
      },
      {
        "name": "sourceOutput",
        "type": "string",
        "required": false,
        "description": "Output of the source expression, by name or index (default: its first output)"
      },
      {
        "name": "targetExpression",
        "type": "string",
        "required": true,
        "description": "Expression the wire enters (name, or index inside a MaterialFunction)"
      },
      {
        "name": "targetInput",
        "type": "string",
        "required": false,
        "description": "Input of the target expression, by name or index (default: its first input)"
      }
    ]
  },
  "connect_material_expressions": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "sourceExpression",
        "type": "string",
        "required": true,
        "description": "Expression the wire leaves (name, or index inside a MaterialFunction)"
      },
      {
        "name": "sourceOutput",
        "type": "string",
        "required": false,
        "description": "Output of the source expression, by name or index (default: its first output)"
      },
      {
        "name": "targetExpression",
        "type": "string",
        "required": true,
        "description": "Expression the wire enters (name, or index inside a MaterialFunction)"
      },
      {
        "name": "targetInput",
        "type": "string",
        "required": false,
        "description": "Input of the target expression, by name or index (default: its first input)"
      }
    ]
  },
  "connect_material_function_expressions": {
    "category": "material",
    "params": [
      {
        "name": "functionPath",
        "type": "string",
        "required": true,
        "description": "MaterialFunction asset path (#463)",
        "aliases": [
          "materialFunctionPath"
        ]
      },
      {
        "name": "sourceExpression",
        "type": "string",
        "required": true,
        "description": "Expression the wire leaves (name, or index inside a MaterialFunction)"
      },
      {
        "name": "sourceOutput",
        "type": "string",
        "required": false,
        "description": "Output of the source expression, by name or index (default: its first output)"
      },
      {
        "name": "targetExpression",
        "type": "string",
        "required": true,
        "description": "Expression the wire enters (name, or index inside a MaterialFunction)"
      },
      {
        "name": "targetInput",
        "type": "string",
        "required": false,
        "description": "Input of the target expression, by name or index (default: its first input)"
      }
    ]
  },
  "connect_texture_to_material": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "texturePath",
        "type": "string",
        "required": true,
        "description": "Texture asset path"
      },
      {
        "name": "property",
        "type": "string",
        "required": false,
        "description": "Material property: BaseColor, Normal, Roughness, Metallic, EmissiveColor, etc. (default BaseColor)",
        "aliases": [
          "materialProperty"
        ]
      }
    ]
  },
  "connect_to_material_property": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "expressionName",
        "type": "string",
        "required": true,
        "description": "Expression to wire"
      },
      {
        "name": "outputName",
        "type": "string",
        "required": false,
        "description": "Output of the expression, by name or index (default: its first output)"
      },
      {
        "name": "property",
        "type": "string",
        "required": true,
        "description": "Material property: BaseColor, Normal, Roughness, Metallic, EmissiveColor, etc."
      }
    ]
  },
  "disconnect_material_property": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "property",
        "type": "string",
        "required": true,
        "description": "Material property: BaseColor, Normal, Roughness, Metallic, EmissiveColor, etc."
      }
    ]
  },
  "export_material_graph": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "materialPath"
        ]
      }
    ]
  },
  "get_material_shader_stats": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "materialPath"
        ]
      }
    ]
  },
  "get_material_usage": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material or MaterialInstance asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "import_material_graph": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "materialPath"
        ]
      },
      {
        "name": "nodes",
        "type": "array",
        "required": true,
        "description": "Graph spec: [{name,class,posX,posY,...}]",
        "items": "object"
      },
      {
        "name": "propertyConnections",
        "type": "array",
        "required": false,
        "description": "[{property,from,outputIndex}]",
        "items": "object"
      }
    ]
  },
  "list_expression_types": {
    "category": "material",
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
        "description": "Rows to return on this page"
      }
    ]
  },
  "list_expressions_in_function": {
    "category": "material",
    "params": [
      {
        "name": "functionPath",
        "type": "string",
        "required": true,
        "description": "MaterialFunction asset path (#463)",
        "aliases": [
          "materialFunctionPath"
        ]
      }
    ]
  },
  "list_material_expressions": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "includeInputs",
        "type": "boolean",
        "required": false,
        "description": "Include each node's input pin wiring (default false)"
      },
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
        "description": "Rows to return on this page"
      }
    ]
  },
  "list_material_function_expressions": {
    "category": "material",
    "params": [
      {
        "name": "functionPath",
        "type": "string",
        "required": true,
        "description": "MaterialFunction asset path (#463)",
        "aliases": [
          "materialFunctionPath"
        ]
      }
    ]
  },
  "list_material_parameters": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material or MaterialInstance asset path",
        "aliases": [
          "path",
          "materialPath"
        ]
      }
    ]
  },
  "list_material_static_switches": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material or MaterialInstance asset path",
        "aliases": [
          "path",
          "materialPath"
        ]
      }
    ]
  },
  "read_material": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material or MaterialInstance asset path",
        "aliases": [
          "path",
          "materialPath"
        ]
      }
    ]
  },
  "read_material_graph": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "expressionIndex",
        "type": "number",
        "required": false,
        "description": "Read just this node (a nodeId) and the source expressions its inputs link to, unpaged"
      },
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
        "description": "Rows to return on this page"
      }
    ]
  },
  "read_material_parameter_collection": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "MaterialParameterCollection asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World whose live collection instance to read: editor, pie or auto. Omit for the stored defaults only"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "Which PIE world when several run (0 = server/primary). See editor(list_pie_instances)"
      }
    ]
  },
  "read_runtime_virtual_texture": {
    "category": "material",
    "params": [
      {
        "name": "rvtPath",
        "type": "string",
        "required": true,
        "description": "RuntimeVirtualTexture asset path",
        "aliases": [
          "assetPath"
        ]
      }
    ]
  },
  "recompile_material": {
    "category": "material",
    "params": [
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "recompileChildren",
        "type": "boolean",
        "required": false,
        "description": "Cascade to every MaterialInstanceConstant whose parent chain reaches this material (#421)"
      }
    ]
  },
  "render_material_preview": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "materialPath"
        ]
      },
      {
        "name": "outputPath",
        "type": "string",
        "required": true,
        "description": "Absolute file path for the PNG output"
      },
      {
        "name": "width",
        "type": "number",
        "required": false,
        "description": "Image width in pixels (default 256)"
      },
      {
        "name": "height",
        "type": "number",
        "required": false,
        "description": "Image height in pixels (default 256)"
      }
    ]
  },
  "set_material_blend_mode": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "blendMode",
        "type": "string",
        "required": true,
        "description": "Blend mode: Opaque, Masked, Translucent, Additive, Modulate, AlphaComposite, AlphaHoldout"
      }
    ]
  },
  "set_material_domain": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "materialDomain",
        "type": "string",
        "required": true,
        "description": "Material domain: Surface, DeferredDecal, LightFunction, Volume, PostProcess, UI, RuntimeVirtualTexture",
        "aliases": [
          "domain"
        ]
      }
    ]
  },
  "set_material_instance_parent": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "MaterialInstanceConstant asset path",
        "aliases": [
          "path",
          "materialPath"
        ]
      },
      {
        "name": "newParentPath",
        "type": "string",
        "required": true,
        "description": "New parent material or material instance path",
        "aliases": [
          "parentPath"
        ]
      }
    ]
  },
  "set_material_shading_model": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "shadingModel",
        "type": "string",
        "required": true,
        "description": "Shading model, e.g. DefaultLit, Unlit, Subsurface, ClearCoat"
      }
    ]
  },
  "set_material_static_switch": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "MaterialInstanceConstant asset path",
        "aliases": [
          "path",
          "materialPath"
        ]
      },
      {
        "name": "parameterName",
        "type": "string",
        "required": true,
        "description": "Material parameter name"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Static switch value, a boolean"
      },
      {
        "name": "association",
        "type": "string",
        "required": false,
        "description": "Material parameter association: Global, Layer, or Blend"
      },
      {
        "name": "parameterIndex",
        "type": "number",
        "required": false,
        "description": "Material layer/blend parameter index"
      }
    ]
  },
  "validate_material": {
    "category": "material",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Material asset path",
        "aliases": [
          "materialPath"
        ]
      }
    ]
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  add_expression_in_function: "Params: functionPath (or materialFunctionPath), expressionType, positionX?, positionY?, inputName?, inputType?, outputName?, name?",
  add_material_function_expression: "Params: functionPath (or materialFunctionPath), expressionType, positionX?, positionY?, inputName?, inputType?, outputName?, name?",
  add_rvt_output: "Params: materialPath (or assetPath), expressionName?, mirrorProperties?, positionX?, positionY?, recompile?",
  add_rvt_sampler: "Params: materialPath (or assetPath), rvtPath, expressionName?, connectOutputs?, positionX?, positionY?, recompile?",
  add_rvt_volume: "Params: rvtPath (or assetPath), actorLabel?, boundsMode?, boundsAlignActor?",
  batch_set_material_instances: "Params: instances",
  build_material_graph: "Params: assetPath (or materialPath), nodes, propertyConnections?",
  clear_material_instance_parameters: "Params: assetPath (or path, or materialPath)",
  connect_expressions_in_function: "Params: functionPath (or materialFunctionPath), sourceExpression, sourceOutput?, targetExpression, targetInput?",
  connect_material_expressions: "Params: materialPath (or path, or assetPath), sourceExpression, sourceOutput?, targetExpression, targetInput?",
  connect_material_function_expressions: "Params: functionPath (or materialFunctionPath), sourceExpression, sourceOutput?, targetExpression, targetInput?",
  connect_texture_to_material: "Params: materialPath (or path, or assetPath), texturePath, property? (or materialProperty)",
  connect_to_material_property: "Params: materialPath (or path, or assetPath), expressionName, outputName?, property",
  disconnect_material_property: "Params: materialPath (or assetPath), property",
  export_material_graph: "Params: assetPath (or materialPath)",
  get_material_shader_stats: "Params: assetPath (or materialPath)",
  get_material_usage: "Params: assetPath (or path)",
  import_material_graph: "Params: assetPath (or materialPath), nodes, propertyConnections?",
  list_expression_types: "Params: cursor?, limit?",
  list_expressions_in_function: "Params: functionPath (or materialFunctionPath)",
  list_material_expressions: "Params: materialPath (or path, or assetPath), includeInputs?, cursor?, limit?",
  list_material_function_expressions: "Params: functionPath (or materialFunctionPath)",
  list_material_parameters: "Params: assetPath (or path, or materialPath)",
  list_material_static_switches: "Params: assetPath (or path, or materialPath)",
  read_material: "Params: assetPath (or path, or materialPath)",
  read_material_graph: "Params: materialPath (or path, or assetPath), expressionIndex?, cursor?, limit?",
  read_material_parameter_collection: "Params: assetPath (or path), world?, pieInstance?",
  read_runtime_virtual_texture: "Params: rvtPath (or assetPath)",
  recompile_material: "Params: materialPath (or path, or assetPath), recompileChildren?",
  render_material_preview: "Params: assetPath (or materialPath), outputPath, width?, height?",
  set_material_blend_mode: "Params: assetPath (or path), blendMode",
  set_material_domain: "Params: assetPath (or path), materialDomain (or domain)",
  set_material_instance_parent: "Params: assetPath (or path, or materialPath), newParentPath (or parentPath)",
  set_material_shading_model: "Params: assetPath (or path), shadingModel",
  set_material_static_switch: "Params: assetPath (or path, or materialPath), parameterName, value, association?, parameterIndex?",
  validate_material: "Params: assetPath (or materialPath)",
};

/** Every key the spec'd material handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  actorLabel: z.string().optional().describe("Editor label for the new volume (default RVTVolume_<rvt name>)"),
  assetPath: z.string().optional().describe("Alias for materialPath (add_rvt_output, add_rvt_sampler, connect_material_expressions, connect_texture_to_material, connect_to_material_property, disconnect_material_property, list_material_expressions, read_material_graph, recompile_material). Alias for rvtPath (add_rvt_volume, read_runtime_virtual_texture). Material asset path (build_material_graph, export_material_graph, get_material_shader_stats, import_material_graph, render_material_preview, set_material_blend_mode, set_material_domain, set_material_shading_model, validate_material). MaterialInstanceConstant asset path (clear_material_instance_parameters, set_material_instance_parent, set_material_static_switch). Material or MaterialInstance asset path (get_material_usage, list_material_parameters, list_material_static_switches, read_material). MaterialParameterCollection asset path (read_material_parameter_collection)"),
  association: z.string().optional().describe("Material parameter association: Global, Layer, or Blend"),
  blendMode: z.string().optional().describe("Blend mode: Opaque, Masked, Translucent, Additive, Modulate, AlphaComposite, AlphaHoldout"),
  boundsAlignActor: z.string().optional().describe("Actor label or object path whose rotation and bounds the volume aligns to, typically the landscape"),
  boundsMode: z.string().optional().describe("writers (cover every primitive writing into this RVT) | alignActor (match one actor's box and rotation)"),
  connectOutputs: z.boolean().optional().describe("Connect each sample output to the material property of the same name (default true)"),
  cursor: z.string().optional().describe("Resume a paged read: pass back the 'nextCursor' from the previous page, unmodified"),
  domain: z.string().optional().describe("Alias for materialDomain"),
  expressionIndex: z.number().optional().describe("Read just this node (a nodeId) and the source expressions its inputs link to, unpaged"),
  expressionName: z.string().optional().describe("Node name; an existing node of that name is reused (add_rvt_output, add_rvt_sampler). Expression to wire (connect_to_material_property)"),
  expressionType: z.string().optional().describe("Expression type, e.g. Constant3Vector, FunctionInput, FunctionOutput, If"),
  functionPath: z.string().optional().describe("MaterialFunction asset path (#463)"),
  height: z.number().optional().describe("Image height in pixels (default 256)"),
  includeInputs: z.boolean().optional().describe("Include each node's input pin wiring (default false)"),
  inputName: z.string().optional().describe("FunctionInput name (#463)"),
  inputType: z.string().optional().describe("FunctionInput type: Scalar|Vector2|Vector3|Vector4|Texture2D|TextureCube|StaticBool|MaterialAttributes (#463)"),
  instances: z.array(z.record(z.unknown())).optional().describe("[{assetPath, parentPath?, parameters?:[{name, type (scalar|vector|texture), value}]}]. value: number (scalar), {r,g,b,a} (vector), or texture path (texture) (#594)"),
  limit: z.number().int().optional().describe("Rows to return on this page"),
  materialDomain: z.string().optional().describe("Material domain: Surface, DeferredDecal, LightFunction, Volume, PostProcess, UI, RuntimeVirtualTexture"),
  materialFunctionPath: z.string().optional().describe("Alias for functionPath"),
  materialPath: z.string().optional().describe("Material asset path (add_rvt_output, add_rvt_sampler, connect_material_expressions, connect_texture_to_material, connect_to_material_property, disconnect_material_property, list_material_expressions, read_material_graph, recompile_material). Alias for assetPath (build_material_graph, clear_material_instance_parameters, export_material_graph, get_material_shader_stats, import_material_graph, list_material_parameters, list_material_static_switches, read_material, render_material_preview, set_material_instance_parent, set_material_static_switch, validate_material)"),
  materialProperty: z.string().optional().describe("Alias for property"),
  mirrorProperties: z.boolean().optional().describe("Mirror the material's own property connections into the RVT output node (default true)"),
  name: z.string().optional().describe("Fallback for inputName on a FunctionInput and outputName on a FunctionOutput"),
  newParentPath: z.string().optional().describe("New parent material or material instance path"),
  nodes: z.array(z.record(z.unknown())).optional().describe("Graph spec: [{name,class,posX,posY,...}]"),
  outputName: z.string().optional().describe("FunctionOutput name (add_expression_in_function, add_material_function_expression). Output of the expression, by name or index (default: its first output) (connect_to_material_property)"),
  outputPath: z.string().optional().describe("Absolute file path for the PNG output"),
  parameterIndex: z.number().optional().describe("Material layer/blend parameter index"),
  parameterName: z.string().optional().describe("Material parameter name"),
  parentPath: z.string().optional().describe("Alias for newParentPath"),
  path: z.string().optional().describe("Alias for assetPath (clear_material_instance_parameters, get_material_usage, list_material_parameters, list_material_static_switches, read_material, read_material_parameter_collection, set_material_blend_mode, set_material_domain, set_material_instance_parent, set_material_shading_model, set_material_static_switch). Alias for materialPath (connect_material_expressions, connect_texture_to_material, connect_to_material_property, list_material_expressions, read_material_graph, recompile_material)"),
  pieInstance: z.number().optional().describe("Which PIE world when several run (0 = server/primary). See editor(list_pie_instances)"),
  positionX: z.number().optional().describe("Graph editor X position for a new node"),
  positionY: z.number().optional().describe("Graph editor Y position for a new node"),
  property: z.string().optional().describe("Material property: BaseColor, Normal, Roughness, Metallic, EmissiveColor, etc. (default BaseColor) (connect_texture_to_material). Material property: BaseColor, Normal, Roughness, Metallic, EmissiveColor, etc. (connect_to_material_property, disconnect_material_property)"),
  propertyConnections: z.array(z.record(z.unknown())).optional().describe("[{property,from,outputIndex}]"),
  recompile: z.boolean().optional().describe("Recompile the material after the graph edit (default true)"),
  recompileChildren: z.boolean().optional().describe("Cascade to every MaterialInstanceConstant whose parent chain reaches this material (#421)"),
  rvtPath: z.string().optional().describe("RuntimeVirtualTexture asset path"),
  shadingModel: z.string().optional().describe("Shading model, e.g. DefaultLit, Unlit, Subsurface, ClearCoat"),
  sourceExpression: z.string().optional().describe("Expression the wire leaves (name, or index inside a MaterialFunction)"),
  sourceOutput: z.string().optional().describe("Output of the source expression, by name or index (default: its first output)"),
  targetExpression: z.string().optional().describe("Expression the wire enters (name, or index inside a MaterialFunction)"),
  targetInput: z.string().optional().describe("Input of the target expression, by name or index (default: its first input)"),
  texturePath: z.string().optional().describe("Texture asset path"),
  value: z.unknown().optional().describe("Static switch value, a boolean"),
  width: z.number().optional().describe("Image width in pixels (default 256)"),
  world: z.string().optional().describe("World whose live collection instance to read: editor, pie or auto. Omit for the stored defaults only"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses, handlerSpecs);
