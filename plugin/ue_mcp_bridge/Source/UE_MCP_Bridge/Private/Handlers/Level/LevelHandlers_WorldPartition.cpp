// World Partition actor descriptors (#746).
//
// In a World Partition map an actor whose cell is not loaded is not spawned in
// the editor world at all, so every actor-facing action that iterates spawned
// instances - get_actors_by_class, count_actors_by_class, get_outliner,
// get_actor_details, set_actor_property - silently returned zero for it. A
// caller could not tell "this actor does not exist" from "this actor exists but
// is not streamed in", which quietly corrupts any measurement built on those
// counts. These handlers read the on-disk descriptors instead, so unloaded
// actors are visible and can be streamed in on demand.
//
// This file is a translation-unit partition of FLevelHandlers, like
// LevelHandlers_MultiLevel.cpp - the registrations live in LevelHandlers.cpp.
//
// The engine's own FActorDesc snapshot type is deliberately not used here
// (#805). Its constructors only gained ENGINE_API in UE 5.8, so on 5.7 and
// earlier every reference to them compiles and then fails to link, taking the
// whole plugin down rather than just these two actions. FMCPActorDescSnapshot
// below carries the same fields, is populated the same way the engine populates
// FActorDesc, and only reads exported accessors on
// FWorldPartitionActorDescInstance, so it links on every supported engine.

#include "LevelHandlers.h"

#include "HandlerUtils.h"
#include "HandlerPagination.h"
#include "Handlers/HandlerEditorState.h"

#include "Editor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "UObject/UObjectGlobals.h"

// FWorldPartitionActorDescInstance and the ...ActorDescInstance traversal
// helpers arrived with the actor-desc container instance rework in UE 5.5. On
// 5.4 the whole editor implementation below is compiled out and both actions
// answer with a clear version error instead of failing the build.
#define UE_MCP_HAS_ACTOR_DESC_INSTANCE_API (WITH_EDITOR && UE_MCP_HAS_5_5_API)

#if UE_MCP_HAS_ACTOR_DESC_INSTANCE_API
#include "WorldPartition/DataLayer/DataLayerAsset.h"
#include "WorldPartition/DataLayer/DataLayerInstance.h"
#include "WorldPartition/DataLayer/DataLayerManager.h"
#include "WorldPartition/WorldPartition.h"
#include "WorldPartition/WorldPartitionActorDescInstance.h"
#include "WorldPartition/WorldPartitionHelpers.h"
#endif

namespace
{
#if UE_MCP_HAS_ACTOR_DESC_INSTANCE_API
	constexpr int32 DefaultActorDescLimit = 500;

	/**
	 * Field-for-field stand-in for the engine's FActorDesc, populated exactly the
	 * way the engine populates it. Declared here so the plugin never links
	 * against FActorDesc's unexported constructors (#805).
	 */
	struct FMCPActorDescSnapshot
	{
		FGuid Guid;
		UClass* NativeClass = nullptr;
		FSoftObjectPath Class;
		FName Name;
		FName Label;
		FBox Bounds = FBox(ForceInit);
		FName RuntimeGrid;
		bool bIsSpatiallyLoaded = false;
		bool bActorIsEditorOnly = false;
		FName ActorPackage;
		FName ActorPath;
		/** The data layer asset paths the descriptor itself records. */
		TArray<FName> DataLayerAssets;
		/**
		 * The data layer INSTANCE names the partition resolved those assets to:
		 * object names such as DataLayer_1A2B..., not paths. Empty when the
		 * partition has not resolved this descriptor.
		 */
		TArray<FName> DataLayerInstanceNames;

		explicit FMCPActorDescSnapshot(const FWorldPartitionActorDescInstance& Instance)
		{
			Guid = Instance.GetGuid();
			NativeClass = Instance.GetActorNativeClass();
			// A Blueprint actor reports its base class path; a native actor has
			// none, so fall back to the native class path. The single-argument
			// top-level-path constructor is used rather than passing an empty
			// subpath, whose wide-string overload is deprecated in 5.6+.
			Class = Instance.GetBaseClass().IsNull()
				? FSoftObjectPath(Instance.GetActorNativeClass())
				: FSoftObjectPath(Instance.GetBaseClass());
			Name = Instance.GetActorName();
			Label = Instance.GetActorLabel();
			Bounds = Instance.GetEditorBounds();
			RuntimeGrid = Instance.GetRuntimeGrid();
			bIsSpatiallyLoaded = Instance.GetIsSpatiallyLoaded();
			bActorIsEditorOnly = Instance.GetActorIsEditorOnly();
			ActorPackage = Instance.GetActorPackage();
			ActorPath = *Instance.GetActorSoftPath().ToString();

			// #937: IsUsingDataLayerAsset() is deprecated in UE 5.8; actors no
			// longer carry data layers without assets, so the guard it was is gone.
			//
			// The descriptor records its layers as data layer ASSET paths, which is
			// what dataLayers promises. GetDataLayerInstanceNames() is a different
			// thing: the resolved instance OBJECT names (DataLayer_1A2B...). Those
			// were once read here as if they were asset paths, and an object name
			// is not a path, so FSoftObjectPath came back empty and every member
			// of a data layer listed dataLayers: [""].
			DataLayerAssets = Instance.GetDataLayers();
			// Unresolved names are an engine ensure, not an empty list.
			if (Instance.HasResolvedDataLayerInstanceNames())
			{
				DataLayerInstanceNames = Instance.GetDataLayerInstanceNames().ToArray();
			}
		}
	};

	/** GUIDs of actors currently spawned in the editor world. */
	TSet<FGuid> CollectLoadedActorGuids(UWorld* World)
	{
		TSet<FGuid> Loaded;
		if (!World) return Loaded;
		for (TActorIterator<AActor> It(World); It; ++It)
		{
			if (AActor* Actor = *It)
			{
				const FGuid Guid = Actor->GetActorGuid();
				if (Guid.IsValid()) Loaded.Add(Guid);
			}
		}
		return Loaded;
	}

	FString ActorDescClassName(const FMCPActorDescSnapshot& Desc)
	{
		if (Desc.NativeClass) return Desc.NativeClass->GetName();
		return Desc.Class.IsValid() ? Desc.Class.GetAssetName() : FString();
	}

	/** Case-insensitive match of a needle against every identifying field. */
	bool ActorDescMatchesFilter(const FMCPActorDescSnapshot& Desc, const FString& LowerFilter)
	{
		if (LowerFilter.IsEmpty()) return true;
		const FString Blob = (Desc.Label.ToString() + TEXT("|") + Desc.Name.ToString() + TEXT("|") +
			ActorDescClassName(Desc) + TEXT("|") + Desc.Class.ToString() + TEXT("|") +
			Desc.ActorPath.ToString()).ToLower();
		return Blob.Contains(LowerFilter);
	}

	FString MCPDataLayerAssetPath(const UDataLayerInstance* Instance)
	{
		const UDataLayerAsset* Asset = Instance ? Instance->GetAsset() : nullptr;
		return Asset ? Asset->GetPathName() : FString();
	}

	/**
	 * The map's data layer instances, by instance name and by asset path. A
	 * resolved descriptor carries instance names; one the partition could not
	 * resolve falls back to asset paths, so both keys are needed. Built from the
	 * manager's public instance list once per call: its by-asset lookup is private.
	 */
	struct FMCPDataLayerLookup
	{
		TArray<const UDataLayerInstance*> Instances;
		TMap<FName, const UDataLayerInstance*> ByName;
		TMap<FName, const UDataLayerInstance*> ByAssetPath;

		explicit FMCPDataLayerLookup(const UWorld* World)
		{
			const UWorldPartition* WorldPartition = World ? World->GetWorldPartition() : nullptr;
			const UDataLayerManager* Manager = WorldPartition ? WorldPartition->GetDataLayerManager() : nullptr;
			if (!Manager) return;
			for (const UDataLayerInstance* Instance : Manager->GetDataLayerInstances())
			{
				if (!Instance) continue;
				Instances.Add(Instance);
				ByName.Add(Instance->GetDataLayerFName(), Instance);
				const FString AssetPath = MCPDataLayerAssetPath(Instance);
				if (!AssetPath.IsEmpty()) ByAssetPath.Add(FName(*AssetPath), Instance);
			}
		}

		const UDataLayerInstance* Find(FName Name) const
		{
			if (Name.IsNone()) return nullptr;
			if (const UDataLayerInstance* const* Found = ByName.Find(Name)) return *Found;
			if (const UDataLayerInstance* const* Found = ByAssetPath.Find(Name)) return *Found;
			return nullptr;
		}
	};

	TSharedPtr<FJsonObject> ActorDescToJson(const FMCPActorDescSnapshot& Desc, bool bLoaded, const FMCPDataLayerLookup& DataLayers)
	{
		TSharedPtr<FJsonObject> Obj = MakeShared<FJsonObject>();
		Obj->SetStringField(TEXT("guid"), Desc.Guid.ToString());
		Obj->SetStringField(TEXT("label"), Desc.Label.ToString());
		Obj->SetStringField(TEXT("name"), Desc.Name.ToString());
		Obj->SetStringField(TEXT("class"), ActorDescClassName(Desc));
		Obj->SetStringField(TEXT("classPath"), Desc.Class.ToString());
		Obj->SetStringField(TEXT("actorPath"), Desc.ActorPath.ToString());
		Obj->SetStringField(TEXT("package"), Desc.ActorPackage.ToString());
		Obj->SetStringField(TEXT("runtimeGrid"), Desc.RuntimeGrid.ToString());
		Obj->SetBoolField(TEXT("spatiallyLoaded"), Desc.bIsSpatiallyLoaded);
		Obj->SetBoolField(TEXT("editorOnly"), Desc.bActorIsEditorOnly);
		Obj->SetBoolField(TEXT("loaded"), bLoaded);

		if (Desc.Bounds.IsValid)
		{
			const FVector Min = Desc.Bounds.Min;
			const FVector Max = Desc.Bounds.Max;
			TSharedPtr<FJsonObject> BoundsObj = MakeShared<FJsonObject>();
			TSharedPtr<FJsonObject> MinObj = MCPVec3ToJsonObject(Min);
			TSharedPtr<FJsonObject> MaxObj = MCPVec3ToJsonObject(Max);
			BoundsObj->SetObjectField(TEXT("min"), MinObj);
			BoundsObj->SetObjectField(TEXT("max"), MaxObj);
			Obj->SetObjectField(TEXT("bounds"), BoundsObj);
		}

		TArray<TSharedPtr<FJsonValue>> AssetPaths;
		for (const FName& AssetPath : Desc.DataLayerAssets)
		{
			if (!AssetPath.IsNone()) AssetPaths.Add(MakeShared<FJsonValueString>(AssetPath.ToString()));
		}
		Obj->SetArrayField(TEXT("dataLayers"), AssetPaths);

		// The instances those assets resolve to in this map, named the way
		// list_data_layers names them, so a row can be joined to a layer.
		TArray<TSharedPtr<FJsonValue>> Instances;
		const TArray<FName>& Names = Desc.DataLayerInstanceNames.Num() > 0 ? Desc.DataLayerInstanceNames : Desc.DataLayerAssets;
		for (const FName& Name : Names)
		{
			const UDataLayerInstance* Instance = DataLayers.Find(Name);
			TSharedPtr<FJsonObject> Entry = MakeShared<FJsonObject>();
			Entry->SetStringField(TEXT("instanceName"), Instance ? Instance->GetDataLayerFName().ToString() : Name.ToString());
			Entry->SetStringField(TEXT("shortName"), Instance ? Instance->GetDataLayerShortName() : FString());
			Entry->SetStringField(TEXT("assetPath"), Instance ? MCPDataLayerAssetPath(Instance) : FString());
			Entry->SetBoolField(TEXT("resolved"), Instance != nullptr);
			Instances.Add(MakeShared<FJsonValueObject>(Entry));
		}
		Obj->SetArrayField(TEXT("dataLayerInstances"), Instances);
		return Obj;
	}

	bool TryReadBounds(const TSharedPtr<FJsonObject>& Params, FBox& OutBox)
	{
		const TSharedPtr<FJsonObject>* BoundsObj = nullptr;
		if (!TryGetObjectParam(Params, TEXT("bounds"), BoundsObj) || !BoundsObj) return false;
		const TSharedPtr<FJsonObject>* MinObj = nullptr;
		const TSharedPtr<FJsonObject>* MaxObj = nullptr;
		if (!(*BoundsObj)->TryGetObjectField(TEXT("min"), MinObj) || !MinObj) return false;
		if (!(*BoundsObj)->TryGetObjectField(TEXT("max"), MaxObj) || !MaxObj) return false;

		FVector Min = FVector::ZeroVector;
		FVector Max = FVector::ZeroVector;
		ReadVec3Fields(*MinObj, Min);
		ReadVec3Fields(*MaxObj, Max);
		// An inverted box silently matches nothing, which reads as "no actors".
		OutBox = FBox(FVector::Min(Min, Max), FVector::Max(Min, Max));
		return true;
	}

	/** Descriptors matching the caller's filters, honouring an explicit guid list. */
	bool GatherMatchingDescs(
		const TSharedPtr<FJsonObject>& Params,
		UWorld* World,
		TArray<FMCPActorDescSnapshot>& OutMatches,
		FString& OutError)
	{
		UWorldPartition* WorldPartition = World ? World->GetWorldPartition() : nullptr;
		if (!WorldPartition)
		{
			OutError = TEXT("The current editor world has no World Partition");
			return false;
		}

		// UWorldPartitionBlueprintLibrary is MinimalAPI, so its statics cannot be
		// linked from another module. FWorldPartitionHelpers is exported and
		// gives the same traversal.
		TArray<FMCPActorDescSnapshot> AllDescs;
		FBox Box(ForceInit);
		const bool bHasBounds = TryReadBounds(Params, Box);
		auto Collect = [&AllDescs](const FWorldPartitionActorDescInstance* Instance) -> bool
		{
			if (Instance) AllDescs.Emplace(*Instance);
			return true;
		};
		if (bHasBounds)
		{
			FWorldPartitionHelpers::ForEachIntersectingActorDescInstance(
				WorldPartition, Box, AActor::StaticClass(), Collect);
		}
		else
		{
			FWorldPartitionHelpers::ForEachActorDescInstance(
				WorldPartition, AActor::StaticClass(), Collect);
		}

		TSet<FString> WantedGuids;
		const TArray<TSharedPtr<FJsonValue>>* GuidValues = nullptr;
		if (TryGetArrayParam(Params, TEXT("guids"), GuidValues) && GuidValues)
		{
			for (const TSharedPtr<FJsonValue>& Value : *GuidValues)
			{
				FString Guid;
				if (Value.IsValid() && Value->TryGetString(Guid) && !Guid.IsEmpty())
				{
					WantedGuids.Add(Guid.ToLower());
				}
			}
		}

		const FString LowerFilter = OptionalString(Params, TEXT("filter")).ToLower();
		const FString ClassName = OptionalString(Params, TEXT("className")).ToLower();
		const bool bLoadedOnly = OptionalBool(Params, TEXT("loadedOnly"), false);
		const bool bUnloadedOnly = OptionalBool(Params, TEXT("unloadedOnly"), false);
		const TSet<FGuid> LoadedGuids = CollectLoadedActorGuids(World);

		for (const FMCPActorDescSnapshot& Desc : AllDescs)
		{
			if (WantedGuids.Num() > 0 && !WantedGuids.Contains(Desc.Guid.ToString().ToLower())) continue;
			if (!ActorDescMatchesFilter(Desc, LowerFilter)) continue;
			if (!ClassName.IsEmpty() && !ActorDescClassName(Desc).ToLower().Contains(ClassName)) continue;

			const bool bLoaded = LoadedGuids.Contains(Desc.Guid);
			if (bLoadedOnly && !bLoaded) continue;
			if (bUnloadedOnly && bLoaded) continue;

			OutMatches.Add(Desc);
		}
		return true;
	}

	/**
	 * The identity of the descriptor query being paged: the method name plus
	 * every parameter GatherMatchingDescs reads to decide which descriptors
	 * match. A cursor is only valid against the key that issued it, so anything
	 * left out here would let a page-2 cursor be replayed against a different
	 * filter and page one collection at another collection's boundary.
	 */
	FString BuildActorDescCollectionKey(const TCHAR* Method, const TSharedPtr<FJsonObject>& Params)
	{
		FString Guids;
		const TArray<TSharedPtr<FJsonValue>>* GuidValues = nullptr;
		if (Params.IsValid() && TryGetArrayParam(Params, TEXT("guids"), GuidValues) && GuidValues)
		{
			TArray<FString> Sorted;
			for (const TSharedPtr<FJsonValue>& Value : *GuidValues)
			{
				FString Guid;
				if (Value.IsValid() && Value->TryGetString(Guid) && !Guid.IsEmpty())
				{
					Sorted.Add(Guid.ToLower());
				}
			}
			// Sorted, because the same set of GUIDs listed in a different order
			// is the same query and should not invalidate a live cursor.
			Sorted.Sort();
			Guids = FString::Join(Sorted, TEXT(","));
		}

		FBox Box(ForceInit);
		FString Bounds;
		if (Params.IsValid() && TryReadBounds(Params, Box))
		{
			Bounds = Box.ToString();
		}

		return FString::Printf(
			TEXT("%s|filter=%s|className=%s|guids=%s|bounds=%s|loadedOnly=%d|unloadedOnly=%d"),
			Method,
			*OptionalString(Params, TEXT("filter")).ToLower(),
			*OptionalString(Params, TEXT("className")).ToLower(),
			*Guids,
			*Bounds,
			OptionalBool(Params, TEXT("loadedOnly"), false) ? 1 : 0,
			OptionalBool(Params, TEXT("unloadedOnly"), false) ? 1 : 0);
	}

	bool RequirePartitionedWorld(UWorld* World, TSharedPtr<FJsonValue>& OutError)
	{
		if (!World || !World->IsPartitionedWorld())
		{
			OutError = MCPError(TEXT("The current editor world is not a World Partition map, so it has no actor descriptors. Every actor is already spawned - use get_outliner or get_actors_by_class."));
			return false;
		}
		return true;
	}
#endif // UE_MCP_HAS_ACTOR_DESC_INSTANCE_API
}

TSharedPtr<FJsonValue> FLevelHandlers::ListActorDescs(const TSharedPtr<FJsonObject>& Params)
{
	MCPReadParamsAhead(Params, {
		TEXT("filter"), TEXT("className"), TEXT("guids"), TEXT("bounds"), TEXT("loadedOnly"), TEXT("unloadedOnly"),
		TEXT("cursor"), TEXT("limit"),
	});

#if UE_MCP_HAS_ACTOR_DESC_INSTANCE_API
	REQUIRE_EDITOR_WORLD(World);
	TSharedPtr<FJsonValue> Err;
	if (!RequirePartitionedWorld(World, Err)) return Err;

	// T3: paged. This cut the list at 'limit' and told the caller to raise it or
	// narrow the filter, which on a map with 40,000 descriptors is an answer
	// nobody can act on. The cursor walks the whole set instead.
	MCPPagination::FPageRequest Page;
	if (auto PageErr = MCPPagination::ReadPageRequest(
			Params,
			BuildActorDescCollectionKey(TEXT("list_actor_descs"), Params),
			/*DefaultLimit*/ DefaultActorDescLimit, /*MaxLimit*/ 5000, Page))
	{
		return PageErr;
	}

	TArray<FMCPActorDescSnapshot> Matches;
	FString Error;
	if (!GatherMatchingDescs(Params, World, Matches, Error))
	{
		return MCPError(Error);
	}

	const TSet<FGuid> LoadedGuids = CollectLoadedActorGuids(World);
	const FMCPDataLayerLookup DataLayers(World);

	int32 LoadedCount = 0;
	for (const FMCPActorDescSnapshot& Desc : Matches)
	{
		if (LoadedGuids.Contains(Desc.Guid)) ++LoadedCount;
	}

	TArray<MCPPagination::FPageRow> Rows;
	Rows.Reserve(Matches.Num());
	for (const FMCPActorDescSnapshot& Desc : Matches)
	{
		// The actor GUID is the anchor. It is the descriptor's durable identity:
		// it survives a rename, a move between packages and a relabel, all of
		// which a path or a label would report as a different row.
		Rows.Add({
			Desc.Guid.ToString(),
			MakeShared<FJsonValueObject>(ActorDescToJson(Desc, LoadedGuids.Contains(Desc.Guid), DataLayers)),
		});
	}

	// ForEachActorDescInstance walks the partition's descriptor containers,
	// whose traversal order is not a contract, so the rows are sorted before
	// paging. A cursor over an unordered enumeration is not resumable.
	Rows.Sort([](const MCPPagination::FPageRow& A, const MCPPagination::FPageRow& B)
		{ return A.Id < B.Id; });

	auto Result = MCPSuccess();
	Result->SetNumberField(TEXT("matched"), Matches.Num());
	Result->SetNumberField(TEXT("loadedMatches"), LoadedCount);
	Result->SetNumberField(TEXT("unloadedMatches"), Matches.Num() - LoadedCount);
	MCPPagination::EmitPage(Page, Rows, TEXT("actorDescs"), Result);
	Result->SetNumberField(TEXT("returned"), Result->GetIntegerField(TEXT("count")));
	return MCPResult(Result);
#elif WITH_EDITOR
	return MCPError(TEXT("list_actor_descs needs the World Partition actor descriptor instance API, which is UE 5.5 and newer. On UE 5.4 use get_outliner or get_actors_by_class, which only see actors that are already streamed in."));
#else
	return MCPError(TEXT("World Partition actor descriptors are editor-only"));
#endif
}

TSharedPtr<FJsonValue> FLevelHandlers::LoadActorDescs(const TSharedPtr<FJsonObject>& Params)
{
	MCPReadParamsAhead(Params, {
		TEXT("mode"), TEXT("filter"), TEXT("className"), TEXT("guids"), TEXT("bounds"), TEXT("loadedOnly"),
		TEXT("unloadedOnly"), TEXT("maxActors"), TEXT("dryRun"),
	});

#if UE_MCP_HAS_ACTOR_DESC_INSTANCE_API
	REQUIRE_EDITOR_WORLD(World);
	TSharedPtr<FJsonValue> Err;
	if (!RequirePartitionedWorld(World, Err)) return Err;

	// Pinning is the exported, durable way to make an unloaded actor resident:
	// it keeps the actor loaded regardless of the current streaming sources,
	// which is exactly what a measurement or edit pass needs. (The engine's
	// transient "load" path lives on a MinimalAPI Blueprint library that cannot
	// be linked from here, and would be dropped again by streaming anyway.)
	const FString Mode = OptionalString(Params, TEXT("mode"), TEXT("pin")).ToLower();
	if (Mode != TEXT("pin") && Mode != TEXT("unpin"))
	{
		return MCPError(TEXT("'mode' must be 'pin' (make resident) or 'unpin' (release)"));
	}

	UWorldPartition* WorldPartition = World->GetWorldPartition();
	if (!WorldPartition)
	{
		return MCPError(TEXT("The current editor world has no World Partition"));
	}

	TArray<FMCPActorDescSnapshot> Matches;
	FString Error;
	if (!GatherMatchingDescs(Params, World, Matches, Error))
	{
		return MCPError(Error);
	}

	if (Matches.Num() == 0)
	{
		auto Empty = MCPSuccess();
		Empty->SetStringField(TEXT("mode"), Mode);
		Empty->SetNumberField(TEXT("matched"), 0);
		Empty->SetNumberField(TEXT("affected"), 0);
		Empty->SetStringField(TEXT("note"), TEXT("No actor descriptor matched. Use list_actor_descs to see what the map contains."));
		Empty->SetBoolField(TEXT("changed"), false);
		Empty->SetBoolField(TEXT("unchanged"), true);
		MCPSetNoRollback(Empty, TEXT("No actor matched, so no pin state changed and there is nothing to undo."));
		return MCPResult(Empty);
	}

	// Refuse to stream the whole map in by accident: an unfiltered call on a
	// large World Partition level would load thousands of actors.
	const int32 MaxAffected = FMath::Max(1, OptionalInt(Params, TEXT("maxActors"), 256));
	if (Matches.Num() > MaxAffected)
	{
		return MCPError(FString::Printf(
			TEXT("%d descriptors matched, above the %d limit for a single %s. Narrow 'filter'/'className'/'bounds' or raise 'maxActors' deliberately."),
			Matches.Num(), MaxAffected, *Mode));
	}

	const bool bDryRun = OptionalBool(Params, TEXT("dryRun"), false);
	const TSet<FGuid> ResidentBefore = CollectLoadedActorGuids(World);
	TArray<FGuid> Guids;
	TArray<TSharedPtr<FJsonValue>> Affected;
	Guids.Reserve(Matches.Num());
	for (const FMCPActorDescSnapshot& Desc : Matches)
	{
		Guids.Add(Desc.Guid);
		TSharedPtr<FJsonObject> Entry = MakeShared<FJsonObject>();
		Entry->SetStringField(TEXT("guid"), Desc.Guid.ToString());
		Entry->SetStringField(TEXT("label"), Desc.Label.ToString());
		Entry->SetStringField(TEXT("class"), ActorDescClassName(Desc));
		Affected.Add(MakeShared<FJsonValueObject>(Entry));
	}

	// Pin state before the call, so the inverse touches only the actors this
	// call flipped and never releases a pin someone else placed.
	TSet<FGuid> PinnedBefore;
	for (const FGuid& Guid : Guids)
	{
		if (WorldPartition->IsActorPinned(Guid)) PinnedBefore.Add(Guid);
	}

	if (!bDryRun)
	{
		if (Mode == TEXT("pin")) WorldPartition->PinActors(Guids);
		else                     WorldPartition->UnpinActors(Guids);
	}

	TArray<TSharedPtr<FJsonValue>> FlippedGuids;
	for (const FGuid& Guid : Guids)
	{
		if (WorldPartition->IsActorPinned(Guid) != PinnedBefore.Contains(Guid))
		{
			FlippedGuids.Add(MakeShared<FJsonValueString>(Guid.ToString()));
		}
	}

	// Read the world back so the caller sees what actually became resident
	// rather than trusting the request.
	const TSet<FGuid> NowLoaded = CollectLoadedActorGuids(World);
	int32 ResidentAfter = 0;
	for (const FGuid& Guid : Guids)
	{
		if (NowLoaded.Contains(Guid)) ++ResidentAfter;
	}
	// A real delta: how many actually changed residency. Without the
	// before-snapshot, an already-loaded actor counted as "affected" by a call
	// that did nothing.
	int32 Changed = 0;
	for (const FGuid& Guid : Guids)
	{
		const bool bWas = ResidentBefore.Contains(Guid);
		const bool bNow = NowLoaded.Contains(Guid);
		if (bWas != bNow) ++Changed;
	}

	auto Result = MCPSuccess();
	Result->SetStringField(TEXT("mode"), Mode);
	Result->SetBoolField(TEXT("dryRun"), bDryRun);
	Result->SetNumberField(TEXT("matched"), Matches.Num());
	// Report what actually changed, not what was requested: PinActors is a
	// no-op when the world partition has no pinned-actor adapter.
	Result->SetNumberField(TEXT("requested"), Guids.Num());
	Result->SetNumberField(TEXT("affected"), bDryRun ? 0 : Changed);
	Result->SetNumberField(TEXT("residentAfter"), ResidentAfter);
	Result->SetArrayField(TEXT("actors"), Affected);
	Result->SetNumberField(TEXT("pinStateChanged"), FlippedGuids.Num());

	const bool bChanged = FlippedGuids.Num() > 0;
	if (bChanged) MCPSetUpdated(Result); else Result->SetBoolField(TEXT("updated"), false);
	Result->SetBoolField(TEXT("changed"), bChanged);
	Result->SetBoolField(TEXT("unchanged"), !bChanged);
	if (bChanged)
	{
		TSharedPtr<FJsonObject> Payload = MakeShared<FJsonObject>();
		Payload->SetStringField(TEXT("mode"), Mode == TEXT("pin") ? TEXT("unpin") : TEXT("pin"));
		Payload->SetArrayField(TEXT("guids"), FlippedGuids);
		Payload->SetNumberField(TEXT("maxActors"), FMath::Max(MaxAffected, FlippedGuids.Num()));
		MCPSetRollback(Result, TEXT("load_actor_descs"), Payload);
	}
	else
	{
		MCPSetNoRollback(Result, bDryRun
			? TEXT("Dry run: no pin state was changed, so there is nothing to undo.")
			: TEXT("Every matched actor already had the requested pin state, so nothing changed and there is nothing to undo."));
	}
	return MCPResult(Result);
#elif WITH_EDITOR
	return MCPError(TEXT("load_actor_descs needs the World Partition actor descriptor instance API, which is UE 5.5 and newer. On UE 5.4 load the cell from the World Partition editor window instead."));
#else
	return MCPError(TEXT("World Partition streaming control is editor-only"));
#endif
}

#if UE_MCP_HAS_ACTOR_DESC_INSTANCE_API
namespace
{
	constexpr int32 DefaultDataLayerMembers = 50;
	constexpr int32 MaxDataLayerMembers = 1000;
	constexpr int32 MaxDataLayerRows = 1000;

	const TCHAR* MCPDataLayerTypeName(EDataLayerType Type)
	{
		switch (Type)
		{
		case EDataLayerType::Runtime: return TEXT("Runtime");
		case EDataLayerType::Editor: return TEXT("Editor");
		default: return TEXT("Unknown");
		}
	}

	/** What the descriptors say about one data layer: how many actors it holds, and which. */
	struct FMCPDataLayerMembership
	{
		int32 Actors = 0;
		int32 Loaded = 0;
		/** Label (or name) and the row, kept only when members were asked for. */
		TArray<TPair<FString, TSharedPtr<FJsonObject>>> Members;
	};
}
#endif

TSharedPtr<FJsonValue> FLevelHandlers::ListDataLayers(const TSharedPtr<FJsonObject>& Params)
{
	MCPReadParamsAhead(Params, { TEXT("filter"), TEXT("includeMembers"), TEXT("maxMembers") });

#if UE_MCP_HAS_ACTOR_DESC_INSTANCE_API
	REQUIRE_EDITOR_WORLD(World);
	UWorldPartition* WorldPartition = World->IsPartitionedWorld() ? World->GetWorldPartition() : nullptr;
	if (!WorldPartition)
	{
		return MCPError(TEXT("The current editor world is not a World Partition map, and data layers belong to World Partition maps. Open one with level(load) first."));
	}

	const FString Filter = OptionalString(Params, TEXT("filter")).ToLower();
	const bool bIncludeMembers = OptionalBool(Params, TEXT("includeMembers"), false);
	const int32 MaxMembers = FMath::Clamp(
		OptionalInt(Params, TEXT("maxMembers"), DefaultDataLayerMembers), 0, MaxDataLayerMembers);

	TArray<FString> DirtyBefore;
	MCPEditorState::CollectDirtyEditorPackageNames(DirtyBefore);

	const FMCPDataLayerLookup Lookup(World);
	const TSet<FGuid> LoadedGuids = CollectLoadedActorGuids(World);

	// Membership comes from the descriptors, not from spawned actors, so a layer's
	// actorCount includes the actors whose cells are not streamed in. Reading only
	// loaded actors is what made "this layer is empty" a false answer.
	TMap<const UDataLayerInstance*, FMCPDataLayerMembership> Membership;
	int32 DescsScanned = 0;
	int32 DescsInLayers = 0;
	int32 UnresolvedNames = 0;
	FWorldPartitionHelpers::ForEachActorDescInstance(
		WorldPartition, AActor::StaticClass(),
		[&](const FWorldPartitionActorDescInstance* Instance) -> bool
		{
			if (!Instance) return true;
			++DescsScanned;
			TArray<FName> Names;
			if (Instance->HasResolvedDataLayerInstanceNames())
			{
				Names = Instance->GetDataLayerInstanceNames().ToArray();
			}
			if (Names.Num() == 0)
			{
				Names = Instance->GetDataLayers();
			}
			if (Names.Num() == 0) return true;
			++DescsInLayers;

			const bool bLoaded = LoadedGuids.Contains(Instance->GetGuid());
			TSet<const UDataLayerInstance*> Counted;
			for (const FName& Name : Names)
			{
				const UDataLayerInstance* Layer = Lookup.Find(Name);
				if (!Layer)
				{
					++UnresolvedNames;
					continue;
				}
				if (Counted.Contains(Layer)) continue;
				Counted.Add(Layer);

				FMCPDataLayerMembership& Entry = Membership.FindOrAdd(Layer);
				++Entry.Actors;
				if (bLoaded) ++Entry.Loaded;
				if (bIncludeMembers && MaxMembers > 0)
				{
					const FString Label = Instance->GetActorLabel().IsNone()
						? Instance->GetActorName().ToString()
						: Instance->GetActorLabel().ToString();
					TSharedPtr<FJsonObject> Member = MakeShared<FJsonObject>();
					Member->SetStringField(TEXT("label"), Label);
					Member->SetStringField(TEXT("guid"), Instance->GetGuid().ToString());
					Member->SetStringField(TEXT("class"), Instance->GetActorNativeClass()
						? Instance->GetActorNativeClass()->GetName() : FString());
					Member->SetBoolField(TEXT("loaded"), bLoaded);
					Entry.Members.Emplace(Label + TEXT("|") + Instance->GetGuid().ToString(), Member);
				}
			}
			return true;
		});

	TArray<const UDataLayerInstance*> Layers = Lookup.Instances;
	Layers.Sort([](const UDataLayerInstance& A, const UDataLayerInstance& B)
	{
		const FString ShortA = A.GetDataLayerShortName();
		const FString ShortB = B.GetDataLayerShortName();
		return ShortA != ShortB ? ShortA < ShortB : A.GetDataLayerFName().LexicalLess(B.GetDataLayerFName());
	});

	TArray<TSharedPtr<FJsonValue>> Rows;
	int32 Matched = 0;
	for (const UDataLayerInstance* Layer : Layers)
	{
		const FString ShortName = Layer->GetDataLayerShortName();
		const FString InstanceName = Layer->GetDataLayerFName().ToString();
		const FString AssetPath = MCPDataLayerAssetPath(Layer);
		if (!Filter.IsEmpty()
			&& !ShortName.ToLower().Contains(Filter)
			&& !InstanceName.ToLower().Contains(Filter)
			&& !AssetPath.ToLower().Contains(Filter))
		{
			continue;
		}
		++Matched;
		if (Rows.Num() >= MaxDataLayerRows) continue;

		TSharedPtr<FJsonObject> Row = MakeShared<FJsonObject>();
		Row->SetStringField(TEXT("instanceName"), InstanceName);
		Row->SetStringField(TEXT("shortName"), ShortName);
		Row->SetStringField(TEXT("fullName"), Layer->GetDataLayerFullName());
		Row->SetStringField(TEXT("assetPath"), AssetPath);
		Row->SetStringField(TEXT("type"), MCPDataLayerTypeName(Layer->GetType()));
		Row->SetBoolField(TEXT("isRuntime"), Layer->IsRuntime());
		// An editor layer has no runtime state; the engine reports Unloaded for it.
		Row->SetStringField(TEXT("initialRuntimeState"), GetDataLayerRuntimeStateName(Layer->GetInitialRuntimeState()));
		Row->SetBoolField(TEXT("isClientOnly"), Layer->IsClientOnly());
		Row->SetBoolField(TEXT("isServerOnly"), Layer->IsServerOnly());
		const UDataLayerInstance* Parent = Layer->GetParent();
		Row->SetStringField(TEXT("parent"), Parent ? Parent->GetDataLayerFName().ToString() : FString());
		Row->SetBoolField(TEXT("isInitiallyVisible"), Layer->IsInitiallyVisible());
		Row->SetBoolField(TEXT("isVisible"), Layer->IsVisible());
		Row->SetBoolField(TEXT("isInitiallyLoadedInEditor"), Layer->IsInitiallyLoadedInEditor());
		Row->SetBoolField(TEXT("isLoadedInEditor"), Layer->IsLoadedInEditor());
		Row->SetBoolField(TEXT("isEffectiveLoadedInEditor"), Layer->IsEffectiveLoadedInEditor());

		const FMCPDataLayerMembership* Members = Membership.Find(Layer);
		Row->SetNumberField(TEXT("actorCount"), Members ? Members->Actors : 0);
		Row->SetNumberField(TEXT("loadedActorCount"), Members ? Members->Loaded : 0);
		if (bIncludeMembers)
		{
			TArray<TPair<FString, TSharedPtr<FJsonObject>>> Sorted = Members ? Members->Members : TArray<TPair<FString, TSharedPtr<FJsonObject>>>();
			Sorted.Sort([](const TPair<FString, TSharedPtr<FJsonObject>>& A, const TPair<FString, TSharedPtr<FJsonObject>>& B)
			{
				return A.Key < B.Key;
			});
			TArray<TSharedPtr<FJsonValue>> MemberValues;
			for (int32 Index = 0; Index < FMath::Min(MaxMembers, Sorted.Num()); ++Index)
			{
				MemberValues.Add(MakeShared<FJsonValueObject>(Sorted[Index].Value));
			}
			Row->SetArrayField(TEXT("members"), MemberValues);
			Row->SetBoolField(TEXT("membersTruncated"), (Members ? Members->Actors : 0) > MemberValues.Num());
		}
		Rows.Add(MakeShared<FJsonValueObject>(Row));
	}

	auto Result = MCPSuccess();
	Result->SetStringField(TEXT("worldName"), World->GetName());
	Result->SetNumberField(TEXT("dataLayerCount"), Lookup.Instances.Num());
	Result->SetNumberField(TEXT("matched"), Matched);
	Result->SetNumberField(TEXT("returned"), Rows.Num());
	Result->SetBoolField(TEXT("truncated"), Matched > Rows.Num());
	Result->SetNumberField(TEXT("actorDescsScanned"), DescsScanned);
	Result->SetNumberField(TEXT("actorDescsInDataLayers"), DescsInLayers);
	// A layer name on a descriptor that matches no instance in this map: an
	// asset reference left behind when its instance was deleted, typically.
	Result->SetNumberField(TEXT("unresolvedDataLayerReferences"), UnresolvedNames);
	Result->SetBoolField(TEXT("includeMembers"), bIncludeMembers);
	if (bIncludeMembers) Result->SetNumberField(TEXT("maxMembers"), MaxMembers);
	Result->SetArrayField(TEXT("dataLayers"), Rows);

	TArray<FString> DirtyAfter;
	MCPEditorState::CollectDirtyEditorPackageNames(DirtyAfter);
	for (const FString& Already : DirtyBefore)
	{
		DirtyAfter.Remove(Already);
	}
	Result->SetBoolField(TEXT("dirtiedPackages"), DirtyAfter.Num() > 0);
	if (DirtyAfter.Num() > 0)
	{
		Result->SetArrayField(TEXT("dirtyPackages"), MCPStringListToJson(DirtyAfter));
	}
	return MCPResult(Result);
#elif WITH_EDITOR
	return MCPError(TEXT("list_data_layers needs the World Partition actor descriptor instance API, which is UE 5.5 and newer."));
#else
	return MCPError(TEXT("Data layer inspection is editor-only"));
#endif
}
