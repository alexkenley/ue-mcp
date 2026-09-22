import { describe, expect, it, vi } from "vitest";
import type { IBridge } from "../../src/bridge.js";
import { bp, categoryTool, type ToolContext, type ToolDef } from "../../src/types.js";
import { niagaraTool } from "../../src/tools/niagara.js";

interface BridgeCall {
  method: string;
  params?: Record<string, unknown>;
  timeoutMs?: number;
}

function recordingBridge(result: unknown = { kept: 1, dropped: 2 }): IBridge & { calls: BridgeCall[] } {
  const calls: BridgeCall[] = [];
  return {
    calls,
    isConnected: true,
    connect: async () => {},
    call: async (method, params, timeoutMs) => {
      calls.push({ method, params, timeoutMs });
      return result;
    },
  } as unknown as IBridge & { calls: BridgeCall[] };
}

function activeContext(bridge: IBridge, tool: ToolDef): ToolContext {
  return {
    bridge,
    project: {} as ToolContext["project"],
    getToolGraph: () => [tool],
  } as ToolContext;
}

function rebuilt(actions = { ...niagaraTool.actions }): ToolDef {
  return niagaraTool.rebuild!(actions);
}

describe("niagara batch dispatch (#1081)", () => {
  it("uses the same timeout, path repair, and projection pipeline as a direct call", async () => {
    const tool = rebuilt();
    const directBridge = recordingBridge();
    const batchBridge = recordingBridge();
    const op = {
      action: "get_info",
      assetPath: "\\Game\\VFX\\NS_Test",
      timeoutMs: 45_000,
      select: ["kept"],
    };
    const { action: _action, ...opParams } = op;

    const direct = await tool.handler(activeContext(directBridge, tool), op);
    const batch = await tool.handler(activeContext(batchBridge, tool), {
      action: "batch",
      ops: [{ action: "get_info", params: opParams }],
    }) as { results: Array<{ action: string; result: unknown }>; stoppedAt: number | null };

    expect(batchBridge.calls).toEqual(directBridge.calls);
    expect(batchBridge.calls).toEqual([{
      method: "get_niagara_info",
      params: { assetPath: "/Game/VFX/NS_Test" },
      timeoutMs: 45_000,
    }]);
    expect(batch.results).toEqual([{ action: "get_info", result: direct }]);
    expect(batch.stoppedAt).toBeNull();
    expect(direct).toMatchObject({ kept: 1, pathsRepaired: expect.any(Object) });
  });

  it("dispatches actions injected into the active session graph", async () => {
    const bridge = recordingBridge({ session: true });
    const tool = rebuilt({
      ...niagaraTool.actions,
      session_probe: bp("read", "Session probe. Params: assetPath", "session_probe"),
    });

    const out = await tool.handler(activeContext(bridge, tool), {
      action: "batch",
      ops: [{ action: "session_probe", params: { assetPath: "/Game/VFX/NS_Test" } }],
    }) as { results: Array<{ result: unknown }>; stoppedAt: number | null };

    expect(bridge.calls[0]).toMatchObject({ method: "session_probe", params: { assetPath: "/Game/VFX/NS_Test" } });
    expect(out).toEqual({ results: [{ action: "session_probe", result: { session: true } }], stoppedAt: null });
  });

  it("does not fall back when the active graph omits the action or category", async () => {
    const bridge = recordingBridge();
    const { get_info: _removed, ...actions } = niagaraTool.actions;
    const tool = rebuilt(actions);

    const out = await tool.handler(activeContext(bridge, tool), {
      action: "batch",
      ops: [{ action: "get_info", params: { assetPath: "/Game/VFX/NS_Test" } }],
    });

    expect(out).toEqual({
      results: [{ action: "get_info", error: "Unknown niagara action 'get_info'" }],
      stoppedAt: 0,
    });
    expect(bridge.calls).toEqual([]);

    const noCategory = {
      ...activeContext(bridge, tool),
      getToolGraph: () => [],
    } as ToolContext;
    await expect(tool.handler(noCategory, {
      action: "batch",
      ops: [{ action: "get_info" }],
    })).resolves.toEqual({
      results: [{ action: "get_info", error: "Niagara is not available in the active tool graph" }],
      stoppedAt: 0,
    });
    expect(bridge.calls).toEqual([]);
  });

  it("runs the active category's parameter folding for each operation", async () => {
    const bridge = recordingBridge();
    const tool = categoryTool(
      "niagara",
      "Test Niagara graph.",
      {
        ...niagaraTool.actions,
        fold_probe: bp("read", "Fold probe. Params: legacyPath", "fold_probe"),
      },
      undefined,
      undefined,
      {
        normalizeParams: (params) => {
          const { legacyPath, ...rest } = params;
          return { ...rest, assetPath: legacyPath ?? rest.assetPath };
        },
      },
    );

    await tool.handler(activeContext(bridge, tool), {
      action: "batch",
      ops: [{ action: "fold_probe", params: { legacyPath: "/Game/VFX/NS_Test" } }],
    });

    expect(bridge.calls).toEqual([{
      method: "fold_probe",
      params: { assetPath: "/Game/VFX/NS_Test" },
      timeoutMs: undefined,
    }]);
  });

  it("keeps fail-fast results and rejects nesting before another operation runs", async () => {
    const bridge = recordingBridge({ ok: true });
    const tool = rebuilt();
    const unusedCall = vi.spyOn(bridge, "call");

    const out = await tool.handler(activeContext(bridge, tool), {
      action: "batch",
      ops: [
        { action: "get_info", params: { assetPath: "/Game/VFX/One" } },
        { action: "batch", params: { ops: [] } },
        { action: "get_info", params: { assetPath: "/Game/VFX/Two" } },
      ],
    });

    expect(out).toEqual({
      results: [
        { action: "get_info", result: { ok: true } },
        { action: "batch", error: "nested batch not allowed" },
      ],
      stoppedAt: 1,
    });
    expect(unusedCall).toHaveBeenCalledTimes(1);
  });
});
