/**
 * Making written C++ correct before it is built.
 *
 * ue-mcp can author C++ into a project, which is more than most tooling does.
 * What it could not do was tell an agent whether what it was about to write
 * would compile: whether a symbol exists, which header declares it, which
 * module owns that header, whether the engine deprecated it two versions ago.
 * The agent found out from the compiler, one missing include per build, and a
 * build of an Unreal project is minutes long.
 *
 * These are views over `engine-index.ts`, plus the two things that need the
 * PROJECT rather than the engine: what a module's Build.cs already depends on,
 * and what a header the agent just wrote actually references.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  lookupMember,
  lookupSymbol,
  splitQualified,
  unprefixed,
  type EngineIndex,
  type EngineSymbol,
} from "./engine-index.js";

/* ── verify ────────────────────────────────────────────────────────── */

export interface SymbolVerdict {
  name: string;
  found: boolean;
  kind?: EngineSymbol["kind"] | "member";
  module?: string;
  /** What to put in an #include to reach it. */
  include?: string;
  header?: string;
  line?: number;
  signature?: string;
  parent?: string;
  deprecated?: { version?: string; message?: string };
  /** Set when the header cannot be included from another module. */
  privateHeader?: boolean;
  /** Other declarations of the same name, when there is more than one. */
  alsoDeclaredIn?: string[];
  /** Close spellings, when the name was not found at all. */
  suggestions?: string[];
}

export interface VerifyResult {
  engineVersion: string;
  checked: number;
  foundCount: number;
  /** Names that did not resolve. Empty means every symbol exists. */
  missing: string[];
  /** Names that resolved but are deprecated. */
  deprecated: string[];
  /** Every include line needed, deduplicated and sorted. */
  includes: string[];
  /** Every module needed, deduplicated and sorted. */
  modules: string[];
  symbols: SymbolVerdict[];
}

/**
 * Close spellings for a name the index does not hold.
 *
 * Matched on a shared opening, after stripping the engine's type prefix, so
 * `UAbilitySystemComponnet` finds `UAbilitySystemComponent`. Bare containment
 * was tried first and was worse than nothing: it answered `FNotARealType`
 * with `Area`, because "areal" is a substring of it. A name with no real
 * neighbour now returns nothing, which is the honest answer.
 *
 * Edit distance over 166,000 names on every miss is not worth what it would
 * add here, since the realistic error is a transposition or a wrong suffix and
 * both keep the opening intact.
 */
function suggestNames(index: EngineIndex, name: string, limit = 5): string[] {
  const needle = unprefixed(name).toLowerCase();
  if (needle.length < 3) return [];
  const opening = needle.slice(0, 3);
  const out: Array<{ name: string; score: number }> = [];
  for (const candidate of Object.keys(index.symbols)) {
    const bare = unprefixed(candidate).toLowerCase();
    if (bare === needle || !bare.startsWith(opening)) continue;
    // Among names that start alike, the closest length is the best guess.
    out.push({ name: candidate, score: Math.abs(bare.length - needle.length) });
  }
  return out
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((x) => x.name);
}

/** One symbol's verdict. Accepts `Class::Member` as well as a bare name. */
export function verifySymbol(index: EngineIndex, name: string): SymbolVerdict {
  const trimmed = name.trim();
  const { className, member } = splitQualified(trimmed);

  if (className) {
    const hit = lookupMember(index, className, member);
    if (hit) {
      return {
        name: trimmed,
        found: true,
        kind: "member",
        module: hit.owner.module,
        include: hit.owner.include,
        header: hit.owner.header,
        line: hit.line,
        signature: hit.signature,
        privateHeader: hit.owner.include === hit.owner.header ? true : undefined,
      };
    }
    // The owning type may exist even when the member does not, and saying so
    // is the difference between "you misspelled the method" and "you
    // misspelled the class".
    const owner = lookupSymbol(index, className)[0];
    return {
      name: trimmed,
      found: false,
      suggestions: owner
        ? [`${className} exists (${owner.include}) but no member '${member}' was found in it`]
        : suggestNames(index, className),
    };
  }

  const hits = lookupSymbol(index, trimmed);
  if (hits.length === 0) {
    return { name: trimmed, found: false, suggestions: suggestNames(index, trimmed) };
  }
  const best = hits[0];
  return {
    name: trimmed,
    found: true,
    kind: best.kind,
    module: best.module,
    include: best.include,
    header: best.header,
    line: best.line,
    signature: best.signature,
    parent: best.parent,
    deprecated: best.deprecated,
    privateHeader: best.include === best.header ? true : undefined,
    alsoDeclaredIn: hits.length > 1 ? hits.slice(1, 4).map((h) => h.include) : undefined,
  };
}

/** Verify a batch, and aggregate what the caller has to do about it. */
export function verifySymbols(index: EngineIndex, names: string[]): VerifyResult {
  const symbols = names.map((n) => verifySymbol(index, n));
  const includes = new Set<string>();
  const modules = new Set<string>();
  for (const s of symbols) {
    if (!s.found) continue;
    if (s.include && !s.privateHeader) includes.add(s.include);
    if (s.module) modules.add(s.module);
  }
  return {
    engineVersion: index.engineVersion,
    checked: symbols.length,
    foundCount: symbols.filter((s) => s.found).length,
    missing: symbols.filter((s) => !s.found).map((s) => s.name),
    deprecated: symbols.filter((s) => s.deprecated).map((s) => s.name),
    includes: [...includes].sort(),
    modules: [...modules].sort(),
    symbols,
  };
}

/* ── Build.cs ──────────────────────────────────────────────────────── */

export interface BuildCsDeps {
  path: string;
  publicDeps: string[];
  privateDeps: string[];
}

/**
 * The module names a Build.cs already depends on.
 *
 * A regex over the two AddRange calls, which is what every Build.cs in
 * practice uses. A file that builds its dependency list some other way reads
 * as having none, which makes a suggestion redundant rather than wrong.
 */
export function readBuildCsDeps(buildCsPath: string): BuildCsDeps {
  const source = fs.readFileSync(buildCsPath, "utf-8");
  const listFor = (kind: "Public" | "Private"): string[] => {
    const re = new RegExp(`${kind}DependencyModuleNames\\s*\\.\\s*AddRange\\s*\\(\\s*new\\s+string\\[\\]\\s*\\{([^}]*)\\}`, "s");
    const m = re.exec(source);
    if (!m) return [];
    return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  };
  return { path: buildCsPath, publicDeps: listFor("Public"), privateDeps: listFor("Private") };
}

/** The Build.cs for a module directory, or for the module owning a file. */
export function findBuildCs(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 12; i++) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      return null;
    }
    const found = entries.find((e) => e.endsWith(".Build.cs"));
    if (found) return path.join(dir, found);
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

export interface DepSuggestion {
  modules: string[];
  /** Modules needed that the Build.cs does not already list. */
  missing: string[];
  buildCs?: BuildCsDeps;
  /** The line to paste, when something is missing. */
  edit?: string;
}

/** Which modules a set of symbols needs, and which are not yet depended on. */
export function suggestBuildDeps(
  index: EngineIndex,
  names: string[],
  buildCsPath?: string | null,
): DepSuggestion {
  const verified = verifySymbols(index, names);
  // Core and CoreUObject are in every module's dependency list already, by
  // way of the engine's own defaults, so proposing them is noise.
  const ALWAYS_PRESENT = new Set(["Core", "CoreUObject"]);
  const modules = verified.modules.filter((m) => !ALWAYS_PRESENT.has(m));

  if (!buildCsPath || !fs.existsSync(buildCsPath)) {
    return { modules, missing: modules };
  }
  const buildCs = readBuildCsDeps(buildCsPath);
  const declared = new Set([...buildCs.publicDeps, ...buildCs.privateDeps]);
  const missing = modules.filter((m) => !declared.has(m));
  return {
    modules,
    missing,
    buildCs,
    edit: missing.length
      ? `PrivateDependencyModuleNames.AddRange(new string[] { ${missing.map((m) => `"${m}"`).join(", ")} });`
      : undefined,
  };
}

/* ── example usage ─────────────────────────────────────────────────── */

export interface UsageSite {
  file: string;
  line: number;
  text: string;
  /** `source` is a .cpp, `header` is a .h, `project` is the user's own code. */
  kind: "source" | "header" | "project";
}

export interface UsageResult {
  symbol: string;
  siteCount: number;
  sites: UsageSite[];
  /**
   * Whether the engine tree actually contains .cpp files.
   *
   * An engine installed from the Epic launcher ships headers and no sources
   * at all, which is the common case. Without this flag an empty result reads
   * as "nothing uses this symbol" rather than "this install cannot answer
   * that", and those call for opposite next steps.
   */
  engineSourcesAvailable: boolean;
  note?: string;
}

/**
 * Real call sites for a symbol, to answer "how is this actually used" with
 * code that compiles. Better than a signature for anything with a non-obvious
 * calling convention.
 *
 * Prefers .cpp files, because a header shows the declaration the caller
 * already has. But a launcher-installed engine contains no .cpp at all, so on
 * those this falls back to headers, where Unreal keeps a great deal of inline
 * code, and to the project's own sources, which are often the better example
 * anyway. The result says which happened.
 */
export function findExampleUsage(
  engineRoot: string,
  symbol: string,
  options: { limit?: number; trees?: string[]; projectDir?: string | null } = {},
): UsageResult {
  const limit = options.limit ?? 10;
  const trees = options.trees ?? ["Runtime"];
  const needle = symbol.includes("::") ? symbol.split("::").pop()! : symbol;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A use is a call, a template argument, a scope, or a member access. A bare
  // mention in a type position is a declaration more often than an example.
  const use = new RegExp(`\\b${escaped}\\s*[(<:.]`);
  // The line that declares the thing is not an example of using it.
  const declaration = new RegExp(`^\\s*(?:class|struct|enum|virtual|static|template|UFUNCTION|UPROPERTY)\\b`);

  const sites: UsageSite[] = [];
  let sawCpp = false;

  const scan = (dir: string, kind: UsageSite["kind"], root: string): void => {
    if (sites.length >= limit) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (sites.length >= limit) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "Intermediate" || entry.name === "ThirdParty" || entry.name === "Binaries") continue;
        scan(full, kind, root);
        continue;
      }
      const isCpp = entry.name.endsWith(".cpp");
      const isHeader = entry.name.endsWith(".h");
      if (!isCpp && !isHeader) continue;
      if (isCpp) sawCpp = true;
      // Headers are the fallback, so they are only read once it is clear the
      // tree has no sources to prefer.
      if (isHeader && kind === "source") continue;

      let source: string;
      try {
        source = fs.readFileSync(full, "utf-8");
      } catch {
        continue;
      }
      if (!source.includes(needle)) continue;
      const lines = source.split(/\r?\n/);
      for (let i = 0; i < lines.length && sites.length < limit; i++) {
        const text = lines[i].trim();
        if (!use.test(text)) continue;
        if (text.startsWith("//") || text.startsWith("*") || text.startsWith("#")) continue;
        if (declaration.test(text)) continue;
        sites.push({
          file: path.relative(root, full).replace(/\\/g, "/"),
          line: i + 1,
          text: text.slice(0, 240),
          kind: isCpp ? kind : "header",
        });
      }
    }
  };

  // Pass one: sources only, which is what an example should be.
  for (const tree of trees) scan(path.join(engineRoot, "Engine", "Source", tree), "source", engineRoot);

  const engineSourcesAvailable = sawCpp;
  let note: string | undefined;

  if (!engineSourcesAvailable) {
    note =
      "This engine install ships headers without .cpp sources, which is normal for a launcher "
      + "install, so no engine call sites exist to find. Results below come from inline code in "
      + "headers and from this project's own sources. A source build of the engine would answer "
      + "this fully.";
    // Pass two: headers, where Unreal keeps a lot of inline implementation.
    for (const tree of trees) scan(path.join(engineRoot, "Engine", "Source", tree), "header", engineRoot);
  }

  // The project's own code is often the better example regardless.
  if (options.projectDir && sites.length < limit) {
    scan(path.join(options.projectDir, "Source"), "project", options.projectDir);
  }

  return { symbol, siteCount: sites.length, sites, engineSourcesAvailable, note };
}

/* ── header lint ───────────────────────────────────────────────────── */

export interface LintFinding {
  severity: "error" | "warning";
  rule: string;
  message: string;
  line?: number;
}

export interface LintResult {
  file: string;
  findings: LintFinding[];
  /** Engine symbols the header references. */
  referenced: string[];
  /** Include lines it should have but does not. */
  missingIncludes: string[];
  /** Modules its Build.cs should list but does not. */
  missingModules: string[];
  buildCs?: string;
}

/** Symbols a header references, by the engine's naming convention. */
export function referencedSymbols(source: string): string[] {
  // Strip comments and strings first, so a symbol named only in a comment does
  // not produce an include the file does not need.
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
  const found = new Set<string>();
  for (const m of stripped.matchAll(/\b([AUFE][A-Z]\w{2,})\b/g)) found.add(m[1]);
  return [...found].sort();
}

/**
 * Check a header the agent just wrote against the engine it has to build
 * against.
 *
 * Reports what the compiler would, before the compiler runs: a symbol that
 * does not exist, one used without its include, one whose module is missing
 * from Build.cs, and one the engine has deprecated. Also the two structural
 * mistakes that produce baffling errors in an Unreal build - a reflected type
 * with no generated header include, and a UCLASS with no body macro.
 */
export function lintHeader(
  index: EngineIndex,
  headerPath: string,
  options: { buildCsPath?: string | null } = {},
): LintResult {
  const source = fs.readFileSync(headerPath, "utf-8");
  const findings: LintFinding[] = [];
  const lines = source.split(/\r?\n/);
  const lineOf = (needle: string): number | undefined => {
    const at = lines.findIndex((l) => l.includes(needle));
    return at >= 0 ? at + 1 : undefined;
  };

  const includes = new Set(
    [...source.matchAll(/^\s*#include\s+[<"]([^">]+)[">]/gm)].map((m) => m[1]),
  );

  // Reflected types need their generated header, and it must be last.
  const reflected = /\b(UCLASS|USTRUCT|UENUM|UINTERFACE)\s*\(/.test(source);
  const generated = [...includes].find((i) => i.endsWith(".generated.h"));
  if (reflected && !generated) {
    findings.push({
      severity: "error",
      rule: "missing-generated-include",
      message:
        `This header declares a reflected type but does not include its .generated.h. `
        + `Add #include "${path.basename(headerPath, ".h")}.generated.h" as the LAST include.`,
    });
  }
  if (reflected && generated) {
    const includeLines = [...source.matchAll(/^\s*#include\s+[<"]([^">]+)[">]/gm)];
    const last = includeLines[includeLines.length - 1]?.[1];
    if (last !== generated) {
      findings.push({
        severity: "error",
        rule: "generated-include-not-last",
        message: `${generated} must be the last #include; '${last}' follows it. UnrealHeaderTool requires this.`,
        line: lineOf(generated),
      });
    }
  }
  if (/\bUCLASS\s*\(/.test(source) && !/GENERATED_(BODY|UCLASS_BODY)\s*\(/.test(source)) {
    findings.push({
      severity: "error",
      rule: "missing-generated-body",
      message: "A UCLASS needs GENERATED_BODY() as the first thing in its body.",
      line: lineOf("UCLASS("),
    });
  }
  if (/\bUSTRUCT\s*\(/.test(source) && !/GENERATED_(BODY|USTRUCT_BODY)\s*\(/.test(source)) {
    findings.push({
      severity: "error",
      rule: "missing-generated-body",
      message: "A USTRUCT needs GENERATED_BODY() in its body.",
      line: lineOf("USTRUCT("),
    });
  }
  if (!/#pragma\s+once/.test(source)) {
    findings.push({ severity: "warning", rule: "missing-pragma-once", message: "No #pragma once." });
  }

  // Symbols it names, against the engine.
  const referenced = referencedSymbols(source);
  const verified = verifySymbols(index, referenced);
  const missingIncludes: string[] = [];

  for (const symbol of verified.symbols) {
    if (!symbol.found || !symbol.include) continue;
    if (symbol.deprecated) {
      findings.push({
        severity: "warning",
        rule: "deprecated-symbol",
        message:
          `${symbol.name} is deprecated`
          + (symbol.deprecated.version ? ` as of ${symbol.deprecated.version}` : "")
          + (symbol.deprecated.message ? `: ${symbol.deprecated.message}` : "."),
        line: lineOf(symbol.name),
      });
      continue;
    }
    if (symbol.privateHeader) {
      findings.push({
        severity: "error",
        rule: "private-header",
        message: `${symbol.name} is declared in ${symbol.header}, a Private header that cannot be included from another module.`,
        line: lineOf(symbol.name),
      });
      continue;
    }
    // A forward declaration is a legitimate alternative to an include in a
    // header, so this only reports what is neither included nor declared.
    const forwardDeclared = new RegExp(`^\\s*(?:class|struct)\\s+${symbol.name}\\s*;`, "m").test(source);
    if (!includes.has(symbol.include) && !forwardDeclared) missingIncludes.push(symbol.include);
  }

  const unique = [...new Set(missingIncludes)].sort();
  for (const include of unique) {
    findings.push({
      severity: "error",
      rule: "missing-include",
      message: `Add #include "${include}".`,
    });
  }

  const buildCsPath = options.buildCsPath ?? findBuildCs(path.dirname(headerPath));
  const deps = suggestBuildDeps(index, referenced.filter((r) => verified.symbols.find((s) => s.name === r)?.found), buildCsPath);
  for (const module of deps.missing) {
    findings.push({
      severity: "error",
      rule: "missing-module-dependency",
      message: `Build.cs does not depend on '${module}', which this header needs.`,
    });
  }

  return {
    file: headerPath.replace(/\\/g, "/"),
    findings,
    referenced: verified.symbols.filter((s) => s.found).map((s) => s.name),
    missingIncludes: unique,
    missingModules: deps.missing,
    buildCs: buildCsPath ?? undefined,
  };
}
