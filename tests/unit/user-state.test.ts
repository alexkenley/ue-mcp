/**
 * ~/.ue-mcp/state.json: how it is keyed, and how it is written.
 *
 * D2: every other project key in this server folds case and forward-slashes
 * (port.ts derives the bridge port from that shape, session.ts keys sessions by
 * it). This file resolved only, so it was the one place that did not.
 * `npx ue-mcp dialog mode defer --editor C:/Projects/X` keyed it `C:\Projects\X`
 * and printed success; the server, launched from .mcp.json with
 * `c:/projects/x/X.uproject`, looked up `c:/projects/x`, found nothing, and fell
 * back to interactive. The user asked for "press nothing in my editor" and the
 * server pressed a dialog button. The same mechanism hit `feedback mode`, which
 * gates posting to a public issue tracker, and `installedHooks`, which is what
 * `uninstall-hooks` reads.
 *
 * D4: every setter was read, mutate, direct writeFileSync. Two writers lost one
 * of the two writes, and a crash or a full disk mid-write left a truncated file
 * that readState treats exactly like a missing one - every project's
 * installedHooks record discarded with nothing said.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDialogMode,
  setDialogMode,
  getFeedbackMode,
  setFeedbackMode,
  getInstalledHooks,
  setInstalledHooks,
  getUserStatePath,
} from "../../src/user-state.js";

let stateFile: string;
let saved: string | undefined;
const roots: string[] = [];

beforeEach(() => {
  saved = process.env.UE_MCP_USER_STATE;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ue-mcp-state-"));
  roots.push(root);
  stateFile = path.join(root, "state.json");
  process.env.UE_MCP_USER_STATE = stateFile;
});

afterEach(() => {
  if (saved === undefined) delete process.env.UE_MCP_USER_STATE;
  else process.env.UE_MCP_USER_STATE = saved;
  while (roots.length > 0) fs.rmSync(roots.pop()!, { recursive: true, force: true });
});

function writeRaw(state: unknown): void {
  fs.writeFileSync(stateFile, typeof state === "string" ? state : JSON.stringify(state, null, 2));
}

function readRaw(): { projects?: Record<string, Record<string, unknown>> } {
  return JSON.parse(fs.readFileSync(stateFile, "utf-8")) as {
    projects?: Record<string, Record<string, unknown>>;
  };
}

describe("project keys fold the way every other project key folds (D2)", () => {
  it("finds a dialog mode written through one spelling when read through another", () => {
    setDialogMode("defer", "C:/Projects/X");
    expect(getDialogMode("c:\\projects\\x")).toBe("defer");
    expect(getDialogMode("C:/Projects/X/")).toBe("defer");
  });

  it("does the same for the feedback mode, which gates posting to a public tracker", () => {
    setFeedbackMode("defer", "C:/Projects/X");
    expect(getFeedbackMode("c:/projects/x")).toBe("defer");
  });

  it("does the same for installedHooks, which is what uninstall-hooks reads", () => {
    setInstalledHooks("C:/Projects/X", ["C:/Users/me/.claude/settings.json"]);
    expect(getInstalledHooks("c:\\projects\\x")).toEqual(["C:/Users/me/.claude/settings.json"]);
  });

  it("stores one entry, not two, for two spellings of one root", () => {
    setDialogMode("defer", "C:/Projects/X");
    setFeedbackMode("auto-approve", "c:\\projects\\x");
    expect(Object.keys(readRaw().projects ?? {})).toHaveLength(1);
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
    expect(getFeedbackMode("C:/Projects/X")).toBe("auto-approve");
  });
});

describe("keys already on disk in the old shape keep applying (D2 migration)", () => {
  it("reads a legacy key written before the normalization existed", () => {
    writeRaw({
      projects: {
        "C:\\Projects\\X": { dialog: { mode: "defer" }, feedback: { mode: "defer" } },
      },
    });
    expect(getDialogMode("c:/projects/x")).toBe("defer");
    expect(getFeedbackMode("c:/projects/x")).toBe("defer");
  });

  it("keeps the legacy value when a later write touches a different key", () => {
    writeRaw({ projects: { "C:\\Projects\\X": { dialog: { mode: "defer" } } } });
    setFeedbackMode("auto-approve", "D:/Other");
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
  });

  // The auditor's target: prove the migration loses an existing setting.
  it("loses nothing when two spellings of one root are both on disk", () => {
    writeRaw({
      projects: {
        "C:\\Projects\\X": {
          dialog: { mode: "defer" },
          installedHooks: ["C:/a/settings.json"],
        },
        "c:/projects/x": {
          feedback: { mode: "auto-approve" },
          installedHooks: ["C:/b/settings.json"],
        },
      },
    });

    // Neither key's value is dropped.
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
    expect(getFeedbackMode("C:/Projects/X")).toBe("auto-approve");
    // Hooks are UNIONED: a path this file forgets is a hook left in somebody's
    // settings with no record of where it is.
    expect(getInstalledHooks("C:/Projects/X").sort()).toEqual([
      "C:/a/settings.json",
      "C:/b/settings.json",
    ]);
  });

  it("prefers the already-canonical spelling when both name a mode", () => {
    writeRaw({
      projects: {
        "C:\\Projects\\X": { dialog: { mode: "auto" } },
        "c:/projects/x": { dialog: { mode: "defer" } },
      },
    });
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
  });

  it("persists the folded form on the next write, without dropping the merged values", () => {
    writeRaw({
      projects: {
        "C:\\Projects\\X": { dialog: { mode: "defer" }, installedHooks: ["C:/a/settings.json"] },
      },
    });
    setFeedbackMode("defer", "C:/Projects/X");

    const keys = Object.keys(readRaw().projects ?? {});
    expect(keys).toEqual(["c:/projects/x"]);
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
    expect(getInstalledHooks("C:/Projects/X")).toEqual(["C:/a/settings.json"]);
  });

  it("leaves the user-wide preferences alone while folding project keys", () => {
    writeRaw({
      preferences: { dialog: { mode: "auto" } },
      projects: { "C:\\Projects\\X": { dialog: { mode: "defer" } } },
    });
    expect(getDialogMode()).toBe("auto");
    expect(getDialogMode("c:/projects/x")).toBe("defer");
    // A project with nothing of its own still falls through to the user's.
    expect(getDialogMode("D:/Untouched")).toBe("auto");
  });
});

describe("the file is written atomically (D4)", () => {
  it("leaves no temp file behind", () => {
    setDialogMode("defer", "C:/Projects/X");
    const dir = path.dirname(stateFile);
    expect(fs.readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  it("releases its lock", () => {
    setDialogMode("defer", "C:/Projects/X");
    expect(fs.existsSync(`${stateFile}.lock`)).toBe(false);
  });

  it("does not block forever on a lock whose holder died", () => {
    const lock = `${stateFile}.lock`;
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.mkdirSync(lock);
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(lock, old, old);

    const started = Date.now();
    setDialogMode("defer", "C:/Projects/X");
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
  });

  // The lock is what stops a `npx ue-mcp feedback mode` run landing in the
  // middle of the server's setInstalledHooks and throwing one of the two writes
  // away. A single-threaded test cannot stage that race, so this proves the
  // mechanism instead: a lock held by somebody else is waited for, and the
  // command still lands rather than being refused.
  it("waits for a lock another writer is holding, and still writes", () => {
    const lock = `${stateFile}.lock`;
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.mkdirSync(lock);

    const started = Date.now();
    setDialogMode("defer", "C:/Projects/X");
    const waited = Date.now() - started;

    expect(waited).toBeGreaterThan(2_000);
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
    fs.rmdirSync(lock);
  });

  it("preserves an unreadable state.json instead of replacing it silently", () => {
    // What a crash or a full disk mid-write leaves: a truncated file. readState
    // treats it exactly like a missing one, which is what discards every
    // project's installedHooks record with nothing said.
    writeRaw('{"projects": {"c:/projects/x": {"installedHooks": ["C:/a/set');
    const warned = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(getInstalledHooks("C:/Projects/X")).toEqual([]);
      expect(warned.mock.calls.flat().join(" ")).toContain("could not be parsed");

      setDialogMode("defer", "C:/Projects/X");
    } finally {
      warned.mockRestore();
    }

    // The bytes that named the hook files are still on disk.
    expect(fs.existsSync(`${stateFile}.corrupt`)).toBe(true);
    expect(fs.readFileSync(`${stateFile}.corrupt`, "utf-8")).toContain("installedHooks");
    // And the new file is valid.
    expect(getDialogMode("C:/Projects/X")).toBe("defer");
  });

  it("keeps the file owner-readable only", () => {
    setDialogMode("defer", "C:/Projects/X");
    expect(fs.existsSync(getUserStatePath())).toBe(true);
    if (process.platform !== "win32") {
      expect(fs.statSync(stateFile).mode & 0o077).toBe(0);
    }
  });

  it("still deletes the file when the last setting is cleared", () => {
    setDialogMode("defer", "C:/Projects/X");
    setDialogMode(undefined, "C:/Projects/X");
    expect(fs.existsSync(stateFile)).toBe(false);
  });
});
