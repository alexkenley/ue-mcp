// #1166: export_blueprint_batch writes what it reports. Assets live in a
// private temp mount.
#if WITH_DEV_AUTOMATION_TESTS

#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Handlers/BlueprintHandlers.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "EdGraph/EdGraph.h"
#include "EdGraphSchema_K2.h"
#include "Engine/Blueprint.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "GameFramework/Actor.h"
#include "HAL/FileManager.h"
#include "K2Node_CallFunction.h"
#include "K2Node_VariableSet.h"
#include "Kismet/KismetMathLibrary.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "Misc/AutomationTest.h"
#include "Misc/FileHelper.h"
#include "Misc/Guid.h"
#include "Misc/Paths.h"
#include "Misc/ScopeExit.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "UObject/Package.h"
#include "Tests/MCPScopedTestMount.h"

namespace MCPBlueprintBatchAuditTests
{
struct FFixture
{
	FMCPScopedTestMount Mount;
	FString PackageName;
	UBlueprint* Blueprint = nullptr;

	FFixture()
		: Mount(TEXT("/UEMCPBatchAudit_") + FGuid::NewGuid().ToString(EGuidFormats::Digits) + TEXT("/"), TEXT("UEMCPBatchAudit"))
		, PackageName(Mount.RootPath + TEXT("BP_DeadCode"))
	{
		UPackage* Package = CreatePackage(*PackageName);
		Blueprint = FKismetEditorUtilities::CreateBlueprint(
			AActor::StaticClass(), Package, FName(TEXT("BP_DeadCode")), BPTYPE_Normal,
			UBlueprint::StaticClass(), UBlueprintGeneratedClass::StaticClass());
	}
};

UK2Node* PlaceNode(UEdGraph* Graph, UK2Node* Node)
{
	Graph->AddNode(Node, false, false);
	Node->CreateNewGuid();
	Node->AllocateDefaultPins();
	return Node;
}

/** One of each finding: an uncalled function beside a called one, an unused
 *  variable, a write-only variable, two exec nodes nothing runs, and a pure
 *  node whose output feeds nothing. */
bool BuildDeadCode(FAutomationTestBase& Test, UBlueprint* Blueprint)
{
	FEdGraphPinType BoolType;
	BoolType.PinCategory = UEdGraphSchema_K2::PC_Boolean;
	FBlueprintEditorUtils::AddMemberVariable(Blueprint, TEXT("UnusedVar"), BoolType);
	FBlueprintEditorUtils::AddMemberVariable(Blueprint, TEXT("WriteOnlyVar"), BoolType);

	for (const TCHAR* Name : {TEXT("UsedFn"), TEXT("DeadFn")})
	{
		UEdGraph* Graph = FBlueprintEditorUtils::CreateNewGraph(
			Blueprint, FName(Name), UEdGraph::StaticClass(), UEdGraphSchema_K2::StaticClass());
		FBlueprintEditorUtils::AddFunctionGraph<UClass>(Blueprint, Graph, /*bIsUserCreated*/ true, nullptr);
	}
	FKismetEditorUtilities::CompileBlueprint(Blueprint);

	if (!Test.TestTrue(TEXT("fixture has an event graph"), Blueprint->UbergraphPages.Num() > 0)) return false;
	UEdGraph* EventGraph = Blueprint->UbergraphPages[0];

	UK2Node_CallFunction* CallUsed = NewObject<UK2Node_CallFunction>(EventGraph);
	CallUsed->FunctionReference.SetSelfMember(FName(TEXT("UsedFn")));
	PlaceNode(EventGraph, CallUsed);

	UK2Node_VariableSet* SetVar = NewObject<UK2Node_VariableSet>(EventGraph);
	SetVar->VariableReference.SetSelfMember(FName(TEXT("WriteOnlyVar")));
	PlaceNode(EventGraph, SetVar);

	UK2Node_CallFunction* PureAdd = NewObject<UK2Node_CallFunction>(EventGraph);
	PureAdd->SetFromFunction(UKismetMathLibrary::StaticClass()->FindFunctionByName(TEXT("Add_IntInt")));
	PlaceNode(EventGraph, PureAdd);

	Test.TestTrue(TEXT("the self call has an exec input"), CallUsed->GetExecPin() != nullptr);
	Test.TestTrue(TEXT("the add node is pure"), PureAdd->IsNodePure());
	return true;
}

TSharedPtr<FJsonObject> Run(FAutomationTestBase& Test, const TCHAR* Method, const TSharedPtr<FJsonObject>& Params)
{
	FMCPHandlerRegistry Registry;
	FBlueprintHandlers::RegisterHandlers(Registry);
	const TSharedPtr<FJsonValue> Value = Registry.ExecuteHandler(Method, Params);
	const TSharedPtr<FJsonObject> Result = Value.IsValid() && Value->Type == EJson::Object ? Value->AsObject() : nullptr;
	Test.TestTrue(FString(Method) + TEXT(" returns an object"), Result.IsValid());
	return Result;
}

bool Succeeded(const TSharedPtr<FJsonObject>& Result)
{
	bool bSuccess = false;
	return Result.IsValid() && Result->TryGetBoolField(TEXT("success"), bSuccess) && bSuccess;
}

TSharedPtr<FJsonObject> ParamsFor(const FString& PackageName)
{
	auto Params = MakeShared<FJsonObject>();
	TArray<TSharedPtr<FJsonValue>> Paths;
	Paths.Add(MakeShared<FJsonValueString>(PackageName));
	Params->SetArrayField(TEXT("assetPaths"), Paths);
	return Params;
}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMCPBlueprintExportBatchTest,
	"UE.MCP.Blueprint.BatchAudit.ExportBatch",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FMCPBlueprintExportBatchTest::RunTest(const FString& Parameters)
{
	using namespace MCPBlueprintBatchAuditTests;
	FFixture Fixture;
	if (!TestNotNull(TEXT("Blueprint fixture created"), Fixture.Blueprint)) return false;
	if (!BuildDeadCode(*this, Fixture.Blueprint)) return false;

	const FString RelativeDir = TEXT("UE_MCP/ExportBatchTest_") + FGuid::NewGuid().ToString(EGuidFormats::Digits);
	const FString AbsoluteDir = FPaths::ConvertRelativePathToFull(FPaths::Combine(FPaths::ProjectSavedDir(), RelativeDir));
	ON_SCOPE_EXIT { IFileManager::Get().DeleteDirectory(*AbsoluteDir, false, true); };

	// The missing path goes through the editor asset library, which logs it.
	AddExpectedError(TEXT("LoadAsset failed"), EAutomationExpectedErrorFlags::Contains, 0);
	auto Params = ParamsFor(Fixture.PackageName);
	TArray<TSharedPtr<FJsonValue>> Paths = Params->GetArrayField(TEXT("assetPaths"));
	Paths.Add(MakeShared<FJsonValueString>(Fixture.Mount.RootPath + TEXT("BP_DoesNotExist")));
	Params->SetArrayField(TEXT("assetPaths"), Paths);
	Params->SetStringField(TEXT("outputDir"), RelativeDir);
	Params->SetBoolField(TEXT("includeT3D"), true);
	const TSharedPtr<FJsonObject> Result = Run(*this, TEXT("export_blueprint_batch"), Params);
	if (!TestTrue(TEXT("a batch with one bad path still succeeds"), Succeeded(Result))) return false;
	TestEqual(TEXT("one exported"), static_cast<int32>(Result->GetNumberField(TEXT("exported"))), 1);
	TestEqual(TEXT("one failed, reported on its own row"), static_cast<int32>(Result->GetNumberField(TEXT("failed"))), 1);

	const TArray<TSharedPtr<FJsonValue>>& Files = Result->GetArrayField(TEXT("files"));
	TestTrue(TEXT("summary plus at least one T3D file"), Files.Num() >= 2);
	FString JsonFile;
	bool bSawT3D = false;
	for (const TSharedPtr<FJsonValue>& File : Files)
	{
		const FString Path = File->AsString();
		TestTrue(FString::Printf(TEXT("%s exists"), *Path), IFileManager::Get().FileExists(*Path));
		TestTrue(FString::Printf(TEXT("%s is under outputDir"), *Path), FPaths::IsUnderDirectory(Path, AbsoluteDir));
		if (Path.EndsWith(TEXT(".json"))) JsonFile = Path;
		if (Path.EndsWith(TEXT(".t3d")))
		{
			FString Text;
			FFileHelper::LoadFileToString(Text, *Path);
			bSawT3D |= Text.Contains(TEXT("Begin Object"));
		}
	}
	TestTrue(TEXT("a T3D file holds exported nodes"), bSawT3D);

	FString JsonText;
	if (!TestTrue(TEXT("summary file reads back"), FFileHelper::LoadFileToString(JsonText, *JsonFile))) return false;
	TSharedPtr<FJsonObject> Summary;
	if (!TestTrue(TEXT("summary parses"), FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(JsonText), Summary) && Summary.IsValid())) return false;

	bool bHasVariable = false;
	for (const TSharedPtr<FJsonValue>& Var : Summary->GetArrayField(TEXT("variables")))
	{
		bHasVariable |= Var->AsObject()->GetStringField(TEXT("name")) == TEXT("UnusedVar");
	}
	TestTrue(TEXT("summary lists variables"), bHasVariable);

	bool bHasFunction = false;
	for (const TSharedPtr<FJsonValue>& Fn : Summary->GetArrayField(TEXT("functions")))
	{
		bHasFunction |= Fn->AsObject()->GetStringField(TEXT("name")) == TEXT("DeadFn");
	}
	TestTrue(TEXT("summary lists functions"), bHasFunction);

	bool bHasLinkField = false;
	int32 EventGraphNodes = -1;
	for (const TSharedPtr<FJsonValue>& GraphValue : Summary->GetArrayField(TEXT("graphs")))
	{
		const TSharedPtr<FJsonObject> Graph = GraphValue->AsObject();
		if (Graph->GetStringField(TEXT("kind")) == TEXT("event_graph"))
		{
			EventGraphNodes = static_cast<int32>(Graph->GetNumberField(TEXT("nodeCount")));
		}
		for (const TSharedPtr<FJsonValue>& NodeValue : Graph->GetArrayField(TEXT("nodes")))
		{
			const TArray<TSharedPtr<FJsonValue>>* Pins = nullptr;
			if (!NodeValue->AsObject()->TryGetArrayField(TEXT("pins"), Pins)) continue;
			for (const TSharedPtr<FJsonValue>& Pin : *Pins)
			{
				bHasLinkField |= Pin->AsObject()->HasField(TEXT("linkedTo"));
			}
		}
	}
	TestEqual(TEXT("event graph node count matches the graph"), EventGraphNodes, Fixture.Blueprint->UbergraphPages[0]->Nodes.Num());
	TestTrue(TEXT("pins carry linkedTo"), bHasLinkField);

	// A relative outputDir cannot climb out of Saved.
	auto Escape = ParamsFor(Fixture.PackageName);
	Escape->SetStringField(TEXT("outputDir"), TEXT("../OutsideSaved"));
	const TSharedPtr<FJsonObject> Refused = Run(*this, TEXT("export_blueprint_batch"), Escape);
	TestFalse(TEXT("a relative outputDir leaving Saved is refused"), Succeeded(Refused));
	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
