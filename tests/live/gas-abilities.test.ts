/**
 * Granting and diagnosis, against a real editor.
 *
 * These four actions call engine functions rather than writing properties, so
 * there is nothing to assert about them off a live ASC: GiveAbility, the
 * active-effect container, and CanActivateAbility only mean anything on a real
 * AbilitySystemComponent in a real world.
 *
 * The case that matters most is the tracer's answer BEFORE anything is set up.
 * An ability that was authored but never granted is the most common reason a
 * GAS setup does nothing, and it is silent: the engine logs nothing worth
 * reading and the ability simply never fires. What the tracer must never do is
 * what it did on its first run against a live editor, which is report
 * "wouldActivate: false" with an empty reason list.
 *
 * This works in the editor world rather than in PIE, deliberately. An actor
 * spawned into a world that has not begun play has an uninitialised ASC, which
 * is the state an agent authoring GAS content is actually in, and the state
 * the diagnostics have to explain rather than trip over.
 *
 * Everything is created under /Game/MCPGasLive and removed afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LiveServer, resultJson } from "./server.js";
import { closeLiveBridges, liveTarget } from "./harness.js";

const target = await liveTarget();

const PACKAGE = "/Game/MCPGasLive";
const ABILITY = `${PACKAGE}/GA_LiveProbe`;
const ACTOR = "MCPGasLiveProbeActor";

let server: LiveServer;

const call = async (tool: string, args: Record<string, unknown>) =>
  server.call(tool, { ...args, timeoutMs: 300_000 });

beforeAll(async () => {
  server = await LiveServer.start({ projects: [target.uproject] });

  await call("gas", { action: "create_ability", name: "GA_LiveProbe", packagePath: PACKAGE });
  await call("level", { action: "place_actor", actorClass: "Actor", label: ACTOR });
  await call("level", {
    action: "add_component",
    actorLabel: ACTOR,
    componentClass: "AbilitySystemComponent",
    componentName: "ASC",
  });
}, 300_000);

afterAll(async () => {
  // Leave the project as it was found, whatever happened above.
  try {
    await call("gas", { action: "revoke_ability", actorLabel: ACTOR, abilityClass: ABILITY, world: "editor" });
    await call("level", { action: "delete_actor", actorLabel: ACTOR });
    await call("asset", { action: "delete_folder", path: PACKAGE, force: true });
  } catch {
    // Cleanup is best effort; a failure here must not mask a test failure.
  }
  await server?.close();
  closeLiveBridges();
});

interface Trace {
  granted: boolean;
  ascInitialized?: boolean;
  wouldActivate: boolean;
  blockedBy: string[];
  spec?: { handle: string; level: number; active: boolean };
}

const trace = async (): Promise<Trace> =>
  resultJson<Trace>(await call("gas", {
    action: "trace_ability_activation",
    actorLabel: ACTOR,
    abilityClass: ABILITY,
    world: "editor",
  }));

describe("trace_ability_activation", () => {
  it("never reports a refusal with no reason", async () => {
    // The invariant. Every other case here is a specific instance of it, and
    // the first live run of this action violated it.
    const body = await trace();
    if (!body.wouldActivate) expect(body.blockedBy.length).toBeGreaterThan(0);
  });

  it("says an ungranted ability is ungranted, and what to call", async () => {
    const body = await trace();
    expect(body.granted).toBe(false);
    expect(body.wouldActivate).toBe(false);
    expect(body.blockedBy.join(" ")).toContain("not granted");
    expect(body.blockedBy.join(" ")).toContain("grant_ability");
  });
});

describe("grant_ability", () => {
  it("grants, and returns the spec plus a rollback that undoes it", async () => {
    const body = resultJson<{
      created: boolean;
      spec: { handle: string; level: number };
      activatableCount: number;
      rollback: { method: string; payload: { abilityClass: string } };
    }>(await call("gas", { action: "grant_ability", actorLabel: ACTOR, abilityClass: ABILITY, world: "editor" }));

    expect(body.created).toBe(true);
    expect(body.spec.level).toBe(1);
    expect(body.activatableCount).toBeGreaterThan(0);
    expect(body.rollback.method).toBe("revoke_ability");
  });

  it("is idempotent, returning the same spec rather than a second one", async () => {
    // Two specs for what the caller thinks of as one ability is the failure
    // this guards: the second handle is invisible until something misbehaves.
    const body = resultJson<{ existed: boolean; created: boolean; spec: { handle: string } }>(
      await call("gas", { action: "grant_ability", actorLabel: ACTOR, abilityClass: ABILITY, world: "editor" }),
    );
    expect(body.existed).toBe(true);
    expect(body.created).toBe(false);
  });

  it("changes the tracer's answer from ungranted to granted", async () => {
    const body = await trace();
    expect(body.granted).toBe(true);
    expect(body.spec?.handle).toBeTruthy();
    expect(body.blockedBy.join(" ")).not.toContain("not granted");
  });

  it("explains an uninitialised ASC instead of refusing silently", async () => {
    // An actor in the editor world never ran InitAbilityActorInfo, so it
    // cannot activate. Saying which, and what to call, is the whole point.
    const body = await trace();
    expect(body.ascInitialized).toBe(false);
    expect(body.wouldActivate).toBe(false);
    expect(body.blockedBy.join(" ")).toContain("init_asc");
  });
});

describe("get_active_effects", () => {
  it("reports an empty effect list without erroring on a bare ASC", async () => {
    const body = resultJson<{ effectCount: number; activeEffects: unknown[]; ownedTags: unknown[] }>(
      await call("gas", { action: "get_active_effects", actorLabel: ACTOR, world: "editor" }),
    );
    expect(body.effectCount).toBe(0);
    expect(body.activeEffects).toEqual([]);
    expect(Array.isArray(body.ownedTags)).toBe(true);
  });
});

describe("revoke_ability", () => {
  it("revokes what was granted, then reports the replay as already done", async () => {
    const first = resultJson<{ revoked: number }>(
      await call("gas", { action: "revoke_ability", actorLabel: ACTOR, abilityClass: ABILITY, world: "editor" }),
    );
    expect(first.revoked).toBe(1);

    // A rollback has to be safe to replay, so the second call is a report
    // rather than a failure.
    const second = resultJson<{ revoked: number; alreadyRevoked: boolean }>(
      await call("gas", { action: "revoke_ability", actorLabel: ACTOR, abilityClass: ABILITY, world: "editor" }),
    );
    expect(second.revoked).toBe(0);
    expect(second.alreadyRevoked).toBe(true);
  });

  it("leaves the tracer saying ungranted again", async () => {
    const body = await trace();
    expect(body.granted).toBe(false);
    expect(body.blockedBy.join(" ")).toContain("not granted");
  });
});

describe("errors name the problem", () => {
  // The bridge reports a handler failure as {success:false, error} in the
  // payload rather than through the MCP isError flag, so that is what these
  // read. An error message is part of the deliverable here: a bad one costs
  // more agent turns than the action saves.
  interface Failure { success: boolean; error?: string }

  it("refuses an ability class that does not resolve, and says what it accepts", async () => {
    const body = resultJson<Failure>(await call("gas", {
      action: "grant_ability",
      actorLabel: ACTOR,
      abilityClass: "/Game/Nope/GA_DoesNotExist",
      world: "editor",
    }));
    expect(body.success).toBe(false);
    // Naming the accepted spellings is the difference between one more turn
    // and three.
    expect(body.error).toContain("GameplayAbility");
    expect(body.error).toContain("Blueprint path");
  });

  it("names the actor it could not find, and how to find the real one", async () => {
    const body = resultJson<Failure>(await call("gas", {
      action: "get_active_effects",
      actorLabel: "ThisActorDoesNotExistAnywhere",
      world: "editor",
    }));
    expect(body.success).toBe(false);
    expect(body.error).toContain("ThisActorDoesNotExistAnywhere");
    expect(body.error).toContain("get_outliner");
  });
});
