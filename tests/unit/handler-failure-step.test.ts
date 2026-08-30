/**
 * A handler that reports its own failure must fail the flow step it ran as,
 * and must not break the MCP category-tool call that reads the body itself.
 *
 * `Bridge.call` rejects on a transport fault and on a JSON-RPC `error`, and
 * resolves everything else - so `{ success: false, error: "..." }` came back
 * by the same route a successful answer did. Both task classes hardcoded
 * `success: true` onto the `TaskResult` they built from it, which made every
 * handler-reported failure a PASSING step: the runner walked on through the
 * plan, `on_failure` never fired, the git snapshot was never restored, and
 * `rollback_on_failure` only ever reacted to a transport fault. A destructive
 * action that emptied an asset and said so ran a flow to completion reporting
 * success.
 *
 * The two routes want opposite things from that verdict, so they are told
 * apart rather than forced onto one behaviour (see `flow/handler-outcome.ts`):
 *
 *   - a flow step FAILS, because the runner is the thing that has to stop;
 *   - a category-tool call does NOT, because `index.ts` renders a failed
 *     `TaskResult` as `Error [TASK_FAILED]: <message>` and never serializes
 *     `result.data`, so failing there would delete the response body - error
 *     detail, per-item verdicts, rollback descriptor - from every handler that
 *     reports its own failure.
 *
 * The rollback descriptor is attached on both routes and on both verdicts. A
 * previous change in this area silently dropped every handler-emitted rollback
 * from ~90 actions; these tests exist so that cannot happen again quietly.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { FlowConfigSchema, type FlowConfig } from "../../src/flow/schema.js";
import { buildFlowRegistry } from "../../src/flow/registry.js";
import { createFlowTool } from "../../src/flow/flow-tool.js";
import { categoryTool, type ToolContext, type ToolDef } from "../../src/types.js";
import { ProjectContext } from "../../src/project.js";
import type { IBridge } from "../../src/bridge.js";
import type { FlowContext } from "../../src/flow/context.js";

/** Every call the fake editor was asked to make, plus the canned answers. */
interface FakeBridge extends IBridge {
  calls: Array<{ method: string; params: Record<string, unknown> }>;
}

function fakeBridge(answers: Record<string, unknown>): FakeBridge {
  const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  return {
    isConnected: true,
    connect: async () => {},
    retargetProject: () => ({ projectPath: null, port: 0, portSource: "default" as const, verified: true }),
    getTarget: () => ({ projectPath: null, port: 0, portSource: "default" as const, verified: true }),
    call: async (method: string, params?: Record<string, unknown>) => {
      calls.push({ method, params: params ?? {} });
      if (!(method in answers)) throw new Error(`fake bridge has no answer for '${method}'`);
      return answers[method];
    },
    calls,
  };
}

/**
 * A category whose actions are bridge-delegating, plus one direct handler, so
 * both task classes in `flow/task-factory.ts` are exercised by the same suite.
 */
function probeTool(handlerAnswer: () => Promise<unknown>): ToolDef {
  return categoryTool(
    "probe",
    "Test-only category standing in for a bridge-backed one.",
    {
      wipe: { description: "A destructive bridge action.", bridge: "wipe_the_thing" },
      touch: { description: "A benign bridge action.", bridge: "touch_the_thing" },
      list: { description: "A read that answers without a success key.", bridge: "list_the_things" },
      refuse: { description: "A direct handler that refuses by returning.", handler: handlerAnswer },
    },
    undefined,
    { note: z.string().optional() } as Record<string, z.ZodType>,
  );
}

function toolContext(bridge: IBridge): ToolContext {
  return { bridge, project: new ProjectContext() };
}

/**
 * The context `index.ts` hands a direct category-tool call: assembled by hand,
 * with none of the fields a `FlowRunner` wires onto a task. That absence is
 * the discriminator, so building it the way the server does is the point.
 */
function categoryToolContext(bridge: IBridge): FlowContext {
  return { bridge, project: new ProjectContext() };
}

/** Run one action exactly the way `index.ts` does: create, then `.run()`. */
async function callAsCategoryTool(
  tool: ToolDef,
  action: string,
  bridge: IBridge,
  params: Record<string, unknown> = {},
) {
  const registry = buildFlowRegistry([tool]);
  const task = await registry.create(`probe.${action}`, categoryToolContext(bridge), params);
  return task.run();
}

function flowConfig(flows: Record<string, unknown>, tasks?: Record<string, unknown>): FlowConfig {
  return FlowConfigSchema.parse({ "ue-mcp": { version: 1 }, flows, ...(tasks ? { tasks } : {}) });
}

interface RunResponse {
  success: boolean;
  summary: string;
  failedStep?: string;
  steps: Array<{
    name: string;
    success: boolean;
    ignoredFailure?: boolean;
    error?: { message: string };
    data?: Record<string, unknown>;
    unappliedRollback?: {
      record: { taskName: string; payload: Record<string, unknown> };
      step: string;
      replayed: boolean;
      note: string;
    };
  }>;
  rollback?: { attempted: number; succeeded: number; errors: unknown[] };
}

async function runFlow(
  tool: ToolDef,
  bridge: IBridge,
  flows: Record<string, unknown>,
  flowName: string,
  params: Record<string, unknown> = {},
): Promise<RunResponse> {
  const flowTool = createFlowTool(buildFlowRegistry([tool]), () => flowConfig(flows));
  const body = await flowTool.handler(toolContext(bridge), {
    action: "run",
    flowName,
    ...params,
  });
  return body as unknown as RunResponse;
}

const REFUSED = async () => ({ success: false, message: "the editor is not running" });
const ACCEPTED = async () => ({ success: true, stopped: true });

describe("a handler that reports its own failure", () => {
  it("fails the flow step, and says what the handler said", async () => {
    const bridge = fakeBridge({
      wipe_the_thing: { success: false, error: "the table was emptied and the import failed" },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      destructive: { description: "one destructive step", steps: { "1": { task: "probe.wipe" } } },
    }, "destructive");

    expect(body.success).toBe(false);
    expect(body.failedStep).toBe("probe.wipe");
    expect(body.steps[0].success).toBe(false);
    expect(body.steps[0].error?.message).toBe("the table was emptied and the import failed");
  });

  it("stops the flow there, instead of running the rest of the plan", async () => {
    const bridge = fakeBridge({
      wipe_the_thing: { success: false, error: "boom" },
      touch_the_thing: { success: true },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      two_steps: {
        description: "a failure followed by more work",
        steps: { "1": { task: "probe.wipe" }, "2": { task: "probe.touch" } },
      },
    }, "two_steps");

    expect(body.success).toBe(false);
    expect(body.steps).toHaveLength(1);
    expect(bridge.calls.map((c) => c.method)).toEqual(["wipe_the_thing"]);
  });

  it("keeps the handler's whole body on the failed step, not just the message", async () => {
    const bridge = fakeBridge({
      wipe_the_thing: {
        success: false,
        error: "import reported problems",
        rowsBefore: 42,
        rowsAfter: 0,
        rollback: { method: "restore_curvetable", payload: { assetPath: "/Game/T", rows: [1, 2] } },
      },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      destructive: { description: "one destructive step", steps: { "1": { task: "probe.wipe" } } },
    }, "destructive");

    expect(body.steps[0].success).toBe(false);
    expect(body.steps[0].data).toMatchObject({
      success: false,
      rowsBefore: 42,
      rowsAfter: 0,
      rollback: { method: "restore_curvetable" },
    });
  });

  it("arms rollback_on_failure, which a transport fault was previously the only way to trip", async () => {
    const bridge = fakeBridge({
      touch_the_thing: {
        success: true,
        rollback: { method: "untouch_the_thing", payload: { id: 7 } },
      },
      wipe_the_thing: { success: false, error: "boom" },
      untouch_the_thing: { success: true },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      guarded: {
        description: "a recorded mutation, then a handler-reported failure",
        rollback_on_failure: true,
        steps: { "1": { task: "probe.touch" }, "2": { task: "probe.wipe" } },
      },
    }, "guarded");

    expect(body.success).toBe(false);
    expect(body.rollback).toMatchObject({ attempted: 1, succeeded: 1 });
    const undo = bridge.calls.find((c) => c.method === "untouch_the_thing");
    expect(undo).toBeTruthy();
    expect(undo!.params).toMatchObject({ id: 7 });
  });

  it("reports a refused inverse as a failed rollback rather than a clean one", async () => {
    const bridge = fakeBridge({
      touch_the_thing: {
        success: true,
        rollback: { method: "untouch_the_thing", payload: { id: 7 } },
      },
      wipe_the_thing: { success: false, error: "boom" },
      untouch_the_thing: { success: false, error: "the inverse could not be applied" },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      guarded: {
        description: "the undo itself refuses",
        rollback_on_failure: true,
        steps: { "1": { task: "probe.touch" }, "2": { task: "probe.wipe" } },
      },
    }, "guarded");

    expect(body.rollback).toMatchObject({ attempted: 1, succeeded: 0 });
    expect(body.rollback!.errors).toHaveLength(1);
  });

  it("fails a direct-handler step too, since a refusal is returned and not thrown", async () => {
    const bridge = fakeBridge({});
    const body = await runFlow(probeTool(REFUSED), bridge, {
      refusal: { description: "a handler that refuses", steps: { "1": { task: "probe.refuse" } } },
    }, "refusal");

    expect(body.success).toBe(false);
    expect(body.steps[0].error?.message).toBe("the editor is not running");
    expect(body.steps[0].data).toMatchObject({ success: false });
  });
});

/**
 * A handler that PARTLY applied its mutation before giving up attaches the
 * inverse for the part that landed, on a body whose top-level verdict is
 * `success: false`. Four shipped handlers do exactly this on purpose:
 * RenameWorldWithExternals, FixAssetHygiene, GenerateLightmapUvs and
 * FractureMesh; the first states the contract in its own comment.
 *
 * flowkit harvests an inverse only from a step that SUCCEEDED
 * (`taskResult.success && taskResult.rollback` in `flow/runner.js`), and the
 * failing step is also the one that stops the run, so nothing downstream can
 * ever invoke that record. Making these steps fail therefore has to hand the
 * record to the caller, or it destroys it. These tests pin the handing back.
 *
 * `plans/flowkit-failed-step-rollback.md` is the prepared runner change that
 * would replay it instead; until that ships, `replayed: false` is the truth.
 */
describe("the inverse a FAILING step carries", () => {
  const PARTIAL = {
    success: false,
    error: "the rename failed partway through the batch",
    partial: true,
    rollback: { method: "rename_asset", payload: { assetPath: "/Game/New/L", newName: "L_Old" } },
  };

  it("reports it on the step, verbatim and replayable, instead of dropping it", async () => {
    const bridge = fakeBridge({ wipe_the_thing: PARTIAL });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      partial: { description: "a partial write", steps: { "1": { task: "probe.wipe" } } },
    }, "partial");

    const step = body.steps[0];
    expect(step.success).toBe(false);
    expect(step.unappliedRollback).toBeTruthy();
    expect(step.unappliedRollback!.replayed).toBe(false);
    // The record routes through the generic bridge task with the method in the
    // payload, which is what makes it runnable without translation.
    expect(step.unappliedRollback!.record).toEqual({
      taskName: "ue-mcp.bridge",
      payload: { assetPath: "/Game/New/L", newName: "L_Old", method: "rename_asset" },
    });
    expect(step.unappliedRollback!.step).toBe(
      '{ task: "ue-mcp.bridge", options: {"method":"rename_asset","assetPath":"/Game/New/L","newName":"L_Old"} }',
    );
  });

  it("puts the same call in the error text, which is what a terminal actually shows", async () => {
    const bridge = fakeBridge({ wipe_the_thing: PARTIAL });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      partial: { description: "a partial write", steps: { "1": { task: "probe.wipe" } } },
    }, "partial");

    const message = body.steps[0].error!.message;
    expect(message).toContain("the rename failed partway through the batch");
    expect(message).toContain("does NOT replay");
    expect(message).toContain('{ task: "ue-mcp.bridge", options: {"method":"rename_asset"');
    expect(body.summary).toContain("NOT run automatically");
    expect(body.summary).toContain('"method":"rename_asset"');
  });

  it("still unwinds the steps BEFORE it, and does not count its own inverse as one that ran", async () => {
    const bridge = fakeBridge({
      touch_the_thing: { success: true, rollback: { method: "untouch_the_thing", payload: { id: 7 } } },
      wipe_the_thing: PARTIAL,
      untouch_the_thing: { success: true },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      guarded: {
        description: "a recorded mutation, then a partial write that fails",
        rollback_on_failure: true,
        steps: { "1": { task: "probe.touch" }, "2": { task: "probe.wipe" } },
      },
    }, "guarded");

    // Exactly one inverse ran: step 1's. The failing step's own is reported.
    expect(body.rollback).toMatchObject({ attempted: 1, succeeded: 1 });
    expect(bridge.calls.map((c) => c.method)).toEqual([
      "touch_the_thing",
      "wipe_the_thing",
      "untouch_the_thing",
    ]);
    expect(bridge.calls.some((c) => c.method === "rename_asset")).toBe(false);
    expect(body.steps[1].unappliedRollback?.replayed).toBe(false);
  });

  it("says nothing about an unapplied inverse when the failing step carried none", async () => {
    const bridge = fakeBridge({ wipe_the_thing: { success: false, error: "boom" } });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      plain: { description: "a failure with no record", steps: { "1": { task: "probe.wipe" } } },
    }, "plain");

    expect(body.steps[0].unappliedRollback).toBeUndefined();
    expect(body.steps[0].error!.message).toBe("boom");
    expect(body.summary).not.toContain("NOT run automatically");
  });

  it("carries a NESTED flow's failing inverse up in the nested step's error", async () => {
    // The runner bubbles a child flow's records to the parent through the same
    // success gate (dist/flow/runner.js:459 in 0.17.0), so a nested failure
    // loses its own inverse exactly the way a top-level one does. It also
    // summarises a nested step to a stepCount and discards the child's step
    // array, which is why nothing this repo owns can put a structured
    // `unappliedRollback` on the parent: the child's step results never reach
    // it. The child's run error DOES, and the undo call travels in that text -
    // which is the reason it is written into the message and not only into a
    // field.
    const bridge = fakeBridge({ wipe_the_thing: PARTIAL });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      child: { description: "the inner flow", steps: { "1": { task: "probe.wipe" } } },
      parent: { description: "the outer flow", steps: { "1": { flow: "child" } } },
    }, "parent");

    expect(body.success).toBe(false);
    const nested = body.steps[0];
    expect(nested.success).toBe(false);
    expect(nested.error!.message).toContain("does NOT replay");
    expect(nested.error!.message).toContain('{ task: "ue-mcp.bridge", options: {"method":"rename_asset"');
  });

  it("leaves a SUCCEEDING step's record alone: that one is replayed, not reported", async () => {
    const bridge = fakeBridge({
      touch_the_thing: { success: true, rollback: { method: "untouch_the_thing", payload: { id: 7 } } },
      wipe_the_thing: { success: false, error: "boom" },
      untouch_the_thing: { success: true },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      guarded: {
        description: "a recorded mutation, then a plain failure",
        rollback_on_failure: true,
        steps: { "1": { task: "probe.touch" }, "2": { task: "probe.wipe" } },
      },
    }, "guarded");

    expect(body.steps[0].unappliedRollback).toBeUndefined();
    expect(body.rollback).toMatchObject({ attempted: 1, succeeded: 1 });
  });
});

describe("a handler that did not report a failure", () => {
  it("passes when the body says success", async () => {
    const bridge = fakeBridge({ touch_the_thing: { success: true, touched: 3 } });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      ok: { description: "one benign step", steps: { "1": { task: "probe.touch" } } },
    }, "ok");

    expect(body.success).toBe(true);
    expect(body.steps[0].data).toMatchObject({ touched: 3 });
  });

  it("passes when the body has no success key at all, the way a listing answers", async () => {
    const bridge = fakeBridge({ list_the_things: { things: ["a", "b"], count: 2 } });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      reading: { description: "a read", steps: { "1": { task: "probe.list" } } },
    }, "reading");

    expect(body.success).toBe(true);
    expect(body.steps[0].data).toMatchObject({ count: 2 });
  });

  it("passes when only a nested per-item success is false, which is that item's verdict", async () => {
    const bridge = fakeBridge({
      list_the_things: { count: 2, items: [{ success: true }, { success: false, error: "item 2" }] },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      reading: { description: "a batch read", steps: { "1": { task: "probe.list" } } },
    }, "reading");

    expect(body.success).toBe(true);
  });
});

describe("the MCP category-tool path", () => {
  it("still answers with the whole body when the handler reports a failure", async () => {
    // index.ts turns `success: false` into `Error [TASK_FAILED]` and drops
    // `data` entirely, so a failure here would delete the response.
    const bridge = fakeBridge({
      wipe_the_thing: {
        success: false,
        error: "import reported problems",
        rowsBefore: 42,
        rollback: { method: "restore_curvetable", payload: { assetPath: "/Game/T" } },
      },
    });
    const result = await callAsCategoryTool(probeTool(ACCEPTED), "wipe", bridge);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      success: false,
      error: "import reported problems",
      rowsBefore: 42,
      rollback: { method: "restore_curvetable" },
    });
  });

  it("still answers with the whole body when a direct handler refuses", async () => {
    const result = await callAsCategoryTool(probeTool(REFUSED), "refuse", fakeBridge({}));

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ success: false, message: "the editor is not running" });
  });

  it("still lifts the rollback descriptor onto the TaskResult", async () => {
    const bridge = fakeBridge({
      touch_the_thing: { success: true, rollback: { method: "untouch_the_thing", payload: { id: 7 } } },
    });
    const result = await callAsCategoryTool(probeTool(ACCEPTED), "touch", bridge);

    expect(result.success).toBe(true);
    expect(result.rollback).toEqual({
      taskName: "ue-mcp.bridge",
      payload: { id: 7, method: "untouch_the_thing" },
    });
  });
});

describe("the caller's field selection", () => {
  it("cannot hide the verdict: a select that strips success still fails the step", async () => {
    const bridge = fakeBridge({
      wipe_the_thing: { success: false, error: "boom", rowsAfter: 0 },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      narrow: {
        description: "a step that projects its own result",
        steps: { "1": { task: "probe.wipe", options: { select: ["rowsAfter"] } } },
      },
    }, "narrow");

    expect(body.success).toBe(false);
    expect(body.steps[0].error?.message).toBe("boom");
    // The projection still applied to what the caller reads back.
    expect(body.steps[0].data).toMatchObject({ rowsAfter: 0 });
    expect(body.steps[0].data).not.toHaveProperty("error");
  });

  it("cannot hide the rollback record either", async () => {
    const bridge = fakeBridge({
      touch_the_thing: {
        success: true,
        touched: 1,
        rollback: { method: "untouch_the_thing", payload: { id: 7 } },
      },
    });
    const result = await callAsCategoryTool(probeTool(ACCEPTED), "touch", bridge, {
      omit: ["rollback"],
    });

    expect(result.data).not.toHaveProperty("rollback");
    expect(result.rollback).toEqual({
      taskName: "ue-mcp.bridge",
      payload: { id: 7, method: "untouch_the_thing" },
    });
  });
});

describe("the YAML bridge task (ue-mcp.bridge), which is also the inverse executor", () => {
  const YAML_CONFIG = () => flowConfig(
    { yaml_step: { description: "a raw bridge step", steps: { "1": { task: "raw" } } } },
    { raw: { class_path: "ue-mcp.bridge", options: { method: "do_a_thing" } } },
  );

  it("fails the step when the method it was told to call reports a failure", async () => {
    const bridge = fakeBridge({ do_a_thing: { success: false, error: "refused" } });
    const tool = createFlowTool(buildFlowRegistry([]), YAML_CONFIG);
    const body = (await tool.handler(toolContext(bridge), {
      action: "run",
      flowName: "yaml_step",
    })) as unknown as RunResponse;

    expect(body.success).toBe(false);
    expect(body.steps[0].error?.message).toBe("refused");
  });

  it("passes the step when the method answers normally", async () => {
    const bridge = fakeBridge({ do_a_thing: { success: true, did: "a thing" } });
    const tool = createFlowTool(buildFlowRegistry([]), YAML_CONFIG);
    const body = (await tool.handler(toolContext(bridge), {
      action: "run",
      flowName: "yaml_step",
    })) as unknown as RunResponse;

    expect(body.success).toBe(true);
    expect(body.steps[0].data).toMatchObject({ did: "a thing" });
  });

  it("leaves a direct call to it alone, since only a runner wires the flow context", async () => {
    const bridge = fakeBridge({ do_a_thing: { success: false, error: "refused" } });
    const task = await buildFlowRegistry([]).create("ue-mcp.bridge", categoryToolContext(bridge), {
      method: "do_a_thing",
    });
    const result = await task.run();

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ success: false, error: "refused" });
  });
});

/**
 * `ignore_failure`, which is where an expected failure belongs.
 *
 * The alternative is a handler that answers `success: true` to a call that did
 * nothing, so that a flow which stops, builds and starts the editor survives an
 * editor that was already stopped. That trades one honest report for one
 * shorter plan, and every OTHER caller of that handler is then told the editor
 * was closed when it was not. flowkit already carries the right hook: the step
 * that expects the failure declares it, the runner records the failure and
 * walks on, and nothing about the handler's answer changes.
 *
 * Read off `node_modules/@db-lyon/flowkit/dist/flow/runner.js`: the flag is
 * planned onto the step (`planStepFromDef`), and consulted on the failed-result
 * path, the thrown path, and the `when:`-threw path. Each sets
 * `ignoredFailure` on the step result and continues without setting
 * `flowError`.
 */
describe("a step that declares its own failure expected", () => {
  it("completes the run, and still records the step as FAILED", async () => {
    const bridge = fakeBridge({
      wipe_the_thing: { success: false, error: "the editor is not running" },
      touch_the_thing: { success: true, touched: 1 },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      stop_then_work: {
        description: "the stop is allowed to have had nothing to stop",
        steps: {
          "1": { task: "probe.wipe", ignore_failure: true },
          "2": { task: "probe.touch" },
        },
      },
    }, "stop_then_work");

    // The run finished and the later step ran.
    expect(body.success).toBe(true);
    expect(bridge.calls.map((c) => c.method)).toEqual(["wipe_the_thing", "touch_the_thing"]);

    // The failure is recorded, not laundered: verdict, marker, message, body.
    expect(body.steps[0].success).toBe(false);
    expect(body.steps[0].ignoredFailure).toBe(true);
    expect(body.steps[0].error?.message).toBe("the editor is not running");
    expect(body.steps[0].data).toMatchObject({ success: false });
    expect(body.summary).toContain("FAILED (ignored)");

    // And it is not the step that stopped anything, because nothing stopped.
    expect(body.failedStep).toBeUndefined();
    expect(body.steps[1].success).toBe(true);
    expect(body.steps[1].ignoredFailure).toBeUndefined();
  });

  it("absorbs a thrown step as well as a reported one", async () => {
    // The bridge has no answer for the method, so the task class throws rather
    // than returning a refusal. runner.js catches that separately and consults
    // the same flag.
    const bridge = fakeBridge({ touch_the_thing: { success: true } });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      throwing: {
        description: "a step that throws",
        steps: {
          "1": { task: "probe.wipe", ignore_failure: true },
          "2": { task: "probe.touch" },
        },
      },
    }, "throwing");

    expect(body.success).toBe(true);
    expect(body.steps[0].success).toBe(false);
    expect(body.steps[0].ignoredFailure).toBe(true);
    expect(body.steps[1].success).toBe(true);
  });

  it("absorbs only the step that asked, and a later real failure still stops the run", async () => {
    const bridge = fakeBridge({
      wipe_the_thing: { success: false, error: "the editor is not running" },
      touch_the_thing: { success: false, error: "the build broke" },
    });
    const body = await runFlow(probeTool(ACCEPTED), bridge, {
      one_expected_one_not: {
        description: "an expected failure, then an unexpected one",
        steps: {
          "1": { task: "probe.wipe", ignore_failure: true },
          "2": { task: "probe.touch" },
        },
      },
    }, "one_expected_one_not");

    expect(body.success).toBe(false);
    expect(body.failedStep).toBe("probe.touch");
    expect(body.steps[0].ignoredFailure).toBe(true);
    expect(body.steps[1].ignoredFailure).toBeUndefined();
  });

  it("leaves rollback where it was: prior inverses unwind, the ignored step contributes none", async () => {
    // The interaction worth pinning. An ignored failure is still a failure, so
    // flowkit's harvest gate (`taskResult.success && taskResult.rollback`)
    // skips its record exactly as it skips any failing step's - the step's own
    // inverse is reported on the step, never replayed. And because the ignored
    // step does not set flowError, rollback is armed by the LATER real failure,
    // which unwinds the successful steps before it.
    const bridge = fakeBridge({
      wipe_the_thing: {
        success: false,
        error: "wrote half of it",
        rollback: { method: "undo_the_half", payload: { id: 9 } },
      },
      touch_the_thing: {
        success: true,
        rollback: { method: "untouch_the_thing", payload: { id: 7 } },
      },
      untouch_the_thing: { success: true },
    });
    const body = await runFlow(probeTool(REFUSED), bridge, {
      mixed: {
        description: "an ignored partial write, a recorded mutation, then a real failure",
        rollback_on_failure: true,
        steps: {
          "1": { task: "probe.wipe", ignore_failure: true },
          "2": { task: "probe.touch" },
          "3": { task: "probe.refuse" },
        },
      },
    }, "mixed");

    expect(body.success).toBe(false);
    expect(body.failedStep).toBe("probe.refuse");

    // Step 1's own inverse was never replayed, and it is handed back instead.
    expect(body.steps[0].ignoredFailure).toBe(true);
    expect(body.steps[0].unappliedRollback?.replayed).toBe(false);
    expect(body.steps[0].unappliedRollback?.record.payload).toMatchObject({
      method: "undo_the_half",
      id: 9,
    });
    expect(bridge.calls.map((c) => c.method)).not.toContain("undo_the_half");

    // Step 2's inverse DID run, armed by step 3's failure.
    expect(body.rollback).toMatchObject({ attempted: 1, succeeded: 1 });
    expect(bridge.calls.map((c) => c.method)).toContain("untouch_the_thing");
  });
});
