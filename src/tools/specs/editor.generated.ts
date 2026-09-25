// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd editor handler. */
export const handlerSpecs: HandlerSpecs = {
  "add_sequence_section": {
    "category": "editor",
    "params": [
      {
        "name": "sequencePath",
        "type": "string",
        "required": true,
        "description": "Level Sequence asset path",
        "aliases": [
          "assetPath",
          "path"
        ]
      },
      {
        "name": "trackType",
        "type": "string",
        "required": true,
        "description": "Transform | Float | SkeletalAnimation | CameraCut | Audio | Event | Fade"
      },
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      },
      {
        "name": "startSeconds",
        "type": "number",
        "required": false,
        "description": "Section start in seconds"
      },
      {
        "name": "endSeconds",
        "type": "number",
        "required": false,
        "description": "Section end in seconds (default one second after the start)"
      },
      {
        "name": "cameraActorLabel",
        "type": "string",
        "required": false,
        "description": "Camera actor to bind a CameraCut section to"
      },
      {
        "name": "cameraActorPath",
        "type": "string",
        "required": false,
        "description": "Full object path of the camera actor. Wins over cameraActorLabel"
      }
    ]
  },
  "add_sequence_track": {
    "category": "editor",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Level Sequence asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "trackType",
        "type": "string",
        "required": true,
        "description": "Transform | Float | SkeletalAnimation | CameraCut | Audio | Event | Fade"
      },
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      }
    ]
  },
  "check_for_crashes": {
    "category": "editor",
    "params": []
  },
  "clear_dialog_policy": {
    "category": "editor",
    "params": [
      {
        "name": "pattern",
        "type": "string",
        "required": false,
        "description": "Exact pattern of the policy to clear; omit to clear every policy"
      }
    ]
  },
  "describe_object": {
    "category": "editor",
    "params": [
      {
        "name": "objectPath",
        "type": "string",
        "required": true,
        "description": "Object, asset, class or Blueprint path. A class or Blueprint resolves to its default object",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "includeProperties",
        "type": "boolean",
        "required": false,
        "description": "Include reflected property metadata (default true)"
      },
      {
        "name": "includeValues",
        "type": "boolean",
        "required": false,
        "description": "Include current property values (default false)"
      },
      {
        "name": "propertyNames",
        "type": "array",
        "required": false,
        "description": "Dotted or indexed property paths to report instead of every property",
        "items": "string"
      }
    ]
  },
  "end_profile_region": {
    "category": "editor",
    "params": [
      {
        "name": "regionName",
        "type": "string",
        "required": true,
        "description": "Name the region was opened under"
      }
    ]
  },
  "focus_viewport_on_actor": {
    "category": "editor",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      }
    ]
  },
  "get_build_status": {
    "category": "editor",
    "params": []
  },
  "get_crash_info": {
    "category": "editor",
    "params": [
      {
        "name": "crashFolder",
        "type": "string",
        "required": true,
        "description": "Crash folder name, as list_crashes reports it"
      }
    ]
  },
  "get_cvars": {
    "category": "editor",
    "params": [
      {
        "name": "name",
        "type": "string",
        "required": false,
        "description": "Console variable to read"
      },
      {
        "name": "names",
        "type": "array",
        "required": false,
        "description": "Console variables to read",
        "items": "string"
      },
      {
        "name": "pattern",
        "type": "string",
        "required": false,
        "description": "Substring matched against every registered console variable. Pass at least one of name, names and pattern"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Max rows for a pattern search (default 100, max 1000)"
      }
    ]
  },
  "get_dialog_policy": {
    "category": "editor",
    "params": []
  },
  "get_editor_performance_stats": {
    "category": "editor",
    "params": []
  },
  "get_frame_timing": {
    "category": "editor",
    "params": [
      {
        "name": "cpuGpuMarginPercent",
        "type": "number",
        "required": false,
        "description": "How far ahead one side must be before the frame is called bound by it (default 10)"
      }
    ]
  },
  "get_insights_trace_status": {
    "category": "editor",
    "params": []
  },
  "get_message_log": {
    "category": "editor",
    "params": [
      {
        "name": "logName",
        "type": "string",
        "required": false,
        "description": "Listing to read (MapCheck, AssetCheck, PIE, LoadErrors...); omit to list the registered ones"
      },
      {
        "name": "maxLines",
        "type": "integer",
        "required": false,
        "description": "Messages to return (default 200)"
      },
      {
        "name": "severity",
        "type": "string",
        "required": false,
        "description": "Severity-name substring: Error | Warning | PerformanceWarning | Info"
      }
    ]
  },
  "get_object_properties": {
    "category": "editor",
    "params": [
      {
        "name": "objectPath",
        "type": "string",
        "required": false,
        "description": "Object path of the live instance. Wins over target"
      },
      {
        "name": "target",
        "type": "string",
        "required": false,
        "description": "gameinstance | gamemode | gamestate | playercontroller | playerpawn | subsystem"
      },
      {
        "name": "subsystemClass",
        "type": "string",
        "required": false,
        "description": "Subsystem class name or /Script path, with target=subsystem"
      },
      {
        "name": "playerIndex",
        "type": "number",
        "required": false,
        "description": "Player index for target=playercontroller or playerpawn (default 0)"
      },
      {
        "name": "propertyNames",
        "type": "array",
        "required": false,
        "description": "Only these properties. The Details-panel spelling is accepted",
        "items": "string"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Max properties returned (default 200)"
      },
      {
        "name": "maxValueLength",
        "type": "number",
        "required": false,
        "description": "Truncate each exported value past this many characters (default 2000)"
      }
    ]
  },
  "get_open_asset_editors": {
    "category": "editor",
    "params": []
  },
  "get_output_log": {
    "category": "editor",
    "params": [
      {
        "name": "maxLines",
        "type": "integer",
        "required": false,
        "description": "How far back into the ring buffer to read (default 100)"
      },
      {
        "name": "filter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring the message must contain"
      },
      {
        "name": "category",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring the log category must contain"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Lines on this page (default 200, max 4096)"
      }
    ]
  },
  "get_pie_config": {
    "category": "editor",
    "params": []
  },
  "get_pie_pawn": {
    "category": "editor",
    "params": [
      {
        "name": "playerIndex",
        "type": "number",
        "required": false,
        "description": "0-based player index (default 0)"
      }
    ]
  },
  "get_property": {
    "category": "editor",
    "params": [
      {
        "name": "objectPath",
        "type": "string",
        "required": true,
        "description": "Object, asset, class or Blueprint path. A class or Blueprint resolves to its default object",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property name; dotted and indexed paths reach component and struct fields"
      }
    ]
  },
  "get_runtime_value": {
    "category": "editor",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property name; dotted and indexed paths reach component and struct fields"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      }
    ]
  },
  "get_runtime_values": {
    "category": "editor",
    "params": [
      {
        "name": "classFilter",
        "type": "string",
        "required": false,
        "description": "Actor or component class name substring; omit to match every actor"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "Root every path at the component with this instance name"
      },
      {
        "name": "paths",
        "type": "array",
        "required": true,
        "description": "Dotted property or function paths to evaluate per match. A function segment may carry literal arguments, e.g. GetBalance(gold, 2)",
        "items": "string"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      }
    ]
  },
  "get_sequence_info": {
    "category": "editor",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Level Sequence asset path",
        "aliases": [
          "path"
        ]
      },
      {
        "name": "includeSectionDetails",
        "type": "boolean",
        "required": false,
        "description": "Include attach sockets and first-key transform values per track"
      }
    ]
  },
  "get_standalone_status": {
    "category": "editor",
    "params": []
  },
  "get_transaction_history": {
    "category": "editor",
    "params": [
      {
        "name": "maxEntries",
        "type": "number",
        "required": false,
        "description": "Cap on entries returned (default 50)"
      }
    ]
  },
  "get_undo_state": {
    "category": "editor",
    "params": []
  },
  "get_viewport_info": {
    "category": "editor",
    "params": []
  },
  "get_viewport_state": {
    "category": "editor",
    "params": [
      {
        "name": "viewportIndex",
        "type": "number",
        "required": false,
        "description": "Level viewport to act on (default the active one)"
      }
    ]
  },
  "get_world_state": {
    "category": "editor",
    "params": []
  },
  "hit_test_viewport_pixel": {
    "category": "editor",
    "params": [
      {
        "name": "x",
        "type": "number",
        "required": true,
        "description": "Viewport pixel X"
      },
      {
        "name": "y",
        "type": "number",
        "required": true,
        "description": "Viewport pixel Y"
      },
      {
        "name": "width",
        "type": "number",
        "required": false,
        "description": "Viewport width to read x against, when picking from a screenshot of another resolution"
      },
      {
        "name": "height",
        "type": "number",
        "required": false,
        "description": "Viewport height to read y against, when picking from a screenshot of another resolution"
      },
      {
        "name": "maxDistance",
        "type": "number",
        "required": false,
        "description": "Max ray length in cm (default 200000)"
      },
      {
        "name": "ignoreActors",
        "type": "array",
        "required": false,
        "description": "Actor labels to skip",
        "items": "string"
      }
    ]
  },
  "list_crashes": {
    "category": "editor",
    "params": [
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Crash folders on this page (default 50, max 500)"
      }
    ]
  },
  "list_dialogs": {
    "category": "editor",
    "params": []
  },
  "list_dirty_packages": {
    "category": "editor",
    "params": []
  },
  "list_function_libraries": {
    "category": "editor",
    "params": [
      {
        "name": "pattern",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring of the library class name"
      },
      {
        "name": "includeFunctions",
        "type": "boolean",
        "required": false,
        "description": "Include each library's static BlueprintCallable functions (default true)"
      }
    ]
  },
  "list_pie_instances": {
    "category": "editor",
    "params": []
  },
  "list_trace_channels": {
    "category": "editor",
    "params": [
      {
        "name": "filter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring over channel name and description"
      },
      {
        "name": "enabledOnly",
        "type": "boolean",
        "required": false,
        "description": "Only channels that are currently on (default false)"
      }
    ]
  },
  "open_asset": {
    "category": "editor",
    "params": [
      {
        "name": "assetPath",
        "type": "string",
        "required": true,
        "description": "Asset to open in its editor",
        "aliases": [
          "path"
        ]
      }
    ]
  },
  "read_bone_transforms": {
    "category": "editor",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      },
      {
        "name": "componentName",
        "type": "string",
        "required": false,
        "description": "SkeletalMeshComponent to read; omit for the first one"
      },
      {
        "name": "bones",
        "type": "array",
        "required": false,
        "description": "Bone or socket names; omit for every bone up to limit",
        "items": "string"
      },
      {
        "name": "relativeTo",
        "type": "string",
        "required": false,
        "description": "Bone or socket whose live frame every sample is expressed in; supersedes space"
      },
      {
        "name": "space",
        "type": "string",
        "required": false,
        "description": "world (default) | component"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Max bones when bones is omitted (default 200)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      }
    ]
  },
  "redraw_viewport": {
    "category": "editor",
    "params": [
      {
        "name": "allViewports",
        "type": "boolean",
        "required": false,
        "description": "Redraw every level viewport rather than one (default false)"
      },
      {
        "name": "invalidateHitProxies",
        "type": "boolean",
        "required": false,
        "description": "Also invalidate hit proxies, needed before a hit test (default true)"
      },
      {
        "name": "viewportIndex",
        "type": "number",
        "required": false,
        "description": "Level viewport to act on (default the active one)"
      }
    ]
  },
  "restore_runtime_visibility": {
    "category": "editor",
    "params": [
      {
        "name": "rollbackToken",
        "type": "string",
        "required": true,
        "description": "Token from a non-dry-run set_runtime_visibility, valid for that PIE session only"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      }
    ]
  },
  "scrub_sequence": {
    "category": "editor",
    "params": [
      {
        "name": "sequencePath",
        "type": "string",
        "required": false,
        "description": "Level Sequence to open and scrub; omit to scrub the one already open",
        "aliases": [
          "assetPath",
          "path"
        ]
      },
      {
        "name": "seconds",
        "type": "number",
        "required": false,
        "description": "Playhead position in seconds. Pass exactly one of seconds and frame"
      },
      {
        "name": "frame",
        "type": "number",
        "required": false,
        "description": "Playhead position as a frame number, read in timeUnit"
      },
      {
        "name": "timeUnit",
        "type": "string",
        "required": false,
        "description": "How to read frame: display (default, the frame numbers Sequencer shows) | tick (the units get_sequence_info's playbackRange reports)"
      }
    ]
  },
  "search_log": {
    "category": "editor",
    "params": [
      {
        "name": "query",
        "type": "string",
        "required": true,
        "description": "Case-insensitive substring to search the captured log for"
      },
      {
        "name": "maxResults",
        "type": "integer",
        "required": false,
        "description": "Cap on matching lines collected out of the 4096-line ring buffer (default 4096)"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: pass back the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Matches on this page (default 100, max 4096)"
      }
    ]
  },
  "set_movement_mode": {
    "category": "editor",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      },
      {
        "name": "mode",
        "type": "string",
        "required": false,
        "description": "none | walking | navwalking | falling | swimming | flying | custom"
      },
      {
        "name": "customMode",
        "type": "integer",
        "required": false,
        "description": "0-255, only with mode=custom"
      },
      {
        "name": "velocity",
        "type": "vec3",
        "required": false,
        "description": "Velocity written to the CharacterMovementComponent"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      }
    ]
  },
  "set_object_property": {
    "category": "editor",
    "params": [
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property name; dotted and indexed paths reach component and struct fields"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "New value as structured JSON, the form get_property returns under value"
      },
      {
        "name": "objectPath",
        "type": "string",
        "required": false,
        "description": "Object path of the live instance. Wins over target"
      },
      {
        "name": "target",
        "type": "string",
        "required": false,
        "description": "gameinstance | gamemode | gamestate | playercontroller | playerpawn | subsystem"
      },
      {
        "name": "subsystemClass",
        "type": "string",
        "required": false,
        "description": "Subsystem class name or /Script path, with target=subsystem"
      },
      {
        "name": "playerIndex",
        "type": "number",
        "required": false,
        "description": "Player index for target=playercontroller or playerpawn (default 0)"
      },
      {
        "name": "postEditChange",
        "type": "boolean",
        "required": false,
        "description": "Fire PostEditChangeProperty after the write (default false)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      }
    ]
  },
  "set_pie_time_scale": {
    "category": "editor",
    "params": [
      {
        "name": "factor",
        "type": "number",
        "required": true,
        "description": "Time-scale factor, greater than 0 (e.g. 500)"
      }
    ]
  },
  "set_property": {
    "category": "editor",
    "params": [
      {
        "name": "objectPath",
        "type": "string",
        "required": true,
        "description": "Object, asset, class or Blueprint path. A class or Blueprint resolves to its default object",
        "aliases": [
          "path",
          "assetPath"
        ]
      },
      {
        "name": "propertyName",
        "type": "string",
        "required": true,
        "description": "Property name; dotted and indexed paths reach component and struct fields"
      },
      {
        "name": "value",
        "type": "any",
        "required": true,
        "description": "New value as structured JSON, the form get_property returns under value"
      },
      {
        "name": "save",
        "type": "boolean",
        "required": false,
        "description": "Save the package to disk after the write (default true; false leaves it dirty)"
      }
    ]
  },
  "set_scalability": {
    "category": "editor",
    "params": [
      {
        "name": "level",
        "type": "string",
        "required": false,
        "description": "Low | Medium | High | Epic | Cinematic (default Epic)"
      }
    ]
  },
  "set_sequence_keyframes": {
    "category": "editor",
    "params": [
      {
        "name": "sequencePath",
        "type": "string",
        "required": true,
        "description": "Level Sequence asset path",
        "aliases": [
          "assetPath",
          "path"
        ]
      },
      {
        "name": "trackType",
        "type": "string",
        "required": true,
        "description": "Transform | Float | SkeletalAnimation | CameraCut | Audio | Event | Fade"
      },
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      },
      {
        "name": "sectionIndex",
        "type": "integer",
        "required": false,
        "description": "Target section index (default 0)"
      },
      {
        "name": "channel",
        "type": "string",
        "required": true,
        "description": "Location.X/Y/Z or Rotation.X/Y/Z (also x/y/z, yaw/pitch/roll) on a Transform track; the float channel on Fade or Float"
      },
      {
        "name": "keyframes",
        "type": "array",
        "required": true,
        "description": "Keys to add, as [{seconds, value}]",
        "items": "object"
      },
      {
        "name": "interpolation",
        "type": "string",
        "required": false,
        "description": "cubic (default) | linear"
      }
    ]
  },
  "set_sequence_playback_range": {
    "category": "editor",
    "params": [
      {
        "name": "sequencePath",
        "type": "string",
        "required": true,
        "description": "Level Sequence asset path",
        "aliases": [
          "assetPath",
          "path"
        ]
      },
      {
        "name": "startSeconds",
        "type": "number",
        "required": true,
        "description": "Range start in seconds"
      },
      {
        "name": "endSeconds",
        "type": "number",
        "required": true,
        "description": "Range end in seconds"
      }
    ]
  },
  "set_view_mode": {
    "category": "editor",
    "params": [
      {
        "name": "viewMode",
        "type": "string",
        "required": true,
        "description": "Lit | Unlit | Wireframe | LightingOnly | DetailLighting | ShaderComplexity | ... get_viewport_state lists what this build supports"
      },
      {
        "name": "viewportIndex",
        "type": "number",
        "required": false,
        "description": "Level viewport to act on (default the active one)"
      }
    ]
  },
  "set_viewport_camera": {
    "category": "editor",
    "params": [
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "Camera location"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "Camera rotation"
      },
      {
        "name": "projection",
        "type": "string",
        "required": false,
        "description": "perspective | top | bottom | left | right | front | back | orthoFreelook. Switched before the pose is applied"
      },
      {
        "name": "viewportType",
        "type": "string",
        "required": false,
        "description": "Perspective | Top | Bottom | Left | Right | Front | Back | OrthoFreelook"
      },
      {
        "name": "orthoZoom",
        "type": "number",
        "required": false,
        "description": "Orthographic zoom, within the engine's own limits"
      }
    ]
  },
  "set_viewport_exposure": {
    "category": "editor",
    "params": [
      {
        "name": "ev100",
        "type": "number",
        "required": false,
        "description": "Fixed EV100 to pin the viewport to; implies fixed exposure"
      },
      {
        "name": "fixed",
        "type": "boolean",
        "required": false,
        "description": "Use a fixed exposure rather than eye adaptation"
      },
      {
        "name": "mode",
        "type": "string",
        "required": false,
        "description": "fixed | auto"
      },
      {
        "name": "viewportIndex",
        "type": "number",
        "required": false,
        "description": "Level viewport to act on (default the active one)"
      }
    ]
  },
  "set_viewport_view": {
    "category": "editor",
    "params": [
      {
        "name": "fov",
        "type": "number",
        "required": false,
        "description": "Field of view in degrees, greater than 0 and less than 180"
      },
      {
        "name": "nearClip",
        "type": "number",
        "required": false,
        "description": "Near clip plane; negative clears the override"
      },
      {
        "name": "farClip",
        "type": "number",
        "required": false,
        "description": "Far clip plane override"
      },
      {
        "name": "viewportType",
        "type": "string",
        "required": false,
        "description": "Perspective | Top | Bottom | Left | Right | Front | Back | OrthoFreelook"
      },
      {
        "name": "cameraSpeed",
        "type": "number",
        "required": false,
        "description": "Viewport camera speed, greater than 0"
      },
      {
        "name": "viewportIndex",
        "type": "number",
        "required": false,
        "description": "Level viewport to act on (default the active one)"
      }
    ]
  },
  "teleport_runtime_actor": {
    "category": "editor",
    "params": [
      {
        "name": "actorLabel",
        "type": "string",
        "required": false,
        "description": "Actor label. Editor labels are not unique, so a label naming several actors is refused"
      },
      {
        "name": "actorPath",
        "type": "string",
        "required": false,
        "description": "Full actor object path, the unambiguous selector. Wins over actorLabel"
      },
      {
        "name": "location",
        "type": "vec3",
        "required": false,
        "description": "Destination; omit to keep the current location"
      },
      {
        "name": "rotation",
        "type": "rotator",
        "required": false,
        "description": "Destination rotation; omit to keep the current one"
      },
      {
        "name": "stopMovement",
        "type": "boolean",
        "required": false,
        "description": "Stop the movement component so the move is not undone (default true)"
      },
      {
        "name": "sweep",
        "type": "boolean",
        "required": false,
        "description": "Collide on the way (default false)"
      },
      {
        "name": "world",
        "type": "string",
        "required": false,
        "description": "World scope: editor | pie | auto. Each action names its own default"
      },
      {
        "name": "pieInstance",
        "type": "number",
        "required": false,
        "description": "PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"
      }
    ]
  },
  "undo_redo_steps": {
    "category": "editor",
    "params": [
      {
        "name": "steps",
        "type": "integer",
        "required": false,
        "description": "How many steps to apply (default 1)"
      },
      {
        "name": "direction",
        "type": "string",
        "required": false,
        "description": "undo (default) | redo"
      }
    ]
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  add_sequence_section: "Params: sequencePath (or assetPath, or path), trackType, actorLabel?, actorPath?, startSeconds?, endSeconds?, cameraActorLabel?, cameraActorPath?",
  add_sequence_track: "Params: assetPath (or path), trackType, actorLabel?, actorPath?",
  check_for_crashes: "Params: none",
  clear_dialog_policy: "Params: pattern?",
  describe_object: "Params: objectPath (or path, or assetPath), includeProperties?, includeValues?, propertyNames?",
  end_profile_region: "Params: regionName",
  focus_viewport_on_actor: "Params: actorLabel?, actorPath?",
  get_build_status: "Params: none",
  get_crash_info: "Params: crashFolder",
  get_cvars: "Params: name?, names?, pattern?, limit?",
  get_dialog_policy: "Params: none",
  get_editor_performance_stats: "Params: none",
  get_frame_timing: "Params: cpuGpuMarginPercent?",
  get_insights_trace_status: "Params: none",
  get_message_log: "Params: logName?, maxLines?, severity?",
  get_object_properties: "Params: objectPath?, target?, subsystemClass?, playerIndex?, propertyNames?, world?, pieInstance?, limit?, maxValueLength?",
  get_open_asset_editors: "Params: none",
  get_output_log: "Params: maxLines?, filter?, category?, cursor?, limit?",
  get_pie_config: "Params: none",
  get_pie_pawn: "Params: playerIndex?",
  get_property: "Params: objectPath (or path, or assetPath), propertyName",
  get_runtime_value: "Params: actorLabel?, actorPath?, propertyName, world?, pieInstance?",
  get_runtime_values: "Params: classFilter?, componentName?, paths, world?, pieInstance?",
  get_sequence_info: "Params: assetPath (or path), includeSectionDetails?",
  get_standalone_status: "Params: none",
  get_transaction_history: "Params: maxEntries?",
  get_undo_state: "Params: none",
  get_viewport_info: "Params: none",
  get_viewport_state: "Params: viewportIndex?",
  get_world_state: "Params: none",
  hit_test_viewport_pixel: "Params: x, y, width?, height?, maxDistance?, ignoreActors?",
  list_crashes: "Params: cursor?, limit?",
  list_dialogs: "Params: none",
  list_dirty_packages: "Params: none",
  list_function_libraries: "Params: pattern?, includeFunctions?",
  list_pie_instances: "Params: none",
  list_trace_channels: "Params: filter?, enabledOnly?",
  open_asset: "Params: assetPath (or path)",
  read_bone_transforms: "Params: actorLabel?, actorPath?, componentName?, bones?, relativeTo?, space?, limit?, world?, pieInstance?",
  redraw_viewport: "Params: allViewports?, invalidateHitProxies?, viewportIndex?",
  restore_runtime_visibility: "Params: rollbackToken, world?, pieInstance?",
  scrub_sequence: "Params: sequencePath? (or assetPath, or path), seconds?, frame?, timeUnit?",
  search_log: "Params: query, maxResults?, cursor?, limit?",
  set_movement_mode: "Params: actorLabel?, actorPath?, mode?, customMode?, velocity?, world?, pieInstance?",
  set_object_property: "Params: propertyName, value, objectPath?, target?, subsystemClass?, playerIndex?, postEditChange?, world?, pieInstance?",
  set_pie_time_scale: "Params: factor",
  set_property: "Params: objectPath (or path, or assetPath), propertyName, value, save?",
  set_scalability: "Params: level?",
  set_sequence_keyframes: "Params: sequencePath (or assetPath, or path), trackType, actorLabel?, actorPath?, sectionIndex?, channel, keyframes, interpolation?",
  set_sequence_playback_range: "Params: sequencePath (or assetPath, or path), startSeconds, endSeconds",
  set_view_mode: "Params: viewMode, viewportIndex?",
  set_viewport_camera: "Params: location?, rotation?, projection?, viewportType?, orthoZoom?",
  set_viewport_exposure: "Params: ev100?, fixed?, mode?, viewportIndex?",
  set_viewport_view: "Params: fov?, nearClip?, farClip?, viewportType?, cameraSpeed?, viewportIndex?",
  teleport_runtime_actor: "Params: actorLabel?, actorPath?, location?, rotation?, stopMovement?, sweep?, world?, pieInstance?",
  undo_redo_steps: "Params: steps?, direction?",
};

/** Every key the spec'd editor handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  actorLabel: z.string().optional().describe("Actor label. Editor labels are not unique, so a label naming several actors is refused"),
  actorPath: z.string().optional().describe("Full actor object path, the unambiguous selector. Wins over actorLabel"),
  allViewports: z.boolean().optional().describe("Redraw every level viewport rather than one (default false)"),
  assetPath: z.string().optional().describe("Alias for sequencePath (add_sequence_section, scrub_sequence, set_sequence_keyframes, set_sequence_playback_range). Level Sequence asset path (add_sequence_track, get_sequence_info). Alias for objectPath (describe_object, get_property, set_property). Asset to open in its editor (open_asset)"),
  bones: z.array(z.string()).optional().describe("Bone or socket names; omit for every bone up to limit"),
  cameraActorLabel: z.string().optional().describe("Camera actor to bind a CameraCut section to"),
  cameraActorPath: z.string().optional().describe("Full object path of the camera actor. Wins over cameraActorLabel"),
  cameraSpeed: z.number().optional().describe("Viewport camera speed, greater than 0"),
  category: z.string().optional().describe("Case-insensitive substring the log category must contain"),
  channel: z.string().optional().describe("Location.X/Y/Z or Rotation.X/Y/Z (also x/y/z, yaw/pitch/roll) on a Transform track; the float channel on Fade or Float"),
  classFilter: z.string().optional().describe("Actor or component class name substring; omit to match every actor"),
  componentName: z.string().optional().describe("Root every path at the component with this instance name (get_runtime_values). SkeletalMeshComponent to read; omit for the first one (read_bone_transforms)"),
  cpuGpuMarginPercent: z.number().optional().describe("How far ahead one side must be before the frame is called bound by it (default 10)"),
  crashFolder: z.string().optional().describe("Crash folder name, as list_crashes reports it"),
  cursor: z.string().optional().describe("Resume a paged read: pass back the nextCursor from the previous page, unmodified"),
  customMode: z.number().int().optional().describe("0-255, only with mode=custom"),
  direction: z.string().optional().describe("undo (default) | redo"),
  enabledOnly: z.boolean().optional().describe("Only channels that are currently on (default false)"),
  endSeconds: z.number().optional().describe("Section end in seconds (default one second after the start) (add_sequence_section). Range end in seconds (set_sequence_playback_range)"),
  ev100: z.number().optional().describe("Fixed EV100 to pin the viewport to; implies fixed exposure"),
  factor: z.number().optional().describe("Time-scale factor, greater than 0 (e.g. 500)"),
  farClip: z.number().optional().describe("Far clip plane override"),
  filter: z.string().optional().describe("Case-insensitive substring the message must contain (get_output_log). Case-insensitive substring over channel name and description (list_trace_channels)"),
  fixed: z.boolean().optional().describe("Use a fixed exposure rather than eye adaptation"),
  fov: z.number().optional().describe("Field of view in degrees, greater than 0 and less than 180"),
  frame: z.number().optional().describe("Playhead position as a frame number, read in timeUnit"),
  height: z.number().optional().describe("Viewport height to read y against, when picking from a screenshot of another resolution"),
  ignoreActors: z.array(z.string()).optional().describe("Actor labels to skip"),
  includeFunctions: z.boolean().optional().describe("Include each library's static BlueprintCallable functions (default true)"),
  includeProperties: z.boolean().optional().describe("Include reflected property metadata (default true)"),
  includeSectionDetails: z.boolean().optional().describe("Include attach sockets and first-key transform values per track"),
  includeValues: z.boolean().optional().describe("Include current property values (default false)"),
  interpolation: z.string().optional().describe("cubic (default) | linear"),
  invalidateHitProxies: z.boolean().optional().describe("Also invalidate hit proxies, needed before a hit test (default true)"),
  keyframes: z.array(z.record(z.unknown())).optional().describe("Keys to add, as [{seconds, value}]"),
  level: z.string().optional().describe("Low | Medium | High | Epic | Cinematic (default Epic)"),
  limit: z.number().optional().describe("Max rows for a pattern search (default 100, max 1000) (get_cvars). Max properties returned (default 200) (get_object_properties). Lines on this page (default 200, max 4096) (get_output_log). Crash folders on this page (default 50, max 500) (list_crashes). Max bones when bones is omitted (default 200) (read_bone_transforms). Matches on this page (default 100, max 4096) (search_log)"),
  location: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Camera location (set_viewport_camera). Destination; omit to keep the current location (teleport_runtime_actor)"),
  logName: z.string().optional().describe("Listing to read (MapCheck, AssetCheck, PIE, LoadErrors...); omit to list the registered ones"),
  maxDistance: z.number().optional().describe("Max ray length in cm (default 200000)"),
  maxEntries: z.number().optional().describe("Cap on entries returned (default 50)"),
  maxLines: z.number().int().optional().describe("Messages to return (default 200) (get_message_log). How far back into the ring buffer to read (default 100) (get_output_log)"),
  maxResults: z.number().int().optional().describe("Cap on matching lines collected out of the 4096-line ring buffer (default 4096)"),
  maxValueLength: z.number().optional().describe("Truncate each exported value past this many characters (default 2000)"),
  mode: z.string().optional().describe("none | walking | navwalking | falling | swimming | flying | custom (set_movement_mode). fixed | auto (set_viewport_exposure)"),
  name: z.string().optional().describe("Console variable to read"),
  names: z.array(z.string()).optional().describe("Console variables to read"),
  nearClip: z.number().optional().describe("Near clip plane; negative clears the override"),
  objectPath: z.string().optional().describe("Object, asset, class or Blueprint path. A class or Blueprint resolves to its default object (describe_object, get_property, set_property). Object path of the live instance. Wins over target (get_object_properties, set_object_property)"),
  orthoZoom: z.number().optional().describe("Orthographic zoom, within the engine's own limits"),
  path: z.string().optional().describe("Alias for sequencePath (add_sequence_section, scrub_sequence, set_sequence_keyframes, set_sequence_playback_range). Alias for assetPath (add_sequence_track, get_sequence_info, open_asset). Alias for objectPath (describe_object, get_property, set_property)"),
  paths: z.array(z.string()).optional().describe("Dotted property or function paths to evaluate per match. A function segment may carry literal arguments, e.g. GetBalance(gold, 2)"),
  pattern: z.string().optional().describe("Exact pattern of the policy to clear; omit to clear every policy (clear_dialog_policy). Substring matched against every registered console variable. Pass at least one of name, names and pattern (get_cvars). Case-insensitive substring of the library class name (list_function_libraries)"),
  pieInstance: z.number().optional().describe("PIE world to target: 0 = server/primary, 1..N = clients. See list_pie_instances"),
  playerIndex: z.number().optional().describe("Player index for target=playercontroller or playerpawn (default 0) (get_object_properties, set_object_property). 0-based player index (default 0) (get_pie_pawn)"),
  postEditChange: z.boolean().optional().describe("Fire PostEditChangeProperty after the write (default false)"),
  projection: z.string().optional().describe("perspective | top | bottom | left | right | front | back | orthoFreelook. Switched before the pose is applied"),
  propertyName: z.string().optional().describe("Property name; dotted and indexed paths reach component and struct fields"),
  propertyNames: z.array(z.string()).optional().describe("Dotted or indexed property paths to report instead of every property (describe_object). Only these properties. The Details-panel spelling is accepted (get_object_properties)"),
  query: z.string().optional().describe("Case-insensitive substring to search the captured log for"),
  regionName: z.string().optional().describe("Name the region was opened under"),
  relativeTo: z.string().optional().describe("Bone or socket whose live frame every sample is expressed in; supersedes space"),
  rollbackToken: z.string().optional().describe("Token from a non-dry-run set_runtime_visibility, valid for that PIE session only"),
  rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional().describe("Camera rotation (set_viewport_camera). Destination rotation; omit to keep the current one (teleport_runtime_actor)"),
  save: z.boolean().optional().describe("Save the package to disk after the write (default true; false leaves it dirty)"),
  seconds: z.number().optional().describe("Playhead position in seconds. Pass exactly one of seconds and frame"),
  sectionIndex: z.number().int().optional().describe("Target section index (default 0)"),
  sequencePath: z.string().optional().describe("Level Sequence asset path (add_sequence_section, set_sequence_keyframes, set_sequence_playback_range). Level Sequence to open and scrub; omit to scrub the one already open (scrub_sequence)"),
  severity: z.string().optional().describe("Severity-name substring: Error | Warning | PerformanceWarning | Info"),
  space: z.string().optional().describe("world (default) | component"),
  startSeconds: z.number().optional().describe("Section start in seconds (add_sequence_section). Range start in seconds (set_sequence_playback_range)"),
  steps: z.number().int().optional().describe("How many steps to apply (default 1)"),
  stopMovement: z.boolean().optional().describe("Stop the movement component so the move is not undone (default true)"),
  subsystemClass: z.string().optional().describe("Subsystem class name or /Script path, with target=subsystem"),
  sweep: z.boolean().optional().describe("Collide on the way (default false)"),
  target: z.string().optional().describe("gameinstance | gamemode | gamestate | playercontroller | playerpawn | subsystem"),
  timeUnit: z.string().optional().describe("How to read frame: display (default, the frame numbers Sequencer shows) | tick (the units get_sequence_info's playbackRange reports)"),
  trackType: z.string().optional().describe("Transform | Float | SkeletalAnimation | CameraCut | Audio | Event | Fade"),
  value: z.unknown().optional().describe("New value as structured JSON, the form get_property returns under value"),
  velocity: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional().describe("Velocity written to the CharacterMovementComponent"),
  viewMode: z.string().optional().describe("Lit | Unlit | Wireframe | LightingOnly | DetailLighting | ShaderComplexity | ... get_viewport_state lists what this build supports"),
  viewportIndex: z.number().optional().describe("Level viewport to act on (default the active one)"),
  viewportType: z.string().optional().describe("Perspective | Top | Bottom | Left | Right | Front | Back | OrthoFreelook"),
  width: z.number().optional().describe("Viewport width to read x against, when picking from a screenshot of another resolution"),
  world: z.string().optional().describe("World scope: editor | pie | auto. Each action names its own default"),
  x: z.number().optional().describe("Viewport pixel X"),
  y: z.number().optional().describe("Viewport pixel Y"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses);
