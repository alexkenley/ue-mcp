// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd asset handler. */
export const handlerSpecs: HandlerSpecs = {
  "add_curvetable_key": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to key"
      },
      {
        "name": "time",
        "type": "number",
        "required": true,
        "description": "Key time"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Key value (a number)"
      },
      {
        "name": "interpMode",
        "type": "string",
        "required": false,
        "description": "linear (default) | constant | cubic | none"
      },
      {
        "name": "keyTimeTolerance",
        "type": "number",
        "required": false,
        "description": "How close an existing key must be to be updated rather than added"
      }
    ]
  },
  "add_curvetable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to add"
      },
      {
        "name": "curveType",
        "type": "string",
        "required": false,
        "description": "simple | rich (default: the table's type, or rich for cubic)",
        "aliases": [
          "mode"
        ]
      },
      {
        "name": "interpMode",
        "type": "string",
        "required": false,
        "description": "linear (default) | constant | cubic | none"
      }
    ]
  },
  "add_datatable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to append or overwrite"
      },
      {
        "name": "row",
        "type": "object",
        "required": true,
        "description": "Row-struct fields to write; fields not named keep their values",
        "aliases": [
          "fields",
          "data"
        ]
      }
    ]
  },
  "add_graph_node": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "EdGraph-backed asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "graphName",
        "type": "string",
        "required": false,
        "description": "Graph to author in, by name or unique substring (required when the asset has several graphs)"
      },
      {
        "name": "nodeClass",
        "type": "string",
        "required": false,
        "description": "Class the node action spawns"
      },
      {
        "name": "actionName",
        "type": "string",
        "required": false,
        "description": "Schema menu entry name, or 'category|name'"
      },
      {
        "name": "spawnMode",
        "type": "string",
        "required": false,
        "description": "auto (default) | action | direct"
      },
      {
        "name": "posX",
        "type": "number",
        "required": false,
        "description": "Node X position"
      },
      {
        "name": "posY",
        "type": "number",
        "required": false,
        "description": "Node Y position"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the asset after the edit (default true)"
      }
    ]
  },
  "add_socket": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh, SkeletalMesh or Skeleton asset path"
      },
      {
        "name": "socketName",
        "type": "string",
        "required": true,
        "description": "Socket name"
      },
      {
        "name": "boneName",
        "type": "string",
        "required": false,
        "description": "Bone to attach to (SkeletalMesh and Skeleton, default root)"
      },
      {
        "name": "relativeLocation",
        "type": "vec3",
        "required": false,
        "description": "Socket location relative to its parent"
      },
      {
        "name": "relativeRotation",
        "type": "rotator",
        "required": false,
        "description": "Socket rotation relative to its parent"
      },
      {
        "name": "relativeScale",
        "type": "vec3",
        "required": false,
        "description": "Socket scale"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "skip (default) | update | error"
      }
    ]
  },
  "append_asset_array_elements": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset path; a Blueprint path writes its generated-class CDO",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Path of the TArray property"
      },
      {
        "name": "elements",
        "type": "array",
        "required": true,
        "description": "Values to append, validated before any is written"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the package after the write (default true)"
      }
    ]
  },
  "asset_health_check": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset to check",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "bind_cloth_to_section": {
    "category": "asset",
    "params": [
      {
        "name": "skeletalMeshPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": true,
        "description": "Mesh LOD"
      },
      {
        "name": "sectionIndex",
        "type": "integer",
        "required": true,
        "description": "Render section to bind"
      },
      {
        "name": "clothingAsset",
        "type": "string",
        "required": false,
        "description": "Clothing asset by name (optional when the mesh has one)"
      },
      {
        "name": "assetLodIndex",
        "type": "integer",
        "required": false,
        "description": "LOD inside the clothing asset (default: lodIndex, clamped)"
      }
    ]
  },
  "bulk_rename_assets": {
    "category": "asset",
    "params": [
      {
        "name": "renames",
        "type": "array",
        "required": true,
        "description": "Rename descriptors: {sourcePath, destinationPath}, {assetPath, newName} or {sourcePath, newPackagePath, newName}",
        "items": "object"
      }
    ]
  },
  "check_uvs": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "Source LOD to act on (default 0)"
      },
      {
        "name": "requireLightmapChannel",
        "type": "boolean",
        "required": false,
        "description": "Treat a missing lightmap channel as a fault (default true for StaticMesh)"
      },
      {
        "name": "maxOverlapFraction",
        "type": "number",
        "required": false,
        "description": "Overlap above this fraction of the lightmap channel is a fault (default 0.001)"
      },
      {
        "name": "rasterSize",
        "type": "number",
        "required": false,
        "description": "Raster resolution for the overlap estimate (default 512)"
      }
    ]
  },
  "compare_textures": {
    "category": "asset",
    "params": [
      {
        "name": "assetPathA",
        "type": "string",
        "required": true,
        "description": "First Texture2D",
        "aliases": [
          "a"
        ]
      },
      {
        "name": "assetPathB",
        "type": "string",
        "required": true,
        "description": "Second Texture2D",
        "aliases": [
          "b"
        ]
      }
    ]
  },
  "connect_graph_pins": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "EdGraph-backed asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "graphName",
        "type": "string",
        "required": false,
        "description": "Graph to author in, by name or unique substring (required when the asset has several graphs)"
      },
      {
        "name": "sourceNode",
        "type": "string",
        "required": false,
        "description": "Node of the source pin: nodeGuid, node path, name or unique title"
      },
      {
        "name": "sourcePinId",
        "type": "string",
        "required": false,
        "description": "pinId of the source pin (preferred)"
      },
      {
        "name": "sourcePin",
        "type": "string",
        "required": false,
        "description": "Source pin name, when no pinId is given"
      },
      {
        "name": "sourcePinDirection",
        "type": "string",
        "required": false,
        "description": "input | output, to disambiguate sourcePin"
      },
      {
        "name": "targetNode",
        "type": "string",
        "required": false,
        "description": "Node of the target pin"
      },
      {
        "name": "targetPinId",
        "type": "string",
        "required": false,
        "description": "pinId of the target pin"
      },
      {
        "name": "targetPin",
        "type": "string",
        "required": false,
        "description": "Target pin name, when no pinId is given"
      },
      {
        "name": "targetPinDirection",
        "type": "string",
        "required": false,
        "description": "input | output, to disambiguate targetPin"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the asset after the edit (default true)"
      }
    ]
  },
  "create_asset_by_class": {
    "category": "asset",
    "params": [
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Asset name"
      },
      {
        "name": "className",
        "type": "string",
        "required": true,
        "description": "Concrete UObject class: class name with or without the C++ prefix, or a /Script/Module.Class path",
        "aliases": [
          "class"
        ]
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game)"
      },
      {
        "name": "properties",
        "type": "object",
        "required": false,
        "description": "Property values keyed by property name"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "skip (default) returns an existing asset; error refuses"
      }
    ]
  },
  "create_customizable_object": {
    "category": "asset",
    "params": [
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Asset name"
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game)"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "skip (default) | error"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the new asset (default true)"
      }
    ]
  },
  "create_data_asset": {
    "category": "asset",
    "params": [
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Asset name"
      },
      {
        "name": "className",
        "type": "string",
        "required": true,
        "description": "UDataAsset subclass: class name with or without the C++ prefix, or a /Script/Module.Class path",
        "aliases": [
          "class"
        ]
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game)"
      },
      {
        "name": "properties",
        "type": "object",
        "required": false,
        "description": "Property values keyed by property name"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "skip (default) returns an existing asset; error refuses"
      }
    ]
  },
  "create_datatable": {
    "category": "asset",
    "params": [
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Asset name"
      },
      {
        "name": "rowStruct",
        "type": "string",
        "required": true,
        "description": "Row struct, e.g. /Script/Module.MyRow or a UserDefinedStruct path"
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game/DataTables)"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "skip (default) returns an existing asset; error refuses"
      }
    ]
  },
  "create_render_target_2d": {
    "category": "asset",
    "params": [
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Asset name, without '/' or '.'"
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game)"
      },
      {
        "name": "width",
        "type": "integer",
        "required": false,
        "description": "Pixel width, 1-8192 (default 512)"
      },
      {
        "name": "height",
        "type": "integer",
        "required": false,
        "description": "Pixel height, 1-8192 (default 512)"
      },
      {
        "name": "format",
        "type": "string",
        "required": false,
        "description": "R8 | RG8 | RGBA8 | RGBA8_SRGB | R16F | RG16F | RGBA16F | R32F | RG32F | RGBA32F | RGB10A2 (default RGBA8_SRGB)"
      },
      {
        "name": "clearColor",
        "type": "object",
        "required": false,
        "description": "Linear clear color {r, g, b, a} (default transparent)"
      },
      {
        "name": "generateMips",
        "type": "boolean",
        "required": false,
        "description": "Generate mipmaps automatically (default false)"
      },
      {
        "name": "targetGamma",
        "type": "number",
        "required": false,
        "description": "Target gamma (default 0, the engine behavior)"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "skip (default) returns an existing asset; error refuses"
      }
    ]
  },
  "create_subobject": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset that owns the new subobject",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "className",
        "type": "string",
        "required": true,
        "description": "Class to instantiate, e.g. a /Script/Module.Class path"
      },
      {
        "name": "name",
        "type": "string",
        "required": true,
        "description": "Subobject name"
      },
      {
        "name": "properties",
        "type": "object",
        "required": false,
        "description": "Property values, validated on a throwaway instance first"
      },
      {
        "name": "outer",
        "type": "string",
        "required": false,
        "description": "asset (default) | package"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "reuse (default) | error"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the owning package (default true)"
      }
    ]
  },
  "delete_asset": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset to delete",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Delete even when other packages reference it, closing open editors (default false)"
      }
    ]
  },
  "delete_asset_batch": {
    "category": "asset",
    "params": [
      {
        "name": "assetPaths",
        "type": "array",
        "required": true,
        "description": "Assets to delete",
        "aliases": [
          "paths"
        ],
        "items": "string"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Delete referenced assets too, closing open editors (default false)"
      }
    ]
  },
  "delete_datatable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to remove"
      }
    ]
  },
  "delete_folder": {
    "category": "asset",
    "params": [
      {
        "name": "path",
        "type": "string",
        "required": false,
        "description": "Content folder to delete"
      },
      {
        "name": "paths",
        "type": "array",
        "required": false,
        "description": "Content folders to delete",
        "items": "string"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Also delete the assets inside (default false: only empty folders)"
      }
    ]
  },
  "diagnose_registry": {
    "category": "asset",
    "params": [
      {
        "name": "path",
        "type": "string",
        "required": true,
        "description": "Content path to diagnose"
      },
      {
        "name": "recursive",
        "type": "boolean",
        "required": false,
        "description": "Include subfolders (default true)"
      },
      {
        "name": "reconcile",
        "type": "boolean",
        "required": false,
        "description": "Force a synchronous rescan first, which evicts pending-kill ghosts"
      }
    ]
  },
  "disconnect_graph_pins": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "EdGraph-backed asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "graphName",
        "type": "string",
        "required": false,
        "description": "Graph to author in, by name or unique substring (required when the asset has several graphs)"
      },
      {
        "name": "sourceNode",
        "type": "string",
        "required": false,
        "description": "Node of the source pin: nodeGuid, node path, name or unique title"
      },
      {
        "name": "sourcePinId",
        "type": "string",
        "required": false,
        "description": "pinId of the source pin (preferred)"
      },
      {
        "name": "sourcePin",
        "type": "string",
        "required": false,
        "description": "Source pin name, when no pinId is given"
      },
      {
        "name": "sourcePinDirection",
        "type": "string",
        "required": false,
        "description": "input | output, to disambiguate sourcePin"
      },
      {
        "name": "targetNode",
        "type": "string",
        "required": false,
        "description": "Node of the target pin"
      },
      {
        "name": "targetPinId",
        "type": "string",
        "required": false,
        "description": "pinId of the target pin"
      },
      {
        "name": "targetPin",
        "type": "string",
        "required": false,
        "description": "Target pin name, when no pinId is given"
      },
      {
        "name": "targetPinDirection",
        "type": "string",
        "required": false,
        "description": "input | output, to disambiguate targetPin"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the asset after the edit (default true)"
      }
    ]
  },
  "duplicate_asset": {
    "category": "asset",
    "params": [
      {
        "name": "sourcePath",
        "type": "string",
        "required": true,
        "description": "Asset to duplicate"
      },
      {
        "name": "destinationPath",
        "type": "string",
        "required": true,
        "description": "Object path of the copy"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "skip (default) returns an existing destination; error refuses"
      }
    ]
  },
  "edit_user_defined_enum": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "UserDefinedEnum asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "op",
        "type": "string",
        "required": true,
        "description": "add_value | rename_value | remove_value"
      },
      {
        "name": "displayName",
        "type": "string",
        "required": false,
        "description": "Display text for the enumerator (add_value, rename_value)"
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Enumerator to act on by short or display name; add_value uses it as the display name when displayName is omitted"
      },
      {
        "name": "index",
        "type": "number",
        "required": false,
        "description": "Enumerator index for rename_value and remove_value"
      }
    ]
  },
  "export_asset": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset to export",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "outputPath",
        "type": "string",
        "required": true,
        "description": "File to write; a relative path resolves against the project directory"
      }
    ]
  },
  "export_texture": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Texture2D asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "outputPath",
        "type": "string",
        "required": true,
        "description": "PNG file to write; a relative path resolves against the project directory",
        "aliases": [
          "filePath"
        ]
      }
    ]
  },
  "export_uv_layout": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "Source LOD to act on (default 0)"
      },
      {
        "name": "channel",
        "type": "number",
        "required": false,
        "description": "Channel to draw (default 0)"
      },
      {
        "name": "outputPath",
        "type": "string",
        "required": false,
        "description": "PNG to write (default under Saved/UVLayouts)"
      },
      {
        "name": "imageSize",
        "type": "number",
        "required": false,
        "description": "PNG edge length (default 1024, max 4096)"
      },
      {
        "name": "showIslands",
        "type": "boolean",
        "required": false,
        "description": "Colour each island separately (default true)"
      },
      {
        "name": "showOverlaps",
        "type": "boolean",
        "required": false,
        "description": "Highlight overlapping texels (default true)"
      },
      {
        "name": "showGrid",
        "type": "boolean",
        "required": false,
        "description": "Draw the unit-square border (default true)"
      }
    ]
  },
  "fill_datatable_from_json": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rows",
        "type": "object",
        "required": false,
        "description": "Rows to upsert: {rowName: {field: value}}"
      },
      {
        "name": "jsonString",
        "type": "string",
        "required": false,
        "description": "The same rows object as JSON text, used when rows is omitted"
      }
    ]
  },
  "force_reload_asset": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset to reload from disk",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "discardUnsaved",
        "type": "boolean",
        "required": false,
        "description": "Reload even when the package has unsaved changes, discarding them (default false)"
      }
    ]
  },
  "generate_lightmap_uvs": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "Source LOD to act on (default 0)"
      },
      {
        "name": "enable",
        "type": "boolean",
        "required": false,
        "description": "Turn lightmap UV generation on (default) or off"
      },
      {
        "name": "sourceChannel",
        "type": "number",
        "required": false,
        "description": "Channel the generator reads (default: the current setting)"
      },
      {
        "name": "destinationChannel",
        "type": "number",
        "required": false,
        "description": "Channel it writes (default: the current setting, or the next free channel)"
      },
      {
        "name": "minLightmapResolution",
        "type": "number",
        "required": false,
        "description": "Packing resolution floor (default 64)"
      },
      {
        "name": "lightmapResolution",
        "type": "number",
        "required": false,
        "description": "The mesh's lightmap resolution"
      },
      {
        "name": "setLightmapCoordinateIndex",
        "type": "boolean",
        "required": false,
        "description": "Point LightMapCoordinateIndex at the destination channel (default true)"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Rebuild even when the settings already match"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the mesh (default true)"
      },
      {
        "name": "dryRun",
        "type": "boolean",
        "required": false,
        "description": "Report without writing"
      },
      {
        "name": "rasterSize",
        "type": "number",
        "required": false,
        "description": "Raster resolution for the result's overlap estimate (default 512)"
      }
    ]
  },
  "get_asset_dependencies": {
    "category": "asset",
    "params": [
      {
        "name": "packages",
        "type": "array",
        "required": false,
        "description": "Package paths to look up",
        "items": "string"
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "One package path, used when packages is omitted"
      },
      {
        "name": "hard",
        "type": "boolean",
        "required": false,
        "description": "Include hard dependencies (default true)"
      },
      {
        "name": "soft",
        "type": "boolean",
        "required": false,
        "description": "Include soft dependencies (default true)"
      }
    ]
  },
  "get_asset_referencers": {
    "category": "asset",
    "params": [
      {
        "name": "packages",
        "type": "array",
        "required": false,
        "description": "Package paths to look up",
        "items": "string"
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "One package path, used when packages is omitted"
      }
    ]
  },
  "get_curvetable_keys": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to read"
      }
    ]
  },
  "get_datatable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to read"
      }
    ]
  },
  "get_mesh_bounds": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path"
      }
    ]
  },
  "get_mesh_collision": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh asset path"
      }
    ]
  },
  "get_mesh_geometry": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "LOD to read (default 0)"
      },
      {
        "name": "sectionIndex",
        "type": "integer",
        "required": false,
        "description": "One render section (omit for every section)"
      },
      {
        "name": "include",
        "type": "array",
        "required": false,
        "description": "positions | uvs | normals | triangles (omit for all four)",
        "items": "string"
      },
      {
        "name": "uvChannel",
        "type": "integer",
        "required": false,
        "description": "UV channel to return (default 0)"
      },
      {
        "name": "dumpToFile",
        "type": "boolean",
        "required": false,
        "description": "Write the geometry JSON to a file instead of returning it"
      },
      {
        "name": "outputPath",
        "type": "string",
        "required": false,
        "description": "File for dumpToFile; relative paths resolve under Saved/"
      }
    ]
  },
  "get_mesh_info": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path"
      }
    ]
  },
  "get_primary_asset_ids": {
    "category": "asset",
    "params": [
      {
        "name": "type",
        "type": "string",
        "required": false,
        "description": "FPrimaryAssetType to list (omit for every type)"
      },
      {
        "name": "maxResults",
        "type": "number",
        "required": false,
        "description": "Most ids to return (default 1000)"
      }
    ]
  },
  "get_stringtable_entry": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StringTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "key",
        "type": "string",
        "required": true,
        "description": "Entry key"
      }
    ]
  },
  "get_texture_info": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Texture2D asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "import_animation": {
    "category": "asset",
    "params": [
      {
        "name": "filePath",
        "type": "string",
        "required": true,
        "description": "Source file on disk",
        "aliases": [
          "filename"
        ]
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Asset name (default: the file name)",
        "aliases": [
          "assetName"
        ]
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game/Animations)",
        "aliases": [
          "destinationPath"
        ]
      },
      {
        "name": "skeletonPath",
        "type": "string",
        "required": true,
        "description": "Skeleton the animation targets"
      },
      {
        "name": "importCustomAttribute",
        "type": "boolean",
        "required": false,
        "description": "Import FBX custom attributes as curves (default true)"
      },
      {
        "name": "removeRedundantKeys",
        "type": "boolean",
        "required": false,
        "description": "Strip keys that do not change the value (default true)"
      },
      {
        "name": "importSettings",
        "type": "object",
        "required": false,
        "description": "FbxAnimSequenceImportData or FbxImportUI fields by UPROPERTY name or dotted path"
      }
    ]
  },
  "import_curvetable": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "jsonString",
        "type": "string",
        "required": false,
        "description": "JSON rows to replace the table from"
      },
      {
        "name": "csvString",
        "type": "string",
        "required": false,
        "description": "CSV rows to replace the table from"
      },
      {
        "name": "filePath",
        "type": "string",
        "required": false,
        "description": "JSON or CSV file to replace the table from",
        "aliases": [
          "jsonPath",
          "csvPath"
        ]
      },
      {
        "name": "format",
        "type": "string",
        "required": false,
        "description": "json | csv (default: from the file extension)"
      },
      {
        "name": "interpMode",
        "type": "string",
        "required": false,
        "description": "linear (default) | constant | cubic | none"
      }
    ]
  },
  "import_file": {
    "category": "asset",
    "params": [
      {
        "name": "filePath",
        "type": "string",
        "required": true,
        "description": "Source file on disk",
        "aliases": [
          "filename"
        ]
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": true,
        "description": "Destination folder",
        "aliases": [
          "destinationPath"
        ]
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Asset name (default: the file name)",
        "aliases": [
          "assetName"
        ]
      },
      {
        "name": "factoryClass",
        "type": "string",
        "required": false,
        "description": "UFactory subclass by name or /Script path (default: picked by extension)"
      },
      {
        "name": "factoryProperties",
        "type": "object",
        "required": false,
        "description": "Factory properties by UPROPERTY name or dotted path, set before the import"
      },
      {
        "name": "replaceExisting",
        "type": "boolean",
        "required": false,
        "description": "Replace an asset already at the destination (default true)"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the imported assets (default false)"
      },
      {
        "name": "automated",
        "type": "boolean",
        "required": false,
        "description": "Suppress interactive dialogs (default true)"
      }
    ]
  },
  "import_skeletal_mesh": {
    "category": "asset",
    "params": [
      {
        "name": "filePath",
        "type": "string",
        "required": true,
        "description": "Source file on disk",
        "aliases": [
          "filename"
        ]
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Asset name (default: the file name)",
        "aliases": [
          "assetName"
        ]
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game/Meshes)",
        "aliases": [
          "destinationPath"
        ]
      },
      {
        "name": "skeletonPath",
        "type": "string",
        "required": false,
        "description": "Existing Skeleton to import onto"
      },
      {
        "name": "importMaterials",
        "type": "boolean",
        "required": false,
        "description": "Import materials (default true)"
      },
      {
        "name": "importTextures",
        "type": "boolean",
        "required": false,
        "description": "Import textures (default true)"
      },
      {
        "name": "importUniformScale",
        "type": "number",
        "required": false,
        "description": "Uniform import scale (default 1.0); 100 fixes metre-authored FBX"
      },
      {
        "name": "importMorphTargets",
        "type": "boolean",
        "required": false,
        "description": "Import morph targets (default true)"
      },
      {
        "name": "createPhysicsAsset",
        "type": "boolean",
        "required": false,
        "description": "Create a PhysicsAsset (default false)"
      },
      {
        "name": "replaceExisting",
        "type": "boolean",
        "required": false,
        "description": "Replace an asset already at the destination (default true)"
      }
    ]
  },
  "import_static_mesh": {
    "category": "asset",
    "params": [
      {
        "name": "filePath",
        "type": "string",
        "required": true,
        "description": "Source file on disk",
        "aliases": [
          "filename"
        ]
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Asset name (default: the file name)",
        "aliases": [
          "assetName"
        ]
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game/Meshes)",
        "aliases": [
          "destinationPath"
        ]
      },
      {
        "name": "combineMeshes",
        "type": "boolean",
        "required": false,
        "description": "Combine every mesh in the file into one (default false)"
      },
      {
        "name": "importMaterials",
        "type": "boolean",
        "required": false,
        "description": "Import materials (default true)"
      },
      {
        "name": "importTextures",
        "type": "boolean",
        "required": false,
        "description": "Import textures (default true)"
      },
      {
        "name": "generateLightmapUVs",
        "type": "boolean",
        "required": false,
        "description": "Generate lightmap UVs (default true)"
      },
      {
        "name": "importUniformScale",
        "type": "number",
        "required": false,
        "description": "Uniform import scale; 100 fixes metre-authored FBX"
      }
    ]
  },
  "import_stringtable": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StringTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "filePath",
        "type": "string",
        "required": true,
        "description": "CSV file to merge into the table",
        "aliases": [
          "filename",
          "csvPath"
        ]
      }
    ]
  },
  "import_stringtable_csv": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StringTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "csvPath",
        "type": "string",
        "required": true,
        "description": "CSV file; a relative path resolves against the project directory",
        "aliases": [
          "filePath"
        ]
      },
      {
        "name": "expectedKeys",
        "type": "array",
        "required": false,
        "description": "Keys the CSV must carry, checked before the asset is touched",
        "items": "string"
      },
      {
        "name": "requireExactKeys",
        "type": "boolean",
        "required": false,
        "description": "Also fail when the CSV carries keys expectedKeys does not list (default false)"
      },
      {
        "name": "replaceExisting",
        "type": "boolean",
        "required": false,
        "description": "Remove entries the CSV does not carry (default false)"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the table (default true)"
      }
    ]
  },
  "import_texture": {
    "category": "asset",
    "params": [
      {
        "name": "filePath",
        "type": "string",
        "required": true,
        "description": "Source file on disk",
        "aliases": [
          "filename"
        ]
      },
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Asset name (default: the file name)",
        "aliases": [
          "assetName"
        ]
      },
      {
        "name": "packagePath",
        "type": "string",
        "required": false,
        "description": "Destination folder (default /Game/Textures)",
        "aliases": [
          "destinationPath"
        ]
      },
      {
        "name": "sRGB",
        "type": "boolean",
        "required": false,
        "description": "Applied to the imported texture"
      },
      {
        "name": "compressionSettings",
        "type": "string",
        "required": false,
        "description": "Compression setting such as Default, Normalmap, Grayscale, HDR or BC7, applied to the imported texture"
      },
      {
        "name": "lodGroup",
        "type": "string",
        "required": false,
        "description": "Texture LOD group, applied to the imported texture"
      },
      {
        "name": "neverStream",
        "type": "boolean",
        "required": false,
        "description": "Applied to the imported texture"
      },
      {
        "name": "noCompression",
        "type": "boolean",
        "required": false,
        "description": "Factory option: import uncompressed"
      },
      {
        "name": "noAlpha",
        "type": "boolean",
        "required": false,
        "description": "Factory option: drop the alpha channel"
      }
    ]
  },
  "list_asset_sockets": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh, SkeletalMesh or Skeleton asset path"
      }
    ]
  },
  "list_curvetable_rows": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowFilter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring filter on row names"
      }
    ]
  },
  "list_enum_values": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "UEnum or UserDefinedEnum asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "list_skeleton_bones": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh or Skeleton asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "includeTransforms",
        "type": "boolean",
        "required": false,
        "description": "Include rest-pose transforms (default true)"
      }
    ]
  },
  "list_sockets": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh, SkeletalMesh or Skeleton asset path"
      }
    ]
  },
  "list_stringtable_keys": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StringTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "keyFilter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring filter on keys"
      }
    ]
  },
  "list_struct_fields": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "UserDefinedStruct asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "measure_mesh_geometry": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "LOD to measure (default 0)"
      },
      {
        "name": "sectionIndex",
        "type": "integer",
        "required": false,
        "description": "One render section (omit to measure the whole LOD)"
      }
    ]
  },
  "move_asset": {
    "category": "asset",
    "params": [
      {
        "name": "sourcePath",
        "type": "string",
        "required": false,
        "description": "Asset to rename, together with destinationPath"
      },
      {
        "name": "destinationPath",
        "type": "string",
        "required": false,
        "description": "New object path, together with sourcePath"
      },
      {
        "name": "assetPath",
        "type": "string",
        "required": false,
        "description": "Asset to rename in its own folder, together with newName"
      },
      {
        "name": "newName",
        "type": "string",
        "required": false,
        "description": "New asset name, together with assetPath"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "World renames only: merge into a destination that already holds external packages (used by rollback)"
      }
    ]
  },
  "move_folder": {
    "category": "asset",
    "params": [
      {
        "name": "sourcePath",
        "type": "string",
        "required": true,
        "description": "Content folder to move"
      },
      {
        "name": "destinationPath",
        "type": "string",
        "required": true,
        "description": "Content folder to move it to"
      }
    ]
  },
  "read_asset": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_asset_graph": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "EdGraph-backed asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "graphName",
        "type": "string",
        "required": false,
        "description": "Only graphs whose name contains this"
      },
      {
        "name": "includePins",
        "type": "boolean",
        "required": false,
        "description": "Include each node's pins and links (default true)"
      },
      {
        "name": "maxNodes",
        "type": "number",
        "required": false,
        "description": "Nodes reported per graph (default 500, max 5000)"
      }
    ]
  },
  "read_cloth_data": {
    "category": "asset",
    "params": [
      {
        "name": "skeletalMeshPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "assetPath"
        ]
      }
    ]
  },
  "read_curvetable": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowFilter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring filter on row names"
      }
    ]
  },
  "read_datatable": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowFilter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring filter on row names"
      },
      {
        "name": "outputPath",
        "type": "string",
        "required": false,
        "description": "Write the rows to this JSON file instead of returning them; relative paths resolve under Saved/"
      }
    ]
  },
  "read_import_sources": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Imported asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_stringtable": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StringTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "keyFilter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring filter on keys"
      }
    ]
  },
  "read_uv_channels": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "Source LOD to act on (default 0)"
      },
      {
        "name": "channels",
        "type": "array",
        "required": false,
        "description": "Only these channels (omit for every channel)",
        "items": "number"
      },
      {
        "name": "includeIslands",
        "type": "boolean",
        "required": false,
        "description": "Include the per-island breakdown (default true)"
      },
      {
        "name": "includeOverlap",
        "type": "boolean",
        "required": false,
        "description": "Compute the overlapping-area fraction (default true)"
      },
      {
        "name": "rasterSize",
        "type": "number",
        "required": false,
        "description": "Raster resolution for the coverage and overlap estimate (default 512)"
      }
    ]
  },
  "reimport_asset": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Imported asset to rebuild from its source file",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "filePath",
        "type": "string",
        "required": false,
        "description": "New source file to record and reimport from",
        "aliases": [
          "filename"
        ]
      }
    ]
  },
  "reimport_datatable": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "jsonPath",
        "type": "string",
        "required": false,
        "description": "JSON file to replace the table from"
      },
      {
        "name": "jsonString",
        "type": "string",
        "required": false,
        "description": "JSON text to replace the table from"
      }
    ]
  },
  "reindex_assets_fts": {
    "category": "asset",
    "params": [
      {
        "name": "directory",
        "type": "string",
        "required": false,
        "description": "Content path to rescan (default /Game)"
      }
    ]
  },
  "reload_package": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset whose package to reload",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "remove_curvetable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to remove"
      }
    ]
  },
  "remove_datatable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to remove"
      }
    ]
  },
  "remove_graph_node": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "EdGraph-backed asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "graphName",
        "type": "string",
        "required": false,
        "description": "Graph to author in, by name or unique substring (required when the asset has several graphs)"
      },
      {
        "name": "node",
        "type": "string",
        "required": true,
        "description": "Node to remove: nodeGuid, path, name or unique title"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the asset after the edit (default true)"
      }
    ]
  },
  "remove_socket": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh, SkeletalMesh or Skeleton asset path"
      },
      {
        "name": "socketName",
        "type": "string",
        "required": true,
        "description": "Socket to remove"
      }
    ]
  },
  "remove_stringtable_entry": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StringTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "key",
        "type": "string",
        "required": true,
        "description": "Entry key"
      }
    ]
  },
  "rename_asset": {
    "category": "asset",
    "params": [
      {
        "name": "sourcePath",
        "type": "string",
        "required": false,
        "description": "Asset to rename, together with destinationPath"
      },
      {
        "name": "destinationPath",
        "type": "string",
        "required": false,
        "description": "New object path, together with sourcePath"
      },
      {
        "name": "assetPath",
        "type": "string",
        "required": false,
        "description": "Asset to rename in its own folder, together with newName"
      },
      {
        "name": "newName",
        "type": "string",
        "required": false,
        "description": "New asset name, together with assetPath"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "World renames only: merge into a destination that already holds external packages (used by rollback)"
      }
    ]
  },
  "rename_curvetable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "oldName",
        "type": "string",
        "required": true,
        "description": "Row to rename",
        "aliases": [
          "rowName"
        ]
      },
      {
        "name": "newName",
        "type": "string",
        "required": true,
        "description": "New row name"
      }
    ]
  },
  "rename_datatable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "oldName",
        "type": "string",
        "required": true,
        "description": "Row to rename",
        "aliases": [
          "rowName"
        ]
      },
      {
        "name": "newName",
        "type": "string",
        "required": true,
        "description": "New row name"
      }
    ]
  },
  "save_all_dirty": {
    "category": "asset",
    "params": [
      {
        "name": "saveMapPackages",
        "type": "boolean",
        "required": false,
        "description": "Include map packages (default true)"
      },
      {
        "name": "saveContentPackages",
        "type": "boolean",
        "required": false,
        "description": "Include content packages (default true)"
      }
    ]
  },
  "save_asset": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": false,
        "description": "Asset to save; omit to save every dirty asset under /Game",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Write the package even when it is not dirty (needs assetPath)"
      }
    ]
  },
  "set_asset_property": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset path; a Blueprint path writes its generated-class CDO",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property path; dotted and indexed paths walk structs, arrays and instanced subobjects"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Value to write: scalar, object, array or asset path"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the package after the write (default true)"
      }
    ]
  },
  "set_cloth_config": {
    "category": "asset",
    "params": [
      {
        "name": "skeletalMeshPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "properties",
        "type": "object",
        "required": true,
        "description": "Config properties to set by reflection"
      },
      {
        "name": "clothingAsset",
        "type": "string",
        "required": false,
        "description": "Only the clothing asset with this name"
      },
      {
        "name": "configType",
        "type": "string",
        "required": false,
        "description": "Only configs whose class or key contains this"
      }
    ]
  },
  "set_curvetable_keys": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "CurveTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row whose keys to replace"
      },
      {
        "name": "keys",
        "type": "array",
        "required": true,
        "description": "Replacement keys: [{time, value, interpMode?, arriveTangent?, leaveTangent?}]",
        "items": "object"
      }
    ]
  },
  "set_datatable_cell": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Existing row to edit"
      },
      {
        "name": "fieldName",
        "type": "string",
        "required": true,
        "description": "Row-struct field to write"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Value to write"
      }
    ]
  },
  "set_datatable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to append or overwrite"
      },
      {
        "name": "row",
        "type": "object",
        "required": true,
        "description": "Row-struct fields to write; fields not named keep their values",
        "aliases": [
          "fields",
          "data"
        ]
      }
    ]
  },
  "set_mesh_material": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material to assign"
      },
      {
        "name": "slotIndex",
        "type": "number",
        "required": false,
        "description": "Material slot index (default 0)"
      }
    ]
  },
  "set_mesh_nav": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh asset path"
      },
      {
        "name": "bHasNavigationData",
        "type": "boolean",
        "required": false,
        "description": "Whether the mesh generates navigation data"
      },
      {
        "name": "clearNavCollision",
        "type": "boolean",
        "required": false,
        "description": "Remove the mesh's NavCollision"
      }
    ]
  },
  "set_sk_material_slots": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "slots",
        "type": "array",
        "required": true,
        "description": "Slot assignments: [{slotName? | slotIndex?, materialPath}]",
        "items": "object"
      }
    ]
  },
  "set_socket_transform": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path"
      },
      {
        "name": "socketName",
        "type": "string",
        "required": true,
        "description": "Socket to move"
      },
      {
        "name": "relativeLocation",
        "type": "vec3",
        "required": false,
        "description": "New relative location"
      },
      {
        "name": "relativeRotation",
        "type": "rotator",
        "required": false,
        "description": "New relative rotation"
      },
      {
        "name": "relativeScale",
        "type": "vec3",
        "required": false,
        "description": "New relative scale"
      }
    ]
  },
  "set_stringtable_entry": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StringTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "key",
        "type": "string",
        "required": true,
        "description": "Entry key"
      },
      {
        "name": "sourceString",
        "type": "string",
        "required": false,
        "description": "Source string to write"
      },
      {
        "name": "value",
        "type": "any",
        "required": false,
        "description": "Source string to write, when sourceString is omitted"
      }
    ]
  },
  "set_texture_settings_by_type": {
    "category": "asset",
    "params": [
      {
        "name": "groups",
        "type": "object",
        "required": true,
        "description": "Texture paths per profile: {normal?, grayscale?, baseColor?, hdr?}"
      }
    ]
  },
  "set_uv_channel_count": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "Source LOD to act on (default 0)"
      },
      {
        "name": "op",
        "type": "string",
        "required": false,
        "description": "set (default) | add | remove | copy"
      },
      {
        "name": "channelCount",
        "type": "number",
        "required": false,
        "description": "Target channel count (op=set)"
      },
      {
        "name": "count",
        "type": "number",
        "required": false,
        "description": "Channels to add (op=add, default 1)"
      },
      {
        "name": "channel",
        "type": "number",
        "required": false,
        "description": "Channel to remove (op=remove)"
      },
      {
        "name": "fromChannel",
        "type": "number",
        "required": false,
        "description": "Source channel (op=copy)"
      },
      {
        "name": "toChannel",
        "type": "number",
        "required": false,
        "description": "Destination channel (op=copy)"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the mesh (default true)"
      },
      {
        "name": "dryRun",
        "type": "boolean",
        "required": false,
        "description": "Report without writing"
      }
    ]
  },
  "transform_uvs": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "Source LOD to act on (default 0)"
      },
      {
        "name": "channel",
        "type": "number",
        "required": false,
        "description": "Channel to transform (default 0)"
      },
      {
        "name": "translate",
        "type": "object",
        "required": false,
        "description": "UV-space offset {u, v}"
      },
      {
        "name": "scale",
        "type": "object",
        "required": false,
        "description": "UV-space scale {u, v}; a zero component is refused"
      },
      {
        "name": "rotate",
        "type": "number",
        "required": false,
        "description": "Rotation in degrees"
      },
      {
        "name": "origin",
        "type": "object",
        "required": false,
        "description": "Pivot for rotate and scale {u, v} (default 0.5, 0.5)"
      },
      {
        "name": "flipU",
        "type": "boolean",
        "required": false,
        "description": "Mirror across U"
      },
      {
        "name": "flipV",
        "type": "boolean",
        "required": false,
        "description": "Mirror across V"
      },
      {
        "name": "order",
        "type": "string",
        "required": false,
        "description": "flipScaleRotateTranslate (default) | translateRotateScaleFlip"
      },
      {
        "name": "selection",
        "type": "object",
        "required": false,
        "description": "What to transform: {mode: all|island|normal|polygonGroup, islandIndices?, normalDirection?, normalAngleTolerance?, polygonGroups?, materialSlotNames?}"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the mesh (default true)"
      },
      {
        "name": "dryRun",
        "type": "boolean",
        "required": false,
        "description": "Report without writing"
      }
    ]
  },
  "unbind_cloth_from_section": {
    "category": "asset",
    "params": [
      {
        "name": "skeletalMeshPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": true,
        "description": "Mesh LOD"
      },
      {
        "name": "sectionIndex",
        "type": "integer",
        "required": true,
        "description": "Render section to unbind"
      },
      {
        "name": "clothingAsset",
        "type": "string",
        "required": false,
        "description": "Refuse unless the section is bound to this clothing asset"
      }
    ]
  },
  "unwrap_uvs": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh or SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "lodIndex",
        "type": "integer",
        "required": false,
        "description": "Source LOD to act on (default 0)"
      },
      {
        "name": "channel",
        "type": "number",
        "required": false,
        "description": "Channel to write (default 0)"
      },
      {
        "name": "method",
        "type": "string",
        "required": false,
        "description": "xatlas (default) | patchBuilder | expMap | conformal | spectralConformal | planar | box | cylinder"
      },
      {
        "name": "pack",
        "type": "boolean",
        "required": false,
        "description": "Repack the islands after unwrapping (default true)"
      },
      {
        "name": "textureResolution",
        "type": "number",
        "required": false,
        "description": "Resolution the packer targets (default 1024)"
      },
      {
        "name": "maxIterations",
        "type": "number",
        "required": false,
        "description": "Solver iteration cap"
      },
      {
        "name": "initialPatchCount",
        "type": "number",
        "required": false,
        "description": "Starting patch count for patchBuilder"
      },
      {
        "name": "islandSource",
        "type": "string",
        "required": false,
        "description": "UVIslands (default) | PolyGroups"
      },
      {
        "name": "projectionTransform",
        "type": "object",
        "required": false,
        "description": "Transform for the planar, box and cylinder projections"
      },
      {
        "name": "preserveVertexOrder",
        "type": "boolean",
        "required": false,
        "description": "Keep the existing vertex order (default true)"
      },
      {
        "name": "backupToChannel",
        "type": "number",
        "required": false,
        "description": "Copy the existing UVs here first"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the mesh (default true)"
      },
      {
        "name": "dryRun",
        "type": "boolean",
        "required": false,
        "description": "Report without writing"
      },
      {
        "name": "rasterSize",
        "type": "number",
        "required": false,
        "description": "Raster resolution for the result's overlap estimate (default 512)"
      }
    ]
  },
  "update_datatable_row": {
    "category": "asset",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "DataTable asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "rowName",
        "type": "string",
        "required": true,
        "description": "Row to append or overwrite"
      },
      {
        "name": "row",
        "type": "object",
        "required": true,
        "description": "Row-struct fields to write; fields not named keep their values",
        "aliases": [
          "fields",
          "data"
        ]
      }
    ]
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  add_curvetable_key: "Params: assetPath (or path), rowName, time, value, interpMode?, keyTimeTolerance?",
  add_curvetable_row: "Params: assetPath (or path), rowName, curveType? (or mode), interpMode?",
  add_datatable_row: "Params: assetPath (or path), rowName, row (or fields, or data)",
  add_graph_node: "Params: assetPath (or path), graphName?, nodeClass?, actionName?, spawnMode?, posX?, posY?, save?",
  add_socket: "Params: assetPath, socketName, boneName?, relativeLocation?, relativeRotation?, relativeScale?, onConflict?",
  append_asset_array_elements: "Params: assetPath (or path), propertyName, elements, save?",
  asset_health_check: "Params: assetPath (or path)",
  bind_cloth_to_section: "Params: skeletalMeshPath (or assetPath), lodIndex, sectionIndex, clothingAsset?, assetLodIndex?",
  bulk_rename_assets: "Params: renames",
  check_uvs: "Params: assetPath (or path), lodIndex?, requireLightmapChannel?, maxOverlapFraction?, rasterSize?",
  compare_textures: "Params: assetPathA (or a), assetPathB (or b)",
  connect_graph_pins: "Params: assetPath (or path), graphName?, sourceNode?, sourcePinId?, sourcePin?, sourcePinDirection?, targetNode?, targetPinId?, targetPin?, targetPinDirection?, save?",
  create_asset_by_class: "Params: name, className (or class), packagePath?, properties?, onConflict?",
  create_customizable_object: "Params: name, packagePath?, onConflict?, save?",
  create_data_asset: "Params: name, className (or class), packagePath?, properties?, onConflict?",
  create_datatable: "Params: name, rowStruct, packagePath?, onConflict?",
  create_render_target_2d: "Params: name, packagePath?, width?, height?, format?, clearColor?, generateMips?, targetGamma?, onConflict?",
  create_subobject: "Params: assetPath (or path), className, name, properties?, outer?, onConflict?, save?",
  delete_asset: "Params: assetPath (or path), force?",
  delete_asset_batch: "Params: assetPaths (or paths), force?",
  delete_datatable_row: "Params: assetPath (or path), rowName",
  delete_folder: "Params: path?, paths?, force?",
  diagnose_registry: "Params: path, recursive?, reconcile?",
  disconnect_graph_pins: "Params: assetPath (or path), graphName?, sourceNode?, sourcePinId?, sourcePin?, sourcePinDirection?, targetNode?, targetPinId?, targetPin?, targetPinDirection?, save?",
  duplicate_asset: "Params: sourcePath, destinationPath, onConflict?",
  edit_user_defined_enum: "Params: assetPath (or path), op, displayName?, name?, index?",
  export_asset: "Params: assetPath (or path), outputPath",
  export_texture: "Params: assetPath (or path), outputPath (or filePath)",
  export_uv_layout: "Params: assetPath (or path), lodIndex?, channel?, outputPath?, imageSize?, showIslands?, showOverlaps?, showGrid?",
  fill_datatable_from_json: "Params: assetPath (or path), rows?, jsonString?",
  force_reload_asset: "Params: assetPath (or path), discardUnsaved?",
  generate_lightmap_uvs: "Params: assetPath (or path), lodIndex?, enable?, sourceChannel?, destinationChannel?, minLightmapResolution?, lightmapResolution?, setLightmapCoordinateIndex?, force?, save?, dryRun?, rasterSize?",
  get_asset_dependencies: "Params: packages?, packagePath?, hard?, soft?",
  get_asset_referencers: "Params: packages?, packagePath?",
  get_curvetable_keys: "Params: assetPath (or path), rowName",
  get_datatable_row: "Params: assetPath (or path), rowName",
  get_mesh_bounds: "Params: assetPath",
  get_mesh_collision: "Params: assetPath",
  get_mesh_geometry: "Params: assetPath (or path), lodIndex?, sectionIndex?, include?, uvChannel?, dumpToFile?, outputPath?",
  get_mesh_info: "Params: assetPath",
  get_primary_asset_ids: "Params: type?, maxResults?",
  get_stringtable_entry: "Params: assetPath (or path), key",
  get_texture_info: "Params: assetPath (or path)",
  import_animation: "Params: filePath (or filename), name? (or assetName), packagePath? (or destinationPath), skeletonPath, importCustomAttribute?, removeRedundantKeys?, importSettings?",
  import_curvetable: "Params: assetPath (or path), jsonString?, csvString?, filePath? (or jsonPath, or csvPath), format?, interpMode?",
  import_file: "Params: filePath (or filename), packagePath (or destinationPath), name? (or assetName), factoryClass?, factoryProperties?, replaceExisting?, save?, automated?",
  import_skeletal_mesh: "Params: filePath (or filename), name? (or assetName), packagePath? (or destinationPath), skeletonPath?, importMaterials?, importTextures?, importUniformScale?, importMorphTargets?, createPhysicsAsset?, replaceExisting?",
  import_static_mesh: "Params: filePath (or filename), name? (or assetName), packagePath? (or destinationPath), combineMeshes?, importMaterials?, importTextures?, generateLightmapUVs?, importUniformScale?",
  import_stringtable: "Params: assetPath (or path), filePath (or filename, or csvPath)",
  import_stringtable_csv: "Params: assetPath (or path), csvPath (or filePath), expectedKeys?, requireExactKeys?, replaceExisting?, save?",
  import_texture: "Params: filePath (or filename), name? (or assetName), packagePath? (or destinationPath), sRGB?, compressionSettings?, lodGroup?, neverStream?, noCompression?, noAlpha?",
  list_asset_sockets: "Params: assetPath",
  list_curvetable_rows: "Params: assetPath (or path), rowFilter?",
  list_enum_values: "Params: assetPath (or path)",
  list_skeleton_bones: "Params: assetPath (or path), includeTransforms?",
  list_sockets: "Params: assetPath",
  list_stringtable_keys: "Params: assetPath (or path), keyFilter?",
  list_struct_fields: "Params: assetPath (or path)",
  measure_mesh_geometry: "Params: assetPath (or path), lodIndex?, sectionIndex?",
  move_asset: "Params: sourcePath?, destinationPath?, assetPath?, newName?, force?",
  move_folder: "Params: sourcePath, destinationPath",
  read_asset: "Params: assetPath (or path)",
  read_asset_graph: "Params: assetPath (or path), graphName?, includePins?, maxNodes?",
  read_cloth_data: "Params: skeletalMeshPath (or assetPath)",
  read_curvetable: "Params: assetPath (or path), rowFilter?",
  read_datatable: "Params: assetPath (or path), rowFilter?, outputPath?",
  read_import_sources: "Params: assetPath (or path)",
  read_stringtable: "Params: assetPath (or path), keyFilter?",
  read_uv_channels: "Params: assetPath (or path), lodIndex?, channels?, includeIslands?, includeOverlap?, rasterSize?",
  reimport_asset: "Params: assetPath (or path), filePath? (or filename)",
  reimport_datatable: "Params: assetPath (or path), jsonPath?, jsonString?",
  reindex_assets_fts: "Params: directory?",
  reload_package: "Params: assetPath (or path)",
  remove_curvetable_row: "Params: assetPath (or path), rowName",
  remove_datatable_row: "Params: assetPath (or path), rowName",
  remove_graph_node: "Params: assetPath (or path), graphName?, node, save?",
  remove_socket: "Params: assetPath, socketName",
  remove_stringtable_entry: "Params: assetPath (or path), key",
  rename_asset: "Params: sourcePath?, destinationPath?, assetPath?, newName?, force?",
  rename_curvetable_row: "Params: assetPath (or path), oldName (or rowName), newName",
  rename_datatable_row: "Params: assetPath (or path), oldName (or rowName), newName",
  save_all_dirty: "Params: saveMapPackages?, saveContentPackages?",
  save_asset: "Params: assetPath? (or path), force?",
  set_asset_property: "Params: assetPath (or path), propertyName, value, save?",
  set_cloth_config: "Params: skeletalMeshPath (or assetPath), properties, clothingAsset?, configType?",
  set_curvetable_keys: "Params: assetPath (or path), rowName, keys",
  set_datatable_cell: "Params: assetPath (or path), rowName, fieldName, value",
  set_datatable_row: "Params: assetPath (or path), rowName, row (or fields, or data)",
  set_mesh_material: "Params: assetPath (or path), materialPath, slotIndex?",
  set_mesh_nav: "Params: assetPath, bHasNavigationData?, clearNavCollision?",
  set_sk_material_slots: "Params: assetPath (or path), slots",
  set_socket_transform: "Params: assetPath, socketName, relativeLocation?, relativeRotation?, relativeScale?",
  set_stringtable_entry: "Params: assetPath (or path), key, sourceString?, value?",
  set_texture_settings_by_type: "Params: groups",
  set_uv_channel_count: "Params: assetPath (or path), lodIndex?, op?, channelCount?, count?, channel?, fromChannel?, toChannel?, save?, dryRun?",
  transform_uvs: "Params: assetPath (or path), lodIndex?, channel?, translate?, scale?, rotate?, origin?, flipU?, flipV?, order?, selection?, save?, dryRun?",
  unbind_cloth_from_section: "Params: skeletalMeshPath (or assetPath), lodIndex, sectionIndex, clothingAsset?",
  unwrap_uvs: "Params: assetPath (or path), lodIndex?, channel?, method?, pack?, textureResolution?, maxIterations?, initialPatchCount?, islandSource?, projectionTransform?, preserveVertexOrder?, backupToChannel?, save?, dryRun?, rasterSize?",
  update_datatable_row: "Params: assetPath (or path), rowName, row (or fields, or data)",
};

/** Every key the spec'd asset handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  a: z.string().optional().describe("Alias for assetPathA"),
  actionName: z.string().optional().describe("Schema menu entry name, or 'category|name'"),
  assetLodIndex: z.number().int().optional().describe("LOD inside the clothing asset (default: lodIndex, clamped)"),
  assetName: z.string().optional().describe("Alias for name"),
  assetPath: z.string().optional().describe("CurveTable asset path (add_curvetable_key, add_curvetable_row, get_curvetable_keys, import_curvetable, list_curvetable_rows, read_curvetable, remove_curvetable_row, rename_curvetable_row, set_curvetable_keys). DataTable asset path (add_datatable_row, delete_datatable_row, fill_datatable_from_json, get_datatable_row, read_datatable, reimport_datatable, remove_datatable_row, rename_datatable_row, set_datatable_cell, set_datatable_row, update_datatable_row). EdGraph-backed asset path (add_graph_node, connect_graph_pins, disconnect_graph_pins, read_asset_graph, remove_graph_node). StaticMesh, SkeletalMesh or Skeleton asset path (add_socket, list_asset_sockets, list_sockets, remove_socket). Asset path; a Blueprint path writes its generated-class CDO (append_asset_array_elements, set_asset_property). Asset to check (asset_health_check). Alias for skeletalMeshPath (bind_cloth_to_section, read_cloth_data, set_cloth_config, unbind_cloth_from_section). StaticMesh or SkeletalMesh asset path (check_uvs, export_uv_layout, get_mesh_bounds, get_mesh_geometry, get_mesh_info, measure_mesh_geometry, read_uv_channels, set_socket_transform, set_uv_channel_count, transform_uvs, unwrap_uvs). Asset that owns the new subobject (create_subobject). Asset to delete (delete_asset). UserDefinedEnum asset path (edit_user_defined_enum). Asset to export (export_asset). Texture2D asset path (export_texture, get_texture_info). Asset to reload from disk (force_reload_asset). StaticMesh asset path (generate_lightmap_uvs, get_mesh_collision, set_mesh_material, set_mesh_nav). StringTable asset path (get_stringtable_entry, import_stringtable, import_stringtable_csv, list_stringtable_keys, read_stringtable, remove_stringtable_entry, set_stringtable_entry). UEnum or UserDefinedEnum asset path (list_enum_values). SkeletalMesh or Skeleton asset path (list_skeleton_bones). UserDefinedStruct asset path (list_struct_fields). Asset to rename in its own folder, together with newName (move_asset, rename_asset). Asset path (read_asset). Imported asset path (read_import_sources). Imported asset to rebuild from its source file (reimport_asset). Asset whose package to reload (reload_package). Asset to save; omit to save every dirty asset under /Game (save_asset). SkeletalMesh asset path (set_sk_material_slots)"),
  assetPathA: z.string().optional().describe("First Texture2D"),
  assetPathB: z.string().optional().describe("Second Texture2D"),
  assetPaths: z.array(z.string()).optional().describe("Assets to delete"),
  automated: z.boolean().optional().describe("Suppress interactive dialogs (default true)"),
  b: z.string().optional().describe("Alias for assetPathB"),
  backupToChannel: z.number().optional().describe("Copy the existing UVs here first"),
  bHasNavigationData: z.boolean().optional().describe("Whether the mesh generates navigation data"),
  boneName: z.string().optional().describe("Bone to attach to (SkeletalMesh and Skeleton, default root)"),
  channel: z.number().optional().describe("Channel to draw (default 0) (export_uv_layout). Channel to remove (op=remove) (set_uv_channel_count). Channel to transform (default 0) (transform_uvs). Channel to write (default 0) (unwrap_uvs)"),
  channelCount: z.number().optional().describe("Target channel count (op=set)"),
  channels: z.array(z.number()).optional().describe("Only these channels (omit for every channel)"),
  class: z.string().optional().describe("Alias for className"),
  className: z.string().optional().describe("Concrete UObject class: class name with or without the C++ prefix, or a /Script/Module.Class path (create_asset_by_class). UDataAsset subclass: class name with or without the C++ prefix, or a /Script/Module.Class path (create_data_asset). Class to instantiate, e.g. a /Script/Module.Class path (create_subobject)"),
  clearColor: z.record(z.unknown()).optional().describe("Linear clear color {r, g, b, a} (default transparent)"),
  clearNavCollision: z.boolean().optional().describe("Remove the mesh's NavCollision"),
  clothingAsset: z.string().optional().describe("Clothing asset by name (optional when the mesh has one) (bind_cloth_to_section). Only the clothing asset with this name (set_cloth_config). Refuse unless the section is bound to this clothing asset (unbind_cloth_from_section)"),
  combineMeshes: z.boolean().optional().describe("Combine every mesh in the file into one (default false)"),
  compressionSettings: z.string().optional().describe("Compression setting such as Default, Normalmap, Grayscale, HDR or BC7, applied to the imported texture"),
  configType: z.string().optional().describe("Only configs whose class or key contains this"),
  count: z.number().optional().describe("Channels to add (op=add, default 1)"),
  createPhysicsAsset: z.boolean().optional().describe("Create a PhysicsAsset (default false)"),
  csvPath: z.string().optional().describe("Alias for filePath (import_curvetable, import_stringtable). CSV file; a relative path resolves against the project directory (import_stringtable_csv)"),
  csvString: z.string().optional().describe("CSV rows to replace the table from"),
  curveType: z.string().optional().describe("simple | rich (default: the table's type, or rich for cubic)"),
  data: z.record(z.unknown()).optional().describe("Alias for row"),
  destinationChannel: z.number().optional().describe("Channel it writes (default: the current setting, or the next free channel)"),
  destinationPath: z.string().optional().describe("Object path of the copy (duplicate_asset). Alias for packagePath (import_animation, import_file, import_skeletal_mesh, import_static_mesh, import_texture). New object path, together with sourcePath (move_asset, rename_asset). Content folder to move it to (move_folder)"),
  directory: z.string().optional().describe("Content path to rescan (default /Game)"),
  discardUnsaved: z.boolean().optional().describe("Reload even when the package has unsaved changes, discarding them (default false)"),
  displayName: z.string().optional().describe("Display text for the enumerator (add_value, rename_value)"),
  dryRun: z.boolean().optional().describe("Report without writing"),
  dumpToFile: z.boolean().optional().describe("Write the geometry JSON to a file instead of returning it"),
  elements: z.array(z.unknown()).optional().describe("Values to append, validated before any is written"),
  enable: z.boolean().optional().describe("Turn lightmap UV generation on (default) or off"),
  expectedKeys: z.array(z.string()).optional().describe("Keys the CSV must carry, checked before the asset is touched"),
  factoryClass: z.string().optional().describe("UFactory subclass by name or /Script path (default: picked by extension)"),
  factoryProperties: z.record(z.unknown()).optional().describe("Factory properties by UPROPERTY name or dotted path, set before the import"),
  fieldName: z.string().optional().describe("Row-struct field to write"),
  fields: z.record(z.unknown()).optional().describe("Alias for row"),
  filename: z.string().optional().describe("Alias for filePath"),
  filePath: z.string().optional().describe("Alias for outputPath (export_texture). Source file on disk (import_animation, import_file, import_skeletal_mesh, import_static_mesh, import_texture). JSON or CSV file to replace the table from (import_curvetable). CSV file to merge into the table (import_stringtable). Alias for csvPath (import_stringtable_csv). New source file to record and reimport from (reimport_asset)"),
  flipU: z.boolean().optional().describe("Mirror across U"),
  flipV: z.boolean().optional().describe("Mirror across V"),
  force: z.boolean().optional().describe("Delete even when other packages reference it, closing open editors (default false) (delete_asset). Delete referenced assets too, closing open editors (default false) (delete_asset_batch). Also delete the assets inside (default false: only empty folders) (delete_folder). Rebuild even when the settings already match (generate_lightmap_uvs). World renames only: merge into a destination that already holds external packages (used by rollback) (move_asset, rename_asset). Write the package even when it is not dirty (needs assetPath) (save_asset)"),
  format: z.string().optional().describe("R8 | RG8 | RGBA8 | RGBA8_SRGB | R16F | RG16F | RGBA16F | R32F | RG32F | RGBA32F | RGB10A2 (default RGBA8_SRGB) (create_render_target_2d). json | csv (default: from the file extension) (import_curvetable)"),
  fromChannel: z.number().optional().describe("Source channel (op=copy)"),
  generateLightmapUVs: z.boolean().optional().describe("Generate lightmap UVs (default true)"),
  generateMips: z.boolean().optional().describe("Generate mipmaps automatically (default false)"),
  graphName: z.string().optional().describe("Graph to author in, by name or unique substring (required when the asset has several graphs) (add_graph_node, connect_graph_pins, disconnect_graph_pins, remove_graph_node). Only graphs whose name contains this (read_asset_graph)"),
  groups: z.record(z.unknown()).optional().describe("Texture paths per profile: {normal?, grayscale?, baseColor?, hdr?}"),
  hard: z.boolean().optional().describe("Include hard dependencies (default true)"),
  height: z.number().int().optional().describe("Pixel height, 1-8192 (default 512)"),
  imageSize: z.number().optional().describe("PNG edge length (default 1024, max 4096)"),
  importCustomAttribute: z.boolean().optional().describe("Import FBX custom attributes as curves (default true)"),
  importMaterials: z.boolean().optional().describe("Import materials (default true)"),
  importMorphTargets: z.boolean().optional().describe("Import morph targets (default true)"),
  importSettings: z.record(z.unknown()).optional().describe("FbxAnimSequenceImportData or FbxImportUI fields by UPROPERTY name or dotted path"),
  importTextures: z.boolean().optional().describe("Import textures (default true)"),
  importUniformScale: z.number().optional().describe("Uniform import scale (default 1.0); 100 fixes metre-authored FBX (import_skeletal_mesh). Uniform import scale; 100 fixes metre-authored FBX (import_static_mesh)"),
  include: z.array(z.string()).optional().describe("positions | uvs | normals | triangles (omit for all four)"),
  includeIslands: z.boolean().optional().describe("Include the per-island breakdown (default true)"),
  includeOverlap: z.boolean().optional().describe("Compute the overlapping-area fraction (default true)"),
  includePins: z.boolean().optional().describe("Include each node's pins and links (default true)"),
  includeTransforms: z.boolean().optional().describe("Include rest-pose transforms (default true)"),
  index: z.number().optional().describe("Enumerator index for rename_value and remove_value"),
  initialPatchCount: z.number().optional().describe("Starting patch count for patchBuilder"),
  interpMode: z.string().optional().describe("linear (default) | constant | cubic | none"),
  islandSource: z.string().optional().describe("UVIslands (default) | PolyGroups"),
  jsonPath: z.string().optional().describe("Alias for filePath (import_curvetable). JSON file to replace the table from (reimport_datatable)"),
  jsonString: z.string().optional().describe("The same rows object as JSON text, used when rows is omitted (fill_datatable_from_json). JSON rows to replace the table from (import_curvetable). JSON text to replace the table from (reimport_datatable)"),
  key: z.string().optional().describe("Entry key"),
  keyFilter: z.string().optional().describe("Case-insensitive substring filter on keys"),
  keys: z.array(z.record(z.unknown())).optional().describe("Replacement keys: [{time, value, interpMode?, arriveTangent?, leaveTangent?}]"),
  keyTimeTolerance: z.number().optional().describe("How close an existing key must be to be updated rather than added"),
  lightmapResolution: z.number().optional().describe("The mesh's lightmap resolution"),
  lodGroup: z.string().optional().describe("Texture LOD group, applied to the imported texture"),
  lodIndex: z.number().int().optional().describe("Mesh LOD (bind_cloth_to_section, unbind_cloth_from_section). Source LOD to act on (default 0) (check_uvs, export_uv_layout, generate_lightmap_uvs, read_uv_channels, set_uv_channel_count, transform_uvs, unwrap_uvs). LOD to read (default 0) (get_mesh_geometry). LOD to measure (default 0) (measure_mesh_geometry)"),
  materialPath: z.string().optional().describe("Material to assign"),
  maxIterations: z.number().optional().describe("Solver iteration cap"),
  maxNodes: z.number().optional().describe("Nodes reported per graph (default 500, max 5000)"),
  maxOverlapFraction: z.number().optional().describe("Overlap above this fraction of the lightmap channel is a fault (default 0.001)"),
  maxResults: z.number().optional().describe("Most ids to return (default 1000)"),
  method: z.string().optional().describe("xatlas (default) | patchBuilder | expMap | conformal | spectralConformal | planar | box | cylinder"),
  minLightmapResolution: z.number().optional().describe("Packing resolution floor (default 64)"),
  mode: z.string().optional().describe("Alias for curveType"),
  name: z.string().optional().describe("Asset name (create_asset_by_class, create_customizable_object, create_data_asset, create_datatable). Asset name, without '/' or '.' (create_render_target_2d). Subobject name (create_subobject). Enumerator to act on by short or display name; add_value uses it as the display name when displayName is omitted (edit_user_defined_enum). Asset name (default: the file name) (import_animation, import_file, import_skeletal_mesh, import_static_mesh, import_texture)"),
  neverStream: z.boolean().optional().describe("Applied to the imported texture"),
  newName: z.string().optional().describe("New asset name, together with assetPath (move_asset, rename_asset). New row name (rename_curvetable_row, rename_datatable_row)"),
  noAlpha: z.boolean().optional().describe("Factory option: drop the alpha channel"),
  noCompression: z.boolean().optional().describe("Factory option: import uncompressed"),
  node: z.string().optional().describe("Node to remove: nodeGuid, path, name or unique title"),
  nodeClass: z.string().optional().describe("Class the node action spawns"),
  oldName: z.string().optional().describe("Row to rename"),
  onConflict: z.string().optional().describe("skip (default) | update | error (add_socket). skip (default) returns an existing asset; error refuses (create_asset_by_class, create_data_asset, create_datatable, create_render_target_2d). skip (default) | error (create_customizable_object). reuse (default) | error (create_subobject). skip (default) returns an existing destination; error refuses (duplicate_asset)"),
  op: z.string().optional().describe("add_value | rename_value | remove_value (edit_user_defined_enum). set (default) | add | remove | copy (set_uv_channel_count)"),
  order: z.string().optional().describe("flipScaleRotateTranslate (default) | translateRotateScaleFlip"),
  origin: z.record(z.unknown()).optional().describe("Pivot for rotate and scale {u, v} (default 0.5, 0.5)"),
  outer: z.string().optional().describe("asset (default) | package"),
  outputPath: z.string().optional().describe("File to write; a relative path resolves against the project directory (export_asset). PNG file to write; a relative path resolves against the project directory (export_texture). PNG to write (default under Saved/UVLayouts) (export_uv_layout). File for dumpToFile; relative paths resolve under Saved/ (get_mesh_geometry). Write the rows to this JSON file instead of returning them; relative paths resolve under Saved/ (read_datatable)"),
  pack: z.boolean().optional().describe("Repack the islands after unwrapping (default true)"),
  packagePath: z.string().optional().describe("Destination folder (default /Game) (create_asset_by_class, create_customizable_object, create_data_asset, create_render_target_2d). Destination folder (default /Game/DataTables) (create_datatable). One package path, used when packages is omitted (get_asset_dependencies, get_asset_referencers). Destination folder (default /Game/Animations) (import_animation). Destination folder (import_file). Destination folder (default /Game/Meshes) (import_skeletal_mesh, import_static_mesh). Destination folder (default /Game/Textures) (import_texture)"),
  packages: z.array(z.string()).optional().describe("Package paths to look up"),
  path: z.string().optional().describe("Alias for assetPath (add_curvetable_key, add_curvetable_row, add_datatable_row, add_graph_node, append_asset_array_elements, asset_health_check, check_uvs, connect_graph_pins, create_subobject, delete_asset, delete_datatable_row, disconnect_graph_pins, edit_user_defined_enum, export_asset, export_texture, export_uv_layout, fill_datatable_from_json, force_reload_asset, generate_lightmap_uvs, get_curvetable_keys, get_datatable_row, get_mesh_geometry, get_stringtable_entry, get_texture_info, import_curvetable, import_stringtable, import_stringtable_csv, list_curvetable_rows, list_enum_values, list_skeleton_bones, list_stringtable_keys, list_struct_fields, measure_mesh_geometry, read_asset, read_asset_graph, read_curvetable, read_datatable, read_import_sources, read_stringtable, read_uv_channels, reimport_asset, reimport_datatable, reload_package, remove_curvetable_row, remove_datatable_row, remove_graph_node, remove_stringtable_entry, rename_curvetable_row, rename_datatable_row, save_asset, set_asset_property, set_curvetable_keys, set_datatable_cell, set_datatable_row, set_mesh_material, set_sk_material_slots, set_stringtable_entry, set_uv_channel_count, transform_uvs, unwrap_uvs, update_datatable_row). Content folder to delete (delete_folder). Content path to diagnose (diagnose_registry)"),
  paths: z.array(z.string()).optional().describe("Alias for assetPaths (delete_asset_batch). Content folders to delete (delete_folder)"),
  posX: z.number().optional().describe("Node X position"),
  posY: z.number().optional().describe("Node Y position"),
  preserveVertexOrder: z.boolean().optional().describe("Keep the existing vertex order (default true)"),
  projectionTransform: z.record(z.unknown()).optional().describe("Transform for the planar, box and cylinder projections"),
  properties: z.record(z.unknown()).optional().describe("Property values keyed by property name (create_asset_by_class, create_data_asset). Property values, validated on a throwaway instance first (create_subobject). Config properties to set by reflection (set_cloth_config)"),
  propertyName: z.string().optional().describe("Path of the TArray property (append_asset_array_elements). Property path; dotted and indexed paths walk structs, arrays and instanced subobjects (set_asset_property)"),
  rasterSize: z.number().optional().describe("Raster resolution for the overlap estimate (default 512) (check_uvs). Raster resolution for the result's overlap estimate (default 512) (generate_lightmap_uvs, unwrap_uvs). Raster resolution for the coverage and overlap estimate (default 512) (read_uv_channels)"),
  reconcile: z.boolean().optional().describe("Force a synchronous rescan first, which evicts pending-kill ghosts"),
  recursive: z.boolean().optional().describe("Include subfolders (default true)"),
  relativeLocation: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Socket location relative to its parent (add_socket). New relative location (set_socket_transform)"),
  relativeRotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional().describe("Socket rotation relative to its parent (add_socket). New relative rotation (set_socket_transform)"),
  relativeScale: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Socket scale (add_socket). New relative scale (set_socket_transform)"),
  removeRedundantKeys: z.boolean().optional().describe("Strip keys that do not change the value (default true)"),
  renames: z.array(z.record(z.unknown())).optional().describe("Rename descriptors: {sourcePath, destinationPath}, {assetPath, newName} or {sourcePath, newPackagePath, newName}"),
  replaceExisting: z.boolean().optional().describe("Replace an asset already at the destination (default true) (import_file, import_skeletal_mesh). Remove entries the CSV does not carry (default false) (import_stringtable_csv)"),
  requireExactKeys: z.boolean().optional().describe("Also fail when the CSV carries keys expectedKeys does not list (default false)"),
  requireLightmapChannel: z.boolean().optional().describe("Treat a missing lightmap channel as a fault (default true for StaticMesh)"),
  rotate: z.number().optional().describe("Rotation in degrees"),
  row: z.record(z.unknown()).optional().describe("Row-struct fields to write; fields not named keep their values"),
  rowFilter: z.string().optional().describe("Case-insensitive substring filter on row names"),
  rowName: z.string().optional().describe("Row to key (add_curvetable_key). Row to add (add_curvetable_row). Row to append or overwrite (add_datatable_row, set_datatable_row, update_datatable_row). Row to remove (delete_datatable_row, remove_curvetable_row, remove_datatable_row). Row to read (get_curvetable_keys, get_datatable_row). Alias for oldName (rename_curvetable_row, rename_datatable_row). Row whose keys to replace (set_curvetable_keys). Existing row to edit (set_datatable_cell)"),
  rows: z.record(z.unknown()).optional().describe("Rows to upsert: {rowName: {field: value}}"),
  rowStruct: z.string().optional().describe("Row struct, e.g. /Script/Module.MyRow or a UserDefinedStruct path"),
  save: z.boolean().optional().describe("Save the asset after the edit (default true) (add_graph_node, connect_graph_pins, disconnect_graph_pins, remove_graph_node). Save the package after the write (default true) (append_asset_array_elements, set_asset_property). Save the new asset (default true) (create_customizable_object). Save the owning package (default true) (create_subobject). Save the mesh (default true) (generate_lightmap_uvs, set_uv_channel_count, transform_uvs, unwrap_uvs). Save the imported assets (default false) (import_file). Save the table (default true) (import_stringtable_csv)"),
  saveContentPackages: z.boolean().optional().describe("Include content packages (default true)"),
  saveMapPackages: z.boolean().optional().describe("Include map packages (default true)"),
  scale: z.record(z.unknown()).optional().describe("UV-space scale {u, v}; a zero component is refused"),
  sectionIndex: z.number().int().optional().describe("Render section to bind (bind_cloth_to_section). One render section (omit for every section) (get_mesh_geometry). One render section (omit to measure the whole LOD) (measure_mesh_geometry). Render section to unbind (unbind_cloth_from_section)"),
  selection: z.record(z.unknown()).optional().describe("What to transform: {mode: all|island|normal|polygonGroup, islandIndices?, normalDirection?, normalAngleTolerance?, polygonGroups?, materialSlotNames?}"),
  setLightmapCoordinateIndex: z.boolean().optional().describe("Point LightMapCoordinateIndex at the destination channel (default true)"),
  showGrid: z.boolean().optional().describe("Draw the unit-square border (default true)"),
  showIslands: z.boolean().optional().describe("Colour each island separately (default true)"),
  showOverlaps: z.boolean().optional().describe("Highlight overlapping texels (default true)"),
  skeletalMeshPath: z.string().optional().describe("SkeletalMesh asset path"),
  skeletonPath: z.string().optional().describe("Skeleton the animation targets (import_animation). Existing Skeleton to import onto (import_skeletal_mesh)"),
  slotIndex: z.number().optional().describe("Material slot index (default 0)"),
  slots: z.array(z.record(z.unknown())).optional().describe("Slot assignments: [{slotName? | slotIndex?, materialPath}]"),
  socketName: z.string().optional().describe("Socket name (add_socket). Socket to remove (remove_socket). Socket to move (set_socket_transform)"),
  soft: z.boolean().optional().describe("Include soft dependencies (default true)"),
  sourceChannel: z.number().optional().describe("Channel the generator reads (default: the current setting)"),
  sourceNode: z.string().optional().describe("Node of the source pin: nodeGuid, node path, name or unique title"),
  sourcePath: z.string().optional().describe("Asset to duplicate (duplicate_asset). Asset to rename, together with destinationPath (move_asset, rename_asset). Content folder to move (move_folder)"),
  sourcePin: z.string().optional().describe("Source pin name, when no pinId is given"),
  sourcePinDirection: z.string().optional().describe("input | output, to disambiguate sourcePin"),
  sourcePinId: z.string().optional().describe("pinId of the source pin (preferred)"),
  sourceString: z.string().optional().describe("Source string to write"),
  spawnMode: z.string().optional().describe("auto (default) | action | direct"),
  sRGB: z.boolean().optional().describe("Applied to the imported texture"),
  targetGamma: z.number().optional().describe("Target gamma (default 0, the engine behavior)"),
  targetNode: z.string().optional().describe("Node of the target pin"),
  targetPin: z.string().optional().describe("Target pin name, when no pinId is given"),
  targetPinDirection: z.string().optional().describe("input | output, to disambiguate targetPin"),
  targetPinId: z.string().optional().describe("pinId of the target pin"),
  textureResolution: z.number().optional().describe("Resolution the packer targets (default 1024)"),
  time: z.number().optional().describe("Key time"),
  toChannel: z.number().optional().describe("Destination channel (op=copy)"),
  translate: z.record(z.unknown()).optional().describe("UV-space offset {u, v}"),
  type: z.string().optional().describe("FPrimaryAssetType to list (omit for every type)"),
  uvChannel: z.number().int().optional().describe("UV channel to return (default 0)"),
  value: z.unknown().optional().describe("Key value (a number) (add_curvetable_key). Value to write: scalar, object, array or asset path (set_asset_property). Value to write (set_datatable_cell). Source string to write, when sourceString is omitted (set_stringtable_entry)"),
  width: z.number().int().optional().describe("Pixel width, 1-8192 (default 512)"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses);
