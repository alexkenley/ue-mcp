// Coverage for level(find_static_mesh_uses).
//
// Built in a transient editor world, so nothing the test makes can reach a
// saved map. The fixture is chosen so the answer the action exists for is the
// one under test: a mesh whose own relative rotation is zero under a parent
// pitched 30 degrees is tilted 30 degrees in the world, and a mesh pitched -30
// under the same parent is upright. A relative-rotation read gets both wrong.

#if WITH_DEV_AUTOMATION_TESTS

#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Handlers/Level/LevelHandlers.h"
#include "Misc/AutomationTest.h"

#include "Components/InstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Editor.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "Misc/Guid.h"
#include "UObject/Package.h"
#include "UObject/UObjectGlobals.h"

namespace
{
	constexpr const TCHAR* FindStaticMeshUsesMethod = TEXT("find_static_mesh_uses");

	/** A transient editor world swapped in as the editor's world for the test's lifetime. */
	class FMCPMeshUsesTestWorld
	{
	public:
		FMCPMeshUsesTestWorld()
		{
			if (!GEditor) return;
			OriginalWorld = GEditor->GetEditorWorldContext().World();
			const FName WorldName = MakeUniqueObjectName(
				GetTransientPackage(), UWorld::StaticClass(), FName(TEXT("UEMCP_FindMeshUsesTestWorld")));
			const UWorld::InitializationValues Values = UWorld::InitializationValues()
				.InitializeScenes(false)
				.AllowAudioPlayback(false)
				.RequiresHitProxies(false)
				.CreatePhysicsScene(false)
				.CreateNavigation(false)
				.CreateAISystem(false)
				.ShouldSimulatePhysics(false)
				.EnableTraceCollision(false)
				.SetTransactional(false)
				.CreateFXSystem(false)
				.CreateWorldPartition(false);
			World = UWorld::CreateWorld(EWorldType::Editor, false, WorldName, GetTransientPackage(), true, ERHIFeatureLevel::Num, &Values);
			if (World) GEditor->GetEditorWorldContext().SetCurrentWorld(World);
		}

		~FMCPMeshUsesTestWorld()
		{
			if (GEditor && World) GEditor->GetEditorWorldContext().SetCurrentWorld(OriginalWorld);
			if (World) World->DestroyWorld(false);
		}

		UWorld* Get() const { return World; }

	private:
		UWorld* OriginalWorld = nullptr;
		UWorld* World = nullptr;
	};

	AActor* SpawnMeshUsesActor(UWorld* World, const TCHAR* Name, const TCHAR* Label)
	{
		FActorSpawnParameters Spawn;
		Spawn.Name = MakeUniqueObjectName(World->PersistentLevel, AActor::StaticClass(), FName(Name));
		Spawn.ObjectFlags = RF_Transient;
		AActor* Actor = World->SpawnActor<AActor>(AActor::StaticClass(), FTransform::Identity, Spawn);
		if (Actor) Actor->SetActorLabel(Label, false);
		return Actor;
	}

	template <typename ComponentType>
	ComponentType* AddMeshUsesComponent(AActor* Actor, const TCHAR* Name, USceneComponent* Parent, const FTransform& Relative)
	{
		ComponentType* Component = NewObject<ComponentType>(Actor, Name, RF_Transient);
		Actor->AddInstanceComponent(Component);
		if (Parent)
		{
			Component->SetupAttachment(Parent);
		}
		else
		{
			Actor->SetRootComponent(Component);
		}
		Component->SetRelativeTransform(Relative);
		return Component;
	}

	TSharedPtr<FJsonObject> RunFindMeshUses(FMCPHandlerRegistry& Registry, const TSharedPtr<FJsonObject>& Request)
	{
		const TSharedPtr<FJsonValue> Response = Registry.ExecuteHandler(FindStaticMeshUsesMethod, Request);
		return (Response.IsValid() && Response->Type == EJson::Object) ? Response->AsObject() : nullptr;
	}

	bool MeshUsesSucceeded(const TSharedPtr<FJsonObject>& Response)
	{
		bool bSuccess = false;
		return Response.IsValid() && Response->TryGetBoolField(TEXT("success"), bSuccess) && bSuccess;
	}

	TSharedPtr<FJsonObject> MeshUsesRow(const TSharedPtr<FJsonObject>& Response, const TCHAR* List, const FString& ComponentName)
	{
		const TArray<TSharedPtr<FJsonValue>>* Rows = nullptr;
		if (!Response.IsValid() || !Response->TryGetArrayField(List, Rows) || !Rows) return nullptr;
		for (const TSharedPtr<FJsonValue>& Value : *Rows)
		{
			const TSharedPtr<FJsonObject> Row = Value.IsValid() ? Value->AsObject() : nullptr;
			if (Row.IsValid() && Row->GetStringField(TEXT("componentName")) == ComponentName) return Row;
		}
		return nullptr;
	}

	bool StringListContains(const TSharedPtr<FJsonObject>& Response, const TCHAR* Field, const FString& Wanted)
	{
		const TArray<TSharedPtr<FJsonValue>>* Values = nullptr;
		if (!Response.IsValid() || !Response->TryGetArrayField(Field, Values) || !Values) return false;
		for (const TSharedPtr<FJsonValue>& Value : *Values)
		{
			if (Value.IsValid() && Value->AsString() == Wanted) return true;
		}
		return false;
	}

	TSharedPtr<FJsonObject> MeshUsesRequest(const TArray<FString>& MeshPaths)
	{
		TSharedPtr<FJsonObject> Request = MakeShared<FJsonObject>();
		Request->SetStringField(TEXT("world"), TEXT("editor"));
		Request->SetArrayField(TEXT("meshPaths"), MCPStringListToJson(MeshPaths));
		return Request;
	}

	TSharedPtr<FJsonObject> BoxJson(const FVector& Min, const FVector& Max)
	{
		TSharedPtr<FJsonObject> Box = MakeShared<FJsonObject>();
		Box->SetObjectField(TEXT("min"), MCPVec3ToJsonObject(Min));
		Box->SetObjectField(TEXT("max"), MCPVec3ToJsonObject(Max));
		return Box;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FLevelFindStaticMeshUsesRefusalsTest,
	"UE.MCP.Level.FindStaticMeshUses.Refusals",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FLevelFindStaticMeshUsesRefusalsTest::RunTest(const FString& Parameters)
{
	FMCPHandlerRegistry Registry;
	FLevelHandlers::RegisterHandlers(Registry);
	if (!TestTrue(TEXT("find_static_mesh_uses is registered"), Registry.HasHandler(FindStaticMeshUsesMethod))) return false;

	{
		const TSharedPtr<FJsonObject> Response = RunFindMeshUses(Registry, MakeShared<FJsonObject>());
		TestFalse(TEXT("a call naming no mesh is refused"), MeshUsesSucceeded(Response));
	}
	{
		TSharedPtr<FJsonObject> Request = MeshUsesRequest({ TEXT("/Engine/BasicShapes/Cube") });
		Request->SetStringField(TEXT("sortBy"), TEXT("size"));
		TestFalse(TEXT("an unknown sortBy is refused"), MeshUsesSucceeded(RunFindMeshUses(Registry, Request)));
	}
	{
		TSharedPtr<FJsonObject> Request = MeshUsesRequest({ TEXT("/Engine/BasicShapes/Cube") });
		TSharedPtr<FJsonObject> Box = MakeShared<FJsonObject>();
		Box->SetObjectField(TEXT("min"), MCPVec3ToJsonObject(FVector::ZeroVector));
		Request->SetObjectField(TEXT("bounds"), Box);
		const TSharedPtr<FJsonObject> Response = RunFindMeshUses(Registry, Request);
		TestFalse(TEXT("a box without max is refused rather than read as zero"), MeshUsesSucceeded(Response));
	}
	{
		TSharedPtr<FJsonObject> Request = MeshUsesRequest({ TEXT("Props/SM_Crate") });
		TestFalse(TEXT("a mesh path that is not mount-rooted is refused"), MeshUsesSucceeded(RunFindMeshUses(Registry, Request)));
	}
	{
		TSharedPtr<FJsonObject> Request = MeshUsesRequest({ TEXT("/Engine/BasicShapes/Cube") });
		Request->SetStringField(TEXT("world"), TEXT("auto"));
		TestFalse(TEXT("an unknown world scope is refused"), MeshUsesSucceeded(RunFindMeshUses(Registry, Request)));
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FLevelFindStaticMeshUsesTransformsTest,
	"UE.MCP.Level.FindStaticMeshUses.WorldTransformsTiltAndFilters",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FLevelFindStaticMeshUsesTransformsTest::RunTest(const FString& Parameters)
{
	FMCPMeshUsesTestWorld WorldScope;
	UWorld* World = WorldScope.Get();
	if (!TestNotNull(TEXT("a transient editor world was created"), World)) return false;

	const FString Suffix = FGuid::NewGuid().ToString(EGuidFormats::Digits);
	const FString Prefix = FString::Printf(TEXT("UEMCP_FindUses_%s_"), *Suffix);
	UStaticMesh* Alpha = NewObject<UStaticMesh>(GetTransientPackage(), *(Prefix + TEXT("Alpha")), RF_Transient);
	UStaticMesh* Beta = NewObject<UStaticMesh>(GetTransientPackage(), *(Prefix + TEXT("Beta")), RF_Transient);
	UStaticMesh* Gamma = NewObject<UStaticMesh>(GetTransientPackage(), *FString::Printf(TEXT("UEMCP_Other_%s_Gamma"), *Suffix), RF_Transient);
	if (!Alpha || !Beta || !Gamma) return false;

	// Actor A: a root pitched 30, a mesh with zero relative rotation under it
	// (30 in the world), and a mesh pitched -30 under it (upright in the world).
	AActor* ActorA = SpawnMeshUsesActor(World, TEXT("UEMCP_FindUses_A"), TEXT("Find Uses A"));
	AActor* ActorB = SpawnMeshUsesActor(World, TEXT("UEMCP_FindUses_B"), TEXT("Find Uses B"));
	if (!TestNotNull(TEXT("actor A"), ActorA) || !TestNotNull(TEXT("actor B"), ActorB)) return false;

	USceneComponent* Pivot = AddMeshUsesComponent<USceneComponent>(ActorA, TEXT("Pivot"), nullptr,
		FTransform(FRotator(30.0, 0.0, 0.0), FVector::ZeroVector));
	UStaticMeshComponent* Tilted = AddMeshUsesComponent<UStaticMeshComponent>(ActorA, TEXT("TiltedByParent"), Pivot,
		FTransform(FRotator::ZeroRotator, FVector(100.0, 0.0, 0.0)));
	UStaticMeshComponent* Upright = AddMeshUsesComponent<UStaticMeshComponent>(ActorA, TEXT("UprightAgainstParent"), Pivot,
		FTransform(FRotator(-30.0, 0.0, 0.0), FVector::ZeroVector));
	UStaticMeshComponent* Unlisted = AddMeshUsesComponent<UStaticMeshComponent>(ActorA, TEXT("UnlistedMesh"), Pivot, FTransform::Identity);
	UStaticMeshComponent* NoMesh = AddMeshUsesComponent<UStaticMeshComponent>(ActorA, TEXT("NoMesh"), Pivot, FTransform::Identity);
	Tilted->SetStaticMesh(Alpha);
	Upright->SetStaticMesh(Beta);
	Unlisted->SetStaticMesh(Gamma);
	NoMesh->SetStaticMesh(nullptr);

	// Actor B, far from A: an upright Alpha root and an instanced Alpha with
	// three instances at 0, 45 and 90 degrees.
	UStaticMeshComponent* FarRoot = AddMeshUsesComponent<UStaticMeshComponent>(ActorB, TEXT("FarRoot"), nullptr,
		FTransform(FRotator::ZeroRotator, FVector(5000.0, 0.0, 0.0)));
	UInstancedStaticMeshComponent* Instances = AddMeshUsesComponent<UInstancedStaticMeshComponent>(ActorB, TEXT("Instances"), FarRoot, FTransform::Identity);
	FarRoot->SetStaticMesh(Alpha);
	Instances->SetStaticMesh(Alpha);
	Instances->AddInstance(FTransform::Identity);
	Instances->AddInstance(FTransform(FRotator(45.0, 0.0, 0.0)));
	Instances->AddInstance(FTransform(FRotator(90.0, 0.0, 0.0)));

	for (USceneComponent* Component : TArray<USceneComponent*>{ Pivot, Tilted, Upright, Unlisted, NoMesh, FarRoot, Instances })
	{
		Component->UpdateComponentToWorld();
	}

	const FString AlphaPath = Alpha->GetPathName();
	const FString BetaPath = Beta->GetPathName();
	const FString Missing = TEXT("/Game/UEMCPMissing/SM_DoesNotExist.SM_DoesNotExist");

	FMCPHandlerRegistry Registry;
	FLevelHandlers::RegisterHandlers(Registry);

	// Everything, path order.
	{
		const TSharedPtr<FJsonObject> Response = RunFindMeshUses(Registry, MeshUsesRequest({ AlphaPath, BetaPath, Missing }));
		if (!TestTrue(TEXT("the scan succeeds"), MeshUsesSucceeded(Response))) return false;
		TestTrue(TEXT("it says it read loaded actors only"), Response->GetBoolField(TEXT("loadedOnly")));
		TestFalse(TEXT("reading dirties no package"), Response->GetBoolField(TEXT("dirtiedPackages")));
		TestEqual(TEXT("three plain components use a listed mesh"), static_cast<int32>(Response->GetNumberField(TEXT("matchedComponents"))), 3);
		TestEqual(TEXT("all three are rows"), static_cast<int32>(Response->GetNumberField(TEXT("totalRows"))), 3);
		TestFalse(TEXT("nothing is truncated"), Response->GetBoolField(TEXT("truncated")));
		TestTrue(TEXT("a mesh that does not exist is named as unknown"), StringListContains(Response, TEXT("unknownMeshPaths"), Missing));
		TestTrue(TEXT("and as unmatched"), StringListContains(Response, TEXT("unmatchedMeshPaths"), Missing));
		TestFalse(TEXT("a used mesh is not unmatched"), StringListContains(Response, TEXT("unmatchedMeshPaths"), AlphaPath));
		const TSharedPtr<FJsonObject>* UsesByMesh = nullptr;
		if (TestTrue(TEXT("usesByMesh is reported"), Response->TryGetObjectField(TEXT("usesByMesh"), UsesByMesh)))
		{
			TestEqual(TEXT("Alpha counts its plain and instanced uses"), static_cast<int32>((*UsesByMesh)->GetNumberField(AlphaPath)), 3);
			TestEqual(TEXT("Beta is used once"), static_cast<int32>((*UsesByMesh)->GetNumberField(BetaPath)), 1);
		}
		TestNull(TEXT("an unlisted mesh is not reported"), MeshUsesRow(Response, TEXT("components"), TEXT("UnlistedMesh")).Get());
		TestNull(TEXT("an instanced component is not a component row"), MeshUsesRow(Response, TEXT("components"), TEXT("Instances")).Get());

		const TSharedPtr<FJsonObject> TiltedRow = MeshUsesRow(Response, TEXT("components"), TEXT("TiltedByParent"));
		if (TestNotNull(TEXT("the mesh under the pitched parent is reported"), TiltedRow.Get()))
		{
			TestEqual(TEXT("its world tilt is the parent's 30 degrees"), TiltedRow->GetNumberField(TEXT("tiltDegrees")), 30.0, 0.01);
			FRotator Relative = FRotator::ZeroRotator;
			ReadRotatorFieldsStrict(TiltedRow->GetObjectField(TEXT("relativeRotation")), Relative);
			TestTrue(TEXT("though its own relative rotation is zero"), Relative.IsNearlyZero(0.01));
			FVector Location = FVector::ZeroVector;
			ReadVec3FieldsStrict(TiltedRow->GetObjectField(TEXT("location")), Location);
			const FVector Expected = FRotator(30.0, 0.0, 0.0).RotateVector(FVector(100.0, 0.0, 0.0));
			TestTrue(TEXT("and its location is the world one"), Location.Equals(Expected, 0.01));
			TestEqual(TEXT("its actor label is reported"), TiltedRow->GetStringField(TEXT("actorLabel")), FString(TEXT("Find Uses A")));
			TestEqual(TEXT("its parent is named"), TiltedRow->GetStringField(TEXT("attachParent")), FString(TEXT("Pivot")));
			TestEqual(TEXT("its mesh is named"), TiltedRow->GetStringField(TEXT("meshPath")), AlphaPath);
		}
		const TSharedPtr<FJsonObject> UprightRow = MeshUsesRow(Response, TEXT("components"), TEXT("UprightAgainstParent"));
		if (TestNotNull(TEXT("the counter-rotated mesh is reported"), UprightRow.Get()))
		{
			TestEqual(TEXT("and is upright in the world"), UprightRow->GetNumberField(TEXT("tiltDegrees")), 0.0, 0.01);
		}

		const TSharedPtr<FJsonObject> InstancedRow = MeshUsesRow(Response, TEXT("instancedComponents"), TEXT("Instances"));
		if (TestNotNull(TEXT("the instanced component is listed apart"), InstancedRow.Get()))
		{
			TestEqual(TEXT("with its instance count"), static_cast<int32>(InstancedRow->GetNumberField(TEXT("instanceCount"))), 3);
			TestEqual(TEXT("and its most tilted instance"), InstancedRow->GetNumberField(TEXT("maxInstanceTiltDegrees")), 90.0, 0.01);
		}
	}

	// Only what is tilted.
	{
		TSharedPtr<FJsonObject> Request = MeshUsesRequest({ AlphaPath, BetaPath });
		Request->SetNumberField(TEXT("minTiltDegrees"), 20.0);
		const TSharedPtr<FJsonObject> Response = RunFindMeshUses(Registry, Request);
		if (TestTrue(TEXT("the tilt filter succeeds"), MeshUsesSucceeded(Response)))
		{
			TestEqual(TEXT("one plain use is tilted 20 degrees or more"), static_cast<int32>(Response->GetNumberField(TEXT("totalRows"))), 1);
			TestEqual(TEXT("the other two are counted below it"), static_cast<int32>(Response->GetNumberField(TEXT("belowMinTilt"))), 2);
			TestNotNull(TEXT("and the tilted one is the row"), MeshUsesRow(Response, TEXT("components"), TEXT("TiltedByParent")).Get());
			const TSharedPtr<FJsonObject> InstancedRow = MeshUsesRow(Response, TEXT("instancedComponents"), TEXT("Instances"));
			if (TestNotNull(TEXT("the instanced component is still listed"), InstancedRow.Get()))
			{
				TestEqual(TEXT("with how many of its instances are tilted"), static_cast<int32>(InstancedRow->GetNumberField(TEXT("instancesAtOrAboveMinTilt"))), 2);
			}
		}
	}

	// A box around actor A.
	{
		TSharedPtr<FJsonObject> Request = MeshUsesRequest({ AlphaPath, BetaPath });
		Request->SetObjectField(TEXT("bounds"), BoxJson(FVector(-1000.0), FVector(1000.0)));
		Request->SetBoolField(TEXT("includeInstanced"), false);
		const TSharedPtr<FJsonObject> Response = RunFindMeshUses(Registry, Request);
		if (TestTrue(TEXT("the bounds filter succeeds"), MeshUsesSucceeded(Response)))
		{
			TestEqual(TEXT("the two uses inside the box are rows"), static_cast<int32>(Response->GetNumberField(TEXT("totalRows"))), 2);
			TestEqual(TEXT("the far one is counted outside"), static_cast<int32>(Response->GetNumberField(TEXT("outsideBounds"))), 1);
			TestNull(TEXT("and is not a row"), MeshUsesRow(Response, TEXT("components"), TEXT("FarRoot")).Get());
			TestFalse(TEXT("instanced rows are left out when asked"), Response->HasField(TEXT("instancedComponents")));
			TestEqual(TEXT("but still counted"), static_cast<int32>(Response->GetNumberField(TEXT("matchedInstancedComponents"))), 1);
		}
	}

	// Most tilted first, capped at one row, selected by prefix.
	{
		TSharedPtr<FJsonObject> Request = MakeShared<FJsonObject>();
		Request->SetStringField(TEXT("meshPathPrefix"), GetTransientPackage()->GetPathName() + TEXT(".") + Prefix);
		Request->SetStringField(TEXT("sortBy"), TEXT("tilt"));
		Request->SetNumberField(TEXT("maxResults"), 1);
		const TSharedPtr<FJsonObject> Response = RunFindMeshUses(Registry, Request);
		if (TestTrue(TEXT("the prefix selection succeeds"), MeshUsesSucceeded(Response)))
		{
			TestEqual(TEXT("the prefix selects Alpha and Beta, not Gamma"), static_cast<int32>(Response->GetNumberField(TEXT("matchedComponents"))), 3);
			TestEqual(TEXT("one row is returned"), static_cast<int32>(Response->GetNumberField(TEXT("returned"))), 1);
			TestTrue(TEXT("and the cut is reported"), Response->GetBoolField(TEXT("truncated")));
			TestNotNull(TEXT("the most tilted use survives the cut"), MeshUsesRow(Response, TEXT("components"), TEXT("TiltedByParent")).Get());
		}
	}

	return true;
}

#endif
