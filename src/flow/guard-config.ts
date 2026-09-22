import * as fs from "node:fs";
import * as path from "node:path";
import yaml from "js-yaml";
import { deepMerge } from "@db-lyon/flowkit";
import { globalConfigPath } from "../global-config.js";
import type { ToolDef } from "../types.js";
import type { GuardDeclarations } from "./guard-schema.js";
import type { GuardSource } from "./guards.js";
import { buildDefaults, type PluginContribution } from "./loader.js";
import { FlowConfigSchema } from "./schema.js";

interface ConfigLayer {
  file: string;
  stamp: string | null;
}

function configLayer(file: string): ConfigLayer {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error(`Guard config is not a file: ${file}`);
    return { file, stamp: `${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}:${stat.ino}` };
  } catch (error) {
    // Only absence is a legitimate deletion. Permission and other I/O errors
    // must not be mistaken for an empty layer that removes a protection.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { file, stamp: null };
    throw error;
  }
}

function configLayers(configDir: string): ConfigLayer[] {
  const project = configLayer(path.join(configDir, "ue-mcp.yml"));
  const layers = [configLayer(globalConfigPath()), project];
  // Match loadFlowConfig: overlays are used only when the project file exists.
  if (project.stamp !== null) {
    if (process.env.UE_MCP_ENV) {
      layers.push(configLayer(path.join(configDir, `ue-mcp.${process.env.UE_MCP_ENV}.yml`)));
    }
    layers.push(configLayer(path.join(configDir, "ue-mcp.local.yml")));
  }
  return layers;
}

function readGuards(layers: ConfigLayer[], defaults: Record<string, unknown>): GuardDeclarations {
  let merged = defaults;
  for (const { file, stamp } of layers) {
    if (stamp === null) continue;
    const document: unknown = yaml.load(fs.readFileSync(file, "utf8"), { filename: file });
    if (document === undefined) continue; // An empty file is valid YAML.
    if (document === null || typeof document !== "object" || Array.isArray(document)) {
      throw new Error(`Guard config must be a YAML mapping: ${file}`);
    }
    merged = deepMerge(merged, document) as Record<string, unknown>;
  }
  // Use the same merge and guard normalization as loadFlowConfig, but read
  // strictly: readGlobalConfigDoc intentionally swallows malformed files.
  return FlowConfigSchema.parse(merged).guards;
}

function assertRegisteredStructure(next: GuardDeclarations, registered: GuardDeclarations): void {
  for (const [name, declaration] of Object.entries(next)) {
    const original = registered[name];
    if (!original || declaration.scope !== original.scope || declaration.order !== original.order
      || (["before", "after"] as const).some((phase) => declaration[phase]
        && declaration[phase]?.class_path !== original[phase]?.class_path)) {
      throw new Error(`Guard '${name}' changed its registration; restart ue-mcp to apply new guards, hooks, class_path, scope or order`);
    }
  }
}

/**
 * One session's YAML guard source. Plugin declarations never use its resolver.
 * Successful deletions disable registered hooks. Failed reads retain the last
 * valid snapshot and are retried, even if file metadata has not changed.
 */
export function createLiveGuardSource(
  tools: ToolDef[],
  configDir: string = process.cwd(),
  pluginContribution?: PluginContribution,
  onError: (message: string) => void = (message) => console.error(message),
): GuardSource & { guards: GuardDeclarations } {
  // Match loadFlowConfig's defaults so partial task/flow overrides validate
  // identically. An invalid config must not publish a guard removal either.
  const defaults = buildDefaults(tools);
  defaults.tasks = { ...(defaults.tasks as Record<string, unknown>), ...pluginContribution?.tasks };
  defaults.flows = { ...(defaults.flows as Record<string, unknown>), ...pluginContribution?.flows };
  const layers = configLayers(configDir);
  let cachedStamp = JSON.stringify(layers);
  const registered = readGuards(layers, defaults); // No last-good state at startup: fail closed.
  // Registration is fixed for this session. An inconsistent initial snapshot
  // could omit hooks entirely, leaving nothing to trigger a later reload.
  if (JSON.stringify(configLayers(configDir)) !== cachedStamp) {
    throw new Error("Guard config changed while it was being read");
  }
  let cached = registered;
  let lastError: string | undefined;

  return {
    label: "YAML guard config",
    guards: registered,
    liveOptions(name, phase) {
      try {
        const currentLayers = configLayers(configDir);
        const stamp = JSON.stringify(currentLayers);
        if (stamp !== cachedStamp) {
          const next = readGuards(currentLayers, defaults);
          assertRegisteredStructure(next, registered);
          // A replacement or deletion during the read must not publish a
          // partially read set of layers. Retry it on the next guarded call.
          if (JSON.stringify(configLayers(configDir)) !== stamp) {
            throw new Error("Guard config changed while it was being read");
          }
          cached = next;
          cachedStamp = stamp;
        }
        lastError = undefined;
      } catch (error) {
        const message = `Guard config could not be reloaded; declarations are unchanged: ${error instanceof Error ? error.message : String(error)}`;
        if (message !== lastError) onError(message);
        lastError = message;
      }
      return cached[name]?.[phase]?.options ?? null;
    },
  };
}
