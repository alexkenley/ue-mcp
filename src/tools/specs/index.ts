// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import type { HandlerSpecs } from "../../handler-spec.js";
import { handlerSpecs as animation } from "./animation.generated.js";
import { handlerSpecs as material } from "./material.generated.js";
import { handlerSpecs as niagara } from "./niagara.generated.js";
import { handlerSpecs as pcg } from "./pcg.generated.js";
import { handlerSpecs as widget } from "./widget.generated.js";

/** Every recorded handler spec, across categories. */
export const RECORDED_HANDLER_SPECS: HandlerSpecs = {
  ...animation,
  ...material,
  ...niagara,
  ...pcg,
  ...widget,
};
