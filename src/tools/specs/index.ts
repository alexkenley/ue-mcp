// GENERATED FILE - do not edit.
//
// Written by scripts/generate-handler-specs.mjs from tests/golden/handler-specs.json,
// which is recorded from the parameter specs the C++ handlers register with
// (npm run specs:record). To change a parameter, change its RegisterHandler
// spec, re-record, and regenerate (#1057).
import type { HandlerSpecs } from "../../handler-spec.js";
import { handlerSpecs as animation } from "./animation.generated.js";
import { handlerSpecs as asset } from "./asset.generated.js";
import { handlerSpecs as audio } from "./audio.generated.js";
import { handlerSpecs as blueprint } from "./blueprint.generated.js";
import { handlerSpecs as chooser } from "./chooser.generated.js";
import { handlerSpecs as demo } from "./demo.generated.js";
import { handlerSpecs as editor } from "./editor.generated.js";
import { handlerSpecs as fab } from "./fab.generated.js";
import { handlerSpecs as foliage } from "./foliage.generated.js";
import { handlerSpecs as gameplay } from "./gameplay.generated.js";
import { handlerSpecs as gas } from "./gas.generated.js";
import { handlerSpecs as landscape } from "./landscape.generated.js";
import { handlerSpecs as level } from "./level.generated.js";
import { handlerSpecs as material } from "./material.generated.js";
import { handlerSpecs as networking } from "./networking.generated.js";
import { handlerSpecs as niagara } from "./niagara.generated.js";
import { handlerSpecs as pcg } from "./pcg.generated.js";
import { handlerSpecs as physics } from "./physics.generated.js";
import { handlerSpecs as project } from "./project.generated.js";
import { handlerSpecs as reflection } from "./reflection.generated.js";
import { handlerSpecs as statetree } from "./statetree.generated.js";
import { handlerSpecs as widget } from "./widget.generated.js";

/** Every recorded handler spec, across categories. */
export const RECORDED_HANDLER_SPECS: HandlerSpecs = {
  ...animation,
  ...asset,
  ...audio,
  ...blueprint,
  ...chooser,
  ...demo,
  ...editor,
  ...fab,
  ...foliage,
  ...gameplay,
  ...gas,
  ...landscape,
  ...level,
  ...material,
  ...networking,
  ...niagara,
  ...pcg,
  ...physics,
  ...project,
  ...reflection,
  ...statetree,
  ...widget,
};
