import { describe, expect, it, vi } from "vitest";
import { assetTool } from "../../src/tools/asset.js";
import type { ToolContext } from "../../src/types.js";

describe("asset render_thumbnail", () => {
  it("maps the public action to the generic bridge handler", async () => {
    const call = vi.fn(async () => ({ success: true }));
    const ctx = { bridge: { call } } as unknown as ToolContext;

    await assetTool.handler(ctx, {
      action: "render_thumbnail",
      assetPath: "/Game/Weapons/SK_Rifle",
      outputPath: "C:/Temp/rifle.png",
      width: 512,
      height: 256,
    });

    expect(call).toHaveBeenCalledWith("render_asset_thumbnail", {
      assetPath: "/Game/Weapons/SK_Rifle",
      outputPath: "C:/Temp/rifle.png",
      width: 512,
      height: 256,
    }, undefined);
  });

  it("limits thumbnail dimensions before dispatch", () => {
    expect(assetTool.schema.width.safeParse(0).success).toBe(false);
    expect(assetTool.schema.width.safeParse(4096).success).toBe(true);
    expect(assetTool.schema.height.safeParse(4097).success).toBe(false);
  });
});
