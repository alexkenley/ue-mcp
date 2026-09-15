import { describe, expect, it } from "vitest";
import { searchToolGraph } from "../../src/tool-search.js";

describe("searchToolGraph", () => {
  it("keeps matching Epic gateway actions distinct", () => {
    const hits = searchToolGraph([{
      name: "animation",
      actions: {
        epic_import_animation: {
          bridge: "epic_call_tool",
          description: "Import an animation asset.",
        },
        epic_import_pose: {
          bridge: "epic_call_tool",
          description: "Import a pose asset.",
        },
      },
    }], "import");

    expect(hits.map((hit) => hit.action)).toEqual(["epic_import_animation", "epic_import_pose"]);
  });

  it("collapses ordinary bridge aliases to the best-scoring name", () => {
    const hits = searchToolGraph([{
      name: "asset",
      actions: {
        import_asset: {
          bridge: "import_content",
          description: "Import an asset.",
        },
        import_texture: {
          bridge: "import_content",
          description: "Import texture asset.",
        },
      },
    }], "import texture");

    expect(hits.map((hit) => hit.action)).toEqual(["import_texture"]);
  });
});
