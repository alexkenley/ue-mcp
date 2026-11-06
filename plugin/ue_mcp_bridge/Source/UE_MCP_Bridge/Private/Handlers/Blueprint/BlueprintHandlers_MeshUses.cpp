// Translation-unit partition of FBlueprintHandlers, like the other
// BlueprintHandlers_*.cpp files. Registration stays in BlueprintHandlers.cpp.
//
// blueprint(find_static_mesh_uses): every static mesh component TEMPLATE in a
// set of Blueprints that uses one of a set of meshes, with its transform
// composed up its attach chain to the actor root, so a mesh tilted by a
// rotated parent reads as tilted even though its own relative rotation is zero.
//
// Read-only, and that rules out the editor's own component tree as the source.
// USubobjectDataSubsystem::GatherSubobjectData calls GetObjectForBlueprint on
// every inherited node, which creates inheritable-component override templates
// in the Blueprint being read (the engine says so at that call). Reading a
// transform through it would change the asset. This walks the generated class
// hierarchy instead and reads each node's template through
// USCS_Node::GetActualComponentTemplate, which only looks overrides up, and
// asks for the inheritable component handler without creating one.

#include "BlueprintHandlers.h"
#include "BlueprintHandlers_Internal.h"
#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Handlers/HandlerEditorState.h"
#include "Handlers/HandlerStaticMeshUse.h"

#include "AnimationRuntime.h"
#include "AssetRegistry/ARFilter.h"
#include "AssetRegistry/AssetData.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "AssetRegistry/IAssetRegistry.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Components/SkinnedMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Blueprint.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "Engine/InheritableComponentHandler.h"
#include "Engine/SCS_Node.h"
#include "Engine/SimpleConstructionScript.h"
#include "Engine/SkeletalMeshSocket.h"
#include "Engine/SkinnedAsset.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshSocket.h"
#include "GameFramework/Actor.h"
#include "Misc/PackageName.h"
#include "Misc/Paths.h"

namespace MCPBlueprintMeshUses
{
	constexpr int32 DefaultMaxBlueprints = 500;
	constexpr int32 MaxMaxBlueprints = 5000;
	constexpr int32 DefaultMaxResults = 200;
	constexpr int32 MaxMaxResults = 2000;
	/** Meshes a meshPathPrefix may expand to before the registry walk is refused. */
	constexpr int32 MaxPrefixMeshes = 4096;
	constexpr int32 MaxListedFailures = 25;
	/** Deeper than any real attach chain; a guard against a malformed one. */
	constexpr int32 MaxChainDepth = 128;

	enum class ESource : uint8
	{
		/** A default subobject of the native class, as this Blueprint's defaults set it. */
		Native,
		/** A node of this Blueprint's own construction script. */
		Own,
		/** A node a parent Blueprint declares. */
		Inherited,
	};

	const TCHAR* SourceName(ESource Source)
	{
		switch (Source)
		{
		case ESource::Native: return TEXT("native");
		case ESource::Own: return TEXT("own");
		default: return TEXT("inherited");
		}
	}

	/** One scene component template of the Blueprint, and what it attaches to. */
	struct FTemplateNode
	{
		/** "native:<Name>" or "scs:<VariableName>". */
		FString Key;
		FString Name;
		USceneComponent* Template = nullptr;
		/** The parent's key; empty for the actor root or an unattached native component. */
		FString ParentKey;
		FName Socket;
		ESource Source = ESource::Own;
		/** The Blueprint (or native class) that declares the component. */
		FString DeclaredIn;
		/** For an inherited node: the Blueprint whose override template is in effect, when not the declaring one. */
		FString OverriddenIn;
		bool bRoot = false;
	};

	FString KeyFor(bool bNative, FName Name)
	{
		return (bNative ? TEXT("native:") : TEXT("scs:")) + Name.ToString();
	}

	FString BlueprintPathOf(const UClass* Class)
	{
		if (const UBlueprint* Blueprint = UBlueprint::GetBlueprintFromClass(Class)) return Blueprint->GetPathName();
		return Class ? Class->GetPathName() : FString();
	}

	/**
	 * Every scene component template the class would construct, the way the
	 * engine constructs it: native default subobjects first, then each
	 * Blueprint's construction script from the root-most parent down. A root SCS
	 * node with no parent attaches to the actor root; the first such scene node
	 * becomes the root when the native class has none, and a script's default
	 * scene root is skipped once a root exists (SimpleConstructionScript.cpp,
	 * ExecuteScriptOnActor).
	 */
	void BuildTemplateGraph(UBlueprintGeneratedClass* Class, TArray<FTemplateNode>& OutNodes, TMap<FString, int32>& OutByKey)
	{
		FString RootKey;
		auto Add = [&OutNodes, &OutByKey](FTemplateNode&& Node)
		{
			if (OutByKey.Contains(Node.Key)) return;
			OutByKey.Add(Node.Key, OutNodes.Num());
			OutNodes.Add(MoveTemp(Node));
		};

		const UClass* NativeClass = Class;
		while (NativeClass && !NativeClass->HasAnyClassFlags(CLASS_Native))
		{
			NativeClass = NativeClass->GetSuperClass();
		}

		if (AActor* Defaults = Cast<AActor>(Class->GetDefaultObject()))
		{
			TInlineComponentArray<UActorComponent*> Components;
			Defaults->GetComponents(Components);
			USceneComponent* NativeRoot = Defaults->GetRootComponent();
			for (UActorComponent* Component : Components)
			{
				USceneComponent* Scene = Cast<USceneComponent>(Component);
				if (!Scene) continue;
				FTemplateNode Node;
				Node.Key = KeyFor(true, Scene->GetFName());
				Node.Name = Scene->GetName();
				Node.Template = Scene;
				const USceneComponent* Parent = Scene->GetAttachParent();
				Node.ParentKey = Parent ? KeyFor(true, Parent->GetFName()) : FString();
				Node.Socket = Scene->GetAttachSocketName();
				Node.Source = ESource::Native;
				Node.DeclaredIn = NativeClass ? NativeClass->GetPathName() : FString();
				Node.bRoot = Scene == NativeRoot;
				if (Node.bRoot) RootKey = Node.Key;
				Add(MoveTemp(Node));
			}
		}

		TArray<UBlueprintGeneratedClass*> Stack;
		UBlueprint::GetBlueprintHierarchyFromClass(Class, Stack);
		for (int32 StackIndex = Stack.Num() - 1; StackIndex >= 0; --StackIndex)
		{
			UBlueprintGeneratedClass* Owner = Stack[StackIndex];
			USimpleConstructionScript* SCS = Owner ? Owner->SimpleConstructionScript.Get() : nullptr;
			if (!SCS) continue;
			const FString OwnerPath = BlueprintPathOf(Owner);

			TMap<const USCS_Node*, const USCS_Node*> ParentOf;
			for (const USCS_Node* Node : SCS->GetAllNodes())
			{
				if (!Node) continue;
				for (const USCS_Node* Child : Node->GetChildNodes())
				{
					if (Child) ParentOf.Add(Child, Node);
				}
			}

			const USCS_Node* DefaultSceneRoot = SCS->GetDefaultSceneRootNode();
			// With no root yet, the first top-level scene node of this script, in
			// root-node order, becomes the actor root.
			const USCS_Node* ScriptRoot = nullptr;
			if (RootKey.IsEmpty())
			{
				for (const USCS_Node* Node : SCS->GetRootNodes())
				{
					if (Node && Node->ParentComponentOrVariableName.IsNone()
						&& Cast<USceneComponent>(Node->GetActualComponentTemplate(Class)))
					{
						ScriptRoot = Node;
						RootKey = KeyFor(false, Node->GetVariableName());
						break;
					}
				}
			}

			for (const USCS_Node* Node : SCS->GetAllNodes())
			{
				if (!Node) continue;
				const bool bTopLevel = !ParentOf.Contains(Node) && Node->ParentComponentOrVariableName.IsNone();
				if (Node == DefaultSceneRoot && bTopLevel && Node != ScriptRoot)
				{
					// The engine skips a script's default root once the actor has one.
					continue;
				}

				// Read-only: looks this class's override chain up, never creates one.
				UActorComponent* Effective = Node->GetActualComponentTemplate(Class);
				USceneComponent* Scene = Cast<USceneComponent>(Effective);
				if (!Scene) continue;

				FTemplateNode Entry;
				Entry.Key = KeyFor(false, Node->GetVariableName());
				Entry.Name = Node->GetVariableName().ToString();
				Entry.Template = Scene;
				Entry.Socket = Node->AttachToName;
				Entry.Source = StackIndex == 0 ? ESource::Own : ESource::Inherited;
				Entry.DeclaredIn = OwnerPath;
				if (StackIndex > 0 && Effective != Node->ComponentTemplate)
				{
					const FComponentKey ComponentKey(Node);
					for (int32 Below = 0; Below < StackIndex; ++Below)
					{
						UInheritableComponentHandler* Handler = Stack[Below]
							? Stack[Below]->GetInheritableComponentHandler(/*bCreateIfNecessary*/ false)
							: nullptr;
						if (Handler && Handler->GetOverridenComponentTemplate(ComponentKey) == Effective)
						{
							Entry.OverriddenIn = BlueprintPathOf(Stack[Below]);
							break;
						}
					}
				}

				if (const USCS_Node* const* Parent = ParentOf.Find(Node))
				{
					Entry.ParentKey = KeyFor(false, (*Parent)->GetVariableName());
				}
				else if (!Node->ParentComponentOrVariableName.IsNone())
				{
					Entry.ParentKey = KeyFor(Node->bIsParentComponentNative, Node->ParentComponentOrVariableName);
				}
				else if (Node == ScriptRoot)
				{
					Entry.bRoot = true;
				}
				else
				{
					Entry.ParentKey = RootKey;
				}
				Add(MoveTemp(Entry));
			}
		}
	}

	/** The socket's transform in its parent's component space, read from the parent's mesh asset. */
	bool SocketTransform(const USceneComponent* Parent, FName Socket, FTransform& Out)
	{
		if (Socket.IsNone())
		{
			Out = FTransform::Identity;
			return true;
		}
		if (const UStaticMeshComponent* StaticParent = Cast<UStaticMeshComponent>(Parent))
		{
			const UStaticMesh* Mesh = StaticParent->GetStaticMesh();
			if (const UStaticMeshSocket* MeshSocket = Mesh ? Mesh->FindSocket(Socket) : nullptr)
			{
				Out = FTransform(MeshSocket->RelativeRotation, MeshSocket->RelativeLocation, MeshSocket->RelativeScale);
				return true;
			}
			return false;
		}
		if (const USkinnedMeshComponent* SkinnedParent = Cast<USkinnedMeshComponent>(Parent))
		{
			// A template is never posed, so the reference pose stands in for the
			// bone; that is the pose the editor's viewport shows a template in.
			const USkinnedAsset* Asset = SkinnedParent->GetSkinnedAsset();
			if (!Asset) return false;
			const FReferenceSkeleton& RefSkeleton = Asset->GetRefSkeleton();
			if (const USkeletalMeshSocket* MeshSocket = Asset->FindSocket(Socket))
			{
				const int32 BoneIndex = RefSkeleton.FindBoneIndex(MeshSocket->BoneName);
				if (BoneIndex == INDEX_NONE) return false;
				Out = MeshSocket->GetSocketLocalTransform() * FAnimationRuntime::GetComponentSpaceTransformRefPose(RefSkeleton, BoneIndex);
				return true;
			}
			const int32 BoneIndex = RefSkeleton.FindBoneIndex(Socket);
			if (BoneIndex == INDEX_NONE) return false;
			Out = FAnimationRuntime::GetComponentSpaceTransformRefPose(RefSkeleton, BoneIndex);
			return true;
		}
		return false;
	}

	/** A template's transform in actor space: relative to the actor root, whose own relative transform the spawn transform replaces. */
	struct FActorSpace
	{
		FTransform Transform = FTransform::Identity;
		TArray<FString> Chain;
		TArray<FString> Notes;
	};

	FActorSpace ComposeActorSpace(const TArray<FTemplateNode>& Nodes, const TMap<FString, int32>& ByKey, int32 Index)
	{
		FActorSpace Out;
		TArray<int32> Path;
		TSet<int32> Seen;
		int32 Current = Index;
		while (Current != INDEX_NONE && Path.Num() < MaxChainDepth)
		{
			if (Seen.Contains(Current))
			{
				Out.Notes.Add(TEXT("The attach chain loops; composed from where it repeats."));
				break;
			}
			Seen.Add(Current);
			Path.Add(Current);
			const FTemplateNode& Node = Nodes[Current];
			if (Node.bRoot) break;
			if (Node.ParentKey.IsEmpty())
			{
				Out.Notes.Add(FString::Printf(TEXT("%s is attached to nothing, so its relative transform is taken as actor space."), *Node.Name));
				break;
			}
			const int32* Parent = ByKey.Find(Node.ParentKey);
			if (!Parent)
			{
				Out.Notes.Add(FString::Printf(TEXT("%s names parent %s, which the class does not construct; composed from %s."),
					*Node.Name, *Node.ParentKey, *Node.Name));
				break;
			}
			Current = *Parent;
		}

		FTransform World = FTransform::Identity;
		for (int32 Step = Path.Num() - 1; Step >= 0; --Step)
		{
			const FTemplateNode& Node = Nodes[Path[Step]];
			Out.Chain.Add(Node.Name);
			if (Node.bRoot)
			{
				World = FTransform::Identity;
				continue;
			}

			FTransform ParentFrame = World;
			if (Step < Path.Num() - 1 && !Node.Socket.IsNone())
			{
				FTransform Socket;
				if (SocketTransform(Nodes[Path[Step + 1]].Template, Node.Socket, Socket))
				{
					ParentFrame = Socket * World;
				}
				else
				{
					Out.Notes.Add(FString::Printf(TEXT("Socket %s on %s did not resolve on its mesh; composed without it."),
						*Node.Socket.ToString(), *Nodes[Path[Step + 1]].Name));
				}
			}

			const FTransform Relative = Node.Template->GetRelativeTransform();
			FTransform Composed = Relative * ParentFrame;
			// The engine's general case (USceneComponent::CalcNewComponentToWorld_GeneralCase):
			// an absolute part ignores the parent.
			if (Node.Template->IsUsingAbsoluteLocation()) Composed.SetTranslation(Relative.GetTranslation());
			if (Node.Template->IsUsingAbsoluteRotation()) Composed.SetRotation(Relative.GetRotation());
			if (Node.Template->IsUsingAbsoluteScale()) Composed.SetScale3D(Relative.GetScale3D());
			if (Node.Template->IsUsingAbsoluteLocation() || Node.Template->IsUsingAbsoluteRotation() || Node.Template->IsUsingAbsoluteScale())
			{
				Out.Notes.Add(FString::Printf(TEXT("%s uses an absolute location, rotation or scale, which is world space; actor space here assumes the actor at the origin, unrotated."), *Node.Name));
			}
			World = Composed;
		}
		Out.Transform = World;
		return Out;
	}

	struct FUseRow
	{
		double Tilt = 0.0;
		TSharedPtr<FJsonObject> Json;
	};

	TSharedPtr<FJsonObject> TemplateRow(
		const UBlueprint* Blueprint, const TArray<FTemplateNode>& Nodes, const TMap<FString, int32>& ByKey,
		const FTemplateNode& Node, const UStaticMesh* Mesh, const FActorSpace& Space)
	{
		TSharedPtr<FJsonObject> Row = MakeShared<FJsonObject>();
		Row->SetStringField(TEXT("blueprintPath"), Blueprint->GetPathName());
		Row->SetStringField(TEXT("componentName"), Node.Name);
		Row->SetStringField(TEXT("componentClass"), Node.Template->GetClass()->GetName());
		Row->SetStringField(TEXT("source"), SourceName(Node.Source));
		Row->SetStringField(TEXT("declaredIn"), Node.DeclaredIn);
		if (!Node.OverriddenIn.IsEmpty()) Row->SetStringField(TEXT("overriddenIn"), Node.OverriddenIn);
		Row->SetStringField(TEXT("meshPath"), Mesh->GetPathName());
		Row->SetBoolField(TEXT("isRoot"), Node.bRoot);
		const int32* Parent = ByKey.Find(Node.ParentKey);
		Row->SetStringField(TEXT("attachParent"), Parent ? Nodes[*Parent].Name : FString());
		Row->SetStringField(TEXT("attachSocket"), Node.Socket.IsNone() ? FString() : Node.Socket.ToString());
		Row->SetArrayField(TEXT("attachChain"), MCPStringListToJson(Space.Chain));
		Row->SetObjectField(TEXT("relativeLocation"), MCPVec3ToJsonObject(Node.Template->GetRelativeLocation()));
		Row->SetObjectField(TEXT("relativeRotation"), MCPRotatorToJsonObject(Node.Template->GetRelativeRotation()));
		Row->SetObjectField(TEXT("relativeScale"), MCPVec3ToJsonObject(Node.Template->GetRelativeScale3D()));
		// location, rotation, scale, upVector and tiltDegrees are actor space.
		MCPStaticMeshUse::WriteTransformFields(Row, Space.Transform);
		if (Space.Notes.Num() > 0) Row->SetArrayField(TEXT("notes"), MCPStringListToJson(Space.Notes));
		return Row;
	}

	/** Where the Blueprints come from: the request's list, or the registry's referencers of the meshes. */
	struct FCandidates
	{
		TArray<FString> Paths;
		bool bFromAssetPaths = false;
		FString Directory;
		bool bRecursive = true;
		bool bWaitedForRegistry = false;
		int32 MeshPackages = 0;
		int32 NonBlueprintReferencers = 0;
		int32 BlueprintsOutsideDirectory = 0;
	};

	bool UnderDirectory(const FString& PackageName, const FString& Directory, bool bRecursive)
	{
		const FString Folder = FPackageName::GetLongPackagePath(PackageName);
		if (Folder.Equals(Directory, ESearchCase::IgnoreCase)) return true;
		return bRecursive && Folder.StartsWith(Directory + TEXT("/"), ESearchCase::IgnoreCase);
	}

	/** Returns an error response, or nullptr with Out filled. */
	TSharedPtr<FJsonValue> GatherCandidates(
		const TSharedPtr<FJsonObject>& Params, const MCPStaticMeshUse::FMeshSelector& Selector, FCandidates& Out)
	{
		Out.bRecursive = OptionalBool(Params, TEXT("recursive"), true);
		FString Directory = OptionalString(Params, TEXT("directory"), TEXT("/Game"));
		const TArray<TSharedPtr<FJsonValue>>* AssetPaths = nullptr;
		TryGetArrayParam(Params, TEXT("assetPaths"), AssetPaths);

		if (AssetPaths && AssetPaths->Num() > 0)
		{
			Out.bFromAssetPaths = true;
			TSet<FString> Seen;
			for (const TSharedPtr<FJsonValue>& Value : *AssetPaths)
			{
				FString Path;
				if (!Value.IsValid() || !Value->TryGetString(Path)) continue;
				Path.TrimStartAndEndInline();
				if (Path.IsEmpty() || Seen.Contains(Path.ToLower())) continue;
				Seen.Add(Path.ToLower());
				Out.Paths.Add(Path);
			}
			if (Out.Paths.Num() == 0)
			{
				return MCPError(TEXT("'assetPaths' holds no usable Blueprint path"));
			}
			return nullptr;
		}

		Directory.TrimStartAndEndInline();
		Directory.ReplaceInline(TEXT("\\"), TEXT("/"));
		while (Directory.Len() > 1 && Directory.EndsWith(TEXT("/"))) Directory.LeftChopInline(1);
		if (!Directory.StartsWith(TEXT("/")) || Directory.Len() < 2)
		{
			return MCPError(FString::Printf(
				TEXT("'directory' must be a mount-rooted content path such as /Game or /Game/Props, got '%s'"), *Directory));
		}
		Out.Directory = Directory;

		IAssetRegistry& Registry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>(TEXT("AssetRegistry")).Get();
		// A sweep during the initial scan would miss every referencer not reached yet.
		Out.bWaitedForRegistry = Registry.IsLoadingAssets();
		if (Out.bWaitedForRegistry) Registry.WaitForCompletion();

		TSet<FName> MeshPackages;
		for (const FString& Path : Selector.ExactPaths)
		{
			MeshPackages.Add(FName(*FPackageName::ObjectPathToPackageName(Path)));
		}
		if (!Selector.Prefix.IsEmpty())
		{
			FString Folder = Selector.Prefix;
			while (Folder.Len() > 1 && Folder.EndsWith(TEXT("/"))) Folder.LeftChopInline(1);
			if (!Selector.Prefix.EndsWith(TEXT("/")))
			{
				const FString Parent = FPaths::GetPath(Folder);
				if (Parent.Len() > 1) Folder = Parent;
			}
			FARFilter Filter;
			Filter.ClassPaths.Add(UStaticMesh::StaticClass()->GetClassPathName());
			Filter.bRecursiveClasses = true;
			Filter.PackagePaths.Add(FName(*Folder));
			Filter.bRecursivePaths = true;
			TArray<FAssetData> Meshes;
			Registry.GetAssets(Filter, Meshes);
			int32 PrefixMatches = 0;
			for (const FAssetData& Mesh : Meshes)
			{
				if (!Selector.MatchesPath(Mesh.GetObjectPathString())) continue;
				if (++PrefixMatches > MaxPrefixMeshes)
				{
					return MCPError(FString::Printf(
						TEXT("meshPathPrefix '%s' selects more than %d static meshes. Narrow it, or pass assetPaths to name the Blueprints to read."),
						*Selector.Prefix, MaxPrefixMeshes));
				}
				MeshPackages.Add(Mesh.PackageName);
			}
		}
		Out.MeshPackages = MeshPackages.Num();

		TSet<FName> Referencers;
		for (const FName& Package : MeshPackages)
		{
			TArray<FName> Found;
			Registry.GetReferencers(Package, Found);
			Referencers.Append(Found);
		}

		TSet<FString> Seen;
		for (const FName& Package : Referencers)
		{
			TArray<FAssetData> Assets;
			Registry.GetAssetsByPackageName(Package, Assets);
			bool bHasBlueprint = false;
			for (const FAssetData& Asset : Assets)
			{
				if (!Asset.IsInstanceOf(UBlueprint::StaticClass())) continue;
				bHasBlueprint = true;
				if (!UnderDirectory(Package.ToString(), Directory, Out.bRecursive))
				{
					++Out.BlueprintsOutsideDirectory;
					continue;
				}
				const FString ObjectPath = Asset.GetObjectPathString();
				if (!Seen.Contains(ObjectPath))
				{
					Seen.Add(ObjectPath);
					Out.Paths.Add(ObjectPath);
				}
			}
			// Maps and external actor packages: placed uses, which
			// level(find_static_mesh_uses) reads from the loaded world.
			if (!bHasBlueprint) ++Out.NonBlueprintReferencers;
		}
		Out.Paths.Sort();
		return nullptr;
	}
}

TSharedPtr<FJsonValue> FBlueprintHandlers::FindBlueprintStaticMeshUses(const TSharedPtr<FJsonObject>& Params)
{
	using namespace MCPBlueprintMeshUses;

	MCPReadParamsAhead(Params, {
		TEXT("meshPaths"), TEXT("meshPathPrefix"), TEXT("assetPaths"), TEXT("directory"), TEXT("recursive"),
		TEXT("minTiltDegrees"), TEXT("includeInstanced"), TEXT("sortBy"), TEXT("maxResults"), TEXT("maxBlueprints"),
	});

	MCPStaticMeshUse::FMeshSelector Selector;
	if (TSharedPtr<FJsonValue> SelectorError = MCPStaticMeshUse::ReadMeshSelector(Params, Selector))
	{
		return SelectorError;
	}
	const FString SortBy = OptionalString(Params, TEXT("sortBy"), TEXT("path")).ToLower();
	if (SortBy != TEXT("path") && SortBy != TEXT("tilt"))
	{
		return MCPError(TEXT("'sortBy' must be 'path' (Blueprint then component order, the default) or 'tilt' (most tilted first)"));
	}
	const double MinTilt = MCPStaticMeshUse::ReadMinTilt(Params);
	const bool bIncludeInstanced = OptionalBool(Params, TEXT("includeInstanced"), true);
	const int32 MaxResults = FMath::Clamp(OptionalInt(Params, TEXT("maxResults"), DefaultMaxResults), 1, MaxMaxResults);
	const int32 MaxBlueprints = FMath::Clamp(OptionalInt(Params, TEXT("maxBlueprints"), DefaultMaxBlueprints), 1, MaxMaxBlueprints);

	FCandidates Candidates;
	if (TSharedPtr<FJsonValue> CandidateError = GatherCandidates(Params, Selector, Candidates))
	{
		return CandidateError;
	}

	TArray<FString> DirtyBefore;
	MCPEditorState::CollectDirtyEditorPackageNames(DirtyBefore);

	const int32 CandidateCount = Candidates.Paths.Num();
	const bool bTruncatedAtMaxBlueprints = CandidateCount > MaxBlueprints;
	if (bTruncatedAtMaxBlueprints) Candidates.Paths.SetNum(MaxBlueprints);

	TArray<FUseRow> Rows;
	TArray<FUseRow> InstancedRows;
	TMap<FString, int32> UsesByMesh;
	TArray<FString> FailedToLoad;
	int32 FailedToLoadCount = 0;
	int32 NotActorBlueprints = 0;
	int32 BlueprintsScanned = 0;
	int32 BlueprintsWithUses = 0;
	int32 TemplatesScanned = 0;
	int32 MatchedComponents = 0;
	int32 BelowMinTilt = 0;
	int32 MatchedInstancedComponents = 0;

	for (const FString& Path : Candidates.Paths)
	{
		UBlueprint* Blueprint = LoadBlueprint(Path);
		if (!Blueprint)
		{
			++FailedToLoadCount;
			if (FailedToLoad.Num() < MaxListedFailures) FailedToLoad.Add(Path);
			continue;
		}
		UBlueprintGeneratedClass* Class = Cast<UBlueprintGeneratedClass>(Blueprint->GeneratedClass);
		if (!Class || !Class->IsChildOf(AActor::StaticClass()))
		{
			++NotActorBlueprints;
			continue;
		}
		++BlueprintsScanned;

		TArray<FTemplateNode> Nodes;
		TMap<FString, int32> ByKey;
		BuildTemplateGraph(Class, Nodes, ByKey);

		bool bAnyUse = false;
		for (int32 Index = 0; Index < Nodes.Num(); ++Index)
		{
			const FTemplateNode& Node = Nodes[Index];
			const UStaticMeshComponent* MeshTemplate = Cast<UStaticMeshComponent>(Node.Template);
			if (!MeshTemplate) continue;
			++TemplatesScanned;
			const UStaticMesh* Mesh = MeshTemplate->GetStaticMesh();
			if (!IsValid(Mesh) || !Selector.Matches(Mesh)) continue;
			UsesByMesh.FindOrAdd(Mesh->GetPathName())++;
			bAnyUse = true;

			const FActorSpace Space = ComposeActorSpace(Nodes, ByKey, Index);
			if (const UInstancedStaticMeshComponent* Instanced = Cast<UInstancedStaticMeshComponent>(MeshTemplate))
			{
				++MatchedInstancedComponents;
				if (!bIncludeInstanced) continue;
				TSharedPtr<FJsonObject> Row = TemplateRow(Blueprint, Nodes, ByKey, Node, Mesh, Space);
				const int32 InstanceCount = FMath::Max(0, Instanced->GetInstanceCount());
				Row->SetNumberField(TEXT("instanceCount"), InstanceCount);
				double MaxInstanceTilt = 0.0;
				int32 TiltedInstances = 0;
				for (int32 Instance = 0; Instance < InstanceCount; ++Instance)
				{
					FTransform Local;
					if (!Instanced->GetInstanceTransform(Instance, Local, /*bWorldSpace*/ false)) continue;
					const double InstanceTilt = MCPStaticMeshUse::TiltDegrees((Local * Space.Transform).GetRotation());
					MaxInstanceTilt = FMath::Max(MaxInstanceTilt, InstanceTilt);
					if (MinTilt > 0.0 && InstanceTilt >= MinTilt) ++TiltedInstances;
				}
				Row->SetNumberField(TEXT("maxInstanceTiltDegrees"), MaxInstanceTilt);
				if (MinTilt > 0.0) Row->SetNumberField(TEXT("instancesAtOrAboveMinTilt"), TiltedInstances);
				InstancedRows.Add({ MaxInstanceTilt, Row });
				continue;
			}

			++MatchedComponents;
			const double Tilt = MCPStaticMeshUse::TiltDegrees(Space.Transform.GetRotation());
			if (Tilt < MinTilt)
			{
				++BelowMinTilt;
				continue;
			}
			Rows.Add({ Tilt, TemplateRow(Blueprint, Nodes, ByKey, Node, Mesh, Space) });
		}
		if (bAnyUse) ++BlueprintsWithUses;
	}

	if (SortBy == TEXT("tilt"))
	{
		Rows.StableSort([](const FUseRow& A, const FUseRow& B) { return A.Tilt > B.Tilt; });
		InstancedRows.StableSort([](const FUseRow& A, const FUseRow& B) { return A.Tilt > B.Tilt; });
	}
	auto ToJson = [MaxResults](const TArray<FUseRow>& Source)
	{
		TArray<TSharedPtr<FJsonValue>> Out;
		for (int32 Index = 0; Index < FMath::Min(MaxResults, Source.Num()); ++Index)
		{
			Out.Add(MakeShared<FJsonValueObject>(Source[Index].Json));
		}
		return Out;
	};

	TSharedPtr<FJsonObject> Result = MCPSuccess();
	MCPStaticMeshUse::WriteSelector(Result, Selector);
	Result->SetArrayField(TEXT("unknownMeshPaths"), MCPStringListToJson(MCPStaticMeshUse::UnknownMeshPaths(Selector)));
	Result->SetArrayField(TEXT("unmatchedMeshPaths"), MCPStringListToJson(MCPStaticMeshUse::UnmatchedExactPaths(Selector, UsesByMesh)));
	Result->SetObjectField(TEXT("usesByMesh"), MCPStaticMeshUse::CountsToJson(UsesByMesh));

	TSharedPtr<FJsonObject> Selection = MakeShared<FJsonObject>();
	Selection->SetStringField(TEXT("selectedBy"), Candidates.bFromAssetPaths ? TEXT("assetPaths") : TEXT("referencers"));
	if (!Candidates.bFromAssetPaths)
	{
		Selection->SetStringField(TEXT("directory"), Candidates.Directory);
		Selection->SetBoolField(TEXT("recursive"), Candidates.bRecursive);
		Selection->SetBoolField(TEXT("waitedForAssetRegistryScan"), Candidates.bWaitedForRegistry);
		Selection->SetNumberField(TEXT("meshPackages"), Candidates.MeshPackages);
		Selection->SetNumberField(TEXT("blueprintsOutsideDirectory"), Candidates.BlueprintsOutsideDirectory);
		Selection->SetNumberField(TEXT("nonBlueprintReferencers"), Candidates.NonBlueprintReferencers);
	}
	Selection->SetNumberField(TEXT("candidateBlueprints"), CandidateCount);
	Selection->SetNumberField(TEXT("maxBlueprints"), MaxBlueprints);
	Selection->SetBoolField(TEXT("truncatedAtMaxBlueprints"), bTruncatedAtMaxBlueprints);
	Selection->SetNumberField(TEXT("blueprintsScanned"), BlueprintsScanned);
	Selection->SetNumberField(TEXT("blueprintsWithUses"), BlueprintsWithUses);
	Selection->SetNumberField(TEXT("notActorBlueprints"), NotActorBlueprints);
	Selection->SetNumberField(TEXT("failedToLoadCount"), FailedToLoadCount);
	if (FailedToLoad.Num() > 0) Selection->SetArrayField(TEXT("failedToLoad"), MCPStringListToJson(FailedToLoad));
	Result->SetObjectField(TEXT("selection"), Selection);

	Result->SetNumberField(TEXT("staticMeshTemplatesScanned"), TemplatesScanned);
	Result->SetNumberField(TEXT("matchedComponents"), MatchedComponents);
	Result->SetNumberField(TEXT("belowMinTilt"), BelowMinTilt);
	Result->SetNumberField(TEXT("minTiltDegrees"), MinTilt);
	Result->SetStringField(TEXT("sortBy"), SortBy);
	Result->SetNumberField(TEXT("maxResults"), MaxResults);
	Result->SetNumberField(TEXT("totalRows"), Rows.Num());
	Result->SetNumberField(TEXT("returned"), FMath::Min(MaxResults, Rows.Num()));
	Result->SetBoolField(TEXT("truncated"), Rows.Num() > MaxResults);
	Result->SetArrayField(TEXT("components"), ToJson(Rows));
	Result->SetBoolField(TEXT("includeInstanced"), bIncludeInstanced);
	Result->SetNumberField(TEXT("matchedInstancedComponents"), MatchedInstancedComponents);
	if (bIncludeInstanced)
	{
		Result->SetNumberField(TEXT("instancedRows"), InstancedRows.Num());
		Result->SetBoolField(TEXT("instancedTruncated"), InstancedRows.Num() > MaxResults);
		Result->SetArrayField(TEXT("instancedComponents"), ToJson(InstancedRows));
	}

	// The read guarantee, asserted rather than assumed: loading a Blueprint and
	// reading its templates must leave every package as it was.
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
