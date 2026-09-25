// Translation-unit partition of FBlueprintHandlers, like the other
// BlueprintHandlers_*.cpp files. Registration stays in BlueprintHandlers.cpp.
//
// #1166: export_blueprint_batch writes many Blueprints to disk in one call,
// selected by assetPaths or by the Asset Registry over a directory.

#include "BlueprintHandlers.h"
#include "BlueprintHandlers_Internal.h"
#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Engine/Blueprint.h"
#include "Engine/World.h"
#include "Engine/LevelScriptBlueprint.h"
#include "Engine/SimpleConstructionScript.h"
#include "Engine/SCS_Node.h"
#include "Blueprint/BlueprintSupport.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "K2Node_CustomEvent.h"
#include "K2Node_Event.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "AssetRegistry/IAssetRegistry.h"
#include "AssetRegistry/ARFilter.h"
#include "AssetRegistry/AssetData.h"
#include "Misc/PackageName.h"
#include "Misc/Paths.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"

namespace MCPBlueprintBatch
{
	constexpr int32 DefaultMaxAssets = 200;
	constexpr int32 MaxMaxAssets = 5000;

	struct FTarget
	{
		FString ObjectPath;
		FString PackageName;
		bool bWorld = false;
	};

	struct FSelection
	{
		TArray<FTarget> Targets;
		FString Directory;
		bool bFromAssetPaths = false;
		bool bRecursive = true;
		int32 BlueprintsInDirectory = 0;
		int32 WorldsInDirectory = 0;
		int32 SkippedByClass = 0;
		bool bWaitedForRegistry = false;
	};

	IAssetRegistry& GetRegistry(bool& bOutWaited)
	{
		IAssetRegistry& Registry =
			FModuleManager::LoadModuleChecked<FAssetRegistryModule>(TEXT("AssetRegistry")).Get();
		// A sweep during the initial scan would miss every asset not reached yet.
		bOutWaited = Registry.IsLoadingAssets();
		if (bOutWaited) Registry.WaitForCompletion();
		return Registry;
	}

	/** False only when the registry proves the Blueprint cannot derive from
	 *  FilterClass: a native filter and a native parent outside it. */
	bool MayDeriveFrom(const FAssetData& Asset, UClass* FilterClass)
	{
		if (!FilterClass || !FilterClass->HasAnyClassFlags(CLASS_Native)) return true;
		FString Tag;
		if (!Asset.GetTagValue(FBlueprintTags::NativeParentClassPath, Tag) || Tag.IsEmpty()) return true;
		const FString ClassPath = FPackageName::ExportTextPathToObjectPath(Tag);
		UClass* NativeParent = FindObject<UClass>(nullptr, *ClassPath);
		return !NativeParent || NativeParent->IsChildOf(FilterClass);
	}

	bool DerivesFrom(const UBlueprint* Blueprint, UClass* FilterClass)
	{
		if (!FilterClass) return true;
		if (Blueprint->GeneratedClass && Blueprint->GeneratedClass->IsChildOf(FilterClass)) return true;
		return Blueprint->ParentClass && Blueprint->ParentClass->IsChildOf(FilterClass);
	}

	/** assetPaths when given, otherwise the registry over directory. Returns an
	 *  error response, or nullptr. */
	TSharedPtr<FJsonValue> ReadSelection(
		const TSharedPtr<FJsonObject>& Params, bool bIncludeLevelScripts, UClass* FilterClass, FSelection& Out)
	{
		Out.bRecursive = OptionalBool(Params, TEXT("recursive"), true);
		const TArray<TSharedPtr<FJsonValue>>* Paths = nullptr;
		if (TryGetArrayParam(Params, TEXT("assetPaths"), Paths) && Paths && Paths->Num() > 0)
		{
			Out.bFromAssetPaths = true;
			TSet<FString> Seen;
			for (const TSharedPtr<FJsonValue>& Value : *Paths)
			{
				FString Path;
				if (!Value.IsValid() || !Value->TryGetString(Path)) continue;
				Path.TrimStartAndEndInline();
				if (Path.IsEmpty() || Seen.Contains(Path)) continue;
				Seen.Add(Path);
				FTarget Target;
				Target.ObjectPath = Path;
				Target.PackageName = FPackageName::ObjectPathToPackageName(Path);
				Out.Targets.Add(Target);
			}
			if (Out.Targets.Num() == 0)
			{
				return MCPError(TEXT("'assetPaths' holds no usable path"));
			}
			return nullptr;
		}

		FString Directory = OptionalString(Params, TEXT("directory"), TEXT("/Game"));
		Directory.TrimStartAndEndInline();
		if (Directory.IsEmpty()) Directory = TEXT("/Game");
		while (Directory.Len() > 1 && Directory.EndsWith(TEXT("/"))) Directory.LeftChopInline(1);
		if (!Directory.StartsWith(TEXT("/")))
		{
			return MCPError(FString::Printf(
				TEXT("'directory' must be a mount-rooted content path such as /Game or /Game/AI, got '%s'"), *Directory));
		}
		Out.Directory = Directory;

		IAssetRegistry& Registry = GetRegistry(Out.bWaitedForRegistry);
		FARFilter Filter;
		Filter.PackagePaths.Add(FName(*Directory));
		Filter.bRecursivePaths = Out.bRecursive;
		Filter.ClassPaths.Add(UBlueprint::StaticClass()->GetClassPathName());
		Filter.bRecursiveClasses = true;
		TArray<FAssetData> Blueprints;
		Registry.GetAssets(Filter, Blueprints);
		Out.BlueprintsInDirectory = Blueprints.Num();
		for (const FAssetData& Asset : Blueprints)
		{
			if (!MayDeriveFrom(Asset, FilterClass))
			{
				++Out.SkippedByClass;
				continue;
			}
			FTarget Target;
			Target.ObjectPath = Asset.GetObjectPathString();
			Target.PackageName = Asset.PackageName.ToString();
			Out.Targets.Add(Target);
		}

		// A level script lives inside its map package, so the Blueprint filter
		// never lists one (#942).
		if (bIncludeLevelScripts)
		{
			FARFilter WorldFilter;
			WorldFilter.PackagePaths.Add(FName(*Directory));
			WorldFilter.bRecursivePaths = Out.bRecursive;
			WorldFilter.ClassPaths.Add(UWorld::StaticClass()->GetClassPathName());
			TArray<FAssetData> Worlds;
			Registry.GetAssets(WorldFilter, Worlds);
			Out.WorldsInDirectory = Worlds.Num();
			for (const FAssetData& World : Worlds)
			{
				FTarget Target;
				Target.ObjectPath = World.GetObjectPathString();
				Target.PackageName = World.PackageName.ToString();
				Target.bWorld = true;
				Out.Targets.Add(Target);
			}
		}

		Out.Targets.Sort([](const FTarget& A, const FTarget& B) { return A.ObjectPath < B.ObjectPath; });
		return nullptr;
	}

	void WriteSelectionStats(const TSharedPtr<FJsonObject>& Stats, const FSelection& Selection)
	{
		if (Selection.bFromAssetPaths)
		{
			Stats->SetStringField(TEXT("selectedBy"), TEXT("assetPaths"));
			return;
		}
		Stats->SetStringField(TEXT("selectedBy"), TEXT("directory"));
		Stats->SetStringField(TEXT("directory"), Selection.Directory);
		Stats->SetBoolField(TEXT("recursive"), Selection.bRecursive);
		Stats->SetNumberField(TEXT("blueprintsInDirectory"), Selection.BlueprintsInDirectory);
		Stats->SetNumberField(TEXT("worldsInDirectory"), Selection.WorldsInDirectory);
		Stats->SetNumberField(TEXT("skippedByParentClass"), Selection.SkippedByClass);
		Stats->SetBoolField(TEXT("waitedForAssetRegistryScan"), Selection.bWaitedForRegistry);
	}

	/** Every graph the Blueprint owns, with the selector list_graphs reports. */
	void CollectGraphs(UBlueprint* Blueprint, TArray<UEdGraph*>& OutGraphs, TMap<const UEdGraph*, FString>& OutSelectors)
	{
		Blueprint->GetAllGraphs(OutGraphs);
		TMap<FString, int32> NameCounts;
		CountGraphNames(OutGraphs, NameCounts);
		TMap<FString, int32> SeenCounts;
		for (UEdGraph* Graph : OutGraphs)
		{
			if (!Graph) continue;
			const FString Name = Graph->GetName();
			const int32 Index = SeenCounts.FindOrAdd(Name)++;
			OutSelectors.Add(Graph, MakeGraphSelector(Name, Index, NameCounts.FindRef(Name)));
		}
	}

	FString GraphKind(const UBlueprint* Blueprint, UEdGraph* Graph)
	{
		if (Blueprint->UbergraphPages.Contains(Graph)) return TEXT("event_graph");
		if (Blueprint->FunctionGraphs.Contains(Graph)) return TEXT("function");
		if (Blueprint->MacroGraphs.Contains(Graph)) return TEXT("macro");
		if (Blueprint->DelegateSignatureGraphs.Contains(Graph)) return TEXT("delegate_signature");
		for (const FBPInterfaceDescription& Interface : Blueprint->ImplementedInterfaces)
		{
			if (Interface.Graphs.Contains(Graph)) return TEXT("interface");
		}
		return TEXT("subgraph");
	}

	/** True when the parent class already declares Name, so a graph or event of
	 *  that name is an override rather than a declaration of its own. */
	bool ParentDeclares(const UBlueprint* Blueprint, FName Name)
	{
		return Blueprint->ParentClass && Blueprint->ParentClass->FindFunctionByName(Name) != nullptr;
	}

	TArray<TSharedPtr<FJsonValue>> DescribeVariables(const UBlueprint* Blueprint)
	{
		TArray<TSharedPtr<FJsonValue>> Out;
		for (const FBPVariableDescription& Var : Blueprint->NewVariables)
		{
			TSharedPtr<FJsonObject> Obj = MakeShared<FJsonObject>();
			bool bRoundTrips = true;
			Obj->SetStringField(TEXT("name"), Var.VarName.ToString());
			Obj->SetStringField(TEXT("typeSpec"), FBlueprintHandlers::PinTypeSpec(Var.VarType, bRoundTrips));
			Obj->SetStringField(TEXT("pinCategory"), Var.VarType.PinCategory.ToString());
			Obj->SetStringField(TEXT("guid"), Var.VarGuid.ToString());
			Obj->SetStringField(TEXT("category"), Var.Category.ToString());
			Obj->SetBoolField(TEXT("instanceEditable"),
				(Var.PropertyFlags & CPF_Edit) != 0 && (Var.PropertyFlags & CPF_DisableEditOnInstance) == 0);
			Obj->SetBoolField(TEXT("exposeOnSpawn"), (Var.PropertyFlags & CPF_ExposeOnSpawn) != 0);
			Obj->SetBoolField(TEXT("replicated"), (Var.PropertyFlags & CPF_Net) != 0);
			if (!Var.RepNotifyFunc.IsNone())
			{
				Obj->SetStringField(TEXT("repNotify"), Var.RepNotifyFunc.ToString());
			}
			Out.Add(MakeShared<FJsonValueObject>(Obj));
		}
		return Out;
	}

	TArray<TSharedPtr<FJsonValue>> DescribeComponents(const UBlueprint* Blueprint)
	{
		TArray<TSharedPtr<FJsonValue>> Out;
		const USimpleConstructionScript* SCS = Blueprint->SimpleConstructionScript;
		if (!SCS) return Out;
		TArray<TPair<const USCS_Node*, FString>> Stack;
		for (const USCS_Node* Root : SCS->GetRootNodes())
		{
			if (Root) Stack.Emplace(Root, Root->ParentComponentOrVariableName.IsNone() ? FString() : Root->ParentComponentOrVariableName.ToString());
		}
		while (Stack.Num() > 0)
		{
			const TPair<const USCS_Node*, FString> Entry = Stack.Pop();
			const USCS_Node* Node = Entry.Key;
			TSharedPtr<FJsonObject> Obj = MakeShared<FJsonObject>();
			Obj->SetStringField(TEXT("name"), Node->GetVariableName().ToString());
			Obj->SetStringField(TEXT("class"), Node->ComponentClass ? Node->ComponentClass->GetName() : FString());
			Obj->SetStringField(TEXT("parent"), Entry.Value);
			Out.Add(MakeShared<FJsonValueObject>(Obj));
			for (const USCS_Node* Child : Node->GetChildNodes())
			{
				if (Child) Stack.Emplace(Child, Node->GetVariableName().ToString());
			}
		}
		return Out;
	}

	TSharedPtr<FJsonObject> Callable(const FString& Name, const TCHAR* Kind, const FString& Selector)
	{
		TSharedPtr<FJsonObject> Obj = MakeShared<FJsonObject>();
		Obj->SetStringField(TEXT("name"), Name);
		Obj->SetStringField(TEXT("kind"), Kind);
		Obj->SetStringField(TEXT("graphSelector"), Selector);
		return Obj;
	}

	TArray<TSharedPtr<FJsonValue>> DescribeCallables(
		const UBlueprint* Blueprint, const TArray<UEdGraph*>& Graphs, const TMap<const UEdGraph*, FString>& Selectors)
	{
		TArray<TSharedPtr<FJsonValue>> Out;
		for (UEdGraph* Graph : Graphs)
		{
			if (!Graph) continue;
			const FString Kind = GraphKind(Blueprint, Graph);
			const FString Selector = Selectors.FindRef(Graph);
			if (Kind == TEXT("function"))
			{
				const bool bOverride = ParentDeclares(Blueprint, Graph->GetFName());
				Out.Add(MakeShared<FJsonValueObject>(Callable(Graph->GetName(), bOverride ? TEXT("override") : TEXT("function"), Selector)));
			}
			else if (Kind == TEXT("interface") || Kind == TEXT("macro"))
			{
				Out.Add(MakeShared<FJsonValueObject>(Callable(Graph->GetName(), *Kind, Selector)));
			}
			else if (Kind == TEXT("delegate_signature"))
			{
				Out.Add(MakeShared<FJsonValueObject>(Callable(Graph->GetName(), TEXT("dispatcher"), Selector)));
			}
			for (const UEdGraphNode* Node : Graph->Nodes)
			{
				const UK2Node_Event* Event = Cast<UK2Node_Event>(Node);
				if (!Event) continue;
				TSharedPtr<FJsonObject> Obj = Callable(Event->GetFunctionName().ToString(),
					Event->IsA<UK2Node_CustomEvent>() ? TEXT("custom_event") : TEXT("event"), Selector);
				Obj->SetStringField(TEXT("nodeId"), Event->NodeGuid.ToString());
				Out.Add(MakeShared<FJsonValueObject>(Obj));
			}
		}
		return Out;
	}

	/** outputDir: absolute, or relative to the project when it starts with
	 *  Saved/, or relative to Saved/ otherwise. A relative path may not leave
	 *  Saved/. */
	bool ResolveOutputDir(const FString& Requested, FString& OutDir, FString& OutError)
	{
		const FString SavedDir = FPaths::ConvertRelativePathToFull(FPaths::ProjectSavedDir());
		FString Dir = Requested;
		Dir.TrimStartAndEndInline();
		if (Dir.IsEmpty())
		{
			Dir = FPaths::Combine(SavedDir, TEXT("UE_MCP"), TEXT("BlueprintExport"));
		}
		else if (FPaths::IsRelative(Dir))
		{
			FPaths::NormalizeFilename(Dir);
			const bool bNamesSaved = Dir.Equals(TEXT("Saved"), ESearchCase::IgnoreCase)
				|| Dir.StartsWith(TEXT("Saved/"), ESearchCase::IgnoreCase);
			Dir = bNamesSaved ? FPaths::Combine(FPaths::ProjectDir(), Dir) : FPaths::Combine(SavedDir, Dir);
			Dir = FPaths::ConvertRelativePathToFull(Dir);
			if (!FPaths::IsUnderDirectory(Dir, SavedDir))
			{
				OutError = FString::Printf(
					TEXT("A relative outputDir must stay under the project's Saved folder (%s); '%s' leaves it. Pass an absolute path to write elsewhere."),
					*SavedDir, *Requested);
				return false;
			}
		}
		OutDir = FPaths::ConvertRelativePathToFull(Dir);
		FPaths::NormalizeDirectoryName(OutDir);
		return true;
	}

	/** "/Game/AI/BP_Foo" -> "Game/AI/BP_Foo", used as the per-asset file stem. */
	FString PackageStem(const FString& PackageName)
	{
		FString Stem = PackageName;
		while (Stem.StartsWith(TEXT("/"))) Stem.RightChopInline(1);
		return Stem;
	}

	FString SerializeJson(const TSharedPtr<FJsonObject>& Obj)
	{
		FString Text;
		const TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Text);
		FJsonSerializer::Serialize(Obj.ToSharedRef(), Writer);
		return Text;
	}

}

// ---------------------------------------------------------------------------
// export_blueprint_batch (#1166)
// ---------------------------------------------------------------------------
TSharedPtr<FJsonValue> FBlueprintHandlers::ExportBlueprintBatch(const TSharedPtr<FJsonObject>& Params)
{
	using namespace MCPBlueprintBatch;

	const FString ParentClassSpec = OptionalString(Params, TEXT("parentClass"), TEXT(""));
	UClass* FilterClass = nullptr;
	if (!ParentClassSpec.IsEmpty())
	{
		FilterClass = MCPResolveClass(ParentClassSpec);
		if (!FilterClass) return MCPClassNotFoundError(ParentClassSpec, TEXT("parentClass"));
	}
	const bool bIncludeT3D = OptionalBool(Params, TEXT("includeT3D"), false);
	const bool bIncludeLevelScripts = OptionalBool(Params, TEXT("includeLevelScripts"), false);
	const int32 MaxAssets = FMath::Clamp(OptionalInt(Params, TEXT("maxAssets"), DefaultMaxAssets), 1, MaxMaxAssets);

	FString OutputDir;
	FString DirError;
	if (!ResolveOutputDir(OptionalString(Params, TEXT("outputDir"), TEXT("")), OutputDir, DirError))
	{
		return MCPError(DirError);
	}

	FSelection Selection;
	if (TSharedPtr<FJsonValue> Err = ReadSelection(Params, bIncludeLevelScripts, FilterClass, Selection)) return Err;

	const bool bTruncated = Selection.Targets.Num() > MaxAssets;
	if (bTruncated) Selection.Targets.SetNum(MaxAssets);

	TArray<TSharedPtr<FJsonValue>> Rows;
	TArray<TSharedPtr<FJsonValue>> Files;
	int32 Exported = 0;
	int32 Failed = 0;
	int32 SkippedByClassAfterLoad = 0;

	for (const FTarget& Target : Selection.Targets)
	{
		TSharedPtr<FJsonObject> Row = MakeShared<FJsonObject>();
		Row->SetStringField(TEXT("assetPath"), Target.ObjectPath);
		auto Fail = [&](const FString& Error)
		{
			Row->SetBoolField(TEXT("ok"), false);
			Row->SetStringField(TEXT("error"), Error);
			Rows.Add(MakeShared<FJsonValueObject>(Row));
			++Failed;
		};

		UBlueprint* Blueprint = LoadBlueprint(Target.ObjectPath);
		if (!Blueprint)
		{
			Fail(Target.bWorld
				? TEXT("map has no level script Blueprint")
				: TEXT("did not load as a Blueprint"));
			continue;
		}
		if (!DerivesFrom(Blueprint, FilterClass))
		{
			++SkippedByClassAfterLoad;
			continue;
		}

		TArray<UEdGraph*> Graphs;
		TMap<const UEdGraph*, FString> Selectors;
		CollectGraphs(Blueprint, Graphs, Selectors);

		const FString Stem = FPaths::Combine(OutputDir, PackageStem(Target.PackageName));
		TSharedPtr<FJsonObject> Summary = MakeShared<FJsonObject>();
		Summary->SetStringField(TEXT("assetPath"), Target.ObjectPath);
		Summary->SetStringField(TEXT("blueprintPath"), Blueprint->GetPathName());
		Summary->SetStringField(TEXT("packageName"), Target.PackageName);
		Summary->SetBoolField(TEXT("isLevelScript"), Blueprint->IsA<ULevelScriptBlueprint>());
		Summary->SetStringField(TEXT("blueprintClass"), Blueprint->GetClass()->GetName());
		Summary->SetStringField(TEXT("parentClass"), Blueprint->ParentClass ? Blueprint->ParentClass->GetPathName() : FString());
		Summary->SetArrayField(TEXT("variables"), DescribeVariables(Blueprint));
		Summary->SetArrayField(TEXT("functions"), DescribeCallables(Blueprint, Graphs, Selectors));
		Summary->SetArrayField(TEXT("components"), DescribeComponents(Blueprint));

		FMCPGraphNodeJsonOptions NodeOptions;
		NodeOptions.bLinks = true;
		TArray<TSharedPtr<FJsonValue>> GraphArray;
		TArray<TSharedPtr<FJsonValue>> RowFiles;
		FString WriteError;
		for (UEdGraph* Graph : Graphs)
		{
			if (!Graph) continue;
			const FString Selector = Selectors.FindRef(Graph);
			TSharedPtr<FJsonObject> GraphObj = MakeShared<FJsonObject>();
			GraphObj->SetStringField(TEXT("name"), Graph->GetName());
			GraphObj->SetStringField(TEXT("selector"), Selector);
			GraphObj->SetStringField(TEXT("kind"), GraphKind(Blueprint, Graph));
			GraphObj->SetBoolField(TEXT("nested"), Graph->GetOuter() != Blueprint);
			GraphObj->SetStringField(TEXT("objectPath"), Graph->GetPathName());
			TArray<TSharedPtr<FJsonValue>> Nodes;
			TArray<UEdGraphNode*> GraphNodes;
			for (UEdGraphNode* Node : Graph->Nodes)
			{
				if (!Node) continue;
				GraphNodes.Add(Node);
				Nodes.Add(MakeShared<FJsonValueObject>(MCPDescribeGraphNode(Node, NodeOptions)));
			}
			GraphObj->SetNumberField(TEXT("nodeCount"), Nodes.Num());
			GraphObj->SetArrayField(TEXT("nodes"), Nodes);

			if (bIncludeT3D && GraphNodes.Num() > 0 && WriteError.IsEmpty())
			{
				FString T3D;
				int32 Skipped = 0;
				const int32 Written = MCPExportNodesToT3D(GraphNodes, T3D, Skipped);
				if (Written > 0)
				{
					const FString T3DPath = FPaths::Combine(Stem, FPaths::MakeValidFileName(Selector) + TEXT(".t3d"));
					if (MCPWriteDumpFile(T3DPath, T3D, TEXT("graph T3D"), WriteError))
					{
						GraphObj->SetStringField(TEXT("t3dFile"), T3DPath);
						RowFiles.Add(MakeShared<FJsonValueString>(T3DPath));
					}
				}
				GraphObj->SetNumberField(TEXT("t3dNodeCount"), Written);
				GraphObj->SetNumberField(TEXT("t3dSkipped"), Skipped);
			}
			GraphArray.Add(MakeShared<FJsonValueObject>(GraphObj));
		}
		Summary->SetArrayField(TEXT("graphs"), GraphArray);

		const FString JsonPath = Stem + TEXT(".json");
		if (WriteError.IsEmpty())
		{
			MCPWriteDumpFile(JsonPath, SerializeJson(Summary), TEXT("Blueprint summary"), WriteError);
		}
		if (!WriteError.IsEmpty())
		{
			Row->SetArrayField(TEXT("files"), RowFiles);
			Files.Append(RowFiles);
			Fail(WriteError);
			continue;
		}
		RowFiles.Insert(MakeShared<FJsonValueString>(JsonPath), 0);
		Files.Append(RowFiles);
		Row->SetBoolField(TEXT("ok"), true);
		Row->SetStringField(TEXT("jsonFile"), JsonPath);
		Row->SetNumberField(TEXT("graphCount"), GraphArray.Num());
		Row->SetArrayField(TEXT("files"), RowFiles);
		Rows.Add(MakeShared<FJsonValueObject>(Row));
		++Exported;
	}

	auto Result = MCPSuccess();
	Result->SetStringField(TEXT("outputDir"), OutputDir);
	Result->SetNumberField(TEXT("exported"), Exported);
	Result->SetNumberField(TEXT("failed"), Failed);
	Result->SetArrayField(TEXT("assets"), Rows);
	Result->SetArrayField(TEXT("files"), Files);
	Result->SetNumberField(TEXT("fileCount"), Files.Num());
	Result->SetBoolField(TEXT("includeT3D"), bIncludeT3D);
	// Files only: no package, asset or editor state is touched.
	Result->SetBoolField(TEXT("changed"), Files.Num() > 0);
	MCPSetNoRollback(Result, TEXT(
		"No bridge call deletes a file from disk, so the written files cannot be removed again. No asset, package "
		"or editor state was changed; a rerun overwrites the same paths."));
	TSharedPtr<FJsonObject> Stats = MakeShared<FJsonObject>();
	WriteSelectionStats(Stats, Selection);
	Stats->SetNumberField(TEXT("considered"), Selection.Targets.Num());
	Stats->SetNumberField(TEXT("skippedByParentClassAfterLoad"), SkippedByClassAfterLoad);
	Result->SetObjectField(TEXT("stats"), Stats);
	if (FilterClass) Result->SetStringField(TEXT("parentClass"), FilterClass->GetPathName());
	if (bTruncated)
	{
		Result->SetBoolField(TEXT("truncatedAtMaxAssets"), true);
		Result->SetNumberField(TEXT("maxAssets"), MaxAssets);
	}
	return MCPResult(Result);
}
