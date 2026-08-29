/**
 * Symbol recognition and ranking for the engine index.
 *
 * The index is a regex pass over C++ headers, which means every rule in it is
 * a guess that was wrong on some real header until it was not. These tests
 * pin the cases that drove each rule, against small fixtures rather than
 * against an installed engine, so they run in CI on a machine with no Unreal
 * on it and so a failure points at a rule rather than at a 31,000-file scan.
 *
 * The end-to-end behaviour against a real engine is asserted in the live tier.
 */
import { describe, it, expect } from "vitest";
import {
  includePathFor,
  isDefinitionTail,
  isPrivateHeader,
  lookupSymbol,
  moduleFor,
  scanHeader,
  splitQualified,
  unprefixed,
  type EngineIndex,
  type EngineSymbol,
} from "../../src/engine-index.js";

const ACTOR_H = "Engine/Source/Runtime/Engine/Classes/GameFramework/Actor.h";
const ASC_H =
  "Engine/Plugins/Runtime/GameplayAbilities/Source/GameplayAbilities/Public/AbilitySystemComponent.h";

describe("moduleFor", () => {
  it("reads the module out of an engine tree path", () => {
    expect(moduleFor(ACTOR_H)).toBe("Engine");
    expect(moduleFor("Engine/Source/Runtime/Core/Public/Math/Vector.h")).toBe("Core");
    expect(moduleFor("Engine/Source/Editor/UnrealEd/Public/Editor.h")).toBe("UnrealEd");
  });

  it("reads it from the segment after a plugin's own Source/", () => {
    // This is also the name that goes in a Build.cs dependency list, which is
    // the only reason the field exists.
    expect(moduleFor(ASC_H)).toBe("GameplayAbilities");
    expect(
      moduleFor("Engine/Plugins/FX/Niagara/Source/Niagara/Classes/NiagaraComponent.h"),
    ).toBe("Niagara");
  });
});

describe("includePathFor", () => {
  it("returns the part below Public, Classes or Internal", () => {
    expect(includePathFor(ACTOR_H)).toBe("GameFramework/Actor.h");
    expect(includePathFor(ASC_H)).toBe("AbilitySystemComponent.h");
    expect(includePathFor("Engine/Source/Runtime/Core/Public/Math/Vector.h")).toBe("Math/Vector.h");
  });

  it("falls back to the full path for a header nothing can include", () => {
    const priv = "Engine/Source/Runtime/Engine/Private/Secret.h";
    expect(includePathFor(priv)).toBe(priv);
    expect(isPrivateHeader(priv)).toBe(true);
    expect(isPrivateHeader(ACTOR_H)).toBe(false);
  });
});

describe("isDefinitionTail", () => {
  it("accepts what really follows a definition", () => {
    expect(isDefinitionTail("")).toBe(true);
    expect(isDefinitionTail(" : public UObject")).toBe(true);
    expect(isDefinitionTail(" final : public UObject")).toBe(true);
    expect(isDefinitionTail(" : public TSharedFromThis<FFoo, ESPMode::ThreadSafe>")).toBe(true);
  });

  it("rejects a use of the type dressed as a declaration", () => {
    // `class AActor* GetActor() const` begins a line with `class` and names a
    // type. Without this test AActor resolved to SimpleConstructionScript.h.
    expect(isDefinitionTail("* GetComponentEditorActorInstance() const")).toBe(false);
    expect(isDefinitionTail("& GetRef()")).toBe(false);
    expect(isDefinitionTail(" = FVector2D")).toBe(false);
  });
});

describe("unprefixed", () => {
  it("strips the engine type prefix so a type can match its header name", () => {
    expect(unprefixed("AActor")).toBe("Actor");
    expect(unprefixed("UGameplayStatics")).toBe("GameplayStatics");
    expect(unprefixed("FHitResult")).toBe("HitResult");
  });

  it("leaves a name alone when the leading letter is part of the word", () => {
    expect(unprefixed("Frustum")).toBe("Frustum");
    expect(unprefixed("Actor")).toBe("Actor");
  });
});

describe("scanHeader", () => {
  it("finds a class with its base and its export macro", () => {
    const [symbol] = scanHeader(`class ENGINE_API AActor : public UObject\n{\n};\n`, ACTOR_H);
    expect(symbol).toMatchObject({
      name: "AActor",
      kind: "class",
      module: "Engine",
      include: "GameFramework/Actor.h",
      exported: true,
      parent: "UObject",
      line: 1,
    });
  });

  it("skips a forward declaration, which says nothing about where a type lives", () => {
    const found = scanHeader(`class AActor;\nclass FOther;\n`, ACTOR_H);
    expect(found).toEqual([]);
  });

  it("skips a return type that merely begins a line with `class`", () => {
    const source = `struct FThing\n{\n\tclass AActor* GetActor() const;\n};\n`;
    expect(scanHeader(source, ACTOR_H).map((s) => s.name)).toEqual(["FThing"]);
  });

  it("finds a struct, an enum and a namespace-scope alias", () => {
    const source = [
      `struct FHitResult`,
      `{`,
      `};`,
      `enum class ENetRole : uint8`,
      `{`,
      `};`,
      `using FVector = UE::Math::TVector<double>;`,
    ].join("\n");
    const kinds = Object.fromEntries(scanHeader(source, ACTOR_H).map((s) => [s.name, s.kind]));
    expect(kinds).toEqual({ FHitResult: "struct", ENetRole: "enum", FVector: "alias" });
  });

  it("ignores an indented alias, which is a member of some template", () => {
    // `using FVector = FVector2D;` inside a spatial-index class must not become
    // the answer to "where does FVector live".
    const source = `class TIndex\n{\n\tusing FVector = FVector2D;\n};\n`;
    expect(scanHeader(source, ACTOR_H).map((s) => s.name)).toEqual(["TIndex"]);
  });

  it("records a deprecation with its version and message", () => {
    const source = [
      `UE_DEPRECATED(5.1, "Use FNewThing instead.")`,
      `struct FOldThing`,
      `{`,
      `};`,
    ].join("\n");
    const [symbol] = scanHeader(source, ACTOR_H);
    expect(symbol.deprecated).toEqual({ version: "5.1", message: "Use FNewThing instead." });
  });

  it("does not attach a deprecation to an unrelated declaration below it", () => {
    const source = [
      `UE_DEPRECATED(5.1, "gone")`,
      `struct FOldThing {};`,
      ``,
      ``,
      `struct FFreshThing`,
      `{`,
      `};`,
    ].join("\n");
    const fresh = scanHeader(source, ACTOR_H).find((s) => s.name === "FFreshThing");
    expect(fresh?.deprecated).toBeUndefined();
  });

  it("finds an exported free function", () => {
    const [symbol] = scanHeader(`ENGINE_API FString LexToString(const FVector& V);\n`, ACTOR_H);
    expect(symbol).toMatchObject({ name: "LexToString", kind: "function", exported: true });
  });
});

describe("lookupSymbol ranking", () => {
  const index = (symbols: EngineSymbol[]): EngineIndex => ({
    engineRoot: "C:/Engine",
    engineVersion: "5.8.0+0",
    builtAt: "now",
    trees: ["Runtime"],
    headerCount: 0,
    symbolCount: symbols.length,
    symbols: { [symbols[0].name]: symbols },
  });

  const symbol = (over: Partial<EngineSymbol>): EngineSymbol => ({
    name: "AActor",
    kind: "class",
    header: "Engine/Source/Runtime/Engine/Classes/Other/Thing.h",
    module: "Engine",
    include: "Other/Thing.h",
    line: 1,
    signature: "class AActor",
    exported: true,
    ...over,
  });

  it("puts the header named after the type first", () => {
    // AActor is mentioned in dozens of exported public headers and defined in
    // exactly one, so this has to outweigh every other signal.
    const ranked = lookupSymbol(
      index([
        symbol({ header: "Engine/Source/Runtime/Engine/Classes/Engine/SimpleConstructionScript.h" }),
        symbol({ header: ACTOR_H, include: "GameFramework/Actor.h", exported: false }),
      ]),
      "AActor",
    );
    expect(ranked[0].include).toBe("GameFramework/Actor.h");
  });

  it("never answers with a reflection stub", () => {
    // Including UObject/NoExportTypes.h gets the caller an incomplete type.
    const ranked = lookupSymbol(
      index([
        symbol({ name: "FVector", include: "UObject/NoExportTypes.h", header: "Engine/Source/Runtime/CoreUObject/Public/UObject/NoExportTypes.h" }),
        symbol({ name: "FVector", include: "Math/MathFwd.h", header: "Engine/Source/Runtime/Core/Public/Math/MathFwd.h", kind: "alias", exported: false }),
      ]),
      "FVector",
    );
    expect(ranked[0].include).toBe("Math/MathFwd.h");
  });

  it("prefers a type over a function of the same name", () => {
    // FGameplayTag is both a struct and a constructor declaration carrying the
    // module's API macro; the struct is what the caller means.
    const ranked = lookupSymbol(
      index([
        symbol({ name: "FGameplayTag", kind: "function", include: "GameplayTagContainer.h" }),
        symbol({ name: "FGameplayTag", kind: "struct", include: "GameplayTagContainer.h", exported: false }),
      ]),
      "FGameplayTag",
    );
    expect(ranked[0].kind).toBe("struct");
  });

  it("prefers a public header over a private one", () => {
    const ranked = lookupSymbol(
      index([
        symbol({ header: "Engine/Source/Runtime/Engine/Private/Thing.h", include: "Engine/Source/Runtime/Engine/Private/Thing.h" }),
        symbol({ header: "Engine/Source/Runtime/Engine/Public/Thing.h", include: "Thing.h" }),
      ]),
      "AActor",
    );
    expect(ranked[0].include).toBe("Thing.h");
  });

  it("returns nothing for a name it does not hold", () => {
    expect(lookupSymbol(index([symbol({})]), "FNotHere")).toEqual([]);
  });
});

describe("splitQualified", () => {
  it("splits a qualified member from its class", () => {
    expect(splitQualified("UGameplayStatics::GetPlayerPawn")).toEqual({
      className: "UGameplayStatics",
      member: "GetPlayerPawn",
    });
  });

  it("leaves a bare name alone", () => {
    expect(splitQualified("AActor")).toEqual({ member: "AActor" });
  });
});
