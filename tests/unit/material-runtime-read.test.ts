import { describe, expect, it } from "vitest";
import { parseParamsClause } from "../../src/action-schema.js";
import { materialTool } from "../../src/tools/material.js";
import { handlerSpecs } from "../../src/tools/specs/material.generated.js";

describe("material runtime reads (#1114/#1116)", () => {
  it("forwards the component selector through read_instance", () => {
    expect(materialTool.actions.read_instance.mapParams?.({
      actorLabel: "Cube",
      componentName: "StaticMeshComponent0",
      slotIndex: 0,
      world: "pie",
      pieInstance: 1,
      ignored: true,
    })).toMatchObject({
      actorLabel: "Cube",
      componentName: "StaticMeshComponent0",
      slotIndex: 0,
      world: "pie",
      pieInstance: 1,
    });

    // The asset form is unchanged, including the materialPath alias.
    expect(materialTool.actions.read_instance.mapParams?.({ materialPath: "/Game/MI_Red" })?.assetPath).toBe("/Game/MI_Red");
  });

  it("routes read_mpc to the collection reader and documents world", () => {
    const spec = materialTool.actions.read_mpc;
    expect(spec.kind === "bridge" && spec.bridge).toBe("read_material_parameter_collection");
    expect(spec.effect).toBe("read");
    const params = parseParamsClause(spec.description ?? "").map((p) => p.name);
    expect(params).toEqual(expect.arrayContaining(["assetPath", "world"]));
    // Spec'd (#1057): the bag goes as sent, and `path` is an alias the registry resolves.
    expect(spec.mapParams).toBeUndefined();
    const assetPath = handlerSpecs.read_material_parameter_collection.params.find((p) => p.name === "assetPath");
    expect(assetPath?.aliases).toEqual(["path"]);
  });

  it("declares the selector keys so the MCP layer does not strip them", () => {
    for (const key of ["actorLabel", "actorPath", "componentName", "slotIndex", "slotName", "world", "pieInstance"]) {
      expect(materialTool.schema[key], key).toBeDefined();
    }
  });
});
