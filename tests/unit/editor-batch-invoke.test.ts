import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { editorTool } from "../../src/tools/editor.js";

describe("editor.invoke_object_functions", () => {
  const calls = [
    { target: "playerpawn", functionName: "StartAction" },
    { objectPath: "/Game/Test.Pawn:Inventory", functionName: "StopAction", args: { immediate: true } },
  ];

  it("accepts an ordered call list whose entries each name a function", () => {
    expect(editorTool.schema.calls.safeParse(calls).success).toBe(true);
    expect(editorTool.schema.calls.safeParse([{ target: "playerpawn" }]).success).toBe(false);
    expect(editorTool.schema.calls.safeParse([{ functionName: "F", args: 42 }]).success).toBe(false);
    expect(editorTool.schema.calls.safeParse(Array.from({ length: 64 }, () => calls[0])).success).toBe(true);
  });

  it("bounds the list in the handler, before any call runs (#1057)", () => {
    const source = readFileSync(
      new URL("../../plugin/ue_mcp_bridge/Source/UE_MCP_Bridge/Private/Handlers/EditorHandlers_PIERuntime.cpp", import.meta.url),
      "utf8",
    );
    expect(source).toContain("Missing required non-empty array parameter 'calls'");
    expect(source).toContain("'calls' accepts at most 64 entries");
  });

  it("is spec'd: it forwards its bag as sent, with its long timeout", () => {
    const action = editorTool.actions.invoke_object_functions;
    expect(action.bridge).toBe("invoke_object_functions");
    expect(action.timeoutMs).toBe(300_000);
    expect(action.mapParams).toBeUndefined();
  });
});
