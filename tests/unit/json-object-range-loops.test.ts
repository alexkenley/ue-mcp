import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

it("preserves the JSON map entry type in range-loop references", () => {
  const root = path.resolve("plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/Private");
  // UE 5.8 uses shared-string keys, so an FString pair reference binds to a
  // temporary. Copying the pair in the loop header instead warns on older UE.
  // Deduce the map entry type; convert to FString inside the body when needed.
  const incompatibleLoop = /for\s*\(\s*const\s+TPair\s*<\s*FString\s*,\s*TSharedPtr\s*<\s*FJsonValue\s*>\s*>\s*&?\s*\w+\s*:\s*[^;\n]+\bValues\s*\)/g;
  const violations: string[] = [];
  for (const file of readdirSync(root, { recursive: true })) {
    if (!/\.(cpp|h)$/.test(file)) continue;
    const source = readFileSync(path.join(root, file), "utf8");
    for (const match of source.matchAll(incompatibleLoop)) {
      violations.push(`${file}:${source.slice(0, match.index).split("\n").length}`);
    }
  }
  expect(violations).toEqual([]);
});
