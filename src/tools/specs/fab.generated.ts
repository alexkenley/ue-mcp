// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import { z } from "zod";
import { makeSpecBp, type HandlerSpecs } from "../../handler-spec.js";

/** The recorded contract of every spec'd fab handler. */
export const handlerSpecs: HandlerSpecs = {
  "fab_cache_info": {
    "category": "fab",
    "params": []
  },
  "fab_list_cached": {
    "category": "fab",
    "params": []
  },
  "fab_status": {
    "category": "fab",
    "params": []
  }
};

/** The Params: clause of each spec'd bridge method. */
export const paramsClauses: Readonly<Record<string, string>> = {
  fab_cache_info: "Params: none",
  fab_list_cached: "Params: none",
  fab_status: "Params: none",
};

/** Every key the spec'd fab handlers declare, aliases included. */
export const schema: Record<string, z.ZodType> = {

};

/** Declare an action for a spec'd bridge method: effect, summary, method. */
export const specBp = makeSpecBp(paramsClauses);
