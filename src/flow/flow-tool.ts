import { z } from "zod";
import { FlowRunner } from "@db-lyon/flowkit";
import type {
  TaskRegistry,
  FlowRunResult,
  FlowStepResult,
  FlowRunnerHooks,
  PlanStep,
  TaskDefinition,
  FlowDefinition,
} from "@db-lyon/flowkit";
import type { FlowContext } from "./context.js";
import type { FlowConfig } from "./schema.js";
import type { ToolDef, ToolContext, ActionSpec } from "../types.js";
import { actionEnum } from "../types.js";
import { McpError, ErrorCode } from "../errors.js";
import { nearestActions } from "../action-schema.js";
import { warn } from "../log.js";
import {
  takeSnapshot,
  restoreSnapshot,
  reloadAffectedPackages,
  pruneOldSnapshots,
  type Snapshot,
} from "./git-snapshot.js";
import {

  emitFlowEvent,
  nextRunId,
  trimStepResult,
  trimError,
} from "./events.js";
import {
  journalEnabled,
  journalFile,
  endRun,
  startRun,
  type JournalStep,
} from "../journal.js";
import { journalActions } from "./journal-actions.js";
import { skillActions } from "./skill-actions.js";

/**
 * Name a failed rollback by the bridge method it tried to call. Every record
 * routes through the generic "ue-mcp.bridge" task now, so taskName alone
 * renders three different failed inverses as three identical lines.
 */
function rollbackLabel(e: { taskName: string; payload?: Record<string, unknown> }): string {
  const method = e.payload?.method;
  return typeof method === "string" && method.length > 0 ? method : e.taskName;
}

/**
 * The task registry and flow config a call resolves to.
 *
 * Both are per editor (#817): the registry is built from that project's tool
 * graph, and the config is that project's ue-mcp.yml. Passing plain values
 * still works and means "the same one for every call", which is what a
 * single-editor server and the script runner want.
 */
export type FlowRegistrySource = TaskRegistry | ((ctx: ToolContext) => TaskRegistry);
export type FlowConfigSource = (() => FlowConfig) | ((ctx: ToolContext) => FlowConfig);

export function createFlowTool(
  registrySource: FlowRegistrySource,
  reloadConfig: FlowConfigSource,
): ToolDef {
  const registryFor = (ctx: ToolContext): TaskRegistry =>
    typeof registrySource === "function" ? registrySource(ctx) : registrySource;
  const configFor = (ctx: ToolContext): FlowConfig => reloadConfig(ctx);

  const actions: Record<string, ActionSpec> = {
    run: {
      description:
        "Execute a named flow from ue-mcp.yml. The run is recorded in this project's workflow "
        + "journal automatically, under the flow's name, with its per-step outcome, so "
        + 'flow(action="journal_get", runId=...) reconstructs it afterwards. Params: flowName, '
        + "skip? (step names or numbers), params? (runtime options merged into every step's options, "
        + "highest priority), rollback_on_failure? (invoke inverse tasks in reverse order when a "
        + "later step fails). Returns a summary, every step's data, and the runId.",
      handler: async (ctx, params) => runFlow(registryFor(ctx), configFor(ctx), ctx, params),
    },
    plan: {
      description:
        "Show a flow's execution plan without running a step of it, and without journalling "
        + "anything. Params: flowName. Returns the ordered plan.",
      handler: async (ctx, params) => planFlow(registryFor(ctx), configFor(ctx), ctx, params),
    },
    list: {
      description:
        "List the flows available to this project, merged from ue-mcp.yml, the user-global config "
        + "and any loaded plugin. Params: none",
      handler: async (ctx) => listFlows(configFor(ctx)),
    },
    ...journalActions,
    ...skillActions,
  };

  const def: ToolDef = {
    name: "flow",
    description:
      `Run pre-built named sequences for this project, and keep the record of what was run. ` +
      `ALWAYS check project(action="get_status") first - its 'flows' field lists what's available. ` +
      `If a flow matches the user's request, run it via ` +
      `flow(action="run", flowName="...") instead of composing the sequence by hand. ` +
      `Config reloads on every call - no restart needed.\n\n` +
      `The journal_* actions are the record a run leaves behind: what was done, what it produced, ` +
      `and how it ended. Every flow run writes one automatically; open one by hand for work that is ` +
      `not a flow, so the next session can read back what this one did.\n\n` +
      `The skill_* actions cover the skill packs - the written workflows that say which calls to ` +
      `make in what order - including verifying that the calls they teach still exist.\n\n` +
      `Actions:\n` +
      Object.entries(actions)
        .map(([name, spec]) => `- ${name}: ${spec.description ?? ""}`)
        .join("\n") +
      `\n\nStep types supported in YAML flows: any MCP action (category.action), nested flows (flow:),\n` +
      `and 'shell' for running shell/exec commands. Example shell step:\n` +
      `  steps:\n` +
      `    1: { task: shell, options: { command: "npm run up:build" } }`,
    schema: {
      action: actionEnum(Object.keys(actions) as [string, ...string[]]),
      flowName: z.string().optional().describe("Flow name from ue-mcp.yml. On journal_list, keeps only runs of that flow"),
      skip: z.array(z.string()).optional().describe("run: step names or numbers to skip"),
      params: z.record(z.unknown()).optional().describe("run: runtime options merged into every step's options (highest priority)"),
      rollback_on_failure: z.boolean().optional().describe("run: invoke inverse tasks in reverse order on failure"),
      runId: z.string().optional().describe("Journal run to act on. Omitted on a write, the open run is used and the response says so"),
      title: z.string().optional().describe("journal_start: what the run is, in a few words"),
      tags: z.array(z.string()).optional().describe("journal_start: labels to filter this run by later"),
      tag: z.string().optional().describe("journal_list: keep only runs carrying this tag"),
      text: z.string().optional().describe("journal_note: the note's content"),
      artifactPath: z.string().optional().describe("journal_attach: what the run produced - a content path, a file on disk, or a URL"),
      artifactKind: z.string().optional().describe("journal_attach: free-form label such as asset, screenshot, log, report"),
      note: z.string().optional().describe("journal_attach: one line about the artifact"),
      status: z.string().optional().describe("journal_finish: completed|failed. journal_list: active|completed|failed|cancelled"),
      summary: z.string().optional().describe("journal_finish: what the run achieved, read first by the next session"),
      reason: z.string().optional().describe("journal_cancel: why the run was abandoned"),
      since: z.string().optional().describe("journal_list: epoch ms, an ISO date, or a relative age like 2h / 7d / 30m"),
      contains: z.string().optional().describe("journal_list: case-insensitive substring over the title, summary and notes"),
      limit: z.number().optional().describe("journal_list: how many runs to return (default 20, 0 for all)"),
      detail: z.boolean().optional().describe("journal_list / skill_list: return full detail rather than summary rows"),
      all: z.boolean().optional().describe("journal_delete / skill_remove: act on every one of them instead of a named one"),
      skillName: z.string().optional().describe("skill_get / skill_install / skill_remove: the pack's directory name"),
      includeBody: z.boolean().optional().describe("skill_get: include the pack's markdown (default true)"),
      source: z.string().optional().describe("skill_list: packaged|project|plugin"),
    },
    actions,
    handler: async (ctx, params) => {
      const action = params.action as string;
      const spec = actions[action];
      if (!spec?.handler) {
        const available = Object.keys(actions);
        const close = nearestActions(action, available);
        throw new McpError(
          ErrorCode.UNKNOWN_ACTION,
          `Unknown action '${action}' on 'flow'.`
            + (close.length ? ` Did you mean: ${close.join(", ")}?` : "")
            + ` Available: ${available.join(", ")}.`,
        );
      }
      return spec.handler(ctx, params);
    },
  };
  return def;
}

function listFlows(config: FlowConfig): Record<string, unknown> {
  const flows = Object.entries(config.flows).map(([name, def]) => ({
    name,
    description: def.description,
    stepCount: Object.keys(def.steps).length,
  }));
  return { flowCount: flows.length, flows };
}

async function planFlow(
  registry: TaskRegistry,
  config: FlowConfig,
  ctx: ToolContext,
  params: Record<string, unknown>,
): Promise<unknown> {
  const flowName = params.flowName as string;
  if (!flowName) throw new Error("flowName is required");

  // Plan mode short-circuits inside the runner before any hooks fire,
  // so the runId placeholder we pass here is never observed.
  const runner = makeRunner(registry, config, ctx, nextRunId(), flowName);
  return runner.run({ flowName, plan: true });
}

async function runFlow(
  registry: TaskRegistry,
  config: FlowConfig,
  ctx: ToolContext,
  params: Record<string, unknown>,
): Promise<unknown> {
  const flowName = params.flowName as string;
  if (!flowName) throw new Error("flowName is required");
  const skip = (params.skip as string[] | undefined) ?? [];
  const flowParams = params.params as Record<string, unknown> | undefined;
  const rollback_on_failure = params.rollback_on_failure as boolean | undefined;

  // One runId per top-level call. Every per-step / per-run event we
  // emit carries this id so SSE subscribers can filter to a specific
  // run; the response includes it so callers can correlate.
  const runId = nextRunId();
  const runner = makeRunner(registry, config, ctx, runId, flowName);
  const result = await runner.run({ flowName, skip, params: flowParams, rollback_on_failure });

  const formatted = formatFlowResult(result);
  return { ...formatted, runId };
}

function makeRunner(
  registry: TaskRegistry,
  config: FlowConfig,
  ctx: ToolContext,
  runId: string,
  flowName: string,
): FlowRunner {
  // The whole context, not two fields of it. Rebuilding it field-by-field
  // dropped `elicit`, `getFlows`, `getPlugins` and now the editor session, so
  // a step inside a flow saw a different server than the same action called
  // directly - and, with more than one editor, could not tell which one it
  // was running in.
  const flowCtx: FlowContext = { ...ctx };

  // Opt-in git snapshot: capture Content/ + Config/ on start; reset on failure.
  // Handler-level rollbacks cover in-memory state (selection, PIE, unsaved
  // actors); the snapshot covers anything that touched disk.
  const snapCfg = config.git_snapshot;
  let activeSnapshot: Snapshot | undefined;
  let flowFailed = false;
  const snapshotEnabled = !!(snapCfg?.enabled && ctx.project.projectDir);

  // The automatic half of the journal (V16).
  //
  // A flow run is the one case where the server already knows, without being
  // told, that a unit of work started and how it ended - the runner brackets
  // it and the plan names it. So it is recorded without asking, sharing the
  // runId the flow events already carry, which means an SSE subscriber and the
  // journal are talking about the same run.
  //
  // The explicit half exists because this half cannot: intent, and what a run
  // produced, are known only to the caller. Recording every mutating call
  // instead would produce a call log, not a workflow record - forty lines of
  // "set_property succeeded" that say nothing about what was being built.
  //
  // A session with no project directory has no journal: the file is keyed by
  // project root, and one shared stream for every projectless server would be
  // a worse record than none.
  const journalPath = journalFile(ctx.project.projectDir);
  const journalling = journalEnabled() && !!ctx.project.projectDir;

  // Never let a journal write take a flow down: the record is a byproduct, and
  // a full disk must not fail the work it was recording.
  const journalSafely = (what: string, write: () => void): void => {
    if (!journalling) return;
    try {
      write();
    } catch (e) {
      warn("journal", `${what} failed for flow '${flowName}' (${journalPath})`, e);
    }
  };

  // Always-on per-step observation. Each hook emits a single event on
  // the module-level bus that the HTTP server's /flows/events SSE
  // endpoint pipes to subscribed clients.
  const hooks: FlowRunnerHooks = {
    beforeRun: async (_name, plan) => {
      emitFlowEvent({
        type: "run_started",
        runId,
        flowName,
        plan,
        timestamp: Date.now(),
      });
      journalSafely("opening the run", () => {
        startRun(journalPath, {
          runId,
          title: `flow: ${flowName}`,
          flowName,
          tags: ["flow"],
          project: ctx.project.projectDir,
        });
      });
      if (!snapshotEnabled) return;
      const projectDir = ctx.project.projectDir!;
      const snapshotDir = snapCfg!.snapshot_dir ?? ".ue-mcp/snapshot.git";
      const absSnap = snapshotDir.startsWith(".") || !snapshotDir.match(/^([a-zA-Z]:|\/)/)
        ? `${projectDir}/${snapshotDir}`
        : snapshotDir;
      pruneOldSnapshots(absSnap, (snapCfg!.max_age_hours ?? 24) * 3_600_000);
      try {
        activeSnapshot = takeSnapshot(
          projectDir,
          snapCfg!.paths ?? ["Content", "Config"],
          snapshotDir,
        );
      } catch (e) {
        // Don't fail the flow on snapshot failure - just log. Handler
        // rollbacks still apply.
        console.error(`[ue-mcp] git snapshot failed: ${(e as Error).message}`);
      }
    },
    beforeStep: async (step: PlanStep) => {
      emitFlowEvent({
        type: "step_started",
        runId,
        flowName,
        step,
        timestamp: Date.now(),
      });
    },
    afterStep: async (step: PlanStep, result: FlowStepResult) => {
      emitFlowEvent({
        type: "step_completed",
        runId,
        flowName,
        step,
        result: trimStepResult(result),
        timestamp: Date.now(),
      });
    },
    onStepError: async (step: PlanStep, error: Error) => {
      emitFlowEvent({
        type: "step_failed",
        runId,
        flowName,
        step,
        error: trimError(error),
        timestamp: Date.now(),
      });
    },
    afterRun: async (result: FlowRunResult) => {
      // Restore the git snapshot first (if enabled and the flow failed)
      // so the run_completed event is the last thing observers see.
      if (snapshotEnabled) {
        flowFailed = !result.success;
        if (activeSnapshot && flowFailed) {
          try {
            const { changedPaths } = restoreSnapshot(activeSnapshot);
            if (ctx.bridge.isConnected) {
              await reloadAffectedPackages(ctx.bridge, activeSnapshot.projectDir, changedPaths);
            }
            (result as unknown as { snapshotRestore?: unknown }).snapshotRestore = {
              restored: true,
              changedCount: changedPaths.length,
            };
          } catch (e) {
            (result as unknown as { snapshotRestore?: unknown }).snapshotRestore = {
              restored: false,
              error: (e as Error).message,
            };
          }
        }
      }
      const failedStep = result.steps.find((s) => s.result?.success === false)?.name;
      journalSafely("closing the run", () => {
        endRun(journalPath, runId, {
          status: result.success ? "completed" : "failed",
          summary: result.success
            ? `${result.steps.length} step(s) completed in ${formatDuration(result.duration)}.`
            : `Failed at step '${failedStep ?? "unknown"}' after ${formatDuration(result.duration)}.`,
          durationMs: result.duration,
          steps: result.steps.map(journalStep),
        });
      });
      emitFlowEvent({
        type: "run_completed",
        runId,
        flowName,
        success: result.success,
        duration: result.duration,
        stepCount: result.steps.length,
        failedStep,
        timestamp: Date.now(),
      });
    },
  };

  return new FlowRunner({
    tasks: config.tasks as Record<string, TaskDefinition>,
    flows: config.flows as Record<string, FlowDefinition>,
    registry,
    context: flowCtx,
    hooks,
  });
}

/**
 * One step, trimmed to what a later reader needs. The step's DATA is
 * deliberately left out: an asset listing or a shell log belongs in the run
 * response, not in a file that accumulates one entry per flow forever.
 */
function journalStep(s: FlowStepResult): JournalStep {
  return {
    stepNumber: s.stepNumber,
    name: s.name,
    type: s.type,
    success: s.result?.success ?? false,
    skipped: s.skipped,
    durationMs: s.duration,
    error: s.result?.error?.message,
  };
}

function formatFlowResult(result: FlowRunResult): Record<string, unknown> {
  const lines: string[] = [];
  const icon = result.success ? "✓" : "✗";
  lines.push(`${icon} Flow ${result.success ? "completed" : "failed"} in ${formatDuration(result.duration)}`);
  lines.push("");

  for (const s of result.steps) {
    const stepIcon = s.skipped ? "○" : s.result?.success ? "✓" : "✗";
    const status = s.skipped ? "skipped" : s.result?.success ? formatDuration(s.duration) : "FAILED";
    const attempts = s.attempts && s.attempts > 1 ? ` [${s.attempts} attempts]` : "";
    lines.push(`  ${stepIcon} ${s.stepNumber}. ${s.name} (${s.type}) - ${status}${attempts}`);

    if (s.result?.error) {
      lines.push(`      ${s.result.error.message}`);
    }

    if (s.result?.data?.output && typeof s.result.data.output === "string") {
      const output = s.result.data.output;
      if (output.length > 0) {
        const truncated = output.length > 500 ? output.slice(-500) + "\n      ..." : output;
        for (const line of truncated.split("\n")) {
          lines.push(`      ${line}`);
        }
      }
    }
  }

  if (result.error && !result.steps.some((s) => s.result?.error)) {
    lines.push("");
    lines.push(`  Error: ${result.error.message}`);
  }

  if (result.rollback) {
    lines.push("");
    lines.push(
      `  Rollback: ${result.rollback.succeeded}/${result.rollback.attempted} inverses succeeded` +
        (result.rollback.errors.length ? ` - ${result.rollback.errors.length} failed` : ""),
    );
    for (const e of result.rollback.errors) {
      lines.push(`      ✗ ${rollbackLabel(e)}: ${e.error.message}`);
    }
  }

  const snap = (result as unknown as { snapshotRestore?: { restored: boolean; changedCount?: number; error?: string } }).snapshotRestore;
  if (snap) {
    lines.push("");
    if (snap.restored) {
      lines.push(`  Git snapshot restored: ${snap.changedCount} files reset`);
    } else {
      lines.push(`  Git snapshot restore FAILED: ${snap.error}`);
    }
  }

  if (result.hookErrors && result.hookErrors.length > 0) {
    lines.push("");
    lines.push(`  Hook errors (${result.hookErrors.length}):`);
    for (const h of result.hookErrors) {
      lines.push(`      ✗ ${h.phase}:${h.name} - ${h.error.message}`);
    }
  }

  return {
    summary: lines.join("\n"),
    success: result.success,
    duration: result.duration,
    stepCount: result.steps.length,
    failedStep: result.steps.find((s) => s.result?.success === false)?.name,
    // What each step answered. The per-step events carry no data by design
    // (an SSE subscriber does not want a shell log or an asset listing pushed
    // at it), which left the run response as the only place the data could
    // arrive, and it was dropping it too: a flow that read anything returned a
    // summary line and nothing else, so the same action was strictly less
    // useful inside a flow than called directly.
    steps: result.steps.map((s) => ({
      stepNumber: s.stepNumber,
      name: s.name,
      type: s.type,
      skipped: s.skipped,
      success: s.result?.success ?? false,
      duration: s.duration,
      attempts: s.attempts,
      error: s.result?.error
        ? { message: s.result.error.message, name: s.result.error.name }
        : undefined,
      data: s.result?.data,
    })),
    rollback: result.rollback,
    hookErrors: result.hookErrors,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
