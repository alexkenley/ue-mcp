// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd animation handler. */
export const handlerSpecs: HandlerSpecs = {
  "add_curve": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimSequence asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "curveName",
        "type": "string",
        "required": true,
        "description": "Float curve to add"
      }
    ]
  },
  "add_virtual_bone": {
    "category": "animation",
    "params": [
      {
        "name": "skeletonPath",
        "type": "string",
        "required": true,
        "description": "USkeleton asset path"
      },
      {
        "name": "sourceBone",
        "type": "string",
        "required": true,
        "description": "Bone the virtual bone starts from"
      },
      {
        "name": "targetBone",
        "type": "string",
        "required": true,
        "description": "Bone the virtual bone points at"
      }
    ]
  },
  "get_physics_asset_info": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "get_skeleton_info": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "list_anim_modifiers": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimSequence asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "list_animation_sockets": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "SkeletalMesh asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_anim_blueprint": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimBlueprint asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_anim_graph": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimBlueprint asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "graphName",
        "type": "string",
        "required": false,
        "description": "Graph to read (default AnimGraph)"
      }
    ]
  },
  "read_anim_montage": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimMontage asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_anim_sequence": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimSequence asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_blendspace": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "BlendSpace or BlendSpace1D asset path",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_bone_track": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimSequence asset path"
      },
      {
        "name": "boneName",
        "type": "string",
        "required": true,
        "description": "Bone whose track to sample"
      },
      {
        "name": "frames",
        "type": "array",
        "required": false,
        "description": "Frames to sample (default: first, middle and last)",
        "items": "number"
      }
    ]
  },
  "read_state_machine": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimBlueprint asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "stateMachineName",
        "type": "string",
        "required": true,
        "description": "State machine to read"
      }
    ]
  },
  "remove_anim_notify": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimSequence or AnimMontage asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "notifyName",
        "type": "string",
        "required": false,
        "description": "Notify name to match"
      },
      {
        "name": "notifyClass",
        "type": "string",
        "required": false,
        "description": "Notify class to match. Pass at least one of notifyName and notifyClass; both filters apply together"
      }
    ]
  },
  "remove_animation_notify": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimSequence or AnimMontage asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "notifyName",
        "type": "string",
        "required": false,
        "description": "Notify name to match"
      },
      {
        "name": "notifyClass",
        "type": "string",
        "required": false,
        "description": "Notify class to match. Pass at least one of notifyName and notifyClass; both filters apply together"
      }
    ]
  },
  "remove_virtual_bone": {
    "category": "animation",
    "params": [
      {
        "name": "skeletonPath",
        "type": "string",
        "required": true,
        "description": "USkeleton asset path"
      },
      {
        "name": "virtualBoneName",
        "type": "string",
        "required": true,
        "description": "Virtual bone to remove"
      }
    ]
  },
  "set_anim_blueprint_skeleton": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimBlueprint asset path"
      },
      {
        "name": "skeletonPath",
        "type": "string",
        "required": true,
        "description": "USkeleton to target"
      }
    ]
  },
  "set_montage_properties": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimMontage asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "sequenceLength",
        "type": "number",
        "required": false,
        "description": "Montage length in seconds"
      },
      {
        "name": "rateScale",
        "type": "number",
        "required": false,
        "description": "Playback rate scale"
      },
      {
        "name": "blendIn",
        "type": "number",
        "required": false,
        "description": "Blend-in time in seconds"
      },
      {
        "name": "blendOut",
        "type": "number",
        "required": false,
        "description": "Blend-out time in seconds"
      }
    ]
  },
  "set_montage_slot": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimMontage asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "slotName",
        "type": "string",
        "required": true,
        "description": "Slot name to write onto the track"
      },
      {
        "name": "trackIndex",
        "type": "integer",
        "required": false,
        "description": "Slot track index (default 0)"
      }
    ]
  },
  "set_root_motion_settings": {
    "category": "animation",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "AnimSequence asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "enableRootMotion",
        "type": "boolean",
        "required": false,
        "description": "Extract root motion from the root bone"
      },
      {
        "name": "forceRootLock",
        "type": "boolean",
        "required": false,
        "description": "Lock the root bone even without root motion"
      },
      {
        "name": "useNormalizedRootMotionScale",
        "type": "boolean",
        "required": false,
        "description": "Normalize root motion scale"
      },
      {
        "name": "rootMotionRootLock",
        "type": "string",
        "required": false,
        "description": "Root lock mode: RefPose | AnimFirstFrame | Zero"
      }
    ]
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  add_curve: "Params: assetPath (or path), curveName",
  add_virtual_bone: "Params: skeletonPath, sourceBone, targetBone",
  get_physics_asset_info: "Params: assetPath (or path)",
  get_skeleton_info: "Params: assetPath (or path)",
  list_anim_modifiers: "Params: assetPath (or path)",
  list_animation_sockets: "Params: assetPath (or path)",
  read_anim_blueprint: "Params: assetPath (or path)",
  read_anim_graph: "Params: assetPath (or path), graphName?",
  read_anim_montage: "Params: assetPath (or path)",
  read_anim_sequence: "Params: assetPath (or path)",
  read_blendspace: "Params: assetPath (or path)",
  read_bone_track: "Params: assetPath, boneName, frames?",
  read_state_machine: "Params: assetPath (or path), stateMachineName",
  remove_anim_notify: "Params: assetPath (or path), notifyName?, notifyClass?",
  remove_animation_notify: "Params: assetPath (or path), notifyName?, notifyClass?",
  remove_virtual_bone: "Params: skeletonPath, virtualBoneName",
  set_anim_blueprint_skeleton: "Params: assetPath, skeletonPath",
  set_montage_properties: "Params: assetPath (or path), sequenceLength?, rateScale?, blendIn?, blendOut?",
  set_montage_slot: "Params: assetPath (or path), slotName, trackIndex?",
  set_root_motion_settings: "Params: assetPath (or path), enableRootMotion?, forceRootLock?, useNormalizedRootMotionScale?, rootMotionRootLock?",
};

/** Every key the spec'd animation handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  assetPath: z.string().optional().describe("AnimSequence asset path (add_curve, list_anim_modifiers, read_anim_sequence, read_bone_track, set_root_motion_settings). SkeletalMesh asset path (get_physics_asset_info, get_skeleton_info, list_animation_sockets). AnimBlueprint asset path (read_anim_blueprint, read_anim_graph, read_state_machine, set_anim_blueprint_skeleton). AnimMontage asset path (read_anim_montage, set_montage_properties, set_montage_slot). BlendSpace or BlendSpace1D asset path (read_blendspace). AnimSequence or AnimMontage asset path (remove_anim_notify, remove_animation_notify)"),
  blendIn: z.number().optional().describe("Blend-in time in seconds"),
  blendOut: z.number().optional().describe("Blend-out time in seconds"),
  boneName: z.string().optional().describe("Bone whose track to sample"),
  curveName: z.string().optional().describe("Float curve to add"),
  enableRootMotion: z.boolean().optional().describe("Extract root motion from the root bone"),
  forceRootLock: z.boolean().optional().describe("Lock the root bone even without root motion"),
  frames: z.array(z.number()).optional().describe("Frames to sample (default: first, middle and last)"),
  graphName: z.string().optional().describe("Graph to read (default AnimGraph)"),
  notifyClass: z.string().optional().describe("Notify class to match. Pass at least one of notifyName and notifyClass; both filters apply together"),
  notifyName: z.string().optional().describe("Notify name to match"),
  path: z.string().optional().describe("Alias for assetPath"),
  rateScale: z.number().optional().describe("Playback rate scale"),
  rootMotionRootLock: z.string().optional().describe("Root lock mode: RefPose | AnimFirstFrame | Zero"),
  sequenceLength: z.number().optional().describe("Montage length in seconds"),
  skeletonPath: z.string().optional().describe("USkeleton asset path (add_virtual_bone, remove_virtual_bone). USkeleton to target (set_anim_blueprint_skeleton)"),
  slotName: z.string().optional().describe("Slot name to write onto the track"),
  sourceBone: z.string().optional().describe("Bone the virtual bone starts from"),
  stateMachineName: z.string().optional().describe("State machine to read"),
  targetBone: z.string().optional().describe("Bone the virtual bone points at"),
  trackIndex: z.number().int().optional().describe("Slot track index (default 0)"),
  useNormalizedRootMotionScale: z.boolean().optional().describe("Normalize root motion scale"),
  virtualBoneName: z.string().optional().describe("Virtual bone to remove"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses);
