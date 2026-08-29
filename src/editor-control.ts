import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "child_process";
import * as net from "net";
import WebSocket from "ws";
import { readUeMcpConfig, type ProjectContext } from "./project.js";
import { EngineResolutionError, selectEngine, trySelectEngine, type EngineLookup } from "./engine-root.js";
import { invalidatePluginFreshness } from "./plugin-freshness.js";
import {
  editorOwnsProject,
  findEditorByPid,
  findInteractiveEditors,
  readEngineState,
  readEngineSnapshot,
  readLogState,
  type EngineState,
} from "./engine-observer.js";
import { findLiveInstanceRecord, isPidAlive, lockfileIsFromThisLaunch, resolveBridgeTarget } from "./editor-target.js";
import { startProgress } from "./ui/progress.js";
import type { ElicitFn, ProgressFn } from "./types.js";

// Process control is cross-platform: the editor binary path and the running-
// process probe differ per OS, and stopping goes through the bridge (#790).
const IS_WINDOWS = process.platform === "win32";

const NO_EDITOR_BINARY_MSG =
  "Unreal Editor executable not found. Set UE_EDITOR_PATH to the editor binary (on macOS that is inside UnrealEditor.app/Contents/MacOS/), or install the engine to a default location.";

/**
 * A project's `editor:` config, read from its .uproject path (#817).
 *
 * `buildProject` is handed a path rather than a loaded ProjectContext, and the
 * CLI build has no context at all, so the config is read from the project root
 * here rather than threaded through every caller.
 */
function readProjectEditorConfig(projectPath: string): { path?: string; buildToolPath?: string } {
  try {
    return readUeMcpConfig(path.dirname(path.resolve(projectPath))).editor ?? {};
  } catch {
    return {};
  }
}

/** Read EngineAssociation from a .uproject, or null if unreadable. */
function readEngineAssociation(projectPath: string): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(projectPath, "utf-8"));
    return typeof parsed?.EngineAssociation === "string" ? parsed.EngineAssociation : null;
  } catch {
    return null;
  }
}

/**
 * The engine lookup for one project: its .uproject, its association and its
 * per-project `editor:` config, handed to the single resolver in
 * `engine-root.ts` (#959, #961, #962, #974).
 */
function engineLookupFor(
  projectPath: string | null | undefined,
  engineAssociation?: string | null,
  editorConfig?: { path?: string; buildToolPath?: string },
): EngineLookup {
  return {
    projectPath: projectPath ?? null,
    engineAssociation: engineAssociation ?? null,
    configBuildToolPath: editorConfig?.buildToolPath ?? null,
    configEditorPath: editorConfig?.path ?? null,
  };
}

/**
 * The editor binary this project launches, or null.
 *
 * The whole order lives in `engine-root.ts` now: env pins, the per-project
 * config, the EngineAssociation (as a path, a registered GUID or a launcher
 * version), an engine tree beside or above the project, the engine the project
 * was last opened with, then the default install locations. The build tool goes
 * through the same list, so the editor this launches and the engine
 * `build_project` compiles with are the same tree by construction.
 *
 * #766/#790: the binary lives at a different path per platform, which is what
 * `engineEditorBinaries` covers. On macOS the launchable one is inside the .app
 * bundle.
 */
function findEditorExecutable(project?: ProjectContext): string | null {
  // Same rule as the build tool: the env var is the global default and wins,
  // `editor.path` is how one project names its own binary (#817).
  const envPath = process.env.UE_EDITOR_PATH;
  if (envPath) return envPath;
  const configured = project?.config.editor?.path;
  if (typeof configured === "string" && configured.trim() !== "") return configured.trim();

  const lookup = engineLookupFor(project?.projectPath, project?.engineAssociation, project?.config.editor);
  return trySelectEngine(lookup, "editor")?.editorExecutable ?? null;
}

/**
 * Why no editor binary was found, naming every path probed.
 *
 * A user who is told only to set an env var cannot tell a missing install from
 * a wrong root from a layout the resolver does not understand (#974).
 */
function editorExecutableFailure(project?: ProjectContext): string {
  try {
    selectEngine(
      engineLookupFor(project?.projectPath, project?.engineAssociation, project?.config.editor),
      "editor",
    );
  } catch (err) {
    if (err instanceof EngineResolutionError) return err.message;
  }
  return NO_EDITOR_BINARY_MSG;
}

/**
 * The host the client talks to one project's bridge on.
 *
 * UE_MCP_HOST covers remote setups and stays a global default: it is one value
 * for the process, so with more than one project it points every editor at the
 * same machine. It still wins. `bridge.host` in a project's ue-mcp.yml is how
 * that project differs when it is unset (#817).
 */
function bridgeHost(projectDir?: string | null): string {
  const env = process.env.UE_MCP_HOST;
  if (env) return env;
  if (projectDir) {
    try {
      const configured = readUeMcpConfig(projectDir).bridge?.host;
      if (typeof configured === "string" && configured.trim() !== "") return configured.trim();
    } catch {
      // A project whose config cannot be read is not a reason to fail a
      // liveness probe; the default host is the answer it had before.
    }
  }
  return "127.0.0.1";
}

/**
 * Is anything answering on this port? Exported so a session can be reported as
 * reachable or not without opening a bridge connection to find out (#817).
 */
export function isBridgeReachable(port: number, host?: string, timeoutMs = 1000): Promise<boolean> {
  return isBridgeAvailable(host, port, timeoutMs);
}

async function isBridgeAvailable(host = bridgeHost(), port = 0, timeoutMs = 1000): Promise<boolean> {
  if (!port) return false;
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(false);
      }
    }, timeoutMs);

    socket.once("connect", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      }
    });

    socket.once("error", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

/**
 * How long startup must show no change before we suspect something is holding
 * it rather than working. Generous: shader compilation and asset registry scans
 * legitimately sit on one phase for a long time, and the check that follows
 * costs a couple of seconds.
 */
const STALLED_STARTUP_MS = 45_000;
const WINDOW_PROBE_INTERVAL_MS = 60_000;

export interface ReadyPhase {
  phase: string;
  atSeconds: number;
  detail?: string;
}

export interface ReadyResult {
  ready: boolean;
  elapsedSeconds: number;
  /** Phase transitions with the second each happened, oldest first. */
  timeline: ReadyPhase[];
  reason?: string;
  state?: EngineState;
}

/**
 * Block until the editor is genuinely usable, rendering progress to the
 * terminal while it happens.
 *
 * "The bridge socket answers" is not the same as "the editor is ready": the
 * socket comes up mid-startup, while shaders compile and the map loads. A tool
 * that returned there left the caller polling in a loop, burning tokens to
 * rediscover state the plugin already publishes four times a second. So this
 * waits for the snapshot to say `ready` and reports the whole startup as a
 * progress bar rather than handing control back early.
 */
export async function waitForEditorReadyExternal(
  projectPath: string,
  projectDir: string,
  maxWaitSeconds = 300,
  launchedAtMs?: number,
): Promise<ReadyResult> {
  return waitForEditorReady(projectPath, projectDir, maxWaitSeconds, { launchedAtMs });
}

async function waitForEditorReady(
  projectPath: string | null | undefined,
  projectDir: string | undefined,
  maxWaitSeconds: number,
  opts: { showProgress?: boolean; onProgress?: ProgressFn; launchedAtMs?: number } = {},
): Promise<ReadyResult> {
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  const timeline: ReadyPhase[] = [];
  let lastPhase = "";
  let sawSnapshot = false;
  let socketUpSince: number | null = null;
  /** Highest progress value already sent; the stream must never go backwards. */
  let lastReportedProgress = -1;
  /** When startup last visibly moved, for detecting a wait that has gone quiet. */
  let lastChangeAt = Date.now();
  let lastActivity = "";
  let lastWindowProbeAt = 0;

  const bar = opts.showProgress === false ? null : startProgress("Starting Unreal Editor");
  const elapsed = (): number => (Date.now() - startTime) / 1000;

  const finish = (result: ReadyResult): ReadyResult => {
    bar?.stop(
      result.ready
        ? `Editor ready in ${result.elapsedSeconds.toFixed(1)}s`
        : `Editor did not become ready: ${result.reason ?? "timed out"}`,
    );
    return result;
  };

  while (Date.now() - startTime < maxWaitMs) {
    const snapshot = readEngineSnapshot(projectPath);
    const logState = readLogState(projectPath);

    // Until the plugin's snapshot exists, the log is the only sensor - but the
    // log on disk at launch is the PREVIOUS session's, still ending in "editor
    // exited" or a crash from last time. Trust it only once it has been written
    // since this launch, and hand over to the snapshot as soon as there is one,
    // otherwise the timeline walks backwards through two different sessions.
    const logIsCurrent = (logState.secondsSinceWrite ?? Infinity) < elapsed() + 1;
    const snapshotIsCurrent = snapshot !== null && (snapshot.ageSeconds ?? 999) < 10;
    if (snapshotIsCurrent) sawSnapshot = true;

    // Once the snapshot has spoken, it owns the phase. A momentarily missed
    // read is not news, and falling back to the log there made the timeline
    // flip between two vocabularies mid-startup.
    const phase = snapshotIsCurrent
      ? snapshot!.phase
      : sawSnapshot
        ? lastPhase
        : logIsCurrent
          ? logState.phase
          : "launching";
    if (phase && phase !== lastPhase) {
      lastPhase = phase;
      timeline.push({
        phase,
        atSeconds: Number(elapsed().toFixed(1)),
        detail: typeof snapshot?.modulesLoaded === "number" ? `${snapshot.modulesLoaded} modules` : undefined,
      });
    }

    const label = snapshot?.slowTask?.name ?? phase ?? "launching";
    const detail =
      typeof snapshot?.modulesLoaded === "number" && snapshot.modulesLoaded > 0
        ? `${snapshot.modulesLoaded} modules · ${elapsed().toFixed(0)}s`
        : `${elapsed().toFixed(0)}s`;

    bar?.update({ fraction: snapshot?.slowTask?.fraction ?? null, message: label, detail });

    // The channel the user actually sees.
    //
    // ONE scale, and it only ever goes up. The spec requires progress to
    // increase monotonically, and clients that draw a bar from it (or drop
    // out-of-order updates) are entitled to rely on that. An earlier version
    // switched between two scales - percent-of-slow-task when the engine had
    // one, elapsed-seconds-of-timeout when it did not - which alternate
    // constantly during startup, so the value swung 68 -> 12 -> 33 and any
    // strict client discarded the stream. The reference SDK client just fires
    // its callback and hid the bug.
    //
    // Elapsed seconds against the timeout is the only quantity that is
    // monotonic for the whole wait. The engine's own percentage is far more
    // interesting, so it goes in the message, where it can jump around freely.
    if (opts.onProgress) {
      const update = nextProgressUpdate({
        elapsedSeconds: elapsed(),
        maxWaitSeconds,
        lastReportedProgress,
        label,
        detail,
        slowTaskFraction: snapshot?.slowTask?.fraction,
      });
      if (update) {
        lastReportedProgress = update.progress;
        opts.onProgress(update);
      }
    }

    // Waiting cannot fix a prompt that needs a human, or a crash. Both verdicts
    // come from the log, so they only count once the log is this session's.
    if (logIsCurrent && logState.phase === "crashed") {
      return finish({ ready: false, elapsedSeconds: elapsed(), timeline, reason: "the editor crashed during startup", state: await readEngineState(projectPath ?? null) });
    }
    if (snapshot?.modal) {
      // The whole question, not a summary of it. A startup that stops on a
      // dialog stops because somebody has to read it and decide, and nothing
      // here answers it for them.
      const buttons = (snapshot.modal.buttons ?? []).filter((b) => b !== "");
      return finish({
        ready: false,
        elapsedSeconds: elapsed(),
        timeline,
        reason: describeBlockingDialog({
          title: snapshot.modal.title,
          message: snapshot.modal.message ?? "",
          buttons,
          choices: buttons.map((label) => ({ buttonLabel: label, respondWith: respondCallFor(label) })),
        }),
        state: await readEngineState(projectPath ?? null),
      });
    }
    if (logIsCurrent && logState.blocking) {
      return finish({ ready: false, elapsedSeconds: elapsed(), timeline, reason: logState.phase, state: await readEngineState(projectPath ?? null, { probeWindows: true }) });
    }

    // A prompt raised before the bridge module loads - the "modules are missing
    // or built with a different engine version" box is the common one - is a
    // native window, invisible to the snapshot (which has no Slate access that
    // early) and silent in the log unless the engine happened to write about
    // it. Waiting out the full timeout to discover that is useless, so once
    // startup has visibly stopped moving, look at the actual windows. The probe
    // costs a couple of seconds, hence the stall gate and the rate limit.
    // Fingerprint what is MOVING, never a clock. An earlier version folded the
    // log's age into this - a value that ticks every second - so the wait always
    // looked busy and the stall check never fired once in five minutes.
    // Absolute write time is stable while the log sits still and changes the
    // moment the engine writes again.
    const logWrittenAt =
      logState.secondsSinceWrite === null ? "" : Math.round(Date.now() / 1000 - logState.secondsSinceWrite);
    const activity = `${phase}|${snapshot?.slowTask?.name ?? ""}|${snapshot?.slowTask?.fraction ?? ""}|${snapshot?.modulesLoaded ?? ""}|${logWrittenAt}`;
    if (activity !== lastActivity) {
      lastActivity = activity;
      lastChangeAt = Date.now();
    } else if (Date.now() - lastChangeAt > STALLED_STARTUP_MS && Date.now() - lastWindowProbeAt > WINDOW_PROBE_INTERVAL_MS) {
      lastWindowProbeAt = Date.now();
      const stalledState = await readEngineState(projectPath ?? null, { probeWindows: true });
      if (stalledState.dialogs.length > 0) {
        const dialog = stalledState.dialogs[0];
        const text = (dialog.text ?? []).slice(0, 4).join(" | ");
        return finish({
          ready: false,
          elapsedSeconds: elapsed(),
          timeline,
          reason: `blocked on a native dialog before the bridge loaded: "${dialog.title || dialog.className}" ${text}`.trim(),
          state: stalledState,
        });
      }
      if (!stalledState.running) {
        return finish({
          ready: false,
          elapsedSeconds: elapsed(),
          timeline,
          reason: "the editor process is gone - it exited during startup",
          state: stalledState,
        });
      }
    }

    // Ready means both: the plugin says so, and the socket actually answers.
    // #758: the port is re-read every pass rather than resolved once, because
    // the bridge binds a per-project port and only publishes it to
    // Saved/UE_MCP_Bridge/port.json once it starts, so there is nothing to
    // resolve up front. #819: only that file is consulted, and only once it has
    // been written by this launch - a lockfile left behind by a crashed session
    // can point at a port some unrelated editor has since taken, and answering
    // "ready" on the strength of that is how a wait ends up watching the wrong
    // process.
    const target = resolveBridgeTarget(projectDir);
    const socketUp =
      target.ok &&
      lockfileIsFromThisLaunch(target.writtenAtMs, opts.launchedAtMs) &&
      (await isBridgeAvailable(bridgeHost(projectDir), target.port));
    if (socketUp) {
      if (snapshot?.phase === "ready") {
        return finish({ ready: true, elapsedSeconds: elapsed(), timeline });
      }
      if (!sawSnapshot) {
        // A project on a plugin build without the status module never publishes
        // one. Give it a few seconds to appear before falling back to the old,
        // weaker signal - a single failed read must not be mistaken for that,
        // which is how a mid-startup editor got declared ready.
        if (socketUpSince === null) socketUpSince = Date.now();
        if (Date.now() - socketUpSince > 8000) {
          return finish({ ready: true, elapsedSeconds: elapsed(), timeline, reason: "bridge answered; this plugin build publishes no status snapshot" });
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return finish({
    ready: false,
    elapsedSeconds: elapsed(),
    timeline,
    reason: `still not ready after ${maxWaitSeconds}s`,
    state: await readEngineState(projectPath ?? null, { probeWindows: true }),
  });
}

/**
 * Decide the next progress update, or null when there is nothing new to send.
 *
 * Pure and exported so the monotonicity rule is testable without an editor.
 * The rule matters: the MCP spec requires `progress` to increase, and clients
 * that draw a bar (or drop out-of-order updates) rely on it. Elapsed seconds
 * against the timeout is the only value that holds for the whole wait; the
 * engine's own slow-task percentage swings up and down as tasks come and go,
 * so it belongs in the message where it is free to do that.
 */
export function nextProgressUpdate(input: {
  elapsedSeconds: number;
  maxWaitSeconds: number;
  lastReportedProgress: number;
  label: string;
  detail: string;
  slowTaskFraction?: number;
}): { progress: number; total: number; message: string } | null {
  const seconds = Math.min(Math.round(input.elapsedSeconds), input.maxWaitSeconds);
  if (seconds <= input.lastReportedProgress) return null;

  const percent =
    typeof input.slowTaskFraction === "number" ? ` ${Math.round(input.slowTaskFraction * 100)}%` : "";
  return {
    progress: seconds,
    total: input.maxWaitSeconds,
    message: `${input.label}${percent} (${input.detail})`,
  };
}

/** "config init 1.6s -> engine loop initialized 17.1s -> ready 20.7s" */
function describeTimeline(timeline: ReadyPhase[]): string {
  if (timeline.length === 0) return "no phases observed";
  return timeline.map((entry) => `${entry.phase} ${entry.atSeconds}s`).join(" -> ");
}

/** Startup-only editor settings travel in the environment, because the bridge
 *  reads them before it is listening. Kept in one place so a second setting
 *  cannot quietly drop the first by rebuilding the env inline. */
function buildEditorLaunchEnv(dialogPolicy?: string, paramEcho?: boolean): NodeJS.ProcessEnv {
  if (!dialogPolicy && !paramEcho) return process.env;
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (dialogPolicy) env.UE_MCP_DIALOG_POLICY = dialogPolicy;
  if (paramEcho) env.UE_MCP_PARAM_ECHO = "1";
  return env;
}

export async function startEditor(
  project: ProjectContext,
  timeoutSeconds = 300,
  onProgress?: ProgressFn,
  opts: {
    /**
     * #968: `pattern=response;...`, handed to the editor as
     * UE_MCP_DIALOG_POLICY so the plugin can answer a prompt raised during
     * startup. The bridge is not listening yet at that point, so a policy set
     * over the socket afterwards is always too late for the modal that stalled
     * the launch in the first place.
     */
    dialogPolicy?: string;

    /**
     * Arm the bridge's parameter echo for this editor. The live tier's leak
     * assertions, which prove a routing key never reaches an editor, can only
     * run when the editor was LAUNCHED with it: it is read at startup, so
     * turning it on over the socket afterwards is too late, exactly like the
     * dialog policy above. Without it those cases skip and say why, which
     * leaves the sharpest part of the tier unexercised by default.
     */
    paramEcho?: boolean;
  } = {},
): Promise<{ success: boolean; message: string; state?: EngineState; timeline?: ReadyPhase[]; elapsedSeconds?: number }> {
  // Every check below is about ONE editor: the one holding this project. Know
  // which project that is before looking at anything, because without it the
  // only available question is "is any editor running on this machine", and
  // refusing to launch on the strength of somebody else's editor is exactly the
  // bug this guard used to have (#819).
  if (!project.projectPath) {
    return { success: false, message: "No project loaded. Use project(action='set_project') first." };
  }
  const projectDir = path.dirname(project.projectPath);

  // Fast signal first: a bridge answering on the port THIS project published is
  // proof its editor is up, costs a millisecond, and needs no process table at
  // all. The process probe (seconds, on Windows) only runs when that fails,
  // which is also the only case where its extra detail is worth anything.
  // A lockfile whose process is gone was left by a crash, and the port it names
  // can since have been taken by something else, so an answer on it proves
  // nothing. Discarding it here costs a syscall and keeps a stale file from
  // refusing a launch forever.
  const target = resolveBridgeTarget(projectDir);
  const targetIsLive = target.ok && (target.pid === null || isPidAlive(target.pid));
  if (target.ok && targetIsLive && (await isBridgeAvailable(bridgeHost(projectDir), target.port))) {
    return {
      success: false,
      message: `Editor is already running for this project (its bridge is answering on port ${target.port}).`,
    };
  }

  const alreadyRunning = await findInteractiveEditors(project.projectPath);
  if (alreadyRunning.length > 0) {
    const state = await readEngineState(project.projectPath, { probeWindows: true });
    return {
      success: false,
      message: `Editor is already running for this project (pid ${alreadyRunning.map((p) => p.pid).join(", ")}) but its bridge is not answering yet. ${state.summary}`,
      state,
    };
  }

  const editorExe = findEditorExecutable(project);
  if (!editorExe) {
    return {
      success: false,
      message: editorExecutableFailure(project),
    };
  }

  try {
    // Recorded before the spawn so the wait can tell the lockfile this editor
    // publishes from one an earlier session left behind.
    const launchedAtMs = Date.now();
    const editorProcess = spawn(editorExe, [project.projectPath], {
      stdio: "ignore",
      detached: true,
      env: buildEditorLaunchEnv(opts.dialogPolicy, opts.paramEcho),
    });

    editorProcess.unref();

    // Hold here until the editor is actually usable, drawing the startup as a
    // progress bar. Returning as soon as the socket answered is what left
    // callers polling get_engine_state in a loop while shaders compiled.
    const result = await waitForEditorReady(project.projectPath, projectDir, timeoutSeconds, { onProgress, launchedAtMs });

    if (!result.ready) {
      return {
        success: false,
        message: `Editor launched but did not become ready: ${result.reason}. Startup reached: ${describeTimeline(result.timeline)}.`,
        timeline: result.timeline,
        elapsedSeconds: Number(result.elapsedSeconds.toFixed(1)),
        ...(result.state ? { state: result.state } : {}),
      };
    }

    return {
      success: true,
      message: `Editor ready in ${result.elapsedSeconds.toFixed(1)}s (waited through startup: ${describeTimeline(result.timeline)}). No further status polling is needed.`,
      timeline: result.timeline,
      elapsedSeconds: Number(result.elapsedSeconds.toFixed(1)),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to launch editor: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Fallback for plugin builds without the native request_editor_shutdown
// handler: ask the editor to quit ITSELF, on the game thread, via a deferred
// slate tick so the bridge can reply before the process exits. This is a clean
// in-process exit, not an OS kill.
const EDITOR_SELF_QUIT_PY = [
  "import unreal",
  "def _ue_mcp_quit(dt):",
  "    try:",
  "        unreal.SystemLibrary.quit_editor()",
  "    except Exception as e:",
  "        unreal.log_error('ue-mcp quit_editor failed: ' + str(e))",
  "unreal.register_slate_post_tick_callback(_ue_mcp_quit)",
].join("\n");

/**
 * The .uproject inside a project directory. The stop/restart paths are handed a
 * directory, but the process probe matches editors by the project file they
 * have open, so resolve one from the other.
 */
function uprojectInDir(projectDir?: string): string | null {
  if (!projectDir) return null;
  try {
    const match = fs.readdirSync(projectDir).find((f) => f.toLowerCase().endsWith(".uproject"));
    return match ? path.join(projectDir, match) : null;
  } catch {
    return null;
  }
}

/**
 * What one bridge call on a throwaway socket came back with.
 *
 * A reply alone is not acceptance, and the three ways a call can fail need
 * telling apart: the socket never answered, the bridge answered with a
 * JSON-RPC error (which is what an unregistered method does, so it is how an
 * older plugin build announces itself), or the handler answered by refusing
 * with `result.success === false`. The stop path decides something different
 * in each case, and it needs the handler's own payload to say why.
 */
interface BridgeReply {
  /** The socket answered at all. */
  answered: boolean;
  /** JSON-RPC error: usually a method this plugin build does not register. */
  methodError: boolean;
  /** The handler answered with `success: false`. */
  refused: boolean;
  /** The handler's payload, when the reply carried a readable one. */
  result: Record<string, unknown> | null;
}

function callBridgeOnce(
  port: number,
  method: string,
  params: Record<string, unknown>,
  host: string = bridgeHost(),
): Promise<BridgeReply> {
  return new Promise<BridgeReply>((resolve) => {
    let settled = false;
    // Same host the reachability probe uses. Probing one host and sending the
    // quit to another is its own way of reaching an editor nobody addressed.
    const ws = new WebSocket(`ws://${host}:${port}`);
    const finish = (reply: BridgeReply) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ignore */ }
      resolve(reply);
    };
    const silent: BridgeReply = { answered: false, methodError: false, refused: false, result: null };
    const timer = setTimeout(() => finish(silent), 8000);
    ws.on("open", () => ws.send(JSON.stringify({ id: "ue-mcp-stop", method, params })));
    ws.on("message", (data: unknown) => {
      clearTimeout(timer);
      try {
        const msg = JSON.parse(String(data)) as { error?: unknown; result?: Record<string, unknown> };
        if (msg.error) return finish({ answered: true, methodError: true, refused: false, result: null });
        const result = msg.result && typeof msg.result === "object" ? msg.result : null;
        return finish({
          answered: true,
          methodError: false,
          refused: result?.success === false,
          result,
        });
      } catch {
        // An unparseable reply still means the bridge is answering; treat it
        // the same as it was treated before the native path existed.
        return finish({ answered: true, methodError: false, refused: false, result: null });
      }
    });
    ws.on("error", () => { clearTimeout(timer); finish(silent); });
  });
}

/** The call went out and the handler accepted it. */
function accepted(reply: BridgeReply): boolean {
  return reply.answered && !reply.methodError && !reply.refused;
}

function sendOneBridgeCall(
  port: number,
  method: string,
  params: Record<string, unknown>,
  host: string = bridgeHost(),
): Promise<boolean> {
  return callBridgeOnce(port, method, params, host).then(accepted);
}

/**
 * Package names out of a handler payload, whatever shape it uses.
 *
 * `request_editor_shutdown` reports plain strings under dirtyContentPackages /
 * dirtyMapPackages; `list_dirty_packages` reports `{ package }` objects under
 * content / maps. Both are read here so the fallback path for an older plugin
 * build names the same packages as the native one.
 */
function collectPackageNames(result: Record<string, unknown> | null, keys: readonly string[]): string[] {
  const names = new Set<string>();
  for (const key of keys) {
    const value = result?.[key];
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      if (typeof entry === "string" && entry !== "") names.add(entry);
      else if (entry && typeof entry === "object") {
        const named = (entry as { package?: unknown }).package;
        if (typeof named === "string" && named !== "") names.add(named);
      }
    }
  }
  return [...names].sort();
}

const SHUTDOWN_DIRTY_KEYS = ["dirtyContentPackages", "dirtyMapPackages"] as const;
const LIST_DIRTY_KEYS = ["content", "maps"] as const;

/**
 * What is unsaved, asked of an editor whose plugin build has no
 * `request_editor_shutdown`. Null means the question could not be answered at
 * all, which is not the same as "nothing is dirty" and is never treated as it.
 */
async function readDirtyPackages(port: number, host: string): Promise<string[] | null> {
  const reply = await callBridgeOnce(port, "list_dirty_packages", {}, host);
  if (!reply.answered || reply.methodError || reply.refused || !reply.result) return null;
  return collectPackageNames(reply.result, LIST_DIRTY_KEYS);
}

/**
 * Ask the editor to quit itself via the bridge, through the native
 * `request_editor_shutdown` handler, which is also the action a caller can
 * reach directly. It ends PIE first, closes only once play has actually
 * stopped, and with `requireClean` it refuses on a dirty package and names
 * every one WITHOUT scheduling anything. That refusal is what stop_editor's
 * default is built on: the same check, in the same handler, so the two actions
 * cannot disagree about whether closing is safe.
 *
 * Returns the reply rather than a verdict, because the dirty-package list in
 * the payload is the whole point of asking.
 */
function requestNativeShutdown(port: number, host: string, requireClean: boolean): Promise<BridgeReply> {
  return callBridgeOnce(port, "request_editor_shutdown", { requireClean, endPIE: true }, host);
}

/**
 * The quit for an editor whose plugin build predates the native handler. Never
 * touches the OS process table.
 */
function requestPythonSelfQuit(port: number, host: string): Promise<boolean> {
  return sendOneBridgeCall(port, "execute_python", { code: EDITOR_SELF_QUIT_PY }, host);
}

/**
 * A modal dialog blocking the editor, read straight out of the engine.
 *
 * `list_dialogs` is modal-safe, so it answers while the game thread is parked
 * inside the modal loop, which is exactly when every other handler times out.
 * The message is carried WHOLE: this is the text a person reads to decide, and
 * a question cut off mid-sentence is a question answered on incomplete
 * information.
 */
export interface BlockingDialog {
  title: string;
  /** The complete message text, never truncated. */
  message: string;
  /** Every button label, in the order the dialog lays them out. */
  buttons: string[];
  /** Each button paired with the exact call that presses it. */
  choices: { buttonLabel: string; respondWith: string }[];
}

/**
 * The exact call a caller copies to press one button.
 *
 * "Don't Save" carries an apostrophe, in the ASCII form or the typographic one
 * depending on the build, so a single-quoted literal would hand back a call
 * that does not parse - on the exact button where getting it wrong costs most.
 */
function respondCallFor(label: string): string {
  return /['’]/.test(label)
    ? `editor(action='respond_to_dialog', buttonLabel="${label}")`
    : `editor(action='respond_to_dialog', buttonLabel='${label}')`;
}

/** The dialog blocking this editor, or null when nothing is. */
async function readBlockingDialog(port: number, host: string): Promise<BlockingDialog | null> {
  const reply = await callBridgeOnce(port, "list_dialogs", {}, host);
  if (!accepted(reply) || !reply.result) return null;
  const dialogs = reply.result.dialogs;
  if (!Array.isArray(dialogs) || dialogs.length === 0) return null;

  const first = dialogs[0] as Record<string, unknown>;
  const buttons = Array.isArray(first.buttons)
    ? first.buttons.filter((b): b is string => typeof b === "string" && b !== "")
    : [];
  const supplied = Array.isArray(first.choices) ? (first.choices as Record<string, unknown>[]) : [];
  const choices = buttons.map((label) => {
    const match = supplied.find((c) => c.buttonLabel === label);
    return {
      buttonLabel: label,
      respondWith: typeof match?.respondWith === "string" ? match.respondWith : respondCallFor(label),
    };
  });
  return {
    title: typeof first.title === "string" ? first.title : "",
    message: typeof first.message === "string" ? first.message : "",
    buttons,
    choices,
  };
}

/**
 * The dialog, in full, with the exact call for every button.
 *
 * Nothing here is truncated, ranked or recommended. Which button to press is
 * the reader's decision and the report exists so they can make it from what the
 * editor actually asked, rather than from a summary of it.
 */
export function describeBlockingDialog(dialog: BlockingDialog): string {
  const lines = [
    `A modal dialog is blocking the editor, so nothing was sent to it and nothing was answered for you.`,
    "",
    `Title: ${dialog.title}`,
    "Message:",
    dialog.message === "" ? "(the dialog carries no readable message text)" : dialog.message,
    "",
  ];
  if (dialog.choices.length > 0) {
    lines.push("Buttons, in the order the dialog lays them out. Press one:");
    for (const [index, choice] of dialog.choices.entries()) {
      lines.push(`  ${index + 1}. ${choice.buttonLabel}   ${choice.respondWith}`);
    }
  } else {
    lines.push(
      "The dialog exposes no button label that can be read, so there is nothing to name. " +
        "editor(action='respond_to_dialog', action='close') destroys the window, which is not the same as answering it.",
    );
  }
  return lines.join("\n");
}

/**
 * Put the dialog to the person, through MCP elicitation, and press whichever
 * button they choose.
 *
 * This is the one path that ends with a button being pressed without a separate
 * respond_to_dialog call, and it presses only what the user picked from the
 * dialog's own labels, in a prompt carrying its full text. Declining leaves the
 * dialog exactly where it is.
 *
 * Returns the label pressed, or null when nothing was.
 */
async function askUserToAnswerDialog(
  port: number,
  host: string,
  dialog: BlockingDialog,
  elicit: ElicitFn,
): Promise<string | null> {
  if (dialog.choices.length === 0) return null;

  const LEAVE_OPEN = "Leave the dialog open";
  let answer;
  try {
    answer = await elicit({
      message: [
        "Unreal Editor is blocked on a modal dialog and is waiting for an answer.",
        "",
        `Title: ${dialog.title}`,
        dialog.message === "" ? "(no message text)" : dialog.message,
        "",
        "Choose the button to press. Nothing is pressed unless you choose it.",
      ].join("\n"),
      requestedSchema: {
        type: "object",
        properties: {
          button: {
            type: "string",
            title: "Button",
            description: "The dialog's own buttons, in the order it lays them out.",
            enum: [...dialog.buttons, LEAVE_OPEN],
          },
        },
        required: ["button"],
      },
    });
  } catch {
    // No elicitation UI, or the prompt failed. The dialog stays up and the
    // report is what the caller gets.
    return null;
  }

  if (answer.action !== "accept") return null;
  const chosen = answer.content?.button;
  if (typeof chosen !== "string" || chosen === LEAVE_OPEN) return null;
  if (!dialog.buttons.includes(chosen)) return null;

  const pressed = await callBridgeOnce(port, "respond_to_dialog", { buttonLabel: chosen }, host);
  return accepted(pressed) ? chosen : null;
}

/**
 * What is holding the editor open, in the words of the thing holding it.
 *
 * A stop that times out used to say only "close it manually", which left the
 * caller to make two more calls (get_engine_state, then list_dialogs) to learn
 * something the bridge already knew. If a modal is up, the whole question goes
 * in the report: title, the message in full, and the exact call for every
 * button. Nothing is truncated and no button is recommended.
 */
function blockedStopDetail(state: EngineState): string {
  const modal = state.snapshot?.modal;
  if (!modal) return ` ${state.summary}`;

  const buttons = (modal.buttons ?? []).filter((b) => b !== "");
  return (
    " " +
    describeBlockingDialog({
      title: modal.title,
      message: modal.message ?? "",
      buttons,
      choices: buttons.map((label) => ({ buttonLabel: label, respondWith: respondCallFor(label) })),
    })
  );
}

/**
 * Which editor belongs to the loaded project, decided once so that every
 * lifecycle action agrees about it.
 *
 * #967/#970: stop_editor and request_editor_shutdown act on the same editor
 * through different code paths, and only one of them checked ownership. The
 * check it used compared a lockfile pid against a process, then printed the
 * process's whole command line as evidence of a project mismatch - which, when
 * the command line parse was broken, was the loaded project's own .uproject.
 * Both actions now ask this one function, so they can no longer disagree.
 */
export type EditorOwnership =
  | {
      owned: true;
      port: number;
      pid: number | null;
      /** Where the address came from, for a caller that wants to say so. */
      source: string;
      /** Set when the shared lockfile was stale and a live editor was found instead. */
      healed?: string;
    }
  | { owned: false; message: string; state?: EngineState };

/**
 * The editor holding `projectPath` open, resolved from what this project
 * published and cross-checked against the process table.
 *
 * A lockfile that no longer describes a live editor of this project is a stale
 * lockfile, and it is said in those words. It is never reported as a project
 * mismatch, and the file is never blamed while a healthy editor is still
 * listening: the recovery is to resolve the process that actually holds the
 * .uproject, which is what this does before it refuses anything.
 */
export async function resolveOwnedEditor(
  projectDir?: string | null,
  projectPath?: string | null,
): Promise<EditorOwnership> {
  if (!projectDir || !projectPath) {
    return {
      owned: false,
      message:
        "No project is loaded, so there is no editor to aim at. Use project(action='set_project') first. " +
        "A lifecycle action never falls back to whichever editor it can find.",
    };
  }

  const target = resolveBridgeTarget(projectDir);
  if (!target.ok) {
    const running = await findInteractiveEditors(projectPath);
    if (running.length === 0) {
      return { owned: false, message: `Editor is not running for this project. ${target.reason}` };
    }
    const state = await readEngineState(projectPath, { probeWindows: true });
    return {
      owned: false,
      message:
        `Editor is running (pid ${running.map((p) => p.pid).join(", ")}) but no bridge port is published for it, ` +
        `so it cannot be asked to quit cleanly. ${target.reason} ${state.summary} ` +
        "Close it manually - ue-mcp never force-kills processes.",
      state,
    };
  }

  // Plugin builds before the lockfile carried a pid leave nothing to identify
  // the listener with, so the process table has to answer instead.
  if (target.pid === null) {
    if ((await findInteractiveEditors(projectPath)).length === 0) {
      return {
        owned: false,
        message:
          `The bridge lockfile at ${target.lockfilePath} records no pid (older plugin build) and no editor for this ` +
          `project is running, so port ${target.port} cannot be shown to belong to it. Nothing was asked to quit.`,
      };
    }
    return { owned: true, port: target.port, pid: null, source: target.source };
  }

  // The lockfile was written by an editor that had THIS project open, but it
  // outlives a crash, and the port it names can be taken by something else
  // afterwards (#819). A process whose command line could not be read is not
  // evidence against it: "might be ours" is the only honest answer there, and
  // the lockfile already says whose it is.
  const owner = await findEditorByPid(target.pid);
  if (owner && (owner.projectPath === null || editorOwnsProject(owner, projectPath))) {
    return { owned: true, port: target.port, pid: target.pid, source: target.source };
  }

  // The lockfile does not describe an editor of this project any more. Before
  // refusing, look for the editor that does: it publishes its own address to
  // instances/<pid>.json, which no other instance can take away (#934). Telling
  // the user to delete a file while a healthy editor is listening would throw
  // away the bridge's only handle on it, which is exactly what used to happen.
  const live = await findInteractiveEditors(projectPath);
  const record = live.length > 0 ? findLiveInstanceRecord(projectDir, (pid) => live.some((p) => p.pid === pid)) : null;
  if (record) {
    return {
      owned: true,
      port: record.port,
      pid: record.pid,
      source: "instance-record",
      healed:
        `${target.lockfilePath} names pid ${target.pid}, which is no longer the editor for this project. ` +
        `The editor that is (pid ${record.pid}) was resolved from ${record.recordPath} instead.`,
    };
  }

  const staleDetail = owner
    ? `names pid ${target.pid}, which is no longer the editor for this project - that process now has ` +
      `${owner.projectPath} open`
    : `names pid ${target.pid}, which is no longer running`;
  return {
    owned: false,
    message:
      `Stale lockfile: ${target.lockfilePath} ${staleDetail}. No editor holding ${projectPath} open is running ` +
      `either, so nothing was asked to quit and port ${target.port} was not dialled - it may since have been taken ` +
      "by an unrelated process. The file is safe to delete; the next editor for this project republishes it.",
  };
}

export interface StopEditorResult {
  success: boolean;
  message: string;
  state?: EngineState;
  /** Why the stop refused, for a caller that would rather branch than parse. */
  refusedReason?: "unsaved-work" | "blocking-dialog" | "unknown-dirty-state";
  /** Every package that was dirty when the stop was asked for. */
  dirtyPackages?: string[];
  /** The dialog holding the editor, reported whole so a person can answer it. */
  blockingDialog?: BlockingDialog;
  /** Set when the user answered the dialog through an elicitation prompt. */
  dialogAnsweredByUser?: string;
}

/**
 * How the refusal reads. It names every dirty package and the ways forward,
 * and it offers no flag that would discard them, because there is not one:
 * losing unsaved work is not something this tool can be asked to do.
 */
function unsavedWorkRefusal(dirty: string[]): string {
  return (
    `Refusing to stop the editor: ${dirty.length} unsaved package${dirty.length === 1 ? " is" : "s are"} ` +
    `still dirty and stopping would lose ${dirty.length === 1 ? "it" : "them"}. Unsaved: ${dirty.join(", ")}. ` +
    "Nothing was sent to the editor, so no save prompt is open and the editor is exactly as it was. " +
    "Save them with editor(action='save_dirty') and re-call this, save the ones you want with level(save) or " +
    "asset(save) first, or close the editor yourself and answer its save prompt by hand."
  );
}

/**
 * Stop the editor by asking it to quit ITSELF through the bridge. ue-mcp NEVER
 * issues an OS kill: `taskkill /IM UnrealEditor.exe` matches by image name and
 * would also close the user's other editors (e.g. their real project).
 * Success is confirmed by the project's own bridge port going quiet, so it is
 * specific to this editor even when others are open.
 *
 * IT NEVER PRESSES A BUTTON AND IT NEVER DISCARDS. Two questions are asked
 * before anything is sent: is a modal dialog blocking the editor, and is any
 * package unsaved. Either one refuses, in under a second, with the whole
 * question in the report - the dialog's full text and every button paired with
 * the exact call that presses it, or every dirty package by name. The quit is
 * not sent in that case, so no save prompt is raised, nothing hangs, and
 * nothing is lost.
 *
 * There is deliberately no flag that discards. Where the client supports MCP
 * elicitation, a blocking dialog is put to the person instead, with the
 * dialog's own buttons as the choices, and only the button THEY pick is
 * pressed.
 *
 * The port comes from what this project published and nowhere else, and the
 * process behind it is checked before the quit goes out (#819).
 */
export async function stopEditor(
  projectDir?: string,
  opts: {
    /** Ask the connected client's user, when it advertised elicitation. */
    elicit?: ElicitFn;
  } = {},
): Promise<StopEditorResult> {
  const projectPath = uprojectInDir(projectDir);
  const ownership = await resolveOwnedEditor(projectDir, projectPath);
  if (!ownership.owned) {
    return { success: false, message: ownership.message, ...(ownership.state ? { state: ownership.state } : {}) };
  }

  const port = ownership.port;
  const host = bridgeHost(projectDir);
  const bridgeUp = await isBridgeAvailable(host, port);
  if (!bridgeUp && (await findInteractiveEditors(projectPath)).length === 0) {
    return { success: false, message: "Editor is not running" };
  }
  if (!bridgeUp) {
    // "Unreachable" is where the user is left guessing, so say what the engine
    // is actually doing: a modal dialog waiting on an answer, a slow task at
    // 60%, or a game thread that stopped ticking are all visible from outside.
    const state = await readEngineState(projectPath, { probeWindows: true });
    return {
      success: false,
      message: `Editor is running but its bridge is unreachable, so it cannot be asked to quit cleanly.${blockedStopDetail(state)} Close it manually - ue-mcp never force-kills processes.`,
      state,
    };
  }

  // FIRST: is a modal already up? list_dialogs is modal-safe, so it answers
  // while the game thread is parked inside the modal loop, which is exactly the
  // state where sending a quit would time out and teach nobody anything. Ask
  // before sending, and report the whole question rather than acting on it.
  let dialog = await readBlockingDialog(port, host);
  let answeredByUser: string | undefined;
  if (dialog) {
    if (opts.elicit) {
      const pressed = await askUserToAnswerDialog(port, host, dialog, opts.elicit);
      if (pressed !== null) {
        answeredByUser = pressed;
        // Their choice may have raised the next one. Look again rather than
        // assuming the editor is clear.
        dialog = await readBlockingDialog(port, host);
      }
    }
    if (dialog) {
      return {
        success: false,
        refusedReason: "blocking-dialog",
        blockingDialog: dialog,
        ...(answeredByUser ? { dialogAnsweredByUser: answeredByUser } : {}),
        message:
          describeBlockingDialog(dialog) +
          (answeredByUser
            ? `\n\nYou pressed "${answeredByUser}" on the previous dialog and this one came up behind it. `
            : "\n\n") +
          "The editor was not asked to quit. Answer the dialog, then call editor(action='stop_editor') again.",
      };
    }
  }

  // SECOND: what is unsaved. `requireClean` is the editor's own dirty check,
  // the one editor(request_editor_shutdown) applies, and with it set the
  // handler refuses and names every dirty package WITHOUT scheduling a close.
  // So a refusal here means nothing was asked to quit.
  const shutdown = await requestNativeShutdown(port, host, true);
  const dirty = collectPackageNames(shutdown.result, SHUTDOWN_DIRTY_KEYS);

  if (shutdown.refused) {
    if (dirty.length > 0) {
      return {
        success: false,
        refusedReason: "unsaved-work",
        dirtyPackages: dirty,
        message: unsavedWorkRefusal(dirty),
      };
    }
    const why = typeof shutdown.result?.error === "string" ? shutdown.result.error : "it gave no reason";
    return {
      success: false,
      message:
        `The editor refused to schedule its own shutdown: ${why}. Nothing was asked to quit. ` +
        "ue-mcp never force-kills processes.",
    };
  }

  if (!accepted(shutdown)) {
    // No native handler (an older plugin build), or no answer at all. Ask the
    // dirty question separately before falling back to the Python quit. A
    // question that cannot be answered is not an answer of "clean": it refuses
    // too, and says so.
    const fallbackDirty = await readDirtyPackages(port, host);
    if (fallbackDirty === null) {
      const cause = shutdown.answered
        ? "This editor's plugin build answers neither request_editor_shutdown nor list_dirty_packages"
        : "The editor's bridge stopped answering while it was being asked what is unsaved";
      return {
        success: false,
        refusedReason: "unknown-dirty-state",
        message:
          `${cause}, so whether anything is unsaved cannot be established and stopping would risk losing it. ` +
          "Nothing was asked to quit. Save with editor(action='save_dirty'), or close the editor yourself and " +
          "answer whatever it asks.",
      };
    }
    if (fallbackDirty.length > 0) {
      return {
        success: false,
        refusedReason: "unsaved-work",
        dirtyPackages: fallbackDirty,
        message: unsavedWorkRefusal(fallbackDirty),
      };
    }

    if (!(await requestPythonSelfQuit(port, host))) {
      return {
        success: false,
        message: "Could not deliver a quit request to the editor bridge. Close the editor manually - ue-mcp never force-kills processes.",
      };
    }
  }

  // Confirm via the project's own bridge port closing - specific to this editor.
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!(await isBridgeAvailable(host, port))) {
      return {
        success: true,
        message:
          "Editor quit itself via the bridge." +
          (answeredByUser ? ` You answered its dialog with "${answeredByUser}".` : "") +
          (ownership.healed ? ` ${ownership.healed}` : ""),
        ...(answeredByUser ? { dialogAnsweredByUser: answeredByUser } : {}),
      };
    }
  }

  // It was clean and unblocked when the quit went out, so whatever is holding
  // it started afterwards. Say what that is, in full.
  const blockedState = await readEngineState(projectPath, { probeWindows: false });
  const late = await readBlockingDialog(port, host);
  return {
    success: false,
    message:
      "Asked the editor to quit but its bridge is still up after 20s." +
      (late ? " " + describeBlockingDialog(late) : blockedStopDetail(blockedState)) +
      " Nothing was dirty and no dialog was up when the quit went out, and nothing here presses a button for you." +
      " ue-mcp never force-kills processes.",
    ...(late ? { blockingDialog: late, refusedReason: "blocking-dialog" as const } : {}),
    state: blockedState,
  };
}

export async function restartEditor(
  project: ProjectContext,
  bridge?: { connect: (timeoutMs?: number) => Promise<void> },
  opts: { elicit?: ElicitFn } = {},
): Promise<{ success: boolean; message: string }> {
  // Same rule as start and stop: without a loaded project there is no editor
  // this is about, and the machine-wide answer is somebody else's editor (#819).
  if (!project.projectPath) {
    return { success: false, message: "No project loaded. Use project(action='set_project') first." };
  }

  // A restart inherits the stop's rules whole: it refuses on unsaved work and
  // on a blocking dialog rather than acting on either. Restarting is not a
  // reason to lose a package or to answer a question for somebody.
  const stopResult = await stopEditor(project.projectDir ?? undefined, { elicit: opts.elicit });
  // Whether the stop mattered is a question about THIS project's editor: a
  // failed stop with nothing of ours left running just means it was already
  // down, and another project's editor being up says nothing either way.
  if (!stopResult.success && (await findInteractiveEditors(project.projectPath)).length > 0) {
    return { success: false, message: `Failed to stop editor: ${stopResult.message}` };
  }

  // Wait for process to fully terminate and release locks
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const startResult = await startEditor(project);
  if (!startResult.success) {
    return startResult;
  }

  // Reconnect the bridge if provided
  if (bridge) {
    try {
      await bridge.connect(5000);
    } catch {
      // Bridge reconnect timer will handle it
    }
  }

  return startResult;
}

export interface BuildResult {
  success: boolean;
  message: string;
  exitCode: number | null;
}

function getPlatformString(): string {
  if (IS_WINDOWS) return "Win64";
  if (process.platform === "darwin") return "Mac";
  return "Linux";
}

export interface BuildOptions {
  onOutput?: (line: string) => void;
  /** Development (default), DebugGame, Shipping, Test. */
  configuration?: string;
  /** Win64, Mac, Linux. Defaults to the host platform. */
  platform?: string;
  /** Pass -Clean, which makes UnrealBuildTool rebuild from scratch. */
  clean?: boolean;
}

/**
 * Compile a project's C++ out of process, with UnrealBuildTool.
 *
 * Out of process is the point: UnrealBuildTool refuses to link while an editor
 * holds the module DLLs, so a full rebuild is exactly the case where the editor
 * must be down, and an editor that is down cannot answer a bridge call (#958).
 */
export async function buildProject(
  projectPath: string,
  opts: BuildOptions = {},
): Promise<BuildResult> {
  const resolvedPath = path.resolve(projectPath);

  if (!fs.existsSync(resolvedPath)) {
    return { success: false, exitCode: null, message: `Project file not found: ${resolvedPath}` };
  }

  // The failure names every location probed. The old message named one env var
  // and nothing else, so a missing tool, a wrong root and an unsupported layout
  // all read identically (#974).
  let buildTool: string;
  try {
    const engine = selectEngine(
      engineLookupFor(
        resolvedPath,
        readEngineAssociation(resolvedPath),
        readProjectEditorConfig(resolvedPath),
      ),
      "buildTool",
    );
    if (!engine.buildTool) throw new EngineResolutionError("Resolved engine names no build tool.", []);
    buildTool = engine.buildTool;
  } catch (err) {
    return {
      success: false,
      exitCode: null,
      message: err instanceof EngineResolutionError ? err.message : String(err),
    };
  }

  const projectName = path.basename(resolvedPath, ".uproject");
  const target = `${projectName}Editor`;
  const platform = opts.platform?.trim() || getPlatformString();
  const configuration = opts.configuration?.trim() || "Development";

  // #740: the quotes around the project path are SHELL syntax, not part of the
  // value. On Windows the args are joined into a single `cmd /c` string, so
  // they are required. Off Windows the args go straight into argv with no shell
  // to strip them, so UnrealBuildTool received a path containing literal quote
  // characters and reported "Unable to find project file" for a file that was
  // plainly there - while the same command pasted into a terminal worked,
  // because the shell removed them first.
  const commonArgs = [target, platform, configuration];
  const tailArgs = ["-WaitMutex", "-FromMsBuild", ...(opts.clean ? ["-Clean"] : [])];
  const windowsArgs = [...commonArgs, `-Project="${resolvedPath}"`, ...tailArgs];
  const posixArgs = [...commonArgs, `-Project=${resolvedPath}`, ...tailArgs];

  return new Promise((resolve) => {
    let proc;
    if (IS_WINDOWS) {
      const quotedCommand = `"${buildTool}"`;
      const fullCommand = `cmd /c "${quotedCommand} ${windowsArgs.join(" ")}"`;
      proc = spawn(fullCommand, [], { shell: true, stdio: "pipe" });
    } else {
      proc = spawn(buildTool, posixArgs, { stdio: "pipe" });
    }

    const forward = (data: Buffer) => {
      const text = data.toString();
      if (opts.onOutput) opts.onOutput(text);
      else process.stdout.write(text);
    };

    if (proc.stdout) proc.stdout.on("data", forward);
    if (proc.stderr) proc.stderr.on("data", forward);

    proc.on("close", (code) => {
      // A build is the only event that can turn a "stale plugin" verdict fresh
      // ahead of the cache TTL, so drop the cached answer here rather than
      // making the next get_status report a binary that no longer exists.
      // Only this project's: a build in one editor says nothing about another.
      invalidatePluginFreshness(resolvedPath);
      resolve(
        code === 0
          ? { success: true, exitCode: 0, message: `Build succeeded (${target} ${platform} ${configuration})` }
          : { success: false, exitCode: code, message: `Build failed with exit code ${code}` },
      );
    });

    proc.on("error", (err) => {
      resolve({ success: false, exitCode: null, message: `Build error: ${err.message}` });
    });
  });
}
