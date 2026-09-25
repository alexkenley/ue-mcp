// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd level handler. */
export const handlerSpecs: HandlerSpecs = {
  "add_actor_tag": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "tag",
        "type": "string",
        "required": true,
        "description": "Actor tag"
      }
    ]
  },
  "add_component_to_actor": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentClass",
        "type": "string",
        "required": true,
        "description": "Component class: short name or full path"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": true,
        "description": "Name of the new component"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "When the label or name is taken: skip (default) | error"
      }
    ]
  },
  "add_hismc_instances": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "transforms",
        "type": "array",
        "required": true,
        "description": "Transforms {location, rotation?, scale?} to add",
        "items": "object"
      },
      {
        "name": "worldSpace",
        "type": "boolean",
        "required": false,
        "description": "Treat transforms as world space (default true)"
      }
    ]
  },
  "add_instances": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "transforms",
        "type": "array",
        "required": true,
        "description": "Transforms {location, rotation?, scale?} to add",
        "items": "object"
      },
      {
        "name": "worldSpace",
        "type": "boolean",
        "required": false,
        "description": "Treat transforms as world space (default true)"
      }
    ]
  },
  "add_ismc_instances": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "transforms",
        "type": "array",
        "required": true,
        "description": "Transforms {location, rotation?, scale?} to add",
        "items": "object"
      },
      {
        "name": "worldSpace",
        "type": "boolean",
        "required": false,
        "description": "Treat transforms as world space (default true)"
      }
    ]
  },
  "add_post_process_blendable": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material to add as a blendable",
        "aliases": [
          "material"
        ]
      },
      {
        "name": "weight",
        "type": "number",
        "required": false,
        "description": "Blend weight (default 1)"
      }
    ]
  },
  "aim_actor_at": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "targetPoint",
        "type": "vec3",
        "required": false,
        "description": "World point to look at"
      },
      {
        "name": "targetActor",
        "type": "string",
        "required": false,
        "description": "Label of the actor to look at"
      },
      {
        "name": "targetActorPath",
        "type": "string",
        "required": false,
        "description": "Object path of the actor to look at"
      },
      {
        "name": "roll",
        "type": "number",
        "required": false,
        "description": "Roll in degrees (default 0)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "attach_actor": {
    "category": "level",
    "params": [
      {
        "name": "childLabel",
        "type": "string",
        "required": false,
        "description": "Child actor label; pass childLabel or childPath"
      },
      {
        "name": "childPath",
        "type": "string",
        "required": false,
        "description": "Child actor object path"
      },
      {
        "name": "parentLabel",
        "type": "string",
        "required": false,
        "description": "Parent actor label; pass parentLabel or parentPath"
      },
      {
        "name": "parentPath",
        "type": "string",
        "required": false,
        "description": "Parent actor object path"
      },
      {
        "name": "attachRule",
        "type": "string",
        "required": false,
        "description": "KeepWorld | KeepRelative | SnapToTarget"
      },
      {
        "name": "socketName",
        "type": "string",
        "required": false,
        "description": "Socket or bone on the resolved parent component"
      }
    ]
  },
  "attach_component": {
    "category": "level",
    "params": [
      {
        "name": "childLabel",
        "type": "string",
        "required": false,
        "description": "Child actor label; pass childLabel or childPath"
      },
      {
        "name": "childPath",
        "type": "string",
        "required": false,
        "description": "Child actor object path"
      },
      {
        "name": "parentLabel",
        "type": "string",
        "required": false,
        "description": "Parent actor label; pass parentLabel or parentPath"
      },
      {
        "name": "parentPath",
        "type": "string",
        "required": false,
        "description": "Parent actor object path"
      },
      {
        "name": "childComponentName",
        "type": "string",
        "required": false,
        "description": "Child SceneComponent instance name; omitted selects the actor root"
      },
      {
        "name": "parentComponentName",
        "type": "string",
        "required": false,
        "description": "Parent SceneComponent instance name; omitted selects the actor root"
      },
      {
        "name": "attachRule",
        "type": "string",
        "required": false,
        "description": "KeepWorld | KeepRelative | SnapToTarget"
      },
      {
        "name": "weldSimulatedBodies",
        "type": "boolean",
        "required": false,
        "description": "Weld simulated bodies during attachment (default false)"
      },
      {
        "name": "socketName",
        "type": "string",
        "required": false,
        "description": "Socket or bone on the resolved parent component"
      }
    ]
  },
  "batch_set_actor_properties": {
    "category": "level",
    "params": [
      {
        "name": "properties",
        "type": "object",
        "required": true,
        "description": "Property name to value, dotted paths supported"
      },
      {
        "name": "actorLabels",
        "type": "array",
        "required": false,
        "description": "Exact actor editor labels",
        "items": "string"
      },
      {
        "name": "labelPrefix",
        "type": "string",
        "required": false,
        "description": "Case-sensitive prefix over the actor's editor label"
      },
      {
        "name": "labelContains",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring over the actor's editor label"
      },
      {
        "name": "tag",
        "type": "string",
        "required": false,
        "description": "Actor must carry this tag"
      },
      {
        "name": "classFilter",
        "type": "string",
        "required": false,
        "description": "Actor class, resolved as a class or matched as a substring"
      },
      {
        "name": "folderPath",
        "type": "string",
        "required": false,
        "description": "World Outliner folder, matched exactly"
      },
      {
        "name": "folderPathPrefix",
        "type": "string",
        "required": false,
        "description": "World Outliner folder prefix"
      },
      {
        "name": "matchSubclasses",
        "type": "boolean",
        "required": false,
        "description": "Match subclasses of the class filter (default true)"
      },
      {
        "name": "dryRun",
        "type": "boolean",
        "required": false,
        "description": "Report what would change without writing"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Bypass EditDefaultsOnly to write per-instance overrides"
      },
      {
        "name": "transactionLabel",
        "type": "string",
        "required": false,
        "description": "Undo-stack entry name"
      }
    ]
  },
  "count_actors_by_class": {
    "category": "level",
    "params": [
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "topN",
        "type": "integer",
        "required": false,
        "description": "Only the N most common classes"
      }
    ]
  },
  "delete_actor": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      }
    ]
  },
  "destroy_transient_actor": {
    "category": "level",
    "params": [
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Transient actor object path"
      },
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Transient actor label"
      },
      {
        "name": "all",
        "type": "boolean",
        "required": false,
        "description": "Destroy every transient verification actor in the world"
      }
    ]
  },
  "detach_actor": {
    "category": "level",
    "params": [
      {
        "name": "childLabel",
        "type": "string",
        "required": false,
        "description": "Child actor label; pass childLabel or childPath"
      },
      {
        "name": "childPath",
        "type": "string",
        "required": false,
        "description": "Child actor object path"
      }
    ]
  },
  "detach_component": {
    "category": "level",
    "params": [
      {
        "name": "childLabel",
        "type": "string",
        "required": false,
        "description": "Child actor label; pass childLabel or childPath"
      },
      {
        "name": "childPath",
        "type": "string",
        "required": false,
        "description": "Child actor object path"
      },
      {
        "name": "childComponentName",
        "type": "string",
        "required": false,
        "description": "Child SceneComponent instance name; omitted selects the actor root"
      }
    ]
  },
  "export_actor_fbx": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "outputPath",
        "type": "string",
        "required": true,
        "description": "Output .fbx path",
        "aliases": [
          "filePath"
        ]
      }
    ]
  },
  "get_actor_bounds": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "onlyColliding",
        "type": "boolean",
        "required": false,
        "description": "Only colliding components contribute to the bounds"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "get_actor_details": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "includeProperties",
        "type": "boolean",
        "required": false,
        "description": "Include reflected UPROPERTY values"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": false,
        "description": "Only this property, with includeProperties"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "get_actors_by_class": {
    "category": "level",
    "params": [
      {
        "name": "className",
        "type": "string",
        "required": false,
        "description": "Class name, /Script path or Blueprint class path; required without labelPrefix"
      },
      {
        "name": "labelPrefix",
        "type": "string",
        "required": false,
        "description": "Case-sensitive prefix over the actor's editor label"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "matchSubclasses",
        "type": "boolean",
        "required": false,
        "description": "Match subclasses of the class filter (default true)"
      },
      {
        "name": "includeTransforms",
        "type": "boolean",
        "required": false,
        "description": "Include each actor's location, rotation and scale (default true)"
      }
    ]
  },
  "get_actors_by_component_class": {
    "category": "level",
    "params": [
      {
        "name": "componentClass",
        "type": "string",
        "required": true,
        "description": "Component class name, exact or substring",
        "aliases": [
          "className"
        ]
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "get_component_details": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "includeValues",
        "type": "boolean",
        "required": false,
        "description": "Dump UPROPERTY values"
      },
      {
        "name": "propertyNames",
        "type": "array",
        "required": false,
        "description": "Restrict includeValues to these properties",
        "items": "string"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "get_component_tree": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "includeProperties",
        "type": "boolean",
        "required": false,
        "description": "Include reflected UPROPERTY values"
      },
      {
        "name": "componentClass",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring over the component class name"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Only this component, by instance name"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "get_current_edit_level": {
    "category": "level",
    "params": []
  },
  "get_current_level": {
    "category": "level",
    "params": []
  },
  "get_instance_transforms": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "worldSpace",
        "type": "boolean",
        "required": false,
        "description": "Treat transforms as world space (default true)"
      }
    ]
  },
  "get_nanite_info": {
    "category": "level",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh asset path",
        "aliases": [
          "meshPath"
        ]
      }
    ]
  },
  "get_post_process_settings": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component holding the post-process settings, when the actor is not a PostProcessVolume"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": false,
        "description": "FPostProcessSettings property on that component"
      },
      {
        "name": "onlyOverridden",
        "type": "boolean",
        "required": false,
        "description": "Only settings whose bOverride flag is on"
      },
      {
        "name": "nameContains",
        "type": "string",
        "required": false,
        "description": "Substring over the setting name"
      },
      {
        "name": "names",
        "type": "array",
        "required": false,
        "description": "Exact setting names to return",
        "items": "string"
      }
    ]
  },
  "get_relative_transform": {
    "category": "level",
    "params": [
      {
        "name": "targetLabel",
        "type": "string",
        "required": false,
        "description": "Target actor label; pass targetLabel or targetPath",
        "aliases": [
          "target"
        ]
      },
      {
        "name": "targetPath",
        "type": "string",
        "required": false,
        "description": "Target actor object path"
      },
      {
        "name": "referenceLabel",
        "type": "string",
        "required": false,
        "description": "Reference actor label; pass referenceLabel or referencePath",
        "aliases": [
          "reference"
        ]
      },
      {
        "name": "referencePath",
        "type": "string",
        "required": false,
        "description": "Reference actor object path"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "get_runtime_virtual_texture_summary": {
    "category": "level",
    "params": [
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "get_selected_actors": {
    "category": "level",
    "params": []
  },
  "get_water_state": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      }
    ]
  },
  "get_world_outliner": {
    "category": "level",
    "params": [
      {
        "name": "classFilter",
        "type": "string",
        "required": false,
        "description": "Case-sensitive substring over the class name"
      },
      {
        "name": "exactClass",
        "type": "boolean",
        "required": false,
        "description": "Require classFilter to be the exact class name"
      },
      {
        "name": "nameFilter",
        "type": "string",
        "required": false,
        "description": "Case-sensitive substring over the internal name or the label"
      },
      {
        "name": "folderPath",
        "type": "string",
        "required": false,
        "description": "World Outliner folder, matched exactly"
      },
      {
        "name": "folderPathPrefix",
        "type": "string",
        "required": false,
        "description": "World Outliner folder prefix"
      },
      {
        "name": "editorHidden",
        "type": "boolean",
        "required": false,
        "description": "Only editor-hidden (true) or only visible (false) actors"
      },
      {
        "name": "includeStreaming",
        "type": "boolean",
        "required": false,
        "description": "Include World Partition streaming-proxy and HLOD actors (default false)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "integer",
        "required": false,
        "description": "Rows on this page"
      }
    ]
  },
  "get_world_partition_settings": {
    "category": "level",
    "params": []
  },
  "get_world_settings": {
    "category": "level",
    "params": []
  },
  "line_trace": {
    "category": "level",
    "params": [
      {
        "name": "start",
        "type": "vec3",
        "required": false,
        "description": "Ray start"
      },
      {
        "name": "end",
        "type": "vec3",
        "required": false,
        "description": "Ray end; pass end or direction and distance"
      },
      {
        "name": "direction",
        "type": "vec3",
        "required": false,
        "description": "Ray direction, normalised internally"
      },
      {
        "name": "distance",
        "type": "number",
        "required": false,
        "description": "Ray length when direction is given (default 200000)"
      },
      {
        "name": "traceComplex",
        "type": "boolean",
        "required": false,
        "description": "Trace per-triangle collision (default false)"
      },
      {
        "name": "channel",
        "type": "string",
        "required": false,
        "description": "Collision channel (default Visibility)"
      },
      {
        "name": "ignoreActors",
        "type": "array",
        "required": false,
        "description": "Actor labels to skip",
        "items": "string"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "list_actor_descs": {
    "category": "level",
    "params": [
      {
        "name": "filter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring over label, name, class and path"
      },
      {
        "name": "className",
        "type": "string",
        "required": false,
        "description": "Actor class filter"
      },
      {
        "name": "guids",
        "type": "array",
        "required": false,
        "description": "Exact actor GUIDs",
        "items": "string"
      },
      {
        "name": "bounds",
        "type": "object",
        "required": false,
        "description": "{min:{x,y,z}, max:{x,y,z}} intersection test"
      },
      {
        "name": "loadedOnly",
        "type": "boolean",
        "required": false,
        "description": "Only actors currently streamed in"
      },
      {
        "name": "unloadedOnly",
        "type": "boolean",
        "required": false,
        "description": "Only actors on disk that are not streamed in"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "integer",
        "required": false,
        "description": "Rows on this page"
      }
    ]
  },
  "list_actor_tags": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "integer",
        "required": false,
        "description": "Rows on this page"
      }
    ]
  },
  "list_levels": {
    "category": "level",
    "params": [
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "integer",
        "required": false,
        "description": "Rows on this page"
      }
    ]
  },
  "list_streaming_sublevels": {
    "category": "level",
    "params": []
  },
  "list_transient_actors": {
    "category": "level",
    "params": [
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "integer",
        "required": false,
        "description": "Rows on this page"
      }
    ]
  },
  "list_volumes": {
    "category": "level",
    "params": [
      {
        "name": "volumeType",
        "type": "string",
        "required": false,
        "description": "Substring over the volume class name"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "integer",
        "required": false,
        "description": "Rows on this page"
      }
    ]
  },
  "move_actor": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "World rotation"
      },
      {
        "name": "scale",
        "type": "vec3",
        "required": false,
        "description": "Actor scale"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "nav_project_point": {
    "category": "level",
    "params": [
      {
        "name": "point",
        "type": "vec3",
        "required": true,
        "description": "World point to project onto the navmesh"
      },
      {
        "name": "extent",
        "type": "vec3",
        "required": false,
        "description": "Query extent (default 100, 100, 100)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "place_actor": {
    "category": "level",
    "params": [
      {
        "name": "actorClass",
        "type": "string",
        "required": true,
        "description": "Actor class: short name, /Script path or Blueprint class path"
      },
      {
        "name": "label",
        "type": "string",
        "required": false,
        "description": "Actor label; an existing actor with this label is reported rather than duplicated"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "When the label or name is taken: skip (default) | error"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "World rotation"
      },
      {
        "name": "scale",
        "type": "vec3",
        "required": false,
        "description": "Actor scale"
      },
      {
        "name": "staticMesh",
        "type": "string",
        "required": false,
        "description": "Static mesh for a StaticMeshActor"
      },
      {
        "name": "material",
        "type": "string",
        "required": false,
        "description": "Material applied at slot 0"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "read_actor_motion": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorLabels",
        "type": "array",
        "required": false,
        "description": "Exact actor editor labels",
        "items": "string"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "actorPaths",
        "type": "array",
        "required": false,
        "description": "Full actor object paths",
        "items": "string"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: auto (default, PIE when running) | editor | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "rebuild_water_zone": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "zoneExtent",
        "type": "any",
        "required": false,
        "description": "New WaterZone ZoneExtent in cm, {x, y} or [x, y]"
      },
      {
        "name": "tileSize",
        "type": "number",
        "required": false,
        "description": "New WaterMesh TileSize in cm"
      },
      {
        "name": "maxPasses",
        "type": "integer",
        "required": false,
        "description": "Rebuild passes before giving up on a stable QuadTreeResolution, 2..8 (default 4)"
      }
    ]
  },
  "remove_actor_tag": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "tag",
        "type": "string",
        "required": true,
        "description": "Actor tag"
      }
    ]
  },
  "remove_component_from_actor": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": true,
        "description": "Component to remove"
      }
    ]
  },
  "remove_components_by_class": {
    "category": "level",
    "params": [
      {
        "name": "componentClass",
        "type": "string",
        "required": true,
        "description": "Component class to remove"
      },
      {
        "name": "matchComponentSubclasses",
        "type": "boolean",
        "required": false,
        "description": "Also match subclasses of componentClass (default true)"
      },
      {
        "name": "componentNameContains",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring over the component instance name"
      },
      {
        "name": "actorLabels",
        "type": "array",
        "required": false,
        "description": "Exact actor editor labels",
        "items": "string"
      },
      {
        "name": "labelPrefix",
        "type": "string",
        "required": false,
        "description": "Case-sensitive prefix over the actor's editor label"
      },
      {
        "name": "labelContains",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring over the actor's editor label"
      },
      {
        "name": "tag",
        "type": "string",
        "required": false,
        "description": "Actor must carry this tag"
      },
      {
        "name": "classFilter",
        "type": "string",
        "required": false,
        "description": "Restrict to actors of this class",
        "aliases": [
          "actorClassFilter"
        ]
      },
      {
        "name": "folderPath",
        "type": "string",
        "required": false,
        "description": "World Outliner folder, matched exactly"
      },
      {
        "name": "folderPathPrefix",
        "type": "string",
        "required": false,
        "description": "World Outliner folder prefix"
      },
      {
        "name": "matchSubclasses",
        "type": "boolean",
        "required": false,
        "description": "Match subclasses of the class filter (default true)"
      },
      {
        "name": "dryRun",
        "type": "boolean",
        "required": false,
        "description": "Report what would be removed without removing it (default TRUE)"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the level after a committed removal (default false)"
      },
      {
        "name": "transactionLabel",
        "type": "string",
        "required": false,
        "description": "Undo-stack entry name"
      }
    ]
  },
  "remove_instance": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "index",
        "type": "integer",
        "required": true,
        "description": "Instance index"
      }
    ]
  },
  "remove_streaming_sublevel": {
    "category": "level",
    "params": [
      {
        "name": "levelName",
        "type": "string",
        "required": true,
        "description": "Streaming sub-level name or package path",
        "aliases": [
          "levelPath"
        ]
      }
    ]
  },
  "resolve_actor": {
    "category": "level",
    "params": [
      {
        "name": "internalName",
        "type": "string",
        "required": true,
        "description": "Internal UObject name, such as StaticMeshActor_141"
      }
    ]
  },
  "set_actor_material": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "materialPath",
        "type": "string",
        "required": true,
        "description": "Material asset path"
      },
      {
        "name": "slotIndex",
        "type": "integer",
        "required": false,
        "description": "Material slot (default 0)"
      }
    ]
  },
  "set_actor_mobility": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "mobility",
        "type": "string",
        "required": true,
        "description": "static | stationary | movable"
      }
    ]
  },
  "set_actor_property": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property name, dotted paths supported"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Value to write"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Bypass EditDefaultsOnly to write a per-instance override"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "set_actor_tags": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "tags",
        "type": "array",
        "required": true,
        "description": "The actor's complete tag list",
        "items": "string"
      }
    ]
  },
  "set_component_property": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property name, dotted paths supported"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Value to write; null clears an object reference"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "set_current_edit_level": {
    "category": "level",
    "params": [
      {
        "name": "levelName",
        "type": "string",
        "required": true,
        "description": "Loaded sub-level to make current",
        "aliases": [
          "levelPath"
        ]
      }
    ]
  },
  "set_editor_visibility": {
    "category": "level",
    "params": [
      {
        "name": "hidden",
        "type": "boolean",
        "required": true,
        "description": "true hides the actors in the editor, false shows them"
      },
      {
        "name": "actorLabels",
        "type": "array",
        "required": false,
        "description": "Exact actor editor labels",
        "items": "string"
      },
      {
        "name": "all",
        "type": "boolean",
        "required": false,
        "description": "Target every actor"
      }
    ]
  },
  "set_fixed_exposure": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component holding the post-process settings, when the actor is not a PostProcessVolume"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": false,
        "description": "FPostProcessSettings property on that component"
      },
      {
        "name": "exposure",
        "type": "number",
        "required": true,
        "description": "Fixed adaptation brightness, written to both min and max",
        "aliases": [
          "brightness"
        ]
      },
      {
        "name": "bias",
        "type": "number",
        "required": false,
        "description": "AutoExposureBias (exposure compensation)"
      }
    ]
  },
  "set_fog_properties": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "fogDensity",
        "type": "number",
        "required": false,
        "description": "Fog density"
      },
      {
        "name": "fogHeightFalloff",
        "type": "number",
        "required": false,
        "description": "Fog height falloff"
      },
      {
        "name": "startDistance",
        "type": "number",
        "required": false,
        "description": "Fog start distance"
      },
      {
        "name": "fogInscatteringColor",
        "type": "object",
        "required": false,
        "description": "Inscattering colour {r, g, b} in 0-255",
        "aliases": [
          "color"
        ]
      },
      {
        "name": "enableVolumetricFog",
        "type": "boolean",
        "required": false,
        "description": "Enable volumetric fog"
      },
      {
        "name": "volumetricFogScatteringDistribution",
        "type": "number",
        "required": false,
        "description": "Volumetric fog scattering distribution"
      },
      {
        "name": "volumetricFogExtinctionScale",
        "type": "number",
        "required": false,
        "description": "Volumetric fog extinction scale"
      },
      {
        "name": "volumetricFogDistance",
        "type": "number",
        "required": false,
        "description": "Volumetric fog distance"
      },
      {
        "name": "volumetricFogAlbedo",
        "type": "object",
        "required": false,
        "description": "Volumetric fog albedo {r, g, b} in 0-255"
      }
    ]
  },
  "set_light_properties": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "description": "Light intensity"
      },
      {
        "name": "color",
        "type": "object",
        "required": false,
        "description": "Colour {r, g, b} in 0-255"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "DirectionalLight sun angle"
      },
      {
        "name": "mobility",
        "type": "string",
        "required": false,
        "description": "static | stationary | movable"
      },
      {
        "name": "recaptureSky",
        "type": "boolean",
        "required": false,
        "description": "Recapture a SkyLight after the change"
      },
      {
        "name": "volumetricScatteringIntensity",
        "type": "number",
        "required": false,
        "description": "Volumetric scattering intensity"
      },
      {
        "name": "sourceRadius",
        "type": "number",
        "required": false,
        "description": "Point or spot light source radius"
      },
      {
        "name": "innerConeAngle",
        "type": "number",
        "required": false,
        "description": "Spot light inner cone angle"
      },
      {
        "name": "outerConeAngle",
        "type": "number",
        "required": false,
        "description": "Spot light outer cone angle"
      }
    ]
  },
  "set_nanite_settings": {
    "category": "level",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "StaticMesh asset path",
        "aliases": [
          "meshPath"
        ]
      },
      {
        "name": "enabled",
        "type": "boolean",
        "required": false,
        "description": "Enable Nanite (default true)"
      },
      {
        "name": "positionPrecision",
        "type": "integer",
        "required": false,
        "description": "Nanite position precision"
      }
    ]
  },
  "set_post_process_settings": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component holding the post-process settings, when the actor is not a PostProcessVolume"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": false,
        "description": "FPostProcessSettings property on that component"
      },
      {
        "name": "settings",
        "type": "object",
        "required": true,
        "description": "Setting name to value; each setting's bOverride flag is enabled too"
      },
      {
        "name": "enableOverrides",
        "type": "boolean",
        "required": false,
        "description": "Enable each written setting's bOverride flag (default true)"
      }
    ]
  },
  "set_streaming_sublevel_properties": {
    "category": "level",
    "params": [
      {
        "name": "levelName",
        "type": "string",
        "required": true,
        "description": "Streaming sub-level name or package path",
        "aliases": [
          "levelPath"
        ]
      },
      {
        "name": "initiallyLoaded",
        "type": "boolean",
        "required": false,
        "description": "Load the sub-level with the persistent level"
      },
      {
        "name": "initiallyVisible",
        "type": "boolean",
        "required": false,
        "description": "Make the sub-level visible when loaded"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "Sub-level offset"
      },
      {
        "name": "editorVisible",
        "type": "boolean",
        "required": false,
        "description": "Editor viewport visibility"
      }
    ]
  },
  "set_volume_properties": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "properties",
        "type": "object",
        "required": true,
        "description": "Property name to value"
      }
    ]
  },
  "set_water_body_property": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property name, dotted paths supported"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Value to write: string, number or boolean"
      }
    ]
  },
  "snap_actor_to_floor": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "floorOffset",
        "type": "number",
        "required": false,
        "description": "Vertical offset added to the impact Z"
      },
      {
        "name": "maxDistance",
        "type": "number",
        "required": false,
        "description": "Downward trace length (default 100000)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "snap_instances_to_surface": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "instanceIndices",
        "type": "array",
        "required": false,
        "description": "Instance indices to project; omit for every instance",
        "items": "integer"
      },
      {
        "name": "maxInstances",
        "type": "integer",
        "required": false,
        "description": "Cap on instances processed in one call"
      },
      {
        "name": "direction",
        "type": "vec3",
        "required": false,
        "description": "Trace direction (default straight down)"
      },
      {
        "name": "traceStartOffset",
        "type": "number",
        "required": false,
        "description": "Height above each instance to begin the trace"
      },
      {
        "name": "traceDistance",
        "type": "number",
        "required": false,
        "description": "Maximum trace length"
      },
      {
        "name": "surfaceOffset",
        "type": "number",
        "required": false,
        "description": "Offset along the surface normal after the hit"
      },
      {
        "name": "onMiss",
        "type": "string",
        "required": false,
        "description": "error (default, aborts the batch) | skip"
      },
      {
        "name": "surfaceActorClass",
        "type": "string",
        "required": false,
        "description": "Only accept hits on actors of this class"
      },
      {
        "name": "surfaceActorLabels",
        "type": "array",
        "required": false,
        "description": "Only accept hits on actors with these labels",
        "items": "string"
      },
      {
        "name": "channel",
        "type": "string",
        "required": false,
        "description": "Collision channel (default Visibility)"
      },
      {
        "name": "traceComplex",
        "type": "boolean",
        "required": false,
        "description": "Trace per-triangle collision (default false)"
      },
      {
        "name": "dryRun",
        "type": "boolean",
        "required": false,
        "description": "Report what would change without writing"
      }
    ]
  },
  "spawn_grid": {
    "category": "level",
    "params": [
      {
        "name": "staticMesh",
        "type": "string",
        "required": true,
        "description": "Static mesh to place"
      },
      {
        "name": "min",
        "type": "vec3",
        "required": true,
        "description": "Grid lower bound"
      },
      {
        "name": "max",
        "type": "vec3",
        "required": true,
        "description": "Grid upper bound"
      },
      {
        "name": "countX",
        "type": "integer",
        "required": false,
        "description": "Actors along X (default 4)"
      },
      {
        "name": "countY",
        "type": "integer",
        "required": false,
        "description": "Actors along Y (default 4)"
      },
      {
        "name": "countZ",
        "type": "integer",
        "required": false,
        "description": "Actors along Z (default 1)"
      },
      {
        "name": "jitter",
        "type": "number",
        "required": false,
        "description": "Per-axis location jitter"
      },
      {
        "name": "labelPrefix",
        "type": "string",
        "required": false,
        "description": "Label prefix for the spawned actors (default Grid)"
      }
    ]
  },
  "spawn_light": {
    "category": "level",
    "params": [
      {
        "name": "lightType",
        "type": "string",
        "required": true,
        "description": "point | spot | directional | rect | sky"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "When the label or name is taken: skip (default) | error"
      },
      {
        "name": "label",
        "type": "string",
        "required": false,
        "description": "Actor label; an existing actor with this label is reported rather than duplicated"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "World rotation"
      },
      {
        "name": "intensity",
        "type": "number",
        "required": false,
        "description": "Light intensity"
      },
      {
        "name": "color",
        "type": "object",
        "required": false,
        "description": "Colour {r, g, b} in 0-255"
      },
      {
        "name": "mobility",
        "type": "string",
        "required": false,
        "description": "static | stationary | movable"
      },
      {
        "name": "attenuationRadius",
        "type": "number",
        "required": false,
        "description": "Point, spot and rect lights only"
      }
    ]
  },
  "spawn_transient_actor": {
    "category": "level",
    "params": [
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "actorClass",
        "type": "string",
        "required": true,
        "description": "Actor class: short name, /Script path or Blueprint class path"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "World rotation"
      },
      {
        "name": "scale",
        "type": "vec3",
        "required": false,
        "description": "Actor scale"
      },
      {
        "name": "label",
        "type": "string",
        "required": false,
        "description": "Actor label"
      },
      {
        "name": "hideFromOutliner",
        "type": "boolean",
        "required": false,
        "description": "Keep the actor out of the World Outliner (default false)"
      },
      {
        "name": "initialize",
        "type": "string",
        "required": false,
        "description": "none | construction (default) | beginPlay"
      },
      {
        "name": "properties",
        "type": "object",
        "required": false,
        "description": "Property name to value, applied before initialisation"
      }
    ]
  },
  "spawn_volume": {
    "category": "level",
    "params": [
      {
        "name": "volumeType",
        "type": "string",
        "required": true,
        "description": "Volume class, by short name or alias such as trigger, blocking, postprocess, navmesh"
      },
      {
        "name": "onConflict",
        "type": "string",
        "required": false,
        "description": "When the label or name is taken: skip (default) | error"
      },
      {
        "name": "label",
        "type": "string",
        "required": false,
        "description": "Actor label; an existing actor with this label is reported rather than duplicated"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location"
      },
      {
        "name": "extent",
        "type": "vec3",
        "required": false,
        "description": "Half extent of the cube brush (default 100, 100, 100)"
      },
      {
        "name": "graphPath",
        "type": "string",
        "required": false,
        "description": "PCG graph for a PCGVolume"
      }
    ]
  },
  "summarize_static_mesh_usage": {
    "category": "level",
    "params": [
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      },
      {
        "name": "maxResults",
        "type": "integer",
        "required": false,
        "description": "Cap on result rows; full-scan totals are still reported"
      },
      {
        "name": "includeOccurrences",
        "type": "boolean",
        "required": false,
        "description": "Include example actor and component occurrences per mesh"
      },
      {
        "name": "maxOccurrences",
        "type": "integer",
        "required": false,
        "description": "Cap on occurrence examples per mesh"
      }
    ]
  },
  "test_component_overlap": {
    "category": "level",
    "params": [
      {
        "name": "actorLabelA",
        "type": "string",
        "required": false,
        "description": "First actor label; pass actorLabelA or actorPathA"
      },
      {
        "name": "actorPathA",
        "type": "string",
        "required": false,
        "description": "First actor object path"
      },
      {
        "name": "actorLabelB",
        "type": "string",
        "required": false,
        "description": "Second actor label; pass actorLabelB or actorPathB"
      },
      {
        "name": "actorPathB",
        "type": "string",
        "required": false,
        "description": "Second actor object path"
      },
      {
        "name": "componentNameA",
        "type": "string",
        "required": false,
        "description": "Component on actor A; omitted selects its root"
      },
      {
        "name": "componentNameB",
        "type": "string",
        "required": false,
        "description": "Component on actor B; omitted selects its root"
      },
      {
        "name": "method",
        "type": "string",
        "required": false,
        "description": "OBB (oriented, default) | AABB (axis-aligned world bounds)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor (default) | pie"
      },
      {
        "name": "pieInstance",
        "type": "integer",
        "required": false,
        "description": "Which PIE world when world is pie: 0 = server or primary, 1..N = clients"
      }
    ]
  },
  "update_instance_transform": {
    "category": "level",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor editor label; pass actorLabel or actorPath"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path; the unambiguous selector, and it wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Component instance name"
      },
      {
        "name": "index",
        "type": "integer",
        "required": true,
        "description": "Instance index"
      },
      {
        "name": "worldSpace",
        "type": "boolean",
        "required": false,
        "description": "Treat transforms as world space (default true)"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "World rotation"
      },
      {
        "name": "scale",
        "type": "vec3",
        "required": false,
        "description": "Actor scale"
      }
    ]
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  add_actor_tag: "Params: actorLabel?, actorPath?, tag",
  add_component_to_actor: "Params: actorLabel?, actorPath?, componentClass, componentName, onConflict?",
  add_hismc_instances: "Params: actorLabel?, actorPath?, componentName?, transforms, worldSpace?",
  add_instances: "Params: actorLabel?, actorPath?, componentName?, transforms, worldSpace?",
  add_ismc_instances: "Params: actorLabel?, actorPath?, componentName?, transforms, worldSpace?",
  add_post_process_blendable: "Params: actorLabel?, actorPath?, materialPath (or material), weight?",
  aim_actor_at: "Params: actorLabel?, actorPath?, targetPoint?, targetActor?, targetActorPath?, roll?, world?, pieInstance?",
  attach_actor: "Params: childLabel?, childPath?, parentLabel?, parentPath?, attachRule?, socketName?",
  attach_component: "Params: childLabel?, childPath?, parentLabel?, parentPath?, childComponentName?, parentComponentName?, attachRule?, weldSimulatedBodies?, socketName?",
  batch_set_actor_properties: "Params: properties, actorLabels?, labelPrefix?, labelContains?, tag?, classFilter?, folderPath?, folderPathPrefix?, matchSubclasses?, dryRun?, force?, transactionLabel?",
  count_actors_by_class: "Params: world?, pieInstance?, topN?",
  delete_actor: "Params: actorLabel?, actorPath?",
  destroy_transient_actor: "Params: world?, pieInstance?, actorPath?, actorLabel?, all?",
  detach_actor: "Params: childLabel?, childPath?",
  detach_component: "Params: childLabel?, childPath?, childComponentName?",
  export_actor_fbx: "Params: actorLabel?, actorPath?, outputPath (or filePath)",
  get_actor_bounds: "Params: actorLabel?, actorPath?, onlyColliding?, world?, pieInstance?",
  get_actor_details: "Params: actorLabel?, actorPath?, includeProperties?, propertyName?, world?, pieInstance?",
  get_actors_by_class: "Params: className?, labelPrefix?, world?, pieInstance?, matchSubclasses?, includeTransforms?",
  get_actors_by_component_class: "Params: componentClass (or className), world?, pieInstance?",
  get_component_details: "Params: actorLabel?, actorPath?, componentName?, includeValues?, propertyNames?, world?, pieInstance?",
  get_component_tree: "Params: actorLabel?, actorPath?, includeProperties?, componentClass?, componentName?, world?, pieInstance?",
  get_current_edit_level: "Params: none",
  get_current_level: "Params: none",
  get_instance_transforms: "Params: actorLabel?, actorPath?, componentName?, worldSpace?",
  get_nanite_info: "Params: assetPath (or meshPath)",
  get_post_process_settings: "Params: actorLabel?, actorPath?, componentName?, propertyName?, onlyOverridden?, nameContains?, names?",
  get_relative_transform: "Params: targetLabel? (or target), targetPath?, referenceLabel? (or reference), referencePath?, world?, pieInstance?",
  get_runtime_virtual_texture_summary: "Params: world?, pieInstance?",
  get_selected_actors: "Params: none",
  get_water_state: "Params: actorLabel?, actorPath?",
  get_world_outliner: "Params: classFilter?, exactClass?, nameFilter?, folderPath?, folderPathPrefix?, editorHidden?, includeStreaming?, world?, pieInstance?, cursor?, limit?",
  get_world_partition_settings: "Params: none",
  get_world_settings: "Params: none",
  line_trace: "Params: start?, end?, direction?, distance?, traceComplex?, channel?, ignoreActors?, world?, pieInstance?",
  list_actor_descs: "Params: filter?, className?, guids?, bounds?, loadedOnly?, unloadedOnly?, cursor?, limit?",
  list_actor_tags: "Params: actorLabel?, actorPath?, cursor?, limit?",
  list_levels: "Params: cursor?, limit?",
  list_streaming_sublevels: "Params: none",
  list_transient_actors: "Params: world?, pieInstance?, cursor?, limit?",
  list_volumes: "Params: volumeType?, cursor?, limit?",
  move_actor: "Params: actorLabel?, actorPath?, location?, rotation?, scale?, world?, pieInstance?",
  nav_project_point: "Params: point, extent?, world?, pieInstance?",
  place_actor: "Params: actorClass, label?, onConflict?, location?, rotation?, scale?, staticMesh?, material?, world?, pieInstance?",
  read_actor_motion: "Params: actorLabel?, actorLabels?, actorPath?, actorPaths?, world?, pieInstance?",
  rebuild_water_zone: "Params: actorLabel?, actorPath?, zoneExtent?, tileSize?, maxPasses?",
  remove_actor_tag: "Params: actorLabel?, actorPath?, tag",
  remove_component_from_actor: "Params: actorLabel?, actorPath?, componentName",
  remove_components_by_class: "Params: componentClass, matchComponentSubclasses?, componentNameContains?, actorLabels?, labelPrefix?, labelContains?, tag?, classFilter? (or actorClassFilter), folderPath?, folderPathPrefix?, matchSubclasses?, dryRun?, save?, transactionLabel?",
  remove_instance: "Params: actorLabel?, actorPath?, componentName?, index",
  remove_streaming_sublevel: "Params: levelName (or levelPath)",
  resolve_actor: "Params: internalName",
  set_actor_material: "Params: actorLabel?, actorPath?, materialPath, slotIndex?",
  set_actor_mobility: "Params: actorLabel?, actorPath?, mobility",
  set_actor_property: "Params: actorLabel?, actorPath?, propertyName, value, force?, world?, pieInstance?",
  set_actor_tags: "Params: actorLabel?, actorPath?, tags",
  set_component_property: "Params: actorLabel?, actorPath?, componentName?, propertyName, value, world?, pieInstance?",
  set_current_edit_level: "Params: levelName (or levelPath)",
  set_editor_visibility: "Params: hidden, actorLabels?, all?",
  set_fixed_exposure: "Params: actorLabel?, actorPath?, componentName?, propertyName?, exposure (or brightness), bias?",
  set_fog_properties: "Params: actorLabel?, actorPath?, world?, pieInstance?, fogDensity?, fogHeightFalloff?, startDistance?, fogInscatteringColor? (or color), enableVolumetricFog?, volumetricFogScatteringDistribution?, volumetricFogExtinctionScale?, volumetricFogDistance?, volumetricFogAlbedo?",
  set_light_properties: "Params: actorLabel?, actorPath?, intensity?, color?, rotation?, mobility?, recaptureSky?, volumetricScatteringIntensity?, sourceRadius?, innerConeAngle?, outerConeAngle?",
  set_nanite_settings: "Params: assetPath (or meshPath), enabled?, positionPrecision?",
  set_post_process_settings: "Params: actorLabel?, actorPath?, componentName?, propertyName?, settings, enableOverrides?",
  set_streaming_sublevel_properties: "Params: levelName (or levelPath), initiallyLoaded?, initiallyVisible?, location?, editorVisible?",
  set_volume_properties: "Params: actorLabel?, actorPath?, properties",
  set_water_body_property: "Params: actorLabel?, actorPath?, propertyName, value",
  snap_actor_to_floor: "Params: actorLabel?, actorPath?, floorOffset?, maxDistance?, world?, pieInstance?",
  snap_instances_to_surface: "Params: actorLabel?, actorPath?, componentName?, instanceIndices?, maxInstances?, direction?, traceStartOffset?, traceDistance?, surfaceOffset?, onMiss?, surfaceActorClass?, surfaceActorLabels?, channel?, traceComplex?, dryRun?",
  spawn_grid: "Params: staticMesh, min, max, countX?, countY?, countZ?, jitter?, labelPrefix?",
  spawn_light: "Params: lightType, onConflict?, label?, location?, rotation?, intensity?, color?, mobility?, attenuationRadius?",
  spawn_transient_actor: "Params: world?, pieInstance?, actorClass, location?, rotation?, scale?, label?, hideFromOutliner?, initialize?, properties?",
  spawn_volume: "Params: volumeType, onConflict?, label?, location?, extent?, graphPath?",
  summarize_static_mesh_usage: "Params: world?, pieInstance?, maxResults?, includeOccurrences?, maxOccurrences?",
  test_component_overlap: "Params: actorLabelA?, actorPathA?, actorLabelB?, actorPathB?, componentNameA?, componentNameB?, method?, world?, pieInstance?",
  update_instance_transform: "Params: actorLabel?, actorPath?, componentName?, index, worldSpace?, location?, rotation?, scale?",
};

/** Every key the spec'd level handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  actorClass: z.string().optional().describe("Actor class: short name, /Script path or Blueprint class path"),
  actorClassFilter: z.string().optional().describe("Alias for classFilter"),
  actorLabel: z.string().optional().describe("Actor editor label; pass actorLabel or actorPath (add_actor_tag, add_component_to_actor, add_hismc_instances, add_instances, add_ismc_instances, add_post_process_blendable, aim_actor_at, delete_actor, export_actor_fbx, get_actor_bounds, get_actor_details, get_component_details, get_component_tree, get_instance_transforms, get_post_process_settings, get_water_state, list_actor_tags, move_actor, read_actor_motion, rebuild_water_zone, remove_actor_tag, remove_component_from_actor, remove_instance, set_actor_material, set_actor_mobility, set_actor_property, set_actor_tags, set_component_property, set_fixed_exposure, set_fog_properties, set_light_properties, set_post_process_settings, set_volume_properties, set_water_body_property, snap_actor_to_floor, snap_instances_to_surface, update_instance_transform). Transient actor label (destroy_transient_actor)"),
  actorLabelA: z.string().optional().describe("First actor label; pass actorLabelA or actorPathA"),
  actorLabelB: z.string().optional().describe("Second actor label; pass actorLabelB or actorPathB"),
  actorLabels: z.array(z.string()).optional().describe("Exact actor editor labels"),
  actorPath: z.string().optional().describe("Full actor object path; the unambiguous selector, and it wins over actorLabel (add_actor_tag, add_component_to_actor, add_hismc_instances, add_instances, add_ismc_instances, add_post_process_blendable, aim_actor_at, delete_actor, export_actor_fbx, get_actor_bounds, get_actor_details, get_component_details, get_component_tree, get_instance_transforms, get_post_process_settings, get_water_state, list_actor_tags, move_actor, read_actor_motion, rebuild_water_zone, remove_actor_tag, remove_component_from_actor, remove_instance, set_actor_material, set_actor_mobility, set_actor_property, set_actor_tags, set_component_property, set_fixed_exposure, set_fog_properties, set_light_properties, set_post_process_settings, set_volume_properties, set_water_body_property, snap_actor_to_floor, snap_instances_to_surface, update_instance_transform). Transient actor object path (destroy_transient_actor)"),
  actorPathA: z.string().optional().describe("First actor object path"),
  actorPathB: z.string().optional().describe("Second actor object path"),
  actorPaths: z.array(z.string()).optional().describe("Full actor object paths"),
  all: z.boolean().optional().describe("Destroy every transient verification actor in the world (destroy_transient_actor). Target every actor (set_editor_visibility)"),
  assetPath: z.string().optional().describe("StaticMesh asset path"),
  attachRule: z.string().optional().describe("KeepWorld | KeepRelative | SnapToTarget"),
  attenuationRadius: z.number().optional().describe("Point, spot and rect lights only"),
  bias: z.number().optional().describe("AutoExposureBias (exposure compensation)"),
  bounds: z.record(z.unknown()).optional().describe("{min:{x,y,z}, max:{x,y,z}} intersection test"),
  brightness: z.number().optional().describe("Alias for exposure"),
  channel: z.string().optional().describe("Collision channel (default Visibility)"),
  childComponentName: z.string().optional().describe("Child SceneComponent instance name; omitted selects the actor root"),
  childLabel: z.string().optional().describe("Child actor label; pass childLabel or childPath"),
  childPath: z.string().optional().describe("Child actor object path"),
  classFilter: z.string().optional().describe("Actor class, resolved as a class or matched as a substring (batch_set_actor_properties). Case-sensitive substring over the class name (get_world_outliner). Restrict to actors of this class (remove_components_by_class)"),
  className: z.string().optional().describe("Class name, /Script path or Blueprint class path; required without labelPrefix (get_actors_by_class). Alias for componentClass (get_actors_by_component_class). Actor class filter (list_actor_descs)"),
  color: z.record(z.unknown()).optional().describe("Alias for fogInscatteringColor (set_fog_properties). Colour {r, g, b} in 0-255 (set_light_properties, spawn_light)"),
  componentClass: z.string().optional().describe("Component class: short name or full path (add_component_to_actor). Component class name, exact or substring (get_actors_by_component_class). Case-insensitive substring over the component class name (get_component_tree). Component class to remove (remove_components_by_class)"),
  componentName: z.string().optional().describe("Name of the new component (add_component_to_actor). Component instance name (add_hismc_instances, add_instances, add_ismc_instances, get_component_details, get_instance_transforms, remove_instance, set_component_property, snap_instances_to_surface, update_instance_transform). Only this component, by instance name (get_component_tree). Component holding the post-process settings, when the actor is not a PostProcessVolume (get_post_process_settings, set_fixed_exposure, set_post_process_settings). Component to remove (remove_component_from_actor)"),
  componentNameA: z.string().optional().describe("Component on actor A; omitted selects its root"),
  componentNameB: z.string().optional().describe("Component on actor B; omitted selects its root"),
  componentNameContains: z.string().optional().describe("Case-insensitive substring over the component instance name"),
  countX: z.number().int().optional().describe("Actors along X (default 4)"),
  countY: z.number().int().optional().describe("Actors along Y (default 4)"),
  countZ: z.number().int().optional().describe("Actors along Z (default 1)"),
  cursor: z.string().optional().describe("Resume a paged read: pass back the nextCursor from the previous page, unmodified"),
  direction: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Ray direction, normalised internally (line_trace). Trace direction (default straight down) (snap_instances_to_surface)"),
  distance: z.number().optional().describe("Ray length when direction is given (default 200000)"),
  dryRun: z.boolean().optional().describe("Report what would change without writing (batch_set_actor_properties, snap_instances_to_surface). Report what would be removed without removing it (default TRUE) (remove_components_by_class)"),
  editorHidden: z.boolean().optional().describe("Only editor-hidden (true) or only visible (false) actors"),
  editorVisible: z.boolean().optional().describe("Editor viewport visibility"),
  enabled: z.boolean().optional().describe("Enable Nanite (default true)"),
  enableOverrides: z.boolean().optional().describe("Enable each written setting's bOverride flag (default true)"),
  enableVolumetricFog: z.boolean().optional().describe("Enable volumetric fog"),
  end: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Ray end; pass end or direction and distance"),
  exactClass: z.boolean().optional().describe("Require classFilter to be the exact class name"),
  exposure: z.number().optional().describe("Fixed adaptation brightness, written to both min and max"),
  extent: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Query extent (default 100, 100, 100) (nav_project_point). Half extent of the cube brush (default 100, 100, 100) (spawn_volume)"),
  filePath: z.string().optional().describe("Alias for outputPath"),
  filter: z.string().optional().describe("Case-insensitive substring over label, name, class and path"),
  floorOffset: z.number().optional().describe("Vertical offset added to the impact Z"),
  fogDensity: z.number().optional().describe("Fog density"),
  fogHeightFalloff: z.number().optional().describe("Fog height falloff"),
  fogInscatteringColor: z.record(z.unknown()).optional().describe("Inscattering colour {r, g, b} in 0-255"),
  folderPath: z.string().optional().describe("World Outliner folder, matched exactly"),
  folderPathPrefix: z.string().optional().describe("World Outliner folder prefix"),
  force: z.boolean().optional().describe("Bypass EditDefaultsOnly to write per-instance overrides (batch_set_actor_properties). Bypass EditDefaultsOnly to write a per-instance override (set_actor_property)"),
  graphPath: z.string().optional().describe("PCG graph for a PCGVolume"),
  guids: z.array(z.string()).optional().describe("Exact actor GUIDs"),
  hidden: z.boolean().optional().describe("true hides the actors in the editor, false shows them"),
  hideFromOutliner: z.boolean().optional().describe("Keep the actor out of the World Outliner (default false)"),
  ignoreActors: z.array(z.string()).optional().describe("Actor labels to skip"),
  includeOccurrences: z.boolean().optional().describe("Include example actor and component occurrences per mesh"),
  includeProperties: z.boolean().optional().describe("Include reflected UPROPERTY values"),
  includeStreaming: z.boolean().optional().describe("Include World Partition streaming-proxy and HLOD actors (default false)"),
  includeTransforms: z.boolean().optional().describe("Include each actor's location, rotation and scale (default true)"),
  includeValues: z.boolean().optional().describe("Dump UPROPERTY values"),
  index: z.number().int().optional().describe("Instance index"),
  initialize: z.string().optional().describe("none | construction (default) | beginPlay"),
  initiallyLoaded: z.boolean().optional().describe("Load the sub-level with the persistent level"),
  initiallyVisible: z.boolean().optional().describe("Make the sub-level visible when loaded"),
  innerConeAngle: z.number().optional().describe("Spot light inner cone angle"),
  instanceIndices: z.array(z.number().int()).optional().describe("Instance indices to project; omit for every instance"),
  intensity: z.number().optional().describe("Light intensity"),
  internalName: z.string().optional().describe("Internal UObject name, such as StaticMeshActor_141"),
  jitter: z.number().optional().describe("Per-axis location jitter"),
  label: z.string().optional().describe("Actor label; an existing actor with this label is reported rather than duplicated (place_actor, spawn_light, spawn_volume). Actor label (spawn_transient_actor)"),
  labelContains: z.string().optional().describe("Case-insensitive substring over the actor's editor label"),
  labelPrefix: z.string().optional().describe("Case-sensitive prefix over the actor's editor label (batch_set_actor_properties, get_actors_by_class, remove_components_by_class). Label prefix for the spawned actors (default Grid) (spawn_grid)"),
  levelName: z.string().optional().describe("Streaming sub-level name or package path (remove_streaming_sublevel, set_streaming_sublevel_properties). Loaded sub-level to make current (set_current_edit_level)"),
  levelPath: z.string().optional().describe("Alias for levelName"),
  lightType: z.string().optional().describe("point | spot | directional | rect | sky"),
  limit: z.number().int().optional().describe("Rows on this page"),
  loadedOnly: z.boolean().optional().describe("Only actors currently streamed in"),
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("World location (move_actor, place_actor, spawn_light, spawn_transient_actor, spawn_volume, update_instance_transform). Sub-level offset (set_streaming_sublevel_properties)"),
  matchComponentSubclasses: z.boolean().optional().describe("Also match subclasses of componentClass (default true)"),
  matchSubclasses: z.boolean().optional().describe("Match subclasses of the class filter (default true)"),
  material: z.string().optional().describe("Alias for materialPath (add_post_process_blendable). Material applied at slot 0 (place_actor)"),
  materialPath: z.string().optional().describe("Material to add as a blendable (add_post_process_blendable). Material asset path (set_actor_material)"),
  max: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Grid upper bound"),
  maxDistance: z.number().optional().describe("Downward trace length (default 100000)"),
  maxInstances: z.number().int().optional().describe("Cap on instances processed in one call"),
  maxOccurrences: z.number().int().optional().describe("Cap on occurrence examples per mesh"),
  maxPasses: z.number().int().optional().describe("Rebuild passes before giving up on a stable QuadTreeResolution, 2..8 (default 4)"),
  maxResults: z.number().int().optional().describe("Cap on result rows; full-scan totals are still reported"),
  meshPath: z.string().optional().describe("Alias for assetPath"),
  method: z.string().optional().describe("OBB (oriented, default) | AABB (axis-aligned world bounds)"),
  min: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Grid lower bound"),
  mobility: z.string().optional().describe("static | stationary | movable"),
  nameContains: z.string().optional().describe("Substring over the setting name"),
  nameFilter: z.string().optional().describe("Case-sensitive substring over the internal name or the label"),
  names: z.array(z.string()).optional().describe("Exact setting names to return"),
  onConflict: z.string().optional().describe("When the label or name is taken: skip (default) | error"),
  onlyColliding: z.boolean().optional().describe("Only colliding components contribute to the bounds"),
  onlyOverridden: z.boolean().optional().describe("Only settings whose bOverride flag is on"),
  onMiss: z.string().optional().describe("error (default, aborts the batch) | skip"),
  outerConeAngle: z.number().optional().describe("Spot light outer cone angle"),
  outputPath: z.string().optional().describe("Output .fbx path"),
  parentComponentName: z.string().optional().describe("Parent SceneComponent instance name; omitted selects the actor root"),
  parentLabel: z.string().optional().describe("Parent actor label; pass parentLabel or parentPath"),
  parentPath: z.string().optional().describe("Parent actor object path"),
  pieInstance: z.number().int().optional().describe("Which PIE world when world is pie: 0 = server or primary, 1..N = clients"),
  point: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("World point to project onto the navmesh"),
  positionPrecision: z.number().int().optional().describe("Nanite position precision"),
  properties: z.record(z.unknown()).optional().describe("Property name to value, dotted paths supported (batch_set_actor_properties). Property name to value (set_volume_properties). Property name to value, applied before initialisation (spawn_transient_actor)"),
  propertyName: z.string().optional().describe("Only this property, with includeProperties (get_actor_details). FPostProcessSettings property on that component (get_post_process_settings, set_fixed_exposure, set_post_process_settings). Property name, dotted paths supported (set_actor_property, set_component_property, set_water_body_property)"),
  propertyNames: z.array(z.string()).optional().describe("Restrict includeValues to these properties"),
  recaptureSky: z.boolean().optional().describe("Recapture a SkyLight after the change"),
  reference: z.string().optional().describe("Alias for referenceLabel"),
  referenceLabel: z.string().optional().describe("Reference actor label; pass referenceLabel or referencePath"),
  referencePath: z.string().optional().describe("Reference actor object path"),
  roll: z.number().optional().describe("Roll in degrees (default 0)"),
  rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional().describe("World rotation (move_actor, place_actor, spawn_light, spawn_transient_actor, update_instance_transform). DirectionalLight sun angle (set_light_properties)"),
  save: z.boolean().optional().describe("Save the level after a committed removal (default false)"),
  scale: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Actor scale"),
  settings: z.record(z.unknown()).optional().describe("Setting name to value; each setting's bOverride flag is enabled too"),
  slotIndex: z.number().int().optional().describe("Material slot (default 0)"),
  socketName: z.string().optional().describe("Socket or bone on the resolved parent component"),
  sourceRadius: z.number().optional().describe("Point or spot light source radius"),
  start: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Ray start"),
  startDistance: z.number().optional().describe("Fog start distance"),
  staticMesh: z.string().optional().describe("Static mesh for a StaticMeshActor (place_actor). Static mesh to place (spawn_grid)"),
  surfaceActorClass: z.string().optional().describe("Only accept hits on actors of this class"),
  surfaceActorLabels: z.array(z.string()).optional().describe("Only accept hits on actors with these labels"),
  surfaceOffset: z.number().optional().describe("Offset along the surface normal after the hit"),
  tag: z.string().optional().describe("Actor tag (add_actor_tag, remove_actor_tag). Actor must carry this tag (batch_set_actor_properties, remove_components_by_class)"),
  tags: z.array(z.string()).optional().describe("The actor's complete tag list"),
  target: z.string().optional().describe("Alias for targetLabel"),
  targetActor: z.string().optional().describe("Label of the actor to look at"),
  targetActorPath: z.string().optional().describe("Object path of the actor to look at"),
  targetLabel: z.string().optional().describe("Target actor label; pass targetLabel or targetPath"),
  targetPath: z.string().optional().describe("Target actor object path"),
  targetPoint: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("World point to look at"),
  tileSize: z.number().optional().describe("New WaterMesh TileSize in cm"),
  topN: z.number().int().optional().describe("Only the N most common classes"),
  traceComplex: z.boolean().optional().describe("Trace per-triangle collision (default false)"),
  traceDistance: z.number().optional().describe("Maximum trace length"),
  traceStartOffset: z.number().optional().describe("Height above each instance to begin the trace"),
  transactionLabel: z.string().optional().describe("Undo-stack entry name"),
  transforms: z.array(z.record(z.unknown())).optional().describe("Transforms {location, rotation?, scale?} to add"),
  unloadedOnly: z.boolean().optional().describe("Only actors on disk that are not streamed in"),
  value: z.unknown().optional().describe("Value to write (set_actor_property). Value to write; null clears an object reference (set_component_property). Value to write: string, number or boolean (set_water_body_property)"),
  volumetricFogAlbedo: z.record(z.unknown()).optional().describe("Volumetric fog albedo {r, g, b} in 0-255"),
  volumetricFogDistance: z.number().optional().describe("Volumetric fog distance"),
  volumetricFogExtinctionScale: z.number().optional().describe("Volumetric fog extinction scale"),
  volumetricFogScatteringDistribution: z.number().optional().describe("Volumetric fog scattering distribution"),
  volumetricScatteringIntensity: z.number().optional().describe("Volumetric scattering intensity"),
  volumeType: z.string().optional().describe("Substring over the volume class name (list_volumes). Volume class, by short name or alias such as trigger, blocking, postprocess, navmesh (spawn_volume)"),
  weight: z.number().optional().describe("Blend weight (default 1)"),
  weldSimulatedBodies: z.boolean().optional().describe("Weld simulated bodies during attachment (default false)"),
  world: z.string().optional().describe("World scope: editor (default) | pie (aim_actor_at, count_actors_by_class, destroy_transient_actor, get_actor_bounds, get_actor_details, get_actors_by_class, get_actors_by_component_class, get_component_details, get_component_tree, get_relative_transform, get_runtime_virtual_texture_summary, get_world_outliner, line_trace, list_transient_actors, move_actor, nav_project_point, place_actor, set_actor_property, set_component_property, set_fog_properties, snap_actor_to_floor, spawn_transient_actor, summarize_static_mesh_usage, test_component_overlap). World scope: auto (default, PIE when running) | editor | pie (read_actor_motion)"),
  worldSpace: z.boolean().optional().describe("Treat transforms as world space (default true)"),
  zoneExtent: z.unknown().optional().describe("New WaterZone ZoneExtent in cm, {x, y} or [x, y]"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses);
