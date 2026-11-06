// Coverage for blueprint(find_static_mesh_uses).
//
// Fixture, under a private mount:
//   BP_MeshUsesParent (Actor): a pivot (the scene root, pitched 45, which the spawn
//     transform replaces) > Arm (mesh, pitched 20) > Leaf (mesh, rolled 10, on
//     Arm's mesh socket Tip, itself pitched 30).
//   BP_MeshUsesChild: overrides the inherited Arm to pitch 0.
//   BP_MeshUsesChildPlain: inherits everything unchanged.
//   BP_MeshUsesNative (StaticMeshActor): its native root mesh, pitched 60 on the
//     class defaults.
// The assertions are the reasons the action exists: Leaf's tilt is composed
// through the socket and the parent chain (its own relative roll of 10 is not
// the answer), the root's own rotation is not part of actor space, a child's
// override template is the one read, and reading a child that has no override
// handler leaves it without one: the editor's subobject tree would have made
// one, which is a change to the asset.

#if WITH_DEV_AUTOMATION_TESTS

#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Handlers/Blueprint/BlueprintHandlers.h"
#include "Tests/MCPScopedTestMount.h"

#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Blueprint.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "Engine/InheritableComponentHandler.h"
#include "Engine/SCS_Node.h"
#include "Engine/SimpleConstructionScript.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/StaticMeshSocket.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "Misc/AutomationTest.h"
#include "Misc/Guid.h"
#include "UObject/Package.h"

namespace
{
	constexpr const TCHAR* BlueprintMeshUsesMethod = TEXT("find_blueprint_static_mesh_uses");

	UStaticMesh* MakeMeshUsesMesh(const FString& Root, const TCHAR* Name)
	{
		UPackage* Package = CreatePackage(*(Root + Name));
		return NewObject<UStaticMesh>(Package, Name, RF_Public | RF_Standalone);
	}

	UBlueprint* MakeMeshUsesBlueprint(const FString& Root, const TCHAR* Name, UClass* Parent)
	{
		UPackage* Package = CreatePackage(*(Root + Name));
		return FKismetEditorUtilities::CreateBlueprint(
			Parent, Package, FName(Name), BPTYPE_Normal, UBlueprint::StaticClass(), UBlueprintGeneratedClass::StaticClass());
	}

	USCS_Node* AddMeshUsesNode(UBlueprint* Blueprint, UClass* Class, const TCHAR* Name, USCS_Node* Parent, const FRotator& Rotation)
	{
		USimpleConstructionScript* SCS = Blueprint->SimpleConstructionScript;
		USCS_Node* Node = SCS->CreateNode(Class, FName(Name));
		if (Parent) Parent->AddChildNode(Node);
		else SCS->AddNode(Node);
		Cast<USceneComponent>(Node->ComponentTemplate)->SetRelativeRotation_Direct(Rotation);
		return Node;
	}

	TSharedPtr<FJsonObject> RunBlueprintMeshUses(FMCPHandlerRegistry& Registry, const TSharedPtr<FJsonObject>& Request)
	{
		const TSharedPtr<FJsonValue> Response = Registry.ExecuteHandler(BlueprintMeshUsesMethod, Request);
		return (Response.IsValid() && Response->Type == EJson::Object) ? Response->AsObject() : nullptr;
	}

	bool BlueprintMeshUsesSucceeded(const TSharedPtr<FJsonObject>& Response)
	{
		bool bSuccess = false;
		return Response.IsValid() && Response->TryGetBoolField(TEXT("success"), bSuccess) && bSuccess;
	}

	TSharedPtr<FJsonObject> BlueprintMeshUsesRow(const TSharedPtr<FJsonObject>& Response, const UBlueprint* Blueprint, const FString& Component)
	{
		const TArray<TSharedPtr<FJsonValue>>* Rows = nullptr;
		if (!Response.IsValid() || !Response->TryGetArrayField(TEXT("components"), Rows) || !Rows) return nullptr;
		for (const TSharedPtr<FJsonValue>& Value : *Rows)
		{
			const TSharedPtr<FJsonObject> Row = Value.IsValid() ? Value->AsObject() : nullptr;
			if (Row.IsValid() && Row->GetStringField(TEXT("blueprintPath")) == Blueprint->GetPathName()
				&& Row->GetStringField(TEXT("componentName")) == Component)
			{
				return Row;
			}
		}
		return nullptr;
	}

	double ExpectedTilt(const FTransform& Transform)
	{
		return FMath::RadiansToDegrees(FMath::Acos(FMath::Clamp(Transform.GetRotation().GetUpVector().Z, -1.0, 1.0)));
	}

	int32 OverrideCount(UBlueprintGeneratedClass* Class)
	{
		UInheritableComponentHandler* Handler = Class ? Class->GetInheritableComponentHandler(false) : nullptr;
		if (!Handler) return -1;
		TArray<UActorComponent*> Templates;
		Handler->GetAllTemplates(Templates);
		return Templates.Num();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FBlueprintFindStaticMeshUsesRefusalsTest,
	"UE.MCP.Blueprint.FindStaticMeshUses.Refusals",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBlueprintFindStaticMeshUsesRefusalsTest::RunTest(const FString& Parameters)
{
	FMCPHandlerRegistry Registry;
	FBlueprintHandlers::RegisterHandlers(Registry);
	if (!TestTrue(TEXT("find_blueprint_static_mesh_uses is registered"), Registry.HasHandler(BlueprintMeshUsesMethod))) return false;

	TestFalse(TEXT("a call naming no mesh is refused"), BlueprintMeshUsesSucceeded(RunBlueprintMeshUses(Registry, MakeShared<FJsonObject>())));

	TSharedPtr<FJsonObject> BadDirectory = MakeShared<FJsonObject>();
	BadDirectory->SetArrayField(TEXT("meshPaths"), MCPStringListToJson({ TEXT("/Engine/BasicShapes/Cube") }));
	BadDirectory->SetStringField(TEXT("directory"), TEXT("Game/Props"));
	TestFalse(TEXT("a directory that is not mount-rooted is refused"), BlueprintMeshUsesSucceeded(RunBlueprintMeshUses(Registry, BadDirectory)));

	TSharedPtr<FJsonObject> BadSort = MakeShared<FJsonObject>();
	BadSort->SetArrayField(TEXT("meshPaths"), MCPStringListToJson({ TEXT("/Engine/BasicShapes/Cube") }));
	BadSort->SetStringField(TEXT("sortBy"), TEXT("size"));
	TestFalse(TEXT("an unknown sortBy is refused"), BlueprintMeshUsesSucceeded(RunBlueprintMeshUses(Registry, BadSort)));
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FBlueprintFindStaticMeshUsesComposedTest,
	"UE.MCP.Blueprint.FindStaticMeshUses.ComposedTemplateTransforms",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBlueprintFindStaticMeshUsesComposedTest::RunTest(const FString& Parameters)
{
	FMCPHandlerRegistry Registry;
	FBlueprintHandlers::RegisterHandlers(Registry);

	FMCPScopedTestMount Mount(
		TEXT("/UEMCPMeshUses_") + FGuid::NewGuid().ToString(EGuidFormats::Digits) + TEXT("/"), TEXT("UEMCPMeshUses"));

	UStaticMesh* ArmMesh = MakeMeshUsesMesh(Mount.RootPath, TEXT("SM_Arm"));
	UStaticMesh* LeafMesh = MakeMeshUsesMesh(Mount.RootPath, TEXT("SM_Leaf"));
	UStaticMesh* NativeMesh = MakeMeshUsesMesh(Mount.RootPath, TEXT("SM_NativeRoot"));
	if (!TestNotNull(TEXT("mesh fixtures"), ArmMesh) || !LeafMesh || !NativeMesh) return false;
	UStaticMeshSocket* Tip = NewObject<UStaticMeshSocket>(ArmMesh);
	Tip->SocketName = TEXT("Tip");
	Tip->RelativeLocation = FVector(0.0, 0.0, 50.0);
	Tip->RelativeRotation = FRotator(30.0, 0.0, 0.0);
	ArmMesh->AddSocket(Tip);

	UBlueprint* Parent = MakeMeshUsesBlueprint(Mount.RootPath, TEXT("BP_MeshUsesParent"), AActor::StaticClass());
	if (!TestNotNull(TEXT("parent Blueprint"), Parent)) return false;
	// A new Actor Blueprint may already hold its default scene root. Use it as
	// the pivot when it does, so the root is the same node the engine would pick.
	USimpleConstructionScript* ParentScript = Parent->SimpleConstructionScript;
	USCS_Node* Pivot = ParentScript->GetDefaultSceneRootNode();
	if (Pivot && ParentScript->GetRootNodes().Contains(Pivot))
	{
		Cast<USceneComponent>(Pivot->ComponentTemplate)->SetRelativeRotation_Direct(FRotator(45.0, 0.0, 0.0));
	}
	else
	{
		Pivot = AddMeshUsesNode(Parent, USceneComponent::StaticClass(), TEXT("Pivot"), nullptr, FRotator(45.0, 0.0, 0.0));
	}
	const FString PivotName = Pivot->GetVariableName().ToString();
	USCS_Node* Arm = AddMeshUsesNode(Parent, UStaticMeshComponent::StaticClass(), TEXT("Arm"), Pivot, FRotator(20.0, 0.0, 0.0));
	USCS_Node* Leaf = AddMeshUsesNode(Parent, UStaticMeshComponent::StaticClass(), TEXT("Leaf"), Arm, FRotator(0.0, 0.0, 10.0));
	Leaf->AttachToName = TEXT("Tip");
	Cast<UStaticMeshComponent>(Arm->ComponentTemplate)->SetStaticMesh(ArmMesh);
	Cast<UStaticMeshComponent>(Leaf->ComponentTemplate)->SetStaticMesh(LeafMesh);
	FKismetEditorUtilities::CompileBlueprint(Parent);

	UBlueprint* Child = MakeMeshUsesBlueprint(Mount.RootPath, TEXT("BP_MeshUsesChild"), Parent->GeneratedClass);
	UBlueprint* ChildPlain = MakeMeshUsesBlueprint(Mount.RootPath, TEXT("BP_MeshUsesChildPlain"), Parent->GeneratedClass);
	UBlueprint* Native = MakeMeshUsesBlueprint(Mount.RootPath, TEXT("BP_MeshUsesNative"), AStaticMeshActor::StaticClass());
	if (!TestNotNull(TEXT("child Blueprint"), Child) || !TestNotNull(TEXT("plain child"), ChildPlain) || !TestNotNull(TEXT("native Blueprint"), Native)) return false;
	FKismetEditorUtilities::CompileBlueprint(Child);
	FKismetEditorUtilities::CompileBlueprint(ChildPlain);
	FKismetEditorUtilities::CompileBlueprint(Native);

	// The child's override of the inherited Arm, made after its compile so the
	// compile cannot fold it away.
	UInheritableComponentHandler* ChildOverrides = Child->GetInheritableComponentHandler(true);
	USceneComponent* ArmOverride = ChildOverrides
		? Cast<USceneComponent>(ChildOverrides->CreateOverridenComponentTemplate(FComponentKey(Arm)))
		: nullptr;
	if (!TestNotNull(TEXT("the child overrides the inherited Arm"), ArmOverride)) return false;
	ArmOverride->SetRelativeRotation_Direct(FRotator::ZeroRotator);

	AStaticMeshActor* NativeDefaults = Cast<AStaticMeshActor>(Native->GeneratedClass->GetDefaultObject());
	if (!TestNotNull(TEXT("native defaults"), NativeDefaults)) return false;
	NativeDefaults->GetStaticMeshComponent()->SetStaticMesh(NativeMesh);
	NativeDefaults->GetStaticMeshComponent()->SetRelativeRotation_Direct(FRotator(60.0, 0.0, 0.0));

	UBlueprintGeneratedClass* PlainClass = Cast<UBlueprintGeneratedClass>(ChildPlain->GeneratedClass);
	const int32 PlainOverridesBefore = OverrideCount(PlainClass);

	TSharedPtr<FJsonObject> Request = MakeShared<FJsonObject>();
	Request->SetArrayField(TEXT("meshPaths"), MCPStringListToJson({
		ArmMesh->GetPathName(), LeafMesh->GetPathName(), FPackageName::ObjectPathToPackageName(NativeMesh->GetPathName()) }));
	Request->SetArrayField(TEXT("assetPaths"), MCPStringListToJson({
		Parent->GetPathName(), Child->GetPathName(), ChildPlain->GetPathName(), Native->GetPathName() }));
	const TSharedPtr<FJsonObject> Response = RunBlueprintMeshUses(Registry, Request);
	if (!TestTrue(TEXT("the read succeeds"), BlueprintMeshUsesSucceeded(Response))) return false;
	TestFalse(TEXT("reading templates dirties no package"), Response->GetBoolField(TEXT("dirtiedPackages")));
	TestEqual(TEXT("an inherited-only child still has no override handler, or the same overrides"),
		OverrideCount(PlainClass), PlainOverridesBefore);
	TestEqual(TEXT("seven template uses: two per Actor Blueprint, one native root"),
		static_cast<int32>(Response->GetNumberField(TEXT("totalRows"))), 7);
	const TSharedPtr<FJsonObject>* Selection = nullptr;
	if (TestTrue(TEXT("the selection is reported"), Response->TryGetObjectField(TEXT("selection"), Selection)))
	{
		TestEqual(TEXT("selected by assetPaths"), (*Selection)->GetStringField(TEXT("selectedBy")), FString(TEXT("assetPaths")));
		TestEqual(TEXT("all four were read"), static_cast<int32>((*Selection)->GetNumberField(TEXT("blueprintsScanned"))), 4);
	}

	const FTransform ArmSpace(FRotator(20.0, 0.0, 0.0));
	const FTransform Socket(Tip->RelativeRotation, Tip->RelativeLocation);
	const FTransform LeafSpace = FTransform(FRotator(0.0, 0.0, 10.0)) * Socket * ArmSpace;

	const TSharedPtr<FJsonObject> ParentArm = BlueprintMeshUsesRow(Response, Parent, TEXT("Arm"));
	if (TestNotNull(TEXT("the parent's Arm"), ParentArm.Get()))
	{
		TestEqual(TEXT("is its own node"), ParentArm->GetStringField(TEXT("source")), FString(TEXT("own")));
		TestEqual(TEXT("is tilted by its own pitch only: the root's 45 is the spawn transform's"),
			ParentArm->GetNumberField(TEXT("tiltDegrees")), 20.0, 0.01);
		TestEqual(TEXT("and hangs under the pivot"), ParentArm->GetStringField(TEXT("attachParent")), PivotName);
	}
	const TSharedPtr<FJsonObject> ParentLeaf = BlueprintMeshUsesRow(Response, Parent, TEXT("Leaf"));
	if (TestNotNull(TEXT("the parent's Leaf"), ParentLeaf.Get()))
	{
		TestEqual(TEXT("is composed through the socket and Arm"),
			ParentLeaf->GetNumberField(TEXT("tiltDegrees")), ExpectedTilt(LeafSpace), 0.01);
		TestTrue(TEXT("which is not its own relative roll"), ParentLeaf->GetNumberField(TEXT("tiltDegrees")) > 45.0);
		TestEqual(TEXT("its socket is named"), ParentLeaf->GetStringField(TEXT("attachSocket")), FString(TEXT("Tip")));
		FVector Location = FVector::ZeroVector;
		ReadVec3FieldsStrict(ParentLeaf->GetObjectField(TEXT("location")), Location);
		TestTrue(TEXT("and its actor-space location includes the socket offset"), Location.Equals(LeafSpace.GetLocation(), 0.01));
		const TArray<TSharedPtr<FJsonValue>>& Chain = ParentLeaf->GetArrayField(TEXT("attachChain"));
		if (TestEqual(TEXT("its chain runs from the root"), Chain.Num(), 3))
		{
			TestEqual(TEXT("root first"), Chain[0]->AsString(), PivotName);
			TestEqual(TEXT("itself last"), Chain[2]->AsString(), FString(TEXT("Leaf")));
		}
		TestFalse(TEXT("an exact composition carries no notes"), ParentLeaf->HasField(TEXT("notes")));
	}

	const TSharedPtr<FJsonObject> ChildArm = BlueprintMeshUsesRow(Response, Child, TEXT("Arm"));
	if (TestNotNull(TEXT("the child's Arm"), ChildArm.Get()))
	{
		TestEqual(TEXT("is inherited"), ChildArm->GetStringField(TEXT("source")), FString(TEXT("inherited")));
		TestEqual(TEXT("declared by the parent"), ChildArm->GetStringField(TEXT("declaredIn")), Parent->GetPathName());
		TestEqual(TEXT("and overridden in the child"), ChildArm->GetStringField(TEXT("overriddenIn")), Child->GetPathName());
		TestEqual(TEXT("so the override's zero pitch is what is read"), ChildArm->GetNumberField(TEXT("tiltDegrees")), 0.0, 0.01);
	}
	const TSharedPtr<FJsonObject> ChildLeaf = BlueprintMeshUsesRow(Response, Child, TEXT("Leaf"));
	if (TestNotNull(TEXT("the child's Leaf"), ChildLeaf.Get()))
	{
		const FTransform ChildLeafSpace = FTransform(FRotator(0.0, 0.0, 10.0)) * Socket;
		TestEqual(TEXT("is composed through the overridden Arm"),
			ChildLeaf->GetNumberField(TEXT("tiltDegrees")), ExpectedTilt(ChildLeafSpace), 0.01);
		TestFalse(TEXT("and is not itself overridden"), ChildLeaf->HasField(TEXT("overriddenIn")));
	}
	const TSharedPtr<FJsonObject> PlainArm = BlueprintMeshUsesRow(Response, ChildPlain, TEXT("Arm"));
	if (TestNotNull(TEXT("the plain child's Arm"), PlainArm.Get()))
	{
		TestEqual(TEXT("reads the parent's template"), PlainArm->GetNumberField(TEXT("tiltDegrees")), 20.0, 0.01);
	}

	const TSharedPtr<FJsonObject> NativeRoot = BlueprintMeshUsesRow(Response, Native, NativeDefaults->GetStaticMeshComponent()->GetName());
	if (TestNotNull(TEXT("the native root mesh"), NativeRoot.Get()))
	{
		TestEqual(TEXT("is a native default subobject"), NativeRoot->GetStringField(TEXT("source")), FString(TEXT("native")));
		TestTrue(TEXT("and the root"), NativeRoot->GetBoolField(TEXT("isRoot")));
		TestEqual(TEXT("so actor space is upright whatever its own rotation"), NativeRoot->GetNumberField(TEXT("tiltDegrees")), 0.0, 0.01);
		FRotator Relative = FRotator::ZeroRotator;
		ReadRotatorFieldsStrict(NativeRoot->GetObjectField(TEXT("relativeRotation")), Relative);
		TestEqual(TEXT("which is still reported"), Relative.Pitch, 60.0, 0.01);
	}

	// Only what is tilted, most tilted first, one row.
	{
		TSharedPtr<FJsonObject> Tilted = MakeShared<FJsonObject>();
		Tilted->SetStringField(TEXT("meshPathPrefix"), Mount.RootPath);
		Tilted->SetArrayField(TEXT("assetPaths"), MCPStringListToJson({ Parent->GetPathName(), Child->GetPathName() }));
		Tilted->SetNumberField(TEXT("minTiltDegrees"), 15.0);
		Tilted->SetStringField(TEXT("sortBy"), TEXT("tilt"));
		Tilted->SetNumberField(TEXT("maxResults"), 1);
		const TSharedPtr<FJsonObject> TiltedResponse = RunBlueprintMeshUses(Registry, Tilted);
		if (TestTrue(TEXT("the filtered read succeeds"), BlueprintMeshUsesSucceeded(TiltedResponse)))
		{
			TestEqual(TEXT("three uses are tilted 15 degrees or more"), static_cast<int32>(TiltedResponse->GetNumberField(TEXT("totalRows"))), 3);
			TestEqual(TEXT("the child's upright Arm is below it"), static_cast<int32>(TiltedResponse->GetNumberField(TEXT("belowMinTilt"))), 1);
			TestTrue(TEXT("the cap is reported"), TiltedResponse->GetBoolField(TEXT("truncated")));
			TestNotNull(TEXT("and the parent's Leaf, the most tilted, survives it"), BlueprintMeshUsesRow(TiltedResponse, Parent, TEXT("Leaf")).Get());
		}
	}

	// Without assetPaths the registry chooses, and nothing references an unknown mesh.
	{
		TSharedPtr<FJsonObject> Unreferenced = MakeShared<FJsonObject>();
		Unreferenced->SetArrayField(TEXT("meshPaths"), MCPStringListToJson({ Mount.RootPath + TEXT("SM_NobodyUsesThis") }));
		Unreferenced->SetStringField(TEXT("directory"), Mount.RootPath);
		const TSharedPtr<FJsonObject> UnreferencedResponse = RunBlueprintMeshUses(Registry, Unreferenced);
		if (TestTrue(TEXT("a registry read succeeds"), BlueprintMeshUsesSucceeded(UnreferencedResponse)))
		{
			const TSharedPtr<FJsonObject>* RegistrySelection = nullptr;
			if (TestTrue(TEXT("and reports its selection"), UnreferencedResponse->TryGetObjectField(TEXT("selection"), RegistrySelection)))
			{
				TestEqual(TEXT("by referencers"), (*RegistrySelection)->GetStringField(TEXT("selectedBy")), FString(TEXT("referencers")));
				TestEqual(TEXT("with no candidate"), static_cast<int32>((*RegistrySelection)->GetNumberField(TEXT("candidateBlueprints"))), 0);
			}
			const TArray<TSharedPtr<FJsonValue>>& Unknown = UnreferencedResponse->GetArrayField(TEXT("unknownMeshPaths"));
			TestEqual(TEXT("the mesh that does not exist is named"), Unknown.Num(), 1);
		}
	}

	return true;
}

#endif
