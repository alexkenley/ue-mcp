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
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  list_available_plugins: "Params: filter?, pluginCategory?, enabledOnly?, cursor?, limit?",
  list_project_modules: "Params: cursor?, limit?",
  live_coding_status: "Params: none",
};

/** Every key the spec'd project handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {
  cursor: z.string().optional().describe("Resume a paged read: the nextCursor from the previous page, unmodified"),
  enabledOnly: z.boolean().optional().describe("Only plugins enabled in this editor session (default false)"),
  filter: z.string().optional().describe("Case-insensitive substring of the plugin name or friendly name"),
  limit: z.number().optional().describe("Rows per page, a whole number (default 200, max 2000)"),
  pluginCategory: z.string().optional().describe("Case-insensitive substring of the plugin category"),
};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses, handlerSpecs);
