#include "LevelHandlers.h"

#include "HandlerUtils.h"
#include "Handlers/HandlerEditorState.h"
#include "Handlers/HandlerStaticMeshUse.h"

#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"

namespace
{
	constexpr int32 DefaultStaticMeshResults = 100;
	constexpr int32 MaxStaticMeshResults = 500;
	constexpr int32 HardMaxUniqueStaticMeshes = 8192;
	constexpr int32 DefaultStaticMeshOccurrences = 32;
	constexpr int32 MaxStaticMeshOccurrences = 256;

	struct FStaticMeshAggregate
	{
		FString MeshPath;
		FString LastActorPath;
		int64 ActorCount = 0;
		int64 ComponentCount = 0;
		int64 PlacementCount = 0;
	};

	int64 GetPlacementCount(const UStaticMeshComponent* Component)
	{
		if (const UInstancedStaticMeshComponent* Instanced = Cast<UInstancedStaticMeshComponent>(Component))
		{
			return FMath::Max(0, Instanced->GetInstanceCount());
		}

		return 1;
	}

	void GetSortedActors(UWorld* World, TArray<AActor*>& OutActors)
	{
		for (TActorIterator<AActor> It(World); It; ++It)
		{
			if (IsValid(*It))
			{
				OutActors.Add(*It);
			}
		}

		OutActors.Sort([](const AActor& Left, const AActor& Right)
		{
			return Left.GetPathName() < Right.GetPathName();
		});
	}

	void GetSortedStaticMeshComponents(AActor* Actor, TArray<UStaticMeshComponent*>& OutComponents)
	{
		Actor->GetComponents<UStaticMeshComponent>(OutComponents);
		OutComponents.RemoveAll([](const UStaticMeshComponent* Component)
		{
			return !IsValid(Component);
		});
		OutComponents.Sort([](const UStaticMeshComponent& Left, const UStaticMeshComponent& Right)
		{
			return Left.GetPathName() < Right.GetPathName();
		});
	}

	/**
	 * The world an inspection scan reads: 'editor' (default) or 'pie', never a
	 * silent substitute for the one asked for. Returns an error response, or
	 * nullptr with OutWorld and OutScope set.
	 */
	TSharedPtr<FJsonValue> ResolveInspectionWorld(
		const TSharedPtr<FJsonObject>& Params, UWorld*& OutWorld, FString& OutScope)
	{
		const FString RequestedWorld = OptionalString(Params, TEXT("world"), TEXT("editor"));
		const bool bEditorWorld = RequestedWorld.Equals(TEXT("editor"), ESearchCase::IgnoreCase);
		const bool bPieWorld = RequestedWorld.Equals(TEXT("pie"), ESearchCase::IgnoreCase);
		if (!bEditorWorld && !bPieWorld)
		{
			return MCPError(TEXT("Invalid 'world': expected 'editor' or 'pie'"));
		}

		OutScope = bEditorWorld ? TEXT("editor") : TEXT("pie");
		OutWorld = ResolveWorldFromParams(Params, *OutScope);
		if (!OutWorld)
		{
			return MCPError(FString::Printf(TEXT("World not available for scope '%s'"), *OutScope));
		}
		return nullptr;
	}

	constexpr int32 DefaultMeshUseResults = 200;
	constexpr int32 MaxMeshUseResults = 2000;

	/** One component row and the keys it sorts by. */
	struct FMeshUseRow
	{
		double Tilt = 0.0;
		TSharedPtr<FJsonObject> Json;
	};

	TSharedPtr<FJsonObject> MeshUseComponentRow(
		AActor* Actor, UStaticMeshComponent* Component, const UStaticMesh* Mesh)
	{
		TSharedPtr<FJsonObject> Row = MakeShared<FJsonObject>();
		Row->SetStringField(TEXT("actorLabel"), Actor->GetActorLabel());
		Row->SetStringField(TEXT("actorPath"), Actor->GetPathName());
		Row->SetStringField(TEXT("actorClass"), Actor->GetClass()->GetPathName());
		Row->SetStringField(TEXT("folderPath"), MCPActorFolderPath(Actor));
		Row->SetStringField(TEXT("componentName"), Component->GetName());
		Row->SetStringField(TEXT("componentPath"), Component->GetPathName());
		Row->SetStringField(TEXT("componentClass"), Component->GetClass()->GetName());
		Row->SetStringField(TEXT("meshPath"), Mesh->GetPathName());
		Row->SetBoolField(TEXT("isRootComponent"), Actor->GetRootComponent() == Component);
		const USceneComponent* Parent = Component->GetAttachParent();
		Row->SetStringField(TEXT("attachParent"), Parent ? Parent->GetName() : FString());
		const FName Socket = Component->GetAttachSocketName();
		Row->SetStringField(TEXT("attachSocket"), Socket.IsNone() ? FString() : Socket.ToString());
		return Row;
	}

	void SortMeshUseRows(TArray<FMeshUseRow>& Rows, bool bByTilt)
	{
		// Rows arrive in actor-path, then component-path order. A stable sort keeps
		// that order among equal tilts, so the truncated top N is reproducible.
		if (bByTilt)
		{
			Rows.StableSort([](const FMeshUseRow& A, const FMeshUseRow& B) { return A.Tilt > B.Tilt; });
		}
	}

	TArray<TSharedPtr<FJsonValue>> MeshUseRowsToJson(const TArray<FMeshUseRow>& Rows, int32 Limit)
	{
		TArray<TSharedPtr<FJsonValue>> Out;
		const int32 Count = FMath::Min(Limit, Rows.Num());
		Out.Reserve(Count);
		for (int32 Index = 0; Index < Count; ++Index)
		{
			Out.Add(MakeShared<FJsonValueObject>(Rows[Index].Json));
		}
		return Out;
	}
}

TSharedPtr<FJsonValue> FLevelHandlers::SummarizeStaticMeshUsage(const TSharedPtr<FJsonObject>& Params)
{
	MCPReadParamsAhead(Params, {
		TEXT("world"), TEXT("pieInstance"), TEXT("maxResults"), TEXT("includeOccurrences"), TEXT("maxOccurrences"),
	});

	check(IsInGameThread());

	UWorld* World = nullptr;
	FString WorldScope;
	if (TSharedPtr<FJsonValue> WorldError = ResolveInspectionWorld(Params, World, WorldScope))
	{
		return WorldError;
	}

	const int32 MaxResults = FMath::Clamp(
		OptionalInt(Params, TEXT("maxResults"), DefaultStaticMeshResults),
		1,
		MaxStaticMeshResults);
	const bool bIncludeOccurrences = OptionalBool(Params, TEXT("includeOccurrences"), false);
	const int32 MaxOccurrences = FMath::Clamp(
		OptionalInt(Params, TEXT("maxOccurrences"), DefaultStaticMeshOccurrences),
		0,
		MaxStaticMeshOccurrences);

	// Actor/component iteration order is not an API guarantee. Exact object-path
	// ordering makes aggregation and the bounded occurrence sample reproducible.
	TArray<AActor*> Actors;
	GetSortedActors(World, Actors);

	TMap<FString, FStaticMeshAggregate> Aggregates;
	int64 StaticMeshActors = 0;
	int64 ScannedStaticMeshComponents = 0;
	int64 NullMeshComponents = 0;
	int64 TotalComponentCount = 0;
	int64 TotalPlacementCount = 0;

	for (AActor* Actor : Actors)
	{
		if (!IsValid(Actor))
		{
			continue;
		}

		TArray<UStaticMeshComponent*> Components;
		GetSortedStaticMeshComponents(Actor, Components);
		if (Components.Num() > 0)
		{
			++StaticMeshActors;
		}

		const FString ActorPath = Actor->GetPathName();
		for (UStaticMeshComponent* Component : Components)
		{
			++ScannedStaticMeshComponents;
			UStaticMesh* Mesh = Component->GetStaticMesh();
			if (!IsValid(Mesh))
			{
				++NullMeshComponents;
				continue;
			}

			const FString MeshPath = Mesh->GetPathName();
			FStaticMeshAggregate* Aggregate = Aggregates.Find(MeshPath);
			if (!Aggregate)
			{
				if (Aggregates.Num() >= HardMaxUniqueStaticMeshes)
				{
					return MCPError(FString::Printf(
						TEXT("Static mesh usage exceeds the hard limit of %d unique loaded meshes"),
						HardMaxUniqueStaticMeshes));
				}

				FStaticMeshAggregate NewAggregate;
				NewAggregate.MeshPath = MeshPath;
				Aggregate = &Aggregates.Add(MeshPath, MoveTemp(NewAggregate));
			}

			const int64 PlacementCount = GetPlacementCount(Component);
			++TotalComponentCount;
			TotalPlacementCount += PlacementCount;
			++Aggregate->ComponentCount;
			Aggregate->PlacementCount += PlacementCount;
			if (Aggregate->LastActorPath != ActorPath)
			{
				Aggregate->LastActorPath = ActorPath;
				++Aggregate->ActorCount;
			}
		}
	}

	TArray<FString> SortedMeshPaths;
	Aggregates.GenerateKeyArray(SortedMeshPaths);
	SortedMeshPaths.Sort([&Aggregates](const FString& LeftPath, const FString& RightPath)
	{
		const FStaticMeshAggregate& Left = Aggregates.FindChecked(LeftPath);
		const FStaticMeshAggregate& Right = Aggregates.FindChecked(RightPath);
		if (Left.PlacementCount != Right.PlacementCount)
		{
			return Left.PlacementCount > Right.PlacementCount;
		}
		return LeftPath < RightPath;
	});

	const int32 ReturnedMeshCount = FMath::Min(MaxResults, SortedMeshPaths.Num());
	SortedMeshPaths.SetNum(ReturnedMeshCount);
	TSet<FString> ReturnedMeshPaths;
	ReturnedMeshPaths.Reserve(ReturnedMeshCount);
	for (const FString& MeshPath : SortedMeshPaths)
	{
		ReturnedMeshPaths.Add(MeshPath);
	}

	// Occurrences are examples, globally capped across only the returned meshes.
	// A second deterministic pass keeps omitted aggregates from consuming the cap.
	TMap<FString, TArray<TSharedPtr<FJsonValue>>> OccurrencesByMesh;
	int32 ReturnedOccurrences = 0;
	if (bIncludeOccurrences && MaxOccurrences > 0)
	{
		for (AActor* Actor : Actors)
		{
			if (!IsValid(Actor) || ReturnedOccurrences >= MaxOccurrences)
			{
				break;
			}

			TArray<UStaticMeshComponent*> Components;
			GetSortedStaticMeshComponents(Actor, Components);
			for (UStaticMeshComponent* Component : Components)
			{
				if (ReturnedOccurrences >= MaxOccurrences)
				{
					break;
				}

				UStaticMesh* Mesh = Component->GetStaticMesh();
				if (!IsValid(Mesh) || !ReturnedMeshPaths.Contains(Mesh->GetPathName()))
				{
					continue;
				}

				TSharedPtr<FJsonObject> Occurrence = MakeShared<FJsonObject>();
				Occurrence->SetStringField(TEXT("actorPath"), Actor->GetPathName());
				Occurrence->SetStringField(TEXT("actorLabel"), Actor->GetActorLabel());
				Occurrence->SetStringField(TEXT("componentPath"), Component->GetPathName());
				Occurrence->SetStringField(TEXT("componentName"), Component->GetName());
				Occurrence->SetStringField(TEXT("componentClass"), Component->GetClass()->GetPathName());
				Occurrence->SetNumberField(TEXT("placementCount"), static_cast<double>(GetPlacementCount(Component)));
				OccurrencesByMesh.FindOrAdd(Mesh->GetPathName()).Add(MakeShared<FJsonValueObject>(Occurrence));
				++ReturnedOccurrences;
			}
		}
	}

	TArray<TSharedPtr<FJsonValue>> MeshesJson;
	MeshesJson.Reserve(ReturnedMeshCount);
	int64 ReturnedComponentCount = 0;
	for (const FString& MeshPath : SortedMeshPaths)
	{
		const FStaticMeshAggregate& Aggregate = Aggregates.FindChecked(MeshPath);
		ReturnedComponentCount += Aggregate.ComponentCount;

		TSharedPtr<FJsonObject> MeshJson = MakeShared<FJsonObject>();
		MeshJson->SetStringField(TEXT("meshPath"), Aggregate.MeshPath);
		MeshJson->SetNumberField(TEXT("actorCount"), static_cast<double>(Aggregate.ActorCount));
		MeshJson->SetNumberField(TEXT("componentCount"), static_cast<double>(Aggregate.ComponentCount));
		MeshJson->SetNumberField(TEXT("placementCount"), static_cast<double>(Aggregate.PlacementCount));

		if (bIncludeOccurrences)
		{
			const TArray<TSharedPtr<FJsonValue>>* Occurrences = OccurrencesByMesh.Find(MeshPath);
			MeshJson->SetArrayField(
				TEXT("occurrences"),
				Occurrences ? *Occurrences : TArray<TSharedPtr<FJsonValue>>());
			MeshJson->SetBoolField(
				TEXT("occurrencesTruncated"),
				!Occurrences || Occurrences->Num() < Aggregate.ComponentCount);
		}

		MeshesJson.Add(MakeShared<FJsonValueObject>(MeshJson));
	}

	TSharedPtr<FJsonObject> Result = MCPSuccess();
	Result->SetStringField(TEXT("world"), WorldScope);
	Result->SetStringField(TEXT("worldName"), World->GetName());
	Result->SetBoolField(TEXT("loadedOnly"), true);
	Result->SetNumberField(TEXT("maxResults"), MaxResults);
	Result->SetBoolField(TEXT("includeOccurrences"), bIncludeOccurrences);
	Result->SetNumberField(TEXT("maxOccurrences"), MaxOccurrences);
	Result->SetNumberField(TEXT("hardUniqueMeshLimit"), HardMaxUniqueStaticMeshes);
	Result->SetNumberField(TEXT("actorsScanned"), Actors.Num());
	Result->SetNumberField(TEXT("staticMeshActors"), static_cast<double>(StaticMeshActors));
	Result->SetNumberField(TEXT("scannedStaticMeshComponents"), static_cast<double>(ScannedStaticMeshComponents));
	Result->SetNumberField(TEXT("nullMeshComponents"), static_cast<double>(NullMeshComponents));
	Result->SetNumberField(TEXT("totalComponentCount"), static_cast<double>(TotalComponentCount));
	Result->SetNumberField(TEXT("totalPlacementCount"), static_cast<double>(TotalPlacementCount));
	Result->SetNumberField(TEXT("totalUniqueMeshes"), Aggregates.Num());
	Result->SetNumberField(TEXT("returnedMeshCount"), ReturnedMeshCount);
	Result->SetBoolField(TEXT("truncated"), ReturnedMeshCount < Aggregates.Num());
	Result->SetNumberField(TEXT("totalOccurrences"), static_cast<double>(TotalComponentCount));
	Result->SetNumberField(TEXT("eligibleOccurrencesForReturnedMeshes"), static_cast<double>(ReturnedComponentCount));
	Result->SetNumberField(TEXT("returnedOccurrences"), ReturnedOccurrences);
	Result->SetBoolField(
		TEXT("occurrencesTruncated"),
		bIncludeOccurrences && ReturnedOccurrences < TotalComponentCount);
	Result->SetArrayField(TEXT("meshes"), MeshesJson);
	return MCPResult(Result);
}

TSharedPtr<FJsonValue> FLevelHandlers::FindStaticMeshUses(const TSharedPtr<FJsonObject>& Params)
{
	MCPReadParamsAhead(Params, {
		TEXT("meshPaths"), TEXT("meshPathPrefix"), TEXT("world"), TEXT("pieInstance"), TEXT("bounds"),
		TEXT("minTiltDegrees"), TEXT("includeInstanced"), TEXT("sortBy"), TEXT("maxResults"),
	});

	check(IsInGameThread());

	MCPStaticMeshUse::FMeshSelector Selector;
	if (TSharedPtr<FJsonValue> SelectorError = MCPStaticMeshUse::ReadMeshSelector(Params, Selector))
	{
		return SelectorError;
	}

	UWorld* World = nullptr;
	FString WorldScope;
	if (TSharedPtr<FJsonValue> WorldError = ResolveInspectionWorld(Params, World, WorldScope))
	{
		return WorldError;
	}

	// Strict, unlike a free-form filter: a box with a missing axis would quietly
	// test against zero and read as "no uses here".
	FBox Box(ForceInit);
	bool bHasBounds = false;
	const TSharedPtr<FJsonObject>* BoundsObj = nullptr;
	if (TryGetObjectParam(Params, TEXT("bounds"), BoundsObj) && BoundsObj && BoundsObj->IsValid())
	{
		const TSharedPtr<FJsonObject>* MinObj = nullptr;
		const TSharedPtr<FJsonObject>* MaxObj = nullptr;
		FVector Min = FVector::ZeroVector;
		FVector Max = FVector::ZeroVector;
		if (!(*BoundsObj)->TryGetObjectField(TEXT("min"), MinObj) || !MinObj || !ReadVec3FieldsStrict(*MinObj, Min) ||
			!(*BoundsObj)->TryGetObjectField(TEXT("max"), MaxObj) || !MaxObj || !ReadVec3FieldsStrict(*MaxObj, Max))
		{
			return MCPError(TEXT("'bounds' must be {min:{x,y,z}, max:{x,y,z}} in world units"));
		}
		Box = FBox(Min.ComponentMin(Max), Min.ComponentMax(Max));
		bHasBounds = true;
	}

	const FString SortBy = OptionalString(Params, TEXT("sortBy"), TEXT("path")).ToLower();
	if (SortBy != TEXT("path") && SortBy != TEXT("tilt"))
	{
		return MCPError(TEXT("'sortBy' must be 'path' (actor then component path, the default) or 'tilt' (most tilted first)"));
	}
	const double MinTilt = MCPStaticMeshUse::ReadMinTilt(Params);
	const bool bIncludeInstanced = OptionalBool(Params, TEXT("includeInstanced"), true);
	const int32 MaxResults = FMath::Clamp(
		OptionalInt(Params, TEXT("maxResults"), DefaultMeshUseResults), 1, MaxMeshUseResults);

	TArray<FString> DirtyBefore;
	MCPEditorState::CollectDirtyEditorPackageNames(DirtyBefore);

	TArray<AActor*> Actors;
	GetSortedActors(World, Actors);

	TArray<FMeshUseRow> Rows;
	TArray<FMeshUseRow> InstancedRows;
	TMap<FString, int32> UsesByMesh;
	int64 ScannedComponents = 0;
	int32 MatchedComponents = 0;
	int32 OutsideBounds = 0;
	int32 BelowMinTilt = 0;
	int32 MatchedInstancedComponents = 0;
	int64 MatchedInstances = 0;

	for (AActor* Actor : Actors)
	{
		if (!IsValid(Actor))
		{
			continue;
		}

		TArray<UStaticMeshComponent*> Components;
		GetSortedStaticMeshComponents(Actor, Components);
		for (UStaticMeshComponent* Component : Components)
		{
			++ScannedComponents;
			const UStaticMesh* Mesh = Component->GetStaticMesh();
			if (!IsValid(Mesh) || !Selector.Matches(Mesh))
			{
				continue;
			}
			UsesByMesh.FindOrAdd(Mesh->GetPathName())++;

			// Instances are not components: one HISM can hold thousands, each with
			// its own transform. They are reported per component with a count, and
			// level(get_instance_transforms) reads the instances themselves.
			if (const UInstancedStaticMeshComponent* Instanced = Cast<UInstancedStaticMeshComponent>(Component))
			{
				++MatchedInstancedComponents;
				const int32 InstanceCount = FMath::Max(0, Instanced->GetInstanceCount());
				MatchedInstances += InstanceCount;
				if (!bIncludeInstanced)
				{
					continue;
				}
				if (bHasBounds && !Component->Bounds.GetBox().Intersect(Box))
				{
					continue;
				}

				TSharedPtr<FJsonObject> Row = MeshUseComponentRow(Actor, Component, Mesh);
				MCPStaticMeshUse::WriteTransformFields(Row, Component->GetComponentTransform());
				Row->SetBoolField(TEXT("hierarchical"), Component->IsA<UHierarchicalInstancedStaticMeshComponent>());
				Row->SetNumberField(TEXT("instanceCount"), InstanceCount);
				double MaxInstanceTilt = 0.0;
				int32 TiltedInstances = 0;
				for (int32 Index = 0; Index < InstanceCount; ++Index)
				{
					FTransform InstanceTransform;
					if (!Instanced->GetInstanceTransform(Index, InstanceTransform, /*bWorldSpace*/ true))
					{
						continue;
					}
					const double InstanceTilt = MCPStaticMeshUse::TiltDegrees(InstanceTransform.GetRotation());
					MaxInstanceTilt = FMath::Max(MaxInstanceTilt, InstanceTilt);
					if (MinTilt > 0.0 && InstanceTilt >= MinTilt)
					{
						++TiltedInstances;
					}
				}
				Row->SetNumberField(TEXT("maxInstanceTiltDegrees"), MaxInstanceTilt);
				if (MinTilt > 0.0)
				{
					Row->SetNumberField(TEXT("instancesAtOrAboveMinTilt"), TiltedInstances);
				}
				InstancedRows.Add({ MaxInstanceTilt, Row });
				continue;
			}

			++MatchedComponents;
			const FTransform WorldTransform = Component->GetComponentTransform();
			if (bHasBounds && !Box.IsInsideOrOn(WorldTransform.GetLocation()))
			{
				++OutsideBounds;
				continue;
			}
			const double Tilt = MCPStaticMeshUse::TiltDegrees(WorldTransform.GetRotation());
			if (Tilt < MinTilt)
			{
				++BelowMinTilt;
				continue;
			}

			TSharedPtr<FJsonObject> Row = MeshUseComponentRow(Actor, Component, Mesh);
			MCPStaticMeshUse::WriteTransformFields(Row, WorldTransform);
			Row->SetObjectField(TEXT("relativeRotation"), MCPRotatorToJsonObject(Component->GetRelativeRotation()));
			Rows.Add({ Tilt, Row });
		}
	}

	const bool bByTilt = SortBy == TEXT("tilt");
	SortMeshUseRows(Rows, bByTilt);
	SortMeshUseRows(InstancedRows, bByTilt);

	TSharedPtr<FJsonObject> Result = MCPSuccess();
	Result->SetStringField(TEXT("world"), WorldScope);
	Result->SetStringField(TEXT("worldName"), World->GetName());
	// Like every actor scan, this sees only what is spawned. On a World
	// Partition map an actor whose cell is not loaded is not in the scan at all.
	Result->SetBoolField(TEXT("loadedOnly"), true);
	Result->SetBoolField(TEXT("worldPartition"), World->IsPartitionedWorld());
	if (World->IsPartitionedWorld())
	{
		Result->SetStringField(TEXT("note"), TEXT(
			"World Partition map: only actors that are streamed in were scanned. Make the rest resident with "
			"level(load_actor_descs) (filter by bounds or className) and run this again."));
	}
	MCPStaticMeshUse::WriteSelector(Result, Selector);
	Result->SetArrayField(TEXT("unknownMeshPaths"), MCPStringListToJson(MCPStaticMeshUse::UnknownMeshPaths(Selector)));
	Result->SetArrayField(TEXT("unmatchedMeshPaths"), MCPStringListToJson(MCPStaticMeshUse::UnmatchedExactPaths(Selector, UsesByMesh)));
	Result->SetObjectField(TEXT("usesByMesh"), MCPStaticMeshUse::CountsToJson(UsesByMesh));
	Result->SetNumberField(TEXT("actorsScanned"), Actors.Num());
	Result->SetNumberField(TEXT("staticMeshComponentsScanned"), static_cast<double>(ScannedComponents));
	Result->SetNumberField(TEXT("matchedComponents"), MatchedComponents);
	Result->SetNumberField(TEXT("outsideBounds"), OutsideBounds);
	Result->SetNumberField(TEXT("belowMinTilt"), BelowMinTilt);
	Result->SetNumberField(TEXT("minTiltDegrees"), MinTilt);
	Result->SetStringField(TEXT("sortBy"), SortBy);
	Result->SetNumberField(TEXT("maxResults"), MaxResults);
	Result->SetNumberField(TEXT("totalRows"), Rows.Num());
	Result->SetNumberField(TEXT("returned"), FMath::Min(MaxResults, Rows.Num()));
	Result->SetBoolField(TEXT("truncated"), Rows.Num() > MaxResults);
	Result->SetArrayField(TEXT("components"), MeshUseRowsToJson(Rows, MaxResults));

	Result->SetBoolField(TEXT("includeInstanced"), bIncludeInstanced);
	Result->SetNumberField(TEXT("matchedInstancedComponents"), MatchedInstancedComponents);
	Result->SetNumberField(TEXT("matchedInstances"), static_cast<double>(MatchedInstances));
	if (bIncludeInstanced)
	{
		Result->SetNumberField(TEXT("instancedRows"), InstancedRows.Num());
		Result->SetBoolField(TEXT("instancedTruncated"), InstancedRows.Num() > MaxResults);
		Result->SetArrayField(TEXT("instancedComponents"), MeshUseRowsToJson(InstancedRows, MaxResults));
	}

	// The read guarantee, asserted rather than assumed.
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
}
