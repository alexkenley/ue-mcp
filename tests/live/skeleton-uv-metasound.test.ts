/**
 * Skeleton editing, UV authoring and MetaSound introspection, live (V3, V2, T13).
 *
 * The three share a property: each reaches state that no reflection path
 * exposes, so a unit test can only assert the schema and never the effect.
 * Bone translation retargeting lives in the skeleton's private BoneTree, UV
 * channels are mesh-description attributes rather than UPROPERTYs, and a
 * MetaSound's graph is a document behind a builder API.
 *
 * The fixture is built by DUPLICATING engine assets into /Game, because the
 * bridge refuses to mutate /Engine and the test project ships no skeletal mesh
 * of its own. The skeletal mesh's Skeleton reference is repointed at the
 * duplicated skeleton, so every write these cases make lands on an asset this
 * file created and deletes.
 *
 * MetaSound is the exception, and it is not a test-authoring problem: all seven
 * of T13's read actions resolve through MSReadResolve, which ended in
 * FMetasoundFrontendGraphClass::GetConstDefaultGraph(). That accessor asserts
 * rather than returning null when the document has no default graph page, and
 * on a MetaSoundSource written by audio(metasound_author) it did exactly that
 * and took the editor down with a fatal check, from the saved asset as well as
 * from a live builder session.
 *
 * The resolver now asks the same question with FindConstGraph, but THE PLUGIN
 * HAS NOT BEEN REBUILT, so the editor a live run attaches to still carries the
 * crashing code. Until a rebuild lands, nothing here may read a real MetaSound.
 * The cases below exercise only the resolution failures, which return before
 * that call is reached, and the seven reads stay unverified.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LiveServer, resultJson } from "./server.js";
import { closeLiveBridges, liveTarget } from "./harness.js";

const target = await liveTarget();
let server: LiveServer;

const ROOT = "/Game/MCPLive/SkelUV";
const STATIC_MESH = `${ROOT}/SM_MCPUVCube`;
const SKELETAL_MESH = `${ROOT}/SKM_MCPProbe`;
const SKELETON = `${ROOT}/SK_MCPProbe`;
/** Where the fixture came from, and the skeleton a compatibility registration
 *  can point at without writing to it. */
const SOURCE_CUBE = "/Engine/BasicShapes/Cube";
const SOURCE_SKELETAL_MESH = "/Engine/EngineMeshes/SkeletalCube";
const SOURCE_SKELETON = "/Engine/EngineMeshes/SkeletalCube_Skeleton";

const call = async (tool: string, args: Record<string, unknown>) =>
  server.call(tool, { ...args, timeoutMs: 300_000 });

const asset = async (action: string, args: Record<string, unknown> = {}) =>
  resultJson<Record<string, any>>(await call("asset", { action, ...args }));

const animation = async (action: string, args: Record<string, unknown> = {}) =>
  resultJson<Record<string, any>>(await call("animation", { action, ...args }));

/** Remove the fixture, whoever left it. Run before the build as well as after,
 *  so a run never inherits the channel count or curve table a previous one left. */
const wipeFixture = async (): Promise<void> => {
  for (const assetPath of [STATIC_MESH, SKELETAL_MESH, SKELETON]) {
    try {
      await call("asset", { action: "delete", assetPath, force: true });
    } catch {
      // Absent is the desired state; delete reports it rather than throwing.
    }
  }
};

beforeAll(async () => {
  server = await LiveServer.start({ projects: [target.uproject] });
  await wipeFixture();

  await asset("duplicate", { sourcePath: SOURCE_CUBE, destinationPath: STATIC_MESH });
  await asset("duplicate", { sourcePath: SOURCE_SKELETON, destinationPath: SKELETON });
  await asset("duplicate", { sourcePath: SOURCE_SKELETAL_MESH, destinationPath: SKELETAL_MESH });
  // A duplicated skeletal mesh still points at the ENGINE skeleton, and every
  // skeleton write below would then be refused as a protected mount.
  await asset("set_property", {
    assetPath: SKELETAL_MESH,
    propertyName: "Skeleton",
    value: `${SKELETON}.SK_MCPProbe`,
  });
}, 600_000);

afterAll(async () => {
  try {
    await wipeFixture();
    await call("asset", { action: "delete_folder", path: ROOT, force: true });
  } catch {
    // Leftovers are noise, not a failure.
  }
  await server?.close();
  closeLiveBridges();
}, 300_000);

// ---------------------------------------------------------------------------
// V2 - UV mapping
// ---------------------------------------------------------------------------

interface UvRead {
  success?: boolean;
  channelCount?: number;
  lightmapCoordinateIndex?: number;
  buildSettings?: { bGenerateLightmapUVs?: boolean; dstLightmapIndex?: number };
  channels?: Array<{
    channel?: number;
    isLightmapChannel?: boolean;
    islandCount?: number;
    seamEdgeCount?: number;
    bounds?: { uMin?: number; uMax?: number; vMin?: number; vMax?: number; withinUnitSquare?: boolean };
  }>;
}

const readUvs = async (): Promise<UvRead> =>
  resultJson<UvRead>(await call("asset", { action: "read_uv_channels", assetPath: STATIC_MESH }));

describe("UV channels", () => {
  it("measures every channel, which get_mesh_geometry could not", async () => {
    const body = await readUvs();
    expect(body.success).not.toBe(false);
    expect(body.channelCount ?? 0).toBeGreaterThan(0);
    expect(body.channels).toHaveLength(body.channelCount ?? 0);

    // get_mesh_geometry peeked at one channel off RENDER data. This reads the
    // mesh description, so it can report islands and seams at all.
    for (const channel of body.channels ?? []) {
      expect(channel.bounds, `channel ${channel.channel} has no bounds`).toBeTruthy();
      expect(typeof channel.islandCount).toBe("number");
      expect(typeof channel.seamEdgeCount).toBe("number");
    }
    // Which channel the lightmap uses is the fact every lightmap question
    // starts from, and it is on the mesh rather than on the UVs.
    expect(typeof body.lightmapCoordinateIndex).toBe("number");
  }, 300_000);

  it("adds a channel, and the read reflects it", async () => {
    const before = await readUvs();
    const body = resultJson<{ success?: boolean; previousChannelCount?: number; newChannelCount?: number }>(
      await call("asset", { action: "set_uv_channel_count", assetPath: STATIC_MESH, op: "add", save: true }),
    );
    expect(body.success).not.toBe(false);
    expect(body.previousChannelCount).toBe(before.channelCount);
    expect(body.newChannelCount).toBe((before.channelCount ?? 0) + 1);

    const after = await readUvs();
    expect(after.channelCount).toBe((before.channelCount ?? 0) + 1);
  }, 300_000);

  it("dryRun changes nothing", async () => {
    const before = await readUvs();
    const body = resultJson<{ success?: boolean; dryRun?: boolean }>(
      await call("asset", { action: "set_uv_channel_count", assetPath: STATIC_MESH, op: "add", dryRun: true }),
    );
    expect(body.success).not.toBe(false);
    expect(body.dryRun).toBe(true);

    const after = await readUvs();
    expect(after.channelCount).toBe(before.channelCount);
  }, 300_000);

  it("reports UV health as named issues rather than a bare score", async () => {
    const body = resultJson<{
      success?: boolean;
      issues?: Array<{ code?: string; severity?: string; message?: string; channel?: number }>;
      errorCount?: number;
      warningCount?: number;
      healthy?: boolean;
    }>(await call("asset", { action: "check_uvs", assetPath: STATIC_MESH }));

    expect(body.success).not.toBe(false);
    expect(Array.isArray(body.issues)).toBe(true);
    // The empty channel just added is an error, and it has to be named as one:
    // a health check that answers with a number is not actionable.
    expect(body.errorCount ?? 0).toBeGreaterThan(0);
    expect(body.healthy).toBe(false);
    for (const issue of body.issues ?? []) {
      expect(issue.code, "an issue with no code").toBeTruthy();
      expect(issue.severity, `${issue.code} has no severity`).toBeTruthy();
      expect((issue.message ?? "").length).toBeGreaterThan(10);
    }
    expect((body.issues ?? []).map((i) => i.code)).toContain("channel_empty");
  }, 300_000);

  it("transforms a channel and the measured bounds move with it", async () => {
    // The assertion that makes this more than a dispatch check: a translate of
    // 0.25 in U has to show up as a 0.25 shift in the channel's own bounds.
    const before = await readUvs();
    const beforeBounds = (before.channels ?? []).find((c) => c.channel === 0)?.bounds;
    expect(beforeBounds, "channel 0 has no bounds to compare against").toBeTruthy();

    const body = resultJson<{
      success?: boolean;
      updated?: boolean;
      transformedVertexInstances?: number;
      channelAfter?: { bounds?: { uMin?: number; uMax?: number; vMin?: number } };
    }>(await call("asset", {
      action: "transform_uvs",
      assetPath: STATIC_MESH,
      channel: 0,
      translate: { u: 0.25, v: 0 },
      save: true,
    }));

    expect(body.success).not.toBe(false);
    expect(body.updated).toBe(true);
    expect(body.transformedVertexInstances ?? 0).toBeGreaterThan(0);
    expect(body.channelAfter?.bounds?.uMin).toBeCloseTo((beforeBounds!.uMin ?? 0) + 0.25, 4);
    expect(body.channelAfter?.bounds?.uMax).toBeCloseTo((beforeBounds!.uMax ?? 0) + 0.25, 4);
    // V is untouched, so a transform that moved everything would be caught.
    expect(body.channelAfter?.bounds?.vMin).toBeCloseTo(beforeBounds!.vMin ?? 0, 4);
  }, 300_000);

  it("unwrap dryRun reports the method it would use and writes nothing", async () => {
    const before = await readUvs();
    const body = resultJson<{ success?: boolean; dryRun?: boolean; written?: boolean; method?: string; error?: string }>(
      await call("asset", { action: "unwrap_uvs", assetPath: STATIC_MESH, channel: 0, dryRun: true }),
    );
    if (body.success === false) {
      // Geometry Script is reached by reflection and may be absent; the
      // degradation has to name itself rather than fail anonymously.
      expect(body.error).toContain("geometry");
      return;
    }
    expect(body.written).toBe(false);
    expect(body.method).toBeTruthy();

    const after = await readUvs();
    expect(after.channelCount).toBe(before.channelCount);
  }, 300_000);

  it("exports a layout image whose island count matches the read", async () => {
    const read = await readUvs();
    const islands = (read.channels ?? []).find((c) => c.channel === 0)?.islandCount;

    const body = resultJson<{
      success?: boolean;
      outputPath?: string;
      imageSize?: number;
      fileSizeBytes?: number;
      channelStats?: { islandCount?: number; channel?: number };
    }>(await call("asset", { action: "export_uv_layout", assetPath: STATIC_MESH, channel: 0 }));

    expect(body.success).not.toBe(false);
    expect(body.outputPath).toContain(".png");
    expect(body.imageSize ?? 0).toBeGreaterThan(0);
    expect(body.fileSizeBytes ?? 0).toBeGreaterThan(0);
    // The image is drawn from the same measurement read_uv_channels reports, so
    // a picture that disagreed with the numbers would be caught here.
    expect(body.channelStats?.channel).toBe(0);
    expect(body.channelStats?.islandCount).toBe(islands);
  }, 300_000);

  it("generate_lightmap_uvs rebuilds rather than only setting a flag", async () => {
    // The whole reason this is a handler and not a property write: the build
    // settings mean nothing until UStaticMesh::Build runs.
    const body = resultJson<{
      success?: boolean;
      rebuilt?: boolean;
      unchanged?: boolean;
      destinationChannelProduced?: boolean;
      resultingLightmapCoordinateIndex?: number;
    }>(await call("asset", { action: "generate_lightmap_uvs", assetPath: STATIC_MESH, save: true }));

    expect(body.success).not.toBe(false);
    expect(body.rebuilt).toBe(true);
    expect(body.destinationChannelProduced).toBe(true);

    const after = await readUvs();
    expect(after.buildSettings?.bGenerateLightmapUVs).toBe(true);
    expect(after.lightmapCoordinateIndex).toBe(body.resultingLightmapCoordinateIndex);
  }, 300_000);
});

// ---------------------------------------------------------------------------
// V3 - skeleton editing
// ---------------------------------------------------------------------------

describe("skeleton editing sessions", () => {
  it("opens a session over a working copy and cancels without touching disk", async () => {
    const begun = resultJson<{
      success?: boolean;
      sessionTag?: string;
      skeletonPath?: string;
      boneCount?: number;
      bones?: string[];
      created?: boolean;
    }>(await call("animation", { action: "begin_skeleton_edit", skeletalMeshPath: SKELETAL_MESH }));

    expect(begun.success).not.toBe(false);
    expect(begun.sessionTag).toBeTruthy();
    expect(begun.boneCount ?? 0).toBeGreaterThan(0);
    expect(begun.bones?.length).toBe(begun.boneCount);
    // The session has to resolve the skeleton too: every skeleton-scoped action
    // below addresses that path rather than the mesh.
    expect(begun.skeletonPath).toContain("SK_MCPProbe");

    const cancelled = resultJson<{ success?: boolean; cancelled?: boolean; committed?: boolean }>(
      await call("animation", { action: "cancel_skeleton_edit", sessionTag: begun.sessionTag }),
    );
    expect(cancelled.success).not.toBe(false);
    expect(cancelled.cancelled).toBe(true);
    expect(cancelled.committed).toBe(false);
  }, 300_000);

  it("cancelling a closed session reports alreadyClosed, so a rollback replays", async () => {
    const body = resultJson<{ success?: boolean; alreadyClosed?: boolean; cancelled?: boolean }>(
      await call("animation", { action: "cancel_skeleton_edit", sessionTag: "MCPNoSuchSession" }),
    );
    expect(body.success).not.toBe(false);
    expect(body.alreadyClosed).toBe(true);
    expect(body.cancelled).toBe(false);
  }, 300_000);

  it("validates the whole batch before mutating anything", async () => {
    const begun = resultJson<{ sessionTag?: string; bones?: string[] }>(
      await call("animation", { action: "begin_skeleton_edit", skeletalMeshPath: SKELETAL_MESH }),
    );
    const root = (begun.bones ?? [])[0];
    expect(root, "the fixture skeleton reported no bones").toBeTruthy();

    // Entry two is impossible. Entry one must not have been applied.
    const body = resultJson<{ success?: boolean; error?: string; errorCode?: string }>(
      await call("animation", {
        action: "edit_skeleton_bones",
        sessionTag: begun.sessionTag,
        edits: [
          { op: "add", bone: "MCPProbeBone", parent: root },
          { op: "reparent", bone: "NotABoneAtAll", parent: root },
        ],
      }),
    );
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe("bone_not_found");
    expect(body.error).toContain("NotABoneAtAll");

    const cancelled = resultJson<{ discardedEditCount?: number }>(
      await call("animation", { action: "cancel_skeleton_edit", sessionTag: begun.sessionTag }),
    );
    // Nothing was applied, so there is nothing to discard. A batch that had
    // half-applied would report one here.
    expect(cancelled.discardedEditCount).toBe(0);
  }, 300_000);
});

describe("skeleton properties with no UPROPERTY", () => {
  it("writes and restores bone translation retargeting", async () => {
    const changed = resultJson<{
      success?: boolean;
      updated?: boolean;
      bonesChanged?: number;
      bonesInspected?: number;
      bones?: Array<{ bone?: string; priorMode?: string; mode?: string; changed?: boolean }>;
      rollback?: { method?: string; payload?: { restore?: Array<{ bone: string; mode: string }> } };
    }>(await call("animation", { action: "set_bone_retargeting", skeletonPath: SKELETON, mode: "Skeleton" }));

    expect(changed.success).not.toBe(false);
    expect(changed.updated).toBe(true);
    expect(changed.bonesChanged ?? 0).toBeGreaterThan(0);
    expect(changed.bonesInspected).toBe(changed.bones?.length);
    for (const bone of changed.bones ?? []) {
      expect(bone.mode).toBe("Skeleton");
      expect(bone.priorMode).toBe("Animation");
    }

    // The rollback is a per-bone restore replayed through this same action.
    const restore = changed.rollback?.payload?.restore;
    expect(changed.rollback?.method).toBe("set_bone_retargeting");
    expect(restore?.length).toBe(changed.bones?.length);

    const back = resultJson<{ success?: boolean; bones?: Array<{ mode?: string }> }>(
      await call("animation", { action: "set_bone_retargeting", skeletonPath: SKELETON, restore }),
    );
    expect(back.success).not.toBe(false);
    for (const bone of back.bones ?? []) expect(bone.mode).toBe("Animation");

    const again = resultJson<{ alreadyInMode?: boolean; bonesChanged?: number }>(
      await call("animation", { action: "set_bone_retargeting", skeletonPath: SKELETON, mode: "Animation" }),
    );
    expect(again.alreadyInMode).toBe(true);
    expect(again.bonesChanged).toBe(0);
  }, 300_000);

  it("authors a blend profile, which is a subobject set_property cannot create", async () => {
    const created = resultJson<{
      success?: boolean;
      created?: boolean;
      entryCount?: number;
      entries?: Array<{ bone?: string; scale?: number }>;
      blendProfiles?: string[];
      saved?: boolean;
    }>(await call("animation", {
      action: "author_blend_profile",
      skeletonPath: SKELETON,
      profileName: "MCPLiveProfile",
      entries: [{ bone: "Bone01", scale: 0.5 }],
    }));

    expect(created.success).not.toBe(false);
    expect(created.created).toBe(true);
    expect(created.entryCount).toBe(1);
    expect(created.entries?.[0]?.scale).toBe(0.5);
    expect(created.blendProfiles).toContain("MCPLiveProfile");
    expect(created.saved).toBe(true);

    const removed = resultJson<{
      success?: boolean;
      deleted?: boolean;
      removedEntryCount?: number;
      removedEntries?: Array<{ bone?: string; scale?: number }>;
      blendProfiles?: string[];
      rollback?: { method?: string; payload?: { operation?: string } };
    }>(await call("animation", {
      action: "author_blend_profile",
      skeletonPath: SKELETON,
      profileName: "MCPLiveProfile",
      operation: "remove",
    }));

    expect(removed.deleted).toBe(true);
    // The removal reports what it destroyed, which is the only way its inverse
    // can rebuild the profile.
    expect(removed.removedEntryCount).toBe(1);
    expect(removed.removedEntries?.[0]?.bone).toBe("Bone01");
    expect(removed.blendProfiles).not.toContain("MCPLiveProfile");
    expect(removed.rollback?.payload?.operation).toBe("upsert");
  }, 300_000);

  it("curve metadata edits are idempotent in both directions", async () => {
    const add = resultJson<{
      success?: boolean;
      curvesAdded?: number;
      alreadyUpToDate?: boolean;
      curveMetadata?: Array<{ curve?: string; material?: boolean; morphTarget?: boolean }>;
    }>(await call("animation", { action: "edit_curve_metadata", skeletonPath: SKELETON, add: ["MCPLiveCurve"] }));
    expect(add.success).not.toBe(false);
    expect(add.curvesAdded).toBe(1);
    expect((add.curveMetadata ?? []).map((c) => c.curve)).toContain("MCPLiveCurve");

    const again = resultJson<{ curvesAdded?: number; curvesAlreadyPresent?: number; alreadyUpToDate?: boolean }>(
      await call("animation", { action: "edit_curve_metadata", skeletonPath: SKELETON, add: ["MCPLiveCurve"] }),
    );
    expect(again.curvesAdded).toBe(0);
    expect(again.curvesAlreadyPresent).toBe(1);
    expect(again.alreadyUpToDate).toBe(true);

    const flags = resultJson<{
      success?: boolean;
      flagsChanged?: number;
      curveMetadata?: Array<{ curve?: string; material?: boolean; morphTarget?: boolean }>;
    }>(await call("animation", {
      action: "edit_curve_metadata",
      skeletonPath: SKELETON,
      flags: [{ curve: "MCPLiveCurve", morphTarget: true }],
    }));
    expect(flags.success).not.toBe(false);
    expect(flags.flagsChanged).toBe(1);
    expect((flags.curveMetadata ?? []).find((c) => c.curve === "MCPLiveCurve")?.morphTarget).toBe(true);

    const removed = resultJson<{ curvesRemoved?: number }>(
      await call("animation", { action: "edit_curve_metadata", skeletonPath: SKELETON, remove: ["MCPLiveCurve"] }),
    );
    expect(removed.curvesRemoved).toBe(1);

    const removeAgain = resultJson<{ success?: boolean; curvesRemoved?: number; curvesAlreadyAbsent?: number }>(
      await call("animation", { action: "edit_curve_metadata", skeletonPath: SKELETON, remove: ["MCPLiveCurve"] }),
    );
    expect(removeAgain.success).not.toBe(false);
    expect(removeAgain.curvesRemoved).toBe(0);
    expect(removeAgain.curvesAlreadyAbsent).toBe(1);
  }, 300_000);

  it("registers and unregisters a compatible skeleton, closing the loop diff opens", async () => {
    // asset(diff) computes hierarchyCompatible specifically to answer "can
    // these register as compatible skeletons" and had no way to act on it.
    const unregistered = resultJson<{ success?: boolean; changed?: number; compatibleSkeletons?: string[] }>(
      await call("animation", {
        action: "register_compatible_skeleton",
        skeletonPath: SKELETON,
        compatibleSkeletonPath: SOURCE_SKELETON,
        remove: true,
      }),
    );
    expect(unregistered.success).not.toBe(false);
    expect((unregistered.compatibleSkeletons ?? []).join(" ")).not.toContain("SkeletalCube_Skeleton");

    const registered = resultJson<{
      success?: boolean;
      changed?: number;
      compatibleSkeletons?: string[];
      results?: Array<{ registered?: boolean; engineReportsCompatible?: boolean; boneCount?: number }>;
    }>(await call("animation", {
      action: "register_compatible_skeleton",
      skeletonPath: SKELETON,
      compatibleSkeletonPath: SOURCE_SKELETON,
    }));

    expect(registered.success).not.toBe(false);
    expect(registered.changed).toBe(1);
    expect((registered.compatibleSkeletons ?? []).join(" ")).toContain("SkeletalCube_Skeleton");
    // The engine's own compatibility check travels with the answer, so a
    // registration the engine will not honour is visible rather than silent.
    expect(registered.results?.[0]?.registered).toBe(true);
    expect(registered.results?.[0]?.engineReportsCompatible).toBe(true);
    expect(registered.results?.[0]?.boneCount ?? 0).toBeGreaterThan(0);

    const replay = resultJson<{ alreadyRegistered?: boolean; changed?: number }>(
      await call("animation", {
        action: "register_compatible_skeleton",
        skeletonPath: SKELETON,
        compatibleSkeletonPath: SOURCE_SKELETON,
      }),
    );
    expect(replay.alreadyRegistered).toBe(true);
    expect(replay.changed).toBe(0);
  }, 300_000);
});

// ---------------------------------------------------------------------------
// T13 - MetaSound introspection
// ---------------------------------------------------------------------------

describe("MetaSound introspection", () => {
  it("lists the node classes an add_node call can name", async () => {
    const body = resultJson<{
      success?: boolean;
      nodeClasses?: Array<{ name?: string; namespace?: string; variant?: string }>;
      count?: number;
    }>(await call("audio", { action: "metasound_list_node_classes", filter: "sine" }));

    expect(body.success).not.toBe(false);
    // The listing exists so a caller can name a class; an entry with no
    // namespace or variant cannot be handed back to metasound_add_node.
    const sine = (body.nodeClasses ?? []).find((c) => c.name === "Sine");
    expect(sine, "the curated class list has no Sine").toBeTruthy();
    expect(sine?.namespace).toBeTruthy();
    expect(sine?.variant).toBeTruthy();
  }, 300_000);

  it("names the asset that is missing rather than failing anonymously", async () => {
    const body = resultJson<{ success?: boolean; error?: string }>(
      await call("audio", { action: "metasound_read_document", assetPath: "/Game/MCPNoSuchMetaSound" }),
    );
    expect(body.success).toBe(false);
    expect(body.error).toContain("/Game/MCPNoSuchMetaSound");
  }, 300_000);

  it("refuses a path that is not a MetaSound, naming what it found instead", async () => {
    // Resolution fails before the document is touched, which is what makes
    // this case safe to run while the default-page assert below is unfixed.
    const body = resultJson<{ success?: boolean; error?: string }>(
      await call("audio", { action: "metasound_read_document", assetPath: STATIC_MESH }),
    );
    expect(body.success).toBe(false);
    expect(body.error).toContain("StaticMesh");
    expect(body.error).toContain("MetaSound");
  }, 300_000);

  it("distinguishes a path that names no MetaSound from one that does", async () => {
    // This case described the OLD behaviour, where metasound_get_graph
    // answered success for a path naming nothing and the only usable signal
    // was an assetExists flag. That was the bug. The handler now refuses, and
    // the refusal is worth asserting in detail: an error that says only "not
    // found" leaves a caller unable to tell a typo from an unsaved asset, so
    // it reports both halves of the lookup it actually tried.
    const missing = resultJson<{
      success?: boolean;
      error?: string;
      packageExistsOnDisk?: boolean;
      registryMatched?: boolean;
      reason?: string;
    }>(await call("audio", { action: "metasound_get_graph", assetPath: "/Game/MCPNoSuchMetaSound" }));

    expect(missing.success).toBe(false);
    expect(missing.reason).toBe("missing");
    expect(missing.packageExistsOnDisk).toBe(false);
    expect(missing.registryMatched).toBe(false);
    // The message names the path and both spellings it resolved, so the caller
    // can see whether the object-name half was the problem.
    expect(missing.error).toContain("/Game/MCPNoSuchMetaSound");
    expect(missing.error).toContain("Asset Registry");
  }, 300_000);

  it.skip(
    "reads back an authored graph - BLOCKED until the plugin is rebuilt with the MSReadResolve fix",
    async () => {
      // All seven T13 read actions (metasound_read_document, list_connections,
      // list_variables, search_nodes, inspect_node, list_node_pins, validate)
      // resolve through MSReadResolve in AudioHandlers_MetaSoundRead.cpp. Its
      // last step was
      //     Out.Graph = &Out.Doc->RootGraph.GetConstDefaultGraph();
      // and FMetasoundFrontendGraphClass::GetConstDefaultGraph() ends in a
      // check(FoundGraph) rather than returning null when the document holds no
      // page under Metasound::Frontend::DefaultPageID. A MetaSoundSource written
      // by audio(metasound_author) is such a document, so the first read of it
      // took the editor down with a fatal assert.
      //
      // The resolver now calls FindConstGraph(DefaultPageID), falls back to the
      // first page the document does hold (reporting readDefaultPage/pageNote),
      // and returns an MCPError when there are no pages at all. That fix is
      // SOURCE ONLY: a live editor is running the previously built DLL, so this
      // case stays skipped until a rebuild lands. Reinstate it then, and assert
      // that an authored graph reads back with the node ids metasound_add_node
      // handed out and the connections in metasound_connect's own field names.
    },
  );
});
