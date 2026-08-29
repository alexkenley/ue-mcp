/**
 * What happens to a call's parameters on the way in, and to its result on the
 * way out, regardless of which route dispatched it.
 *
 * There is more than one route. An MCP tool call goes through `index.ts` into
 * the flow registry, which runs the per-action task classes in
 * `flow/task-factory.ts`; a flow step goes through the same task classes from
 * the runner; and `categoryTool.handler` dispatches directly for the micro
 * gateway and for tests. Those routes reach the same handlers by different
 * paths, so a behaviour implemented in one of them is absent from the others.
 *
 * That is not hypothetical. The first cut of the path repair and the field
 * projection went into `categoryTool.handler` alone, every unit test passed
 * because unit tests call that handler, and none of it ran on a live MCP call.
 * A live test caught it. This module exists so the answer is written once and
 * the routes differ only in where they call it from.
 */
import { normalizePathParams, attachPathRepairs, type PathRepair } from "./path-params.js";
import {
  takeFieldSelection,
  projectResult,
  attachFieldReport,
  type FieldSelection,
} from "./field-select.js";

/** What the inbound half decided, carried to the outbound half. */
export interface CallPipeline {
  /** The parameters a handler or bridge method should actually receive. */
  params: Record<string, unknown>;
  repairs: PathRepair[];
  selection: FieldSelection;
}

/**
 * Fold the routing parameters out of a call and repair its paths.
 *
 * `select` and `omit` are consumed here, so they can never reach a bridge
 * method as arguments, and the backslash repair happens before anything else
 * reads a path.
 */
export function prepareCall(rawParams: Record<string, unknown>): CallPipeline {
  const { selection, rest } = takeFieldSelection(rawParams);
  const { params, repairs } = normalizePathParams(rest);
  return { params, repairs, selection };
}

/**
 * Apply the caller's projection, then attach the reports.
 *
 * Order matters: the reports are attached AFTER the projection, so a narrow
 * `select` cannot filter away the account of what the server repaired or of a
 * path that matched nothing.
 */
export function finishCall(raw: unknown, pipeline: CallPipeline): unknown {
  const projection = projectResult(raw, pipeline.selection);
  return attachPathRepairs(attachFieldReport(projection.result, projection), pipeline.repairs);
}

/**
 * True when this call asked for nothing the pipeline does.
 *
 * The task classes return a `TaskResult` whose `data` must stay the same
 * object when nothing was requested, so an untouched call is byte-identical to
 * what it was before any of this existed.
 */
export function isPipelineNoop(pipeline: CallPipeline): boolean {
  return (
    pipeline.repairs.length === 0
    && pipeline.selection.select === undefined
    && pipeline.selection.omit === undefined
  );
}
