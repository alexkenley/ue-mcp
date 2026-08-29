import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * User-scoped, machine-only state. Lives at `~/.ue-mcp/state.json`. Stores
 * things that:
 *
 *   - Vary per machine (absolute filesystem paths)
 *   - Are written by ue-mcp commands, not by hand
 *   - Have no business being committed alongside the project
 *
 * Keyed by absolute project root so a single user can run ue-mcp across many
 * projects without state collision.
 *
 * Currently just `installedHooks` - the list of Claude Code settings files
 * where the feedback PostToolUse hook was installed for a given project.
 * Read on `npx ue-mcp uninstall-hooks` and on re-init to seed the hook
 * checkbox.
 *
 * NOT for project policy. Anything a collaborator should also see goes in
 * `ue-mcp.yml`, not here.
 */

interface ProjectState {
  installedHooks?: string[];
  /** Per-project feedback approval mode (#817). Same preference as the
   *  user-wide one below, scoped to one project root, which is what makes it a
   *  per-session equivalent of UE_MCP_FEEDBACK_MODE without moving it into
   *  tracked project yaml, where it does not belong. */
  feedback?: { mode?: FeedbackMode };
  /** Per-project dialog handling mode. Same preference as the user-wide one
   *  below, scoped to one project root, for the same reason the feedback mode
   *  is: one editor can be a long unattended run while the user sits in front
   *  of another. */
  dialog?: { mode?: DialogMode };
}

export type FeedbackMode = "interactive" | "auto-approve" | "defer";

/**
 * How a modal dialog blocking the editor is handled.
 *
 *   interactive - put the dialog to the user in an MCP elicitation form, with
 *                 its own buttons as the choices, and press only what they pick.
 *   auto        - hand the dialog back in full and let the agent choose and
 *                 answer it. The server presses nothing.
 *   defer       - suspend: press nothing, elicit nothing, and tell the user a
 *                 dialog is blocking the editor and needs answering by hand.
 *
 * Same three-value shape as FeedbackMode, read the same way, defaulted in one
 * place (resolveDialogMode in editor-control.ts).
 */
export type DialogMode = "interactive" | "auto" | "defer";

interface Preferences {
  /** Per-user, per-device feedback approval mode. Set via
   *  `npx ue-mcp feedback mode <value>`. NOT in project yaml because the
   *  preference varies per developer / per machine (am I at the keyboard,
   *  is this a long unattended run, etc.). */
  feedback?: { mode?: FeedbackMode };
  /** Per-user, per-device dialog handling mode. NOT in project yaml for the
   *  same reason: whether a person is at the keyboard to answer a modal is a
   *  property of the machine and the session, not of the project. */
  dialog?: { mode?: DialogMode };
}

interface UserState {
  preferences?: Preferences;
  projects?: Record<string, ProjectState>;
}

function statePath(): string {
  return (
    process.env.UE_MCP_USER_STATE ||
    path.join(os.homedir(), ".ue-mcp", "state.json")
  );
}

function readState(): UserState {
  const file = statePath();
  if (!fs.existsSync(file)) return {};
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf-8"));
    // A catch on JSON.parse only covers a file that is not JSON at all. `null`,
    // `[]`, `3` and `true` are all valid JSON documents and none of them is a
    // state object, so returning what parsed handed every reader something to
    // dereference: `state.projects` on null throws a TypeError with no
    // explanation, out of a call that had nothing to do with preferences. Every
    // reader below assumes an object, so this is the one place to insist on it.
    // A file that is not one is treated exactly like a file that is not there.
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as UserState;
  } catch {
    return {};
  }
}

function writeState(state: UserState): void {
  const file = statePath();
  // Drop empty containers so the file shrinks toward {} as state clears.
  if (state.projects) {
    for (const key of Object.keys(state.projects)) {
      const proj = state.projects[key];
      if (
        proj.installedHooks !== undefined &&
        proj.installedHooks.length === 0
      ) {
        delete proj.installedHooks;
      }
      if (proj.feedback && proj.feedback.mode === undefined) delete proj.feedback;
      if (proj.dialog && proj.dialog.mode === undefined) delete proj.dialog;
      if (Object.keys(proj).length === 0) {
        delete state.projects[key];
      }
    }
    if (Object.keys(state.projects).length === 0) {
      delete state.projects;
    }
  }
  if (state.preferences) {
    const fb = state.preferences.feedback;
    if (fb && fb.mode === undefined) delete state.preferences.feedback;
    const dlg = state.preferences.dialog;
    if (dlg && dlg.mode === undefined) delete state.preferences.dialog;
    if (Object.keys(state.preferences).length === 0) {
      delete state.preferences;
    }
  }

  // No state at all → delete the file rather than leave an empty stub.
  if (Object.keys(state).length === 0) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }

  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2), { mode: 0o600 });
}

function projectKey(projectRoot: string): string {
  return path.resolve(projectRoot);
}

export function getInstalledHooks(projectRoot: string): string[] {
  const state = readState();
  return state.projects?.[projectKey(projectRoot)]?.installedHooks ?? [];
}

export function setInstalledHooks(projectRoot: string, hooks: string[]): void {
  const state = readState();
  const key = projectKey(projectRoot);
  if (!state.projects) state.projects = {};
  if (!state.projects[key]) state.projects[key] = {};
  if (hooks.length > 0) {
    state.projects[key].installedHooks = hooks;
  } else {
    delete state.projects[key].installedHooks;
  }
  writeState(state);
}

/**
 * Read a stored mode the way the env var is read: trimmed and case-folded.
 *
 * The same rule as asDialogMode below, deliberately. These are two adjacent
 * keys in one file, and a user who learns that " AUTO " works for one of them
 * has learned something false about the other.
 *
 * This is kept knowing what it costs: a hand-edited state.json holding
 * "AUTO-APPROVE" used to fall back to interactive, and now resolves to
 * auto-approve, so upgrading removes that user's approval prompt. It is still
 * the right reading. Nothing writes this key but setFeedbackMode, which stores
 * the canonical spelling, so the only way to hold "AUTO-APPROVE" is to have
 * typed it, and somebody who typed the name of a mode named that mode. The old
 * behaviour was not a safety gate: it was a value silently ignored, with the
 * effective mode reported nowhere the person who wrote it would look. Honouring
 * what they wrote is the reading that can be checked against the file.
 */
function asFeedbackMode(mode: unknown): FeedbackMode | undefined {
  const named = typeof mode === "string" ? mode.trim().toLowerCase() : mode;
  return named === "interactive" || named === "auto-approve" || named === "defer" ? named : undefined;
}

/**
 * The feedback approval mode, for one project or for this user.
 *
 * A project's own preference wins over the user-wide one when it has been set
 * (#817): with more than one editor registered, one of them can be a long
 * unattended run while the user sits in front of another, and a single
 * per-device answer cannot describe both. Nothing here reads project yaml -
 * this is a per-user preference either way, and where a collaborator would see
 * it is exactly where it does not belong.
 */
export function getFeedbackMode(projectRoot?: string | null): FeedbackMode | undefined {
  const state = readState();
  if (projectRoot) {
    const scoped = asFeedbackMode(state.projects?.[projectKey(projectRoot)]?.feedback?.mode);
    if (scoped) return scoped;
  }
  return asFeedbackMode(state.preferences?.feedback?.mode);
}

/** Set or clear the feedback mode preference. Pass undefined to clear. */
export function setFeedbackMode(mode: FeedbackMode | undefined, projectRoot?: string | null): void {
  const state = readState();
  if (projectRoot) {
    const key = projectKey(projectRoot);
    if (!state.projects) state.projects = {};
    if (!state.projects[key]) state.projects[key] = {};
    if (mode === undefined) {
      delete state.projects[key].feedback;
    } else {
      state.projects[key].feedback = { mode };
    }
    writeState(state);
    return;
  }
  if (!state.preferences) state.preferences = {};
  if (!state.preferences.feedback) state.preferences.feedback = {};
  if (mode === undefined) {
    delete state.preferences.feedback.mode;
  } else {
    state.preferences.feedback.mode = mode;
  }
  writeState(state);
}

/**
 * Read a stored mode the way the env var is read: trimmed and case-folded.
 *
 * The env override lowercases, so "AUTO" there is auto. A stored value that
 * demanded an exact match made the same word in state.json fall through to the
 * default without a word said, which is the kind of difference nobody finds by
 * reading their own config.
 */
function asDialogMode(mode: unknown): DialogMode | undefined {
  const named = typeof mode === "string" ? mode.trim().toLowerCase() : mode;
  return named === "interactive" || named === "auto" || named === "defer" ? named : undefined;
}

/**
 * The dialog handling mode, for one project or for this user.
 *
 * Read exactly like the feedback mode above, and stored in the same file under
 * `dialog.mode`: a project's own preference wins over the user-wide one when it
 * has been set, and nothing here reads project yaml, because whether somebody
 * is at the keyboard to answer a modal is a property of the machine and the
 * session rather than of the project.
 *
 * Returns undefined when nothing is stored. The default is NOT decided here:
 * it depends on whether the connected client advertised elicitation, which this
 * module cannot see. resolveDialogMode in editor-control.ts owns it.
 */
export function getDialogMode(projectRoot?: string | null): DialogMode | undefined {
  const state = readState();
  if (projectRoot) {
    const scoped = asDialogMode(state.projects?.[projectKey(projectRoot)]?.dialog?.mode);
    if (scoped) return scoped;
  }
  return asDialogMode(state.preferences?.dialog?.mode);
}

/**
 * The dialog mode each scope holds, without the fallback.
 *
 * getDialogMode answers "what applies", which is the right question for the
 * server and the wrong one for a display: it falls back to the user preference,
 * so a caller printing its result as the project's own value reports a value
 * the project never set. This answers "what is set where".
 */
export function getDialogModeScopes(projectRoot?: string | null): {
  project?: DialogMode;
  user?: DialogMode;
} {
  const state = readState();
  return {
    project: projectRoot
      ? asDialogMode(state.projects?.[projectKey(projectRoot)]?.dialog?.mode)
      : undefined,
    user: asDialogMode(state.preferences?.dialog?.mode),
  };
}

/** Set or clear the dialog mode preference. Pass undefined to clear. */
export function setDialogMode(mode: DialogMode | undefined, projectRoot?: string | null): void {
  const state = readState();
  // Normalised on the way in as well as on the way out, so the file never holds
  // a spelling that only one of the two readers accepts.
  if (mode !== undefined) mode = asDialogMode(mode) ?? mode;
  if (projectRoot) {
    const key = projectKey(projectRoot);
    if (!state.projects) state.projects = {};
    if (!state.projects[key]) state.projects[key] = {};
    if (mode === undefined) {
      delete state.projects[key].dialog;
    } else {
      state.projects[key].dialog = { mode };
    }
    writeState(state);
    return;
  }
  if (!state.preferences) state.preferences = {};
  if (!state.preferences.dialog) state.preferences.dialog = {};
  if (mode === undefined) {
    delete state.preferences.dialog.mode;
  } else {
    state.preferences.dialog.mode = mode;
  }
  writeState(state);
}

export function getUserStatePath(): string {
  return statePath();
}
