#!/usr/bin/env node
/**
 * Convention audit over every registered C++ handler.
 *
 * The repo has a house style that is load-bearing rather than cosmetic:
 *
 *   idempotency  a mutation says whether it actually changed anything, so a
 *                replayed flow step or a retried call after a timeout does not
 *                double-apply and does not report success for a no-op.
 *   rollback     a mutation emits the inverse call that undoes it, which is
 *                what `rollback_on_failure` in the flow engine consumes. A
 *                mutation with no rollback silently makes a flow unrecoverable.
 *   reachability every handler is callable from the TS surface. An orphan is a
 *                capability nobody can use.
 *
 * 198 rollback call sites and 101 idempotency markers say the conventions are
 * real. What was missing was anything that fails when a new handler skips one,
 * which is how the gaps this audit reports accumulated.
 *
 * This is a source-level audit, not a runtime one: it reads each handler's
 * function body out of the .cpp and looks for the markers. That cannot prove a
 * rollback is CORRECT, only that one is emitted. Correctness is what the live
 * tier is for. Catching the omissions is still most of the value, because the
 * common failure is not a wrong rollback, it is no rollback at all.
 *
 * Run: node scripts/audit-handler-conventions.mjs [--json]
 * Gated by tests/unit/handler-conventions.test.ts.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const HANDLERS_DIR = join(
  here, "..", "plugin", "ue_mcp_bridge", "Source", "UE_MCP_Bridge", "Private", "Handlers",
);

/** Markers that say a handler reports whether it actually changed anything. */
const IDEMPOTENCY_MARKERS = [
  "MCPSetCreated", "MCPSetExisted", "MCPSetUpdated",
  // Hand-rolled equivalents, all of which answer the same question in the
  // result body: did this call actually change anything? Collected from what
  // handlers really emit rather than from what the helpers offer, because a
  // marker list narrower than the codebase reports false violations.
  "alreadyDeleted", "alreadyRevoked", "alreadyRemoved", "alreadyDetached",
  "alreadyExists", "alreadyRunning", "alreadyStopped", "alreadyPaused",
  "alreadySet", "alreadyOpen", "unchanged", "noChange", "wasAlready",
  "skipped", "nested", "wasActive",
  "SetBoolField(TEXT(\"changed\")",
];

/** Markers that say a handler emits the call that undoes it. */
const ROLLBACK_MARKERS = [
  "MCPSetRollback", "MCPSetDeleteAssetRollback", "SetObjectField(TEXT(\"rollback\")",
];

/** Read every `Registry.RegisterHandler(TEXT("x"), &Fn)` in the tree. */
export function readRegistrations() {
  const re = /Registry\.RegisterHandler(?:WithTimeout)?\(\s*TEXT\("([^"]+)"\)\s*,\s*&(\w+)/g;
  const out = new Map();
  for (const entry of readdirSync(HANDLERS_DIR)) {
    if (!entry.endsWith(".cpp")) continue;
    const body = readFileSync(join(HANDLERS_DIR, entry), "utf8");
    for (const m of body.matchAll(re)) out.set(m[1], { method: m[2], registeredIn: entry });
  }
  return out;
}

/**
 * The body of one handler function, found by brace matching from its
 * definition. Handlers are split across many files, so every file is searched.
 */
export function findHandlerBody(methodName, sources) {
  const signature = new RegExp(
    `TSharedPtr<FJsonValue>\\s+F\\w+::${methodName}\\s*\\([^)]*\\)\\s*\\{`,
  );
  for (const [file, text] of sources) {
    const m = signature.exec(text);
    if (!m) continue;
    let depth = 0;
    const start = m.index + m[0].length - 1;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return { file, body: text.slice(start, i + 1) };
      }
    }
    return { file, body: text.slice(start) };
  }
  return null;
}

/** Every handler source, read once. */
export function readSources() {
  const out = new Map();
  for (const entry of readdirSync(HANDLERS_DIR)) {
    if (!entry.endsWith(".cpp")) continue;
    out.set(entry, readFileSync(join(HANDLERS_DIR, entry), "utf8"));
  }
  return out;
}

const has = (body, markers) => markers.some((marker) => body.includes(marker));

/**
 * Audit every registered handler.
 *
 * `classify` maps a bridge method name to "read" | "mutate" | "unknown". It is
 * injected rather than imported so this script stays runnable on its own,
 * without pulling the TS graph in.
 */
export function auditHandlers(classify) {
  const registrations = readRegistrations();
  const sources = readSources();
  const rows = [];

  for (const [action, { method, registeredIn }] of registrations) {
    const found = findHandlerBody(method, sources);
    const cls = classify(action);
    rows.push({
      action,
      method,
      registeredIn,
      file: found?.file ?? null,
      bodyFound: Boolean(found),
      class: cls,
      idempotent: found ? has(found.body, IDEMPOTENCY_MARKERS) : false,
      rollback: found ? has(found.body, ROLLBACK_MARKERS) : false,
    });
  }
  rows.sort((a, b) => a.action.localeCompare(b.action));
  return rows;
}

/* ── CLI ──────────────────────────────────────────────────────────── */

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  // Standalone: everything not obviously a read is treated as a mutation, so
  // the raw numbers are an upper bound. The unit test uses the real classifier.
  const READ_PREFIX = /^(get_|list_|read_|find_|search_|describe_|inspect_|is_|has_|validate_|check_|measure_|compare_|diagnose_|trace_|count_|export_|reflect_|resolve_|sample_|analyze_|run_eqs_)/;
  const rows = auditHandlers((a) => (READ_PREFIX.test(a) ? "read" : "mutate"));
  const mutations = rows.filter((r) => r.class !== "read");
  const noRollback = mutations.filter((r) => !r.rollback);
  const noIdempotency = mutations.filter((r) => !r.idempotent);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ rows, mutations: mutations.length }, null, 2));
  } else {
    console.log(`handlers registered      : ${rows.length}`);
    console.log(`bodies not found         : ${rows.filter((r) => !r.bodyFound).length}`);
    console.log(`classified as mutations  : ${mutations.length}`);
    console.log(`mutations w/o rollback   : ${noRollback.length}`);
    console.log(`mutations w/o idempotency: ${noIdempotency.length}`);
    console.log(`\nno rollback:\n  ${noRollback.map((r) => r.action).join("\n  ")}`);
  }
}
