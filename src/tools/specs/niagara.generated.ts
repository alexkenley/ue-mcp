// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd niagara handler. */
export const handlerSpecs: HandlerSpecs = {
  "add_emitter_renderer": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "rendererType",
        "type": "string",
        "required": true,
        "description": "sprite|mesh|ribbon or full class name"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "add_emitter_to_system": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "emitterPath",
        "type": "string",
        "required": true,
        "description": "NiagaraEmitter asset to add"
      }
    ]
  },
  "add_niagara_event_handler": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "eventName",
        "type": "string",
        "required": true,
        "description": "Event handler name"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      },
      {
        "name": "sourceEmitterId",
        "type": "string",
        "required": false,
        "description": "Id of the emitter whose events this handler listens to (default: this emitter)"
      }
    ]
  },
  "add_niagara_module": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "moduleScript",
        "type": "string",
        "required": true,
        "description": "Stock module script path, e.g. /Niagara/Modules/Emitter/SpawnRate"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": true,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      },
      {
        "name": "targetIndex",
        "type": "integer",
        "required": false,
        "description": "Stack insert position; -1 (default) appends"
      }
    ]
  },
  "add_niagara_simulation_stage": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "stageName",
        "type": "string",
        "required": true,
        "description": "Simulation stage name"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      },
      {
        "name": "enabled",
        "type": "boolean",
        "required": false,
        "description": "Create the stage enabled (default true)"
      }
    ]
  },
  "compile_niagara_system": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "force",
        "type": "boolean",
        "required": false,
        "description": "Recompile even when nothing looks dirty (default true)"
      },
      {
        "name": "includeGpuShaders",
        "type": "boolean",
        "required": false,
        "description": "Also wait for GPU shader compilation to finish (default false)"
      }
    ]
  },
  "get_emitter_info": {
    "category": "niagara",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "NiagaraEmitter asset path"
      }
    ]
  },
  "get_niagara_compiled_hlsl": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "get_niagara_info": {
    "category": "niagara",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "inspect_data_interface": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      }
    ]
  },
  "list_emitter_renderers": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "list_emitters_in_system": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      }
    ]
  },
  "list_niagara_dynamic_inputs": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": false,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate|all (default all)"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": false,
        "description": "Only this module (default: every module)"
      }
    ]
  },
  "list_niagara_module_inputs": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": false,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate|all (default all)"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": false,
        "description": "Only this module (default: every module)"
      }
    ]
  },
  "list_niagara_modules": {
    "category": "niagara",
    "params": [
      {
        "name": "pathFilter",
        "type": "string",
        "required": false,
        "description": "Case-sensitive substring of the module script object path, applied to the whole set before paging"
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
        "description": "Rows to return on this page (default 200, max 2000)"
      }
    ]
  },
  "list_niagara_static_switches": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": false,
        "description": "Only this module (default: every module)"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": false,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate|all (default all)"
      }
    ]
  },
  "list_niagara_system_parameters": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      }
    ]
  },
  "list_niagara_systems": {
    "category": "niagara",
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
  "remove_emitter_from_system": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "remove_emitter_renderer": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "rendererIndex",
        "type": "integer",
        "required": true,
        "description": "Index of the renderer on the emitter"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "remove_niagara_dynamic_input": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": true,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": true,
        "description": "Name of the module function call node"
      },
      {
        "name": "inputName",
        "type": "string",
        "required": true,
        "description": "Module input pin name"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "remove_niagara_event_handler": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "eventName",
        "type": "string",
        "required": true,
        "description": "Event handler name"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "remove_niagara_module": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": true,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": true,
        "description": "Name of the module function call node"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "remove_niagara_simulation_stage": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "stageName",
        "type": "string",
        "required": true,
        "description": "Simulation stage name"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "set_emitter_property": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path",
        "aliases": [
          "assetPath"
        ]
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name (default: the first emitter)"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Emitter property to set"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "New value, as a string"
      }
    ]
  },
  "set_niagara_dynamic_input": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": true,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": true,
        "description": "Name of the module function call node"
      },
      {
        "name": "inputName",
        "type": "string",
        "required": true,
        "description": "Module input pin name"
      },
      {
        "name": "dynamicInputScript",
        "type": "string",
        "required": true,
        "description": "The dynamic-input NiagaraScript to wire in"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "set_niagara_module_enabled": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": true,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": true,
        "description": "Name of the module function call node"
      },
      {
        "name": "enabled",
        "type": "boolean",
        "required": true,
        "description": "The state to set"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "set_niagara_static_switch": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "moduleName",
        "type": "string",
        "required": true,
        "description": "Name of the module function call node"
      },
      {
        "name": "switchName",
        "type": "string",
        "required": true,
        "description": "Static switch input name"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "Switch value, as a string"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      },
      {
        "name": "stackContext",
        "type": "string",
        "required": false,
        "description": "ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate|all (default all)"
      }
    ]
  },
  "set_renderer_property": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "rendererIndex",
        "type": "integer",
        "required": false,
        "description": "Index of the renderer on the emitter (default 0)"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Renderer property to set"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "New value: a bool, number or string, an asset path for an object property, or JSON for a struct, enum, name or array"
      },
      {
        "name": "emitterName",
        "type": "string",
        "required": false,
        "description": "Emitter handle name. Omit to address the emitter by emitterIndex"
      },
      {
        "name": "emitterIndex",
        "type": "number",
        "required": false,
        "description": "Emitter handle index, used when emitterName is omitted"
      }
    ]
  },
  "spawn_niagara_actor": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location {x,y,z} (default origin)"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "World rotation {pitch,yaw,roll}"
      },
      {
        "name": "label",
        "type": "string",
        "required": false,
        "description": "Editor label. Also the idempotency key: an existing actor with this label is reported rather than duplicated"
      },
      {
        "name": "activate",
        "type": "boolean",
        "required": false,
        "description": "Activate the system on spawn (default true) (#537)"
      }
    ]
  },
  "spawn_niagara_at_location": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "World location {x,y,z} (default origin)"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "World rotation {pitch,yaw,roll}"
      },
      {
        "name": "label",
        "type": "string",
        "required": false,
        "description": "Editor label. Also the idempotency key: an existing actor with this label is reported rather than duplicated"
      },
      {
        "name": "scaleX",
        "type": "number",
        "required": false,
        "description": "X scale of the spawned component (default 1)"
      },
      {
        "name": "scaleY",
        "type": "number",
        "required": false,
        "description": "Y scale of the spawned component (default 1)"
      },
      {
        "name": "scaleZ",
        "type": "number",
        "required": false,
        "description": "Z scale of the spawned component (default 1)"
      },
      {
        "name": "autoDestroy",
        "type": "boolean",
        "required": false,
        "description": "Destroy the component once the system finishes (default false)"
      }
    ]
  },
  "validate_niagara_system": {
    "category": "niagara",
    "params": [
      {
        "name": "systemPath",
        "type": "string",
        "required": true,
        "description": "NiagaraSystem asset path"
      }
    ]
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  add_emitter_renderer: "Params: systemPath, rendererType, emitterName?, emitterIndex?",
  add_emitter_to_system: "Params: systemPath, emitterPath",
  add_niagara_event_handler: "Params: systemPath, eventName, emitterName?, emitterIndex?, sourceEmitterId?",
  add_niagara_module: "Params: systemPath, moduleScript, stackContext, emitterName?, emitterIndex?, targetIndex?",
  add_niagara_simulation_stage: "Params: systemPath, stageName, emitterName?, emitterIndex?, enabled?",
  compile_niagara_system: "Params: systemPath, force?, includeGpuShaders?",
  get_emitter_info: "Params: assetPath",
  get_niagara_compiled_hlsl: "Params: systemPath, emitterName?, emitterIndex?",
  get_niagara_info: "Params: assetPath (or path)",
  inspect_data_interface: "Params: systemPath",
  list_emitter_renderers: "Params: systemPath, emitterName?, emitterIndex?",
  list_emitters_in_system: "Params: systemPath",
  list_niagara_dynamic_inputs: "Params: systemPath, emitterName?, emitterIndex?, stackContext?, moduleName?",
  list_niagara_module_inputs: "Params: systemPath, emitterName?, emitterIndex?, stackContext?, moduleName?",
  list_niagara_modules: "Params: pathFilter?, cursor?, limit?",
  list_niagara_static_switches: "Params: systemPath, moduleName?, emitterName?, emitterIndex?, stackContext?",
  list_niagara_system_parameters: "Params: systemPath",
  list_niagara_systems: "Params: cursor?, limit?",
  remove_emitter_from_system: "Params: systemPath, emitterName?, emitterIndex?",
  remove_emitter_renderer: "Params: systemPath, rendererIndex, emitterName?, emitterIndex?",
  remove_niagara_dynamic_input: "Params: systemPath, stackContext, moduleName, inputName, emitterName?, emitterIndex?",
  remove_niagara_event_handler: "Params: systemPath, eventName, emitterName?, emitterIndex?",
  remove_niagara_module: "Params: systemPath, stackContext, moduleName, emitterName?, emitterIndex?",
  remove_niagara_simulation_stage: "Params: systemPath, stageName, emitterName?, emitterIndex?",
  set_emitter_property: "Params: systemPath (or assetPath), emitterName?, propertyName, value",
  set_niagara_dynamic_input: "Params: systemPath, stackContext, moduleName, inputName, dynamicInputScript, emitterName?, emitterIndex?",
  set_niagara_module_enabled: "Params: systemPath, stackContext, moduleName, enabled, emitterName?, emitterIndex?",
  set_niagara_static_switch: "Params: systemPath, moduleName, switchName, value, emitterName?, emitterIndex?, stackContext?",
  set_renderer_property: "Params: systemPath, rendererIndex?, propertyName, value, emitterName?, emitterIndex?",
  spawn_niagara_actor: "Params: systemPath, location?, rotation?, label?, activate?",
  spawn_niagara_at_location: "Params: systemPath, location?, rotation?, label?, scaleX?, scaleY?, scaleZ?, autoDestroy?",
  validate_niagara_system: "Params: systemPath",
};

/** Every key the spec'd niagara handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  activate: z.boolean().optional().describe("Activate the system on spawn (default true) (#537)"),
  assetPath: z.string().optional().describe("NiagaraEmitter asset path (get_emitter_info). NiagaraSystem asset path (get_niagara_info). Alias for systemPath (set_emitter_property)"),
  autoDestroy: z.boolean().optional().describe("Destroy the component once the system finishes (default false)"),
  cursor: z.string().optional().describe("Resume a paged read: pass back the 'nextCursor' from the previous page, unmodified"),
  dynamicInputScript: z.string().optional().describe("The dynamic-input NiagaraScript to wire in"),
  emitterIndex: z.number().optional().describe("Emitter handle index, used when emitterName is omitted"),
  emitterName: z.string().optional().describe("Emitter handle name. Omit to address the emitter by emitterIndex (add_emitter_renderer, add_niagara_event_handler, add_niagara_module, add_niagara_simulation_stage, get_niagara_compiled_hlsl, list_emitter_renderers, list_niagara_dynamic_inputs, list_niagara_module_inputs, list_niagara_static_switches, remove_emitter_from_system, remove_emitter_renderer, remove_niagara_dynamic_input, remove_niagara_event_handler, remove_niagara_module, remove_niagara_simulation_stage, set_niagara_dynamic_input, set_niagara_module_enabled, set_niagara_static_switch, set_renderer_property). Emitter handle name (default: the first emitter) (set_emitter_property)"),
  emitterPath: z.string().optional().describe("NiagaraEmitter asset to add"),
  enabled: z.boolean().optional().describe("Create the stage enabled (default true) (add_niagara_simulation_stage). The state to set (set_niagara_module_enabled)"),
  eventName: z.string().optional().describe("Event handler name"),
  force: z.boolean().optional().describe("Recompile even when nothing looks dirty (default true)"),
  includeGpuShaders: z.boolean().optional().describe("Also wait for GPU shader compilation to finish (default false)"),
  inputName: z.string().optional().describe("Module input pin name"),
  label: z.string().optional().describe("Editor label. Also the idempotency key: an existing actor with this label is reported rather than duplicated"),
  limit: z.number().int().optional().describe("Rows to return on this page (default 200, max 2000)"),
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("World location {x,y,z} (default origin)"),
  moduleName: z.string().optional().describe("Only this module (default: every module) (list_niagara_dynamic_inputs, list_niagara_module_inputs, list_niagara_static_switches). Name of the module function call node (remove_niagara_dynamic_input, remove_niagara_module, set_niagara_dynamic_input, set_niagara_module_enabled, set_niagara_static_switch)"),
  moduleScript: z.string().optional().describe("Stock module script path, e.g. /Niagara/Modules/Emitter/SpawnRate"),
  path: z.string().optional().describe("Alias for assetPath"),
  pathFilter: z.string().optional().describe("Case-sensitive substring of the module script object path, applied to the whole set before paging"),
  propertyName: z.string().optional().describe("Emitter property to set (set_emitter_property). Renderer property to set (set_renderer_property)"),
  rendererIndex: z.number().int().optional().describe("Index of the renderer on the emitter (remove_emitter_renderer). Index of the renderer on the emitter (default 0) (set_renderer_property)"),
  rendererType: z.string().optional().describe("sprite|mesh|ribbon or full class name"),
  rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional().describe("World rotation {pitch,yaw,roll}"),
  scaleX: z.number().optional().describe("X scale of the spawned component (default 1)"),
  scaleY: z.number().optional().describe("Y scale of the spawned component (default 1)"),
  scaleZ: z.number().optional().describe("Z scale of the spawned component (default 1)"),
  sourceEmitterId: z.string().optional().describe("Id of the emitter whose events this handler listens to (default: this emitter)"),
  stackContext: z.string().optional().describe("ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate (add_niagara_module, remove_niagara_dynamic_input, remove_niagara_module, set_niagara_dynamic_input, set_niagara_module_enabled). ParticleSpawn|ParticleUpdate|EmitterSpawn|EmitterUpdate|all (default all) (list_niagara_dynamic_inputs, list_niagara_module_inputs, list_niagara_static_switches, set_niagara_static_switch)"),
  stageName: z.string().optional().describe("Simulation stage name"),
  switchName: z.string().optional().describe("Static switch input name"),
  systemPath: z.string().optional().describe("NiagaraSystem asset path"),
  targetIndex: z.number().int().optional().describe("Stack insert position; -1 (default) appends"),
  value: z.unknown().optional().describe("New value, as a string (set_emitter_property). Switch value, as a string (set_niagara_static_switch). New value: a bool, number or string, an asset path for an object property, or JSON for a struct, enum, name or array (set_renderer_property)"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses);
