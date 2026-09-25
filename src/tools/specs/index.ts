// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import type { HandlerSpecs } from "../../handler-spec.js";
import { handlerSpecs as animation } from "./animation.generated.js";
import { handlerSpecs as foliage } from "./foliage.generated.js";
import { handlerSpecs as landscape } from "./landscape.generated.js";

/** Every recorded handler spec, across categories. */
export const RECORDED_HANDLER_SPECS: HandlerSpecs = {
  ...animation,
  ...foliage,
  ...landscape,
};
