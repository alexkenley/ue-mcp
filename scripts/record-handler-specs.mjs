#!/usr/bin/env node
/**
 * Record the handler parameter specs the running plugin publishes (#1057).
 *
 *     npm run specs:record
 *
 * The specs are authored in C++, at each handler's RegisterHandler call, and
 * the bridge publishes them in get_bridge_capabilities.handlerSpecs. This writes
 * that answer to tests/golden/handler-specs.json, which is what
 * `npm run specs:generate` renders the TS surface from. Run the generator
 * afterwards and review both diffs.
 *
 * A recording rather than a read at startup, for the reason the Epic catalog is
 * one: the advertised surface is decided before any editor is contacted, so it
 * is the same with or without one. `tests/live/handler-specs.test.ts` compares
 * a live editor against this file and fails when they differ.
 *
 * Talks to the bridge directly, and only to an editor that has tests/ue_mcp
 * open, the same guard every other script in this repo applies.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import {
  assertLoopbackHost,
  assertTestProjectDir,
  bridgePortCandidates,
  describeMissingBridge,
  extractReportedProjectDir,
  PROJECT_IDENTITY_PYTHON,
} from "./bridge-target.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tests", "golden", "handler-specs.json");
const HOST = "127.0.0.1";
const TIMEOUT_MS = 60_000;

function connect(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Connection to ${url} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    ws.on("open", () => { clearTimeout(timer); resolve(ws); });
    ws.on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

let nextId = 1;
function rpc(ws, method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), TIMEOUT_MS);
    const onMessage = (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.id !== id) return;
      clearTimeout(timer);
      ws.off("message", onMessage);
      resolve(msg);
    };
    ws.on("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  assertLoopbackHost(HOST);
  const { candidates, lockfile } = bridgePortCandidates({});
  let ws = null;
  let lastError = null;
  for (const c of candidates) {
    try {
      ws = await connect(`ws://${HOST}:${c.port}`, 3000);
      console.log(`connected to ws://${HOST}:${c.port} (${c.source})`);
      break;
    } catch (e) {
      lastError = e.message;
    }
  }
  if (!ws) throw new Error(describeMissingBridge({ host: HOST, candidates, lockfile, lastError }));

  const ident = await rpc(ws, "execute_python", { code: PROJECT_IDENTITY_PYTHON });
  if (ident.error) throw new Error(`could not identify the connected editor: ${ident.error.message}`);
  const projectDir = assertTestProjectDir(extractReportedProjectDir(ident.result));
  console.log(`target confirmed: ${projectDir}`);

  const answered = await rpc(ws, "get_bridge_capabilities", {});
  if (answered.error) throw new Error(`get_bridge_capabilities failed: ${answered.error.message}`);
  const specs = answered.result?.handlerSpecs;
  if (!specs || typeof specs !== "object" || Object.keys(specs).length === 0) {
    throw new Error(
      "The connected plugin published no handler specs. Recording that would delete every generated "
      + "action, so nothing was written. Rebuild the plugin from this checkout and restart the editor.",
    );
  }

  // Sorted on the way in, so a registration order change is not a diff.
  const handlers = Object.fromEntries(Object.keys(specs).sort().map((m) => [m, specs[m]]));
  const snapshot = { handlerCount: Object.keys(handlers).length, handlers };

  fs.writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`recorded ${snapshot.handlerCount} spec'd handlers`);
  console.log(`wrote ${path.relative(ROOT, OUT)}; now run npm run specs:generate`);
  ws.close();
}

main().catch((err) => {
  console.error(`[specs] ${err.message}`);
  process.exit(1);
});
