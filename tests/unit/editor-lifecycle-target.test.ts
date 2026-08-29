/**
 * Lifecycle actions must act on the editor for the loaded project and on no
 * other one (#819). These cover the paths where the port lockfile cannot vouch
 * for a listener, which is where the old resolver fell through to port 9877 and
 * a stop request could reach a different project's editor.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorProcess } from "../../src/engine-observer.js";

vi.mock("../../src/engine-observer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/engine-observer.js")>();
  return {
    ...actual,
    listEditorProcesses: vi.fn(async () => []),
    findInteractiveEditors: vi.fn(async () => []),
    findEditorByPid: vi.fn(async () => null),
    readEngineState: vi.fn(async () => ({
      running: true,
      processes: [],
      log: { logPath: null, secondsSinceWrite: null, phase: "unknown", blocking: false, lastLine: null, tail: [], errors: [], warnings: [] },
      snapshot: null,
      dialogs: [],
      summary: "stubbed engine state.",
      blocked: false,
    })),
  };
});

const observer = await import("../../src/engine-observer.js");
const { startEditor, stopEditor, restartEditor } = await import("../../src/editor-control.js");
const { bridgeLockfilePath } = await import("../../src/editor-target.js");
const { ProjectContext } = await import("../../src/project.js");

const findInteractiveEditors = vi.mocked(observer.findInteractiveEditors);
const findEditorByPid = vi.mocked(observer.findEditorByPid);

const temporaryRoots: string[] = [];

function makeProject(): { projectDir: string; projectPath: string } {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "ue-mcp-lifecycle-"));
  temporaryRoots.push(projectDir);
  const projectPath = path.join(projectDir, "Demo.uproject");
  fs.writeFileSync(projectPath, JSON.stringify({ EngineAssociation: "5.8" }));
  return { projectDir, projectPath };
}

function writeLockfile(projectDir: string, contents: Record<string, unknown>): void {
  const file = bridgeLockfilePath(projectDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(contents));
}

function editor(pid: number, projectPath: string | null): EditorProcess {
  return { pid, commandLine: "", projectPath, headless: false, responding: true, windowTitle: null };
}

afterEach(() => {
  vi.clearAllMocks();
  findInteractiveEditors.mockResolvedValue([]);
  findEditorByPid.mockResolvedValue(null);
  while (temporaryRoots.length > 0) {
    fs.rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
  }
});

describe("stopEditor targeting", () => {
  it("refuses without a loaded project instead of hunting for an editor", async () => {
    const result = await stopEditor(undefined);
    expect(result.success).toBe(false);
    expect(result.message).toContain("set_project");
    expect(findInteractiveEditors).not.toHaveBeenCalled();
  });

  it("names the lockfile it checked when no port is published", async () => {
    const { projectDir } = makeProject();
    const result = await stopEditor(projectDir);
    // No lockfile and no editor process is the editor being DOWN, which is what
    // a stop was asked for: reported as an idempotent success, not a refusal,
    // so a flow step that stops before building walks on. The targeting
    // assertion is unchanged - it still names the file it read and still
    // refuses to invent a default port.
    expect(result.success).toBe(true);
    expect(result.alreadyStopped).toBe(true);
    expect(result.message).toContain(bridgeLockfilePath(projectDir));
    expect(result.message).not.toContain("9877");
  });

  it("does not guess a port when UE_MCP_PORT is set and the lockfile is gone", async () => {
    const previous = process.env.UE_MCP_PORT;
    process.env.UE_MCP_PORT = "9877";
    try {
      const { projectDir } = makeProject();
      const result = await stopEditor(projectDir);
      expect(result.success).toBe(true);
      expect(result.alreadyStopped).toBe(true);
      expect(result.message).toContain("Editor is not running for this project");
    } finally {
      if (previous === undefined) delete process.env.UE_MCP_PORT;
      else process.env.UE_MCP_PORT = previous;
    }
  });

  it("reports the running editor when it published no port", async () => {
    const { projectDir, projectPath } = makeProject();
    findInteractiveEditors.mockResolvedValue([editor(777, projectPath)]);

    const result = await stopEditor(projectDir);
    expect(result.success).toBe(false);
    expect(result.message).toContain("777");
    expect(result.message).toContain("never force-kills");
  });

  it("does not trust the port on a lockfile whose process is gone", async () => {
    const { projectDir } = makeProject();
    writeLockfile(projectDir, { port: 51999, pid: 4242 });

    const result = await stopEditor(projectDir);
    // This is the branch a cleanly closed editor leaves behind, because the
    // plugin never deletes port.json: a file naming a dead pid with no editor
    // of this project running. The port is still not dialled, and the stop is
    // still idempotent rather than failed.
    expect(result.success).toBe(true);
    expect(result.alreadyStopped).toBe(true);
    expect(result.message).toContain("4242");
    expect(result.message).toContain("no longer running");
    expect(findEditorByPid).toHaveBeenCalledWith(4242);
  });

  it("calls a lockfile that names somebody else's process stale, not a project mismatch", async () => {
    const { projectDir } = makeProject();
    const otherProject = path.join(os.tmpdir(), "SomeoneElse", "Other.uproject");
    writeLockfile(projectDir, { port: 51999, pid: 4242 });
    findEditorByPid.mockResolvedValue(editor(4242, otherProject));

    const result = await stopEditor(projectDir);
    expect(result.success).toBe(true);
    expect(result.alreadyStopped).toBe(true);
    expect(result.message).toContain("Stale lockfile");
    expect(result.message).toContain("Other.uproject");
    expect(result.message).toContain("no longer the editor for this project");
  });

  it("does not refuse the editor that actually has this project open (#967)", async () => {
    // The regression: the guard fired against the very editor it should match
    // and quoted that editor's own .uproject back as proof of a mismatch.
    const { projectDir, projectPath } = makeProject();
    writeLockfile(projectDir, { port: 51999, pid: 4242 });
    findEditorByPid.mockResolvedValue(editor(4242, projectPath));
    findInteractiveEditors.mockResolvedValue([editor(4242, projectPath)]);

    const result = await stopEditor(projectDir);
    // Nothing is listening on 51999 in a unit test, so the stop cannot finish.
    // What matters is that it got past ownership rather than refusing there.
    expect(result.message).not.toContain("Stale lockfile");
    expect(result.message).not.toContain("Delete that file");
    expect(result.message).toContain("bridge is unreachable");
  });

  it("self-heals to the live editor's own record instead of blaming the lockfile", async () => {
    // A stale pid in port.json while a healthy editor of this project is up:
    // telling the user to delete the file would discard the bridge's only
    // handle on it (#967/#934).
    const { projectDir, projectPath } = makeProject();
    writeLockfile(projectDir, { port: 51999, pid: 4242 });
    findEditorByPid.mockResolvedValue(null);
    findInteractiveEditors.mockResolvedValue([editor(777, projectPath)]);
    const record = path.join(projectDir, "Saved", "UE_MCP_Bridge", "instances", "777.json");
    fs.mkdirSync(path.dirname(record), { recursive: true });
    fs.writeFileSync(record, JSON.stringify({ pid: 777, port: 52222, state: "listening" }));

    const result = await stopEditor(projectDir);
    expect(result.message).not.toContain("Stale lockfile");
    expect(result.message).toContain("bridge is unreachable");
  });

  it("does not adopt a pidless lockfile when no editor for the project is running", async () => {
    const { projectDir } = makeProject();
    writeLockfile(projectDir, { port: 51999 });

    const result = await stopEditor(projectDir);
    expect(result.success).toBe(true);
    expect(result.alreadyStopped).toBe(true);
    expect(result.message).toContain("no pid");
  });
});

describe("start and restart without a loaded project", () => {
  it("startEditor asks for a project instead of scanning the machine", async () => {
    const result = await startEditor(new ProjectContext());
    expect(result.success).toBe(false);
    expect(result.message).toContain("set_project");
    expect(findInteractiveEditors).not.toHaveBeenCalled();
  });

  it("restartEditor asks for a project instead of scanning the machine", async () => {
    const result = await restartEditor(new ProjectContext());
    expect(result.success).toBe(false);
    expect(result.message).toContain("set_project");
    expect(findInteractiveEditors).not.toHaveBeenCalled();
  });
});

/**
 * Idempotency, and why it is a correctness property rather than a nicety.
 *
 * A `success: false` body FAILS the flow step that ran it and stops the whole
 * run, and flowkit's step schema has no `continue_on_error`, so there is no
 * per-step escape and `retries` only re-asks an editor that is still in the
 * same state. An action that reports "already in the state you asked for" as a
 * failure therefore aborts the two commonest flow shapes the tool's own
 * description advertises: stop, build, start; and make sure it is up, then
 * work. Both lifecycle halves report instead, with the marker this repo
 * already uses for a re-run.
 */
describe("lifecycle actions are idempotent", () => {
  it("reports a start for an editor that is already running, and spawns nothing", async () => {
    const { projectDir, projectPath } = makeProject();
    const project = new ProjectContext();
    project.setProject(projectPath);
    findInteractiveEditors.mockResolvedValue([editor(4242, projectPath)]);
    expect(projectDir).toBeTruthy();

    const result = await startEditor(project, 1);
    expect(result.success).toBe(true);
    expect(result.alreadyRunning).toBe(true);
    // Its bridge is not answering in a unit test, and that is reported as a
    // flag rather than left for a caller to read out of the sentence.
    expect(result.bridgeReady).toBe(false);
    expect(result.message).toContain("already running for this project");
  });

  it("reports a stop for an editor that is already down", async () => {
    const { projectDir } = makeProject();
    const result = await stopEditor(projectDir);
    expect(result.success).toBe(true);
    expect(result.alreadyStopped).toBe(true);
  });

  it("keeps a genuine refusal a refusal: a running editor with no port is still a failure", async () => {
    // Nothing idempotent about this one. An editor IS running and cannot be
    // reached, so the request was not satisfied and the step must fail.
    const { projectDir, projectPath } = makeProject();
    findInteractiveEditors.mockResolvedValue([editor(777, projectPath)]);

    const result = await stopEditor(projectDir);
    expect(result.success).toBe(false);
    expect(result.alreadyStopped).toBeUndefined();
    expect(result.message).toContain("777");
  });

  it("keeps refusing without a loaded project, which is a caller error and not a no-op", async () => {
    const stop = await stopEditor(undefined);
    expect(stop.success).toBe(false);
    expect(stop.alreadyStopped).toBeUndefined();
    const start = await startEditor(new ProjectContext());
    expect(start.success).toBe(false);
    expect(start.alreadyRunning).toBeUndefined();
  });
});

/**
 * The PIE half of the same contract, pinned at the source because the C++ is
 * built by the engine and not by this suite. A start with a session up and a
 * stop with none are the two re-runs, and both used to be MCPError.
 */
describe("pie_control reports a re-run rather than failing it", () => {
  const pieSource = fs.readFileSync(
    new URL(
      "../../plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/Private/Handlers/EditorHandlers_PIE.cpp",
      import.meta.url,
    ),
    "utf8",
  );

  it("no longer answers an active session with an error", () => {
    expect(pieSource).not.toContain('MCPError(TEXT("PIE session already active"))');
    expect(pieSource).toContain('SetBoolField(TEXT("alreadyRunning"), true)');
  });

  it("no longer answers an absent session with an error", () => {
    expect(pieSource).not.toContain('MCPError(TEXT("No PIE session active"))');
    expect(pieSource).toContain('SetBoolField(TEXT("alreadyStopped"), true)');
  });

  it("says both changed nothing, so a caller cannot read a no-op as a mutation", () => {
    // Two `changed` false fields, one per idempotent branch, alongside the
    // read-only status branch that already had one.
    const changedFalse = pieSource.match(/SetBoolField\(TEXT\("changed"\), false\)/g) ?? [];
    expect(changedFalse.length).toBeGreaterThanOrEqual(3);
  });
});

describe("native editor shutdown", () => {
  it("uses MainFrame so standalone asset editors close before subsystem teardown", () => {
    const source = fs.readFileSync(
      new URL(
        "../../plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/Private/Handlers/EditorHandlers.cpp",
        import.meta.url,
      ),
      "utf8",
    );
    const buildRules = fs.readFileSync(
      new URL(
        "../../plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/UE_MCP_Bridge.Build.cs",
        import.meta.url,
      ),
      "utf8",
    );
    const shutdownHandler = source.slice(
      source.indexOf("FEditorHandlers::RequestEditorShutdown"),
      source.indexOf("FEditorHandlers::FocusViewportOnActor"),
    );

    expect(source).toContain('#include "Interfaces/IMainFrameModule.h"');
    expect(buildRules).toContain('"MainFrame",');
    expect(shutdownHandler).toContain("FModuleManager::LoadModuleChecked<IMainFrameModule>");
    expect(shutdownHandler).toContain("MainFrameModule.RequestCloseEditor()");
    expect(shutdownHandler).not.toContain("UKismetSystemLibrary::QuitEditor()");
  });
});
