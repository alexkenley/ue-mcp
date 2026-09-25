// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd project handler. */
export const handlerSpecs: HandlerSpecs = {
  "generate_project_files": {
    "category": "project",
    "params": [],
    "contractExempt": "runs the project file generator"
  },
  "list_available_plugins": {
    "category": "project",
    "params": [
      {
        "name": "filter",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring of the plugin name or friendly name"
      },
      {
        "name": "pluginCategory",
        "type": "string",
        "required": false,
        "description": "Case-insensitive substring of the plugin category"
      },
      {
        "name": "enabledOnly",
        "type": "boolean",
        "required": false,
        "description": "Only plugins enabled in this editor session (default false)"
      },
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Rows per page, a whole number (default 200, max 2000)"
      }
    ]
  },
  "list_project_modules": {
    "category": "project",
    "params": [
      {
        "name": "cursor",
        "type": "string",
        "required": false,
        "description": "Resume a paged read: the nextCursor from the previous page, unmodified"
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Rows per page, a whole number (default 200, max 2000)"
      }
    ]
  },
  "live_coding_status": {
    "category": "project",
    "params": []
  },
  "set_config": {
    "category": "project",
    "params": [
      {
        "name": "configName",
        "type": "string",
        "required": false,
        "description": "Config to write: Engine, Game, Input... or a file name ending .ini (default DefaultEngine.ini)",
        "aliases": [
          "configFile"
        ]
      },
      {
        "name": "section",
        "type": "string",
        "required": true,
        "description": "INI section"
      },
      {
        "name": "key",
        "type": "string",
        "required": true,
        "description": "INI key"
      },
      {
        "name": "value",
        "type": "string",
        "required": true,
        "description": "INI value"
      }
    ],
    "contractExempt": "writes an INI file under the project's Config folder"
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  generate_project_files: "Params: none",
  list_available_plugins: "Params: filter?, pluginCategory?, enabledOnly?, cursor?, limit?",
  list_project_modules: "Params: cursor?, limit?",
  live_coding_status: "Params: none",
  set_config: "Params: configName? (or configFile), section, key, value",
};

/** Every key the spec'd project handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  configFile: z.string().optional().describe("Alias for configName"),
  configName: z.string().optional().describe("Config to write: Engine, Game, Input... or a file name ending .ini (default DefaultEngine.ini)"),
  cursor: z.string().optional().describe("Resume a paged read: the nextCursor from the previous page, unmodified"),
  enabledOnly: z.boolean().optional().describe("Only plugins enabled in this editor session (default false)"),
  filter: z.string().optional().describe("Case-insensitive substring of the plugin name or friendly name"),
  key: z.string().optional().describe("INI key"),
  limit: z.number().optional().describe("Rows per page, a whole number (default 200, max 2000)"),
  pluginCategory: z.string().optional().describe("Case-insensitive substring of the plugin category"),
  section: z.string().optional().describe("INI section"),
  value: z.string().optional().describe("INI value"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses, handlerSpecs);
