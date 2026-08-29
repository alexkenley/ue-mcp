/**
 * Nothing in this server presses a dialog button by itself, and stop_editor
 * never discards unsaved work.
 *
 * A modal dialog is a question for a person. stop_editor therefore asks two
 * questions before it sends anything: is a dialog blocking the editor, and is
 * any package unsaved. Either one refuses, reports the whole question, and
 * sends no quit.
 *
 * These are safety defaults, so the assertions are deliberately about what does
 * NOT go out over the socket: a stop must never send set_dialog_policy (arming
 * an answer for a prompt nobody has read) and must never send respond_to_dialog
 * unless a person chose that button through the elicitation prompt. A change
 * that puts auto-arming or auto-pressing back fails here.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocketServer, type WebSocket as ServerSocket } from "ws";
import type { EditorProcess } from "../../src/engine-observer.js";
import type { ElicitParams, ElicitResult } from "../../src/types.js";

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
const { stopEditor } = await import("../../src/editor-control.js");
const { bridgeLockfilePath } = await import("../../src/editor-target.js");

const findInteractiveEditors = vi.mocked(observer.findInteractiveEditors);
const findEditorByPid = vi.mocked(observer.findEditorByPid);

const EDITOR_PID = 4242;

/** Every call that would press or pre-answer a button on somebody's behalf. */
const BUTTON_PRESSING_METHODS = ["set_dialog_policy", "respond_to_dialog"];

interface FakeBridge {
  /** Every {method, params} the stop sent, in order. */
  calls: { method: string; params: Record<string, unknown> }[];
  methods: () => string[];
  port: number;
  /** Stop listening and drop the sockets, so the port goes quiet. */
  goQuiet: () => void;
  close: () => Promise<void>;
}

/**
 * A bridge that answers on a real socket. `stopEditor` deliberately opens its
 * own connection per call rather than going through the session bridge, so the
 * only honest way to observe what it sends is to listen for it.
 */
async function startFakeBridge(
  reply: (method: string, params: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<FakeBridge> {
  const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise<void>((resolve) => wss.once("listening", resolve));
  const calls: { method: string; params: Record<string, unknown> }[] = [];
  const sockets = new Set<ServerSocket>();

  wss.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw)) as { id?: string; method: string; params?: Record<string, unknown> };
      calls.push({ method: message.method, params: message.params ?? {} });
      const result = reply(message.method, message.params ?? {});
      if (result === null) {
        socket.send(JSON.stringify({ id: message.id, error: { code: -32601, message: "Unknown method" } }));
        return;
      }
      socket.send(JSON.stringify({ id: message.id, result }));
    });
  });

  return {
    calls,
    methods: () => calls.map((c) => c.method),
    port: (wss.address() as AddressInfo).port,
    goQuiet: () => {
      for (const socket of sockets) socket.terminate();
      wss.close();
    },
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.terminate();
        wss.close(() => resolve());
      }),
  };
}

const temporaryRoots: string[] = [];
const openBridges: FakeBridge[] = [];

function makeProject(port: number): string {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "ue-mcp-stop-"));
  temporaryRoots.push(projectDir);
  const projectPath = path.join(projectDir, "Demo.uproject");
  fs.writeFileSync(projectPath, JSON.stringify({ EngineAssociation: "5.8" }));

  const lockfile = bridgeLockfilePath(projectDir);
  fs.mkdirSync(path.dirname(lockfile), { recursive: true });
  fs.writeFileSync(lockfile, JSON.stringify({ port, pid: EDITOR_PID }));

  const editor: EditorProcess = {
    pid: EDITOR_PID,
    commandLine: "",
    projectPath,
    headless: false,
    responding: true,
    windowTitle: null,
  };
  findEditorByPid.mockResolvedValue(editor);
  findInteractiveEditors.mockResolvedValue([editor]);
  return projectDir;
}

let savedHost: string | undefined;

beforeEach(() => {
  savedHost = process.env.UE_MCP_HOST;
  delete process.env.UE_MCP_HOST;
});

afterEach(async () => {
  if (savedHost === undefined) delete process.env.UE_MCP_HOST;
  else process.env.UE_MCP_HOST = savedHost;
  vi.clearAllMocks();
  findInteractiveEditors.mockResolvedValue([]);
  findEditorByPid.mockResolvedValue(null);
  while (openBridges.length > 0) await openBridges.pop()!.close();
  while (temporaryRoots.length > 0) fs.rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

const NO_DIALOGS = { success: true, dialogs: [], count: 0 };

/** The editor's answer when its own dirty check refuses the shutdown. */
const DIRTY_REFUSAL = {
  success: false,
  error: "Editor has dirty content or map packages; save or discard them before requesting shutdown",
  scheduled: false,
  requireClean: true,
  dirtyContentPackages: ["/Game/Materials/M_Rock"],
  dirtyMapPackages: ["/Temp/Untitled_1"],
};

/** The real shutdown prompt: a long message and three buttons, none of them "OK". */
const SAVE_CONTENT_MESSAGE =
  "The following content and maps have been modified and are not saved.\n" +
  "Select the ones you want to save, or choose Don't Save to close without saving any of them.\n" +
  "Closing without saving discards every change made since the last save, and this cannot be undone.";

const SAVE_CONTENT_DIALOG = {
  success: true,
  count: 1,
  dialogs: [
    {
      title: "Save Content",
      message: SAVE_CONTENT_MESSAGE,
      messageTruncated: false,
      buttons: ["Save Selected", "Don't Save", "Cancel"],
      choices: [
        { buttonLabel: "Save Selected", respondWith: "editor(action='respond_to_dialog', buttonLabel='Save Selected')" },
        { buttonLabel: "Don't Save", respondWith: "editor(action='respond_to_dialog', buttonLabel=\"Don't Save\")" },
        { buttonLabel: "Cancel", respondWith: "editor(action='respond_to_dialog', buttonLabel='Cancel')" },
      ],
      policyMatched: false,
    },
  ],
};

describe("stop_editor never presses a button and never arms one", () => {
  it("arms no dialog policy and presses nothing while refusing a dirty editor", async () => {
    const bridge = await startFakeBridge((method) => {
      if (method === "list_dialogs") return NO_DIALOGS;
      if (method === "request_editor_shutdown") return DIRTY_REFUSAL;
      return { success: true };
    });
    openBridges.push(bridge);

    await stopEditor(makeProject(bridge.port));

    for (const forbidden of BUTTON_PRESSING_METHODS) {
      expect(bridge.methods()).not.toContain(forbidden);
    }
    expect(bridge.methods()).not.toContain("execute_python");
  });

  it("arms no dialog policy and presses nothing while stopping a clean editor", async () => {
    let bridge: FakeBridge;
    bridge = await startFakeBridge((method) => {
      if (method === "list_dialogs") return NO_DIALOGS;
      if (method === "request_editor_shutdown") {
        setTimeout(() => bridge.goQuiet(), 50);
        return { success: true, scheduled: true, dirtyContentPackages: [], dirtyMapPackages: [] };
      }
      return { success: true };
    });
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port));

    expect(result.success).toBe(true);
    expect(bridge.methods()).toEqual(["list_dialogs", "request_editor_shutdown"]);
  });

  it("arms no dialog policy and presses nothing when a dialog is already blocking", async () => {
    const bridge = await startFakeBridge((method) =>
      method === "list_dialogs" ? SAVE_CONTENT_DIALOG : { success: true },
    );
    openBridges.push(bridge);

    await stopEditor(makeProject(bridge.port));

    for (const forbidden of BUTTON_PRESSING_METHODS) {
      expect(bridge.methods()).not.toContain(forbidden);
    }
  });
});

describe("stop_editor refuses rather than discarding unsaved work", () => {
  it("names every dirty package and how to keep it", async () => {
    const bridge = await startFakeBridge((method) => {
      if (method === "list_dialogs") return NO_DIALOGS;
      if (method === "request_editor_shutdown") return DIRTY_REFUSAL;
      return { success: true };
    });
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port));

    expect(result.success).toBe(false);
    expect(result.refusedReason).toBe("unsaved-work");
    expect(result.dirtyPackages).toEqual(["/Game/Materials/M_Rock", "/Temp/Untitled_1"]);
    expect(result.message).toContain("/Game/Materials/M_Rock");
    expect(result.message).toContain("/Temp/Untitled_1");
    expect(result.message).toContain("save_dirty");
    // No flag exists that would discard them, so none is offered.
    expect(result.message).not.toContain("discardUnsaved");
  });

  it("sends no quit at all, so no save prompt is raised and nothing hangs", async () => {
    const bridge = await startFakeBridge((method) => {
      if (method === "list_dialogs") return NO_DIALOGS;
      if (method === "request_editor_shutdown") return DIRTY_REFUSAL;
      return { success: true };
    });
    openBridges.push(bridge);

    await stopEditor(makeProject(bridge.port));

    // The dirty check, which refuses inside the engine without scheduling a
    // close, and nothing after it.
    expect(bridge.methods()).toEqual(["list_dialogs", "request_editor_shutdown"]);
    expect(bridge.calls[1].params.requireClean).toBe(true);
  });

  it("refuses when the plugin build cannot say what is dirty, rather than guessing clean", async () => {
    const bridge = await startFakeBridge(() => null);
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port));

    expect(result.success).toBe(false);
    expect(result.refusedReason).toBe("unknown-dirty-state");
    expect(result.message).toContain("cannot be established");
    expect(bridge.methods()).not.toContain("execute_python");
  });

  it("refuses on the dirty list from an older plugin build too", async () => {
    const bridge = await startFakeBridge((method) =>
      method === "list_dirty_packages"
        ? { success: true, content: [{ package: "/Game/Blueprints/BP_Door" }], maps: [] }
        : null,
    );
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port));

    expect(result.success).toBe(false);
    expect(result.refusedReason).toBe("unsaved-work");
    expect(result.dirtyPackages).toEqual(["/Game/Blueprints/BP_Door"]);
    expect(bridge.methods()).not.toContain("execute_python");
  });
});

describe("stop_editor reports a blocking dialog in full", () => {
  it("returns immediately with the exact title, the whole message and every button", async () => {
    const bridge = await startFakeBridge((method) =>
      method === "list_dialogs" ? SAVE_CONTENT_DIALOG : { success: true },
    );
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port));

    expect(result.success).toBe(false);
    expect(result.refusedReason).toBe("blocking-dialog");
    expect(result.blockingDialog?.title).toBe("Save Content");
    // The WHOLE message, every line of it.
    expect(result.blockingDialog?.message).toBe(SAVE_CONTENT_MESSAGE);
    for (const line of SAVE_CONTENT_MESSAGE.split("\n")) {
      expect(result.message).toContain(line);
    }
    // Every button, in the dialog's own order, each with the call that presses it.
    expect(result.blockingDialog?.buttons).toEqual(["Save Selected", "Don't Save", "Cancel"]);
    expect(result.message).toContain("editor(action='respond_to_dialog', buttonLabel='Save Selected')");
    expect(result.message).toContain("editor(action='respond_to_dialog', buttonLabel=\"Don't Save\")");
    expect(result.message).toContain("editor(action='respond_to_dialog', buttonLabel='Cancel')");
    // No button is recommended.
    expect(result.message.toLowerCase()).not.toContain("recommend");
  });

  it("does not send the quit while a dialog is up", async () => {
    const bridge = await startFakeBridge((method) =>
      method === "list_dialogs" ? SAVE_CONTENT_DIALOG : { success: true },
    );
    openBridges.push(bridge);

    await stopEditor(makeProject(bridge.port));

    expect(bridge.methods()).toEqual(["list_dialogs"]);
  });
});

describe("stop_editor puts a blocking dialog to the user through elicitation", () => {
  it("offers the dialog's own buttons and presses only the one chosen", async () => {
    let asked: ElicitParams | null = null;
    let dialogUp = true;
    const bridge = await startFakeBridge((method) => {
      if (method === "list_dialogs") return dialogUp ? SAVE_CONTENT_DIALOG : NO_DIALOGS;
      if (method === "respond_to_dialog") {
        dialogUp = false;
        return { success: true, clickedButton: "Save Selected" };
      }
      if (method === "request_editor_shutdown") {
        setTimeout(() => bridge.goQuiet(), 50);
        return { success: true, scheduled: true, dirtyContentPackages: [], dirtyMapPackages: [] };
      }
      return { success: true };
    });
    openBridges.push(bridge);

    const elicit = async (params: ElicitParams): Promise<ElicitResult> => {
      asked = params;
      return { action: "accept", content: { button: "Save Selected" } };
    };

    const result = await stopEditor(makeProject(bridge.port), { elicit });

    // The prompt carries the full question and the dialog's real buttons.
    expect(asked!.message).toContain("Save Content");
    expect(asked!.message).toContain(SAVE_CONTENT_MESSAGE);
    expect(asked!.requestedSchema.properties.button).toMatchObject({
      enum: ["Save Selected", "Don't Save", "Cancel", "Leave the dialog open"],
    });

    // Exactly the button the user picked, and only because they picked it.
    const pressed = bridge.calls.filter((c) => c.method === "respond_to_dialog");
    expect(pressed).toHaveLength(1);
    expect(pressed[0].params.buttonLabel).toBe("Save Selected");
    expect(bridge.methods()).not.toContain("set_dialog_policy");
    expect(result.dialogAnsweredByUser).toBe("Save Selected");
    expect(result.success).toBe(true);
  });

  it("presses nothing when the user declines, and reports the dialog instead", async () => {
    const bridge = await startFakeBridge((method) =>
      method === "list_dialogs" ? SAVE_CONTENT_DIALOG : { success: true },
    );
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port), {
      elicit: async () => ({ action: "decline" }),
    });

    expect(bridge.methods()).toEqual(["list_dialogs"]);
    expect(result.refusedReason).toBe("blocking-dialog");
    expect(result.dialogAnsweredByUser).toBeUndefined();
  });

  it("presses nothing when the user chooses to leave the dialog open", async () => {
    const bridge = await startFakeBridge((method) =>
      method === "list_dialogs" ? SAVE_CONTENT_DIALOG : { success: true },
    );
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port), {
      elicit: async () => ({ action: "accept", content: { button: "Leave the dialog open" } }),
    });

    expect(bridge.methods()).toEqual(["list_dialogs"]);
    expect(result.refusedReason).toBe("blocking-dialog");
  });

  it("presses nothing when the client has no elicitation UI", async () => {
    const bridge = await startFakeBridge((method) =>
      method === "list_dialogs" ? SAVE_CONTENT_DIALOG : { success: true },
    );
    openBridges.push(bridge);

    const result = await stopEditor(makeProject(bridge.port), {
      elicit: async () => {
        throw new Error("client did not advertise the elicitation capability");
      },
    });

    expect(bridge.methods()).toEqual(["list_dialogs"]);
    expect(result.refusedReason).toBe("blocking-dialog");
    expect(result.message).toContain("Save Content");
  });
});

/**
 * The same rule on the plugin side. It cannot be exercised from here without an
 * editor, so it is asserted against the source: the module must arm no policy
 * of its own, and must invent no answer for a dialog nobody armed one for.
 */
describe("the plugin arms no policy and invents no answer", () => {
  const read = (relative: string): string =>
    fs.readFileSync(new URL(`../../plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/${relative}`, import.meta.url), "utf8");

  it("registers no built-in dialog policy at module startup", () => {
    const module = read("Private/UE_MCP_Bridge.cpp");
    expect(module).not.toContain("AddDefaultPolicy");
    // The patterns that used to be armed here, each of which answered a save
    // prompt with "discard" before anyone had read it.
    for (const pattern of ["Save Content", "Save Changes", "save the level", "already exists"]) {
      expect(module).not.toContain(`TEXT("${pattern}")`);
    }
  });

  it("offers no way for the module to add a policy at all", () => {
    expect(read("Private/Handlers/DialogHandlers.h")).not.toContain("AddDefaultPolicy");
    expect(read("Private/Handlers/DialogHandlers.cpp")).not.toContain("AddDefaultPolicy");
  });

  it("hands an unarmed dialog back to the user instead of synthesizing a reply", () => {
    const source = read("Private/Handlers/DialogHandlers.cpp");
    const handler = source.slice(
      source.indexOf("EAppReturnType::Type FDialogHandlers::HandleModalDialog(EAppMsgType::Type"),
      source.indexOf("TSharedPtr<FJsonValue> FDialogHandlers::SetDialogPolicy"),
    );
    expect(handler).toContain("FMessageDialog::Open(MsgType, Text, Title)");
    // The old fallback picked an answer from the message type. Every branch of
    // it returned a button nobody had chosen.
    expect(handler).not.toContain("switch (MsgType)");
    expect(handler).not.toContain("auto-defaulted");
  });

  it("reports a dialog's message whole", () => {
    const source = read("Private/Handlers/DialogHandlers.cpp");
    const listDialogs = source.slice(
      source.indexOf("TSharedPtr<FJsonValue> FDialogHandlers::ListDialogs"),
      source.indexOf("TSharedPtr<FJsonValue> FDialogHandlers::RespondToDialog"),
    );
    expect(listDialogs).toContain('SetStringField(TEXT("message"), Message)');
    expect(listDialogs).toContain('SetBoolField(TEXT("messageTruncated"), false)');
    expect(listDialogs).toContain('respondWith');
    expect(listDialogs).not.toContain(".Left(");
  });
});
