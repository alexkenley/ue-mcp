// Coverage for level(list_data_layers).
//
// A data layer needs a saved World Partition map and a data layer asset, which
// tests/live/bcov-mesh-uses-data-layers.test.ts builds and reads back end to end.
// What is asserted here holds on any map: a map that is not World Partition is
// refused by name rather than answered with an empty list, because "this map
// has no data layers" and "this map cannot have data layers" are different
// facts. On a World Partition map the read is checked for its shape, for
// counts that agree with each other, and for leaving every package clean.

#if WITH_DEV_AUTOMATION_TESTS

#include "Editor.h"
#include "Engine/World.h"
#include "HandlerRegistry.h"
#include "Handlers/Level/LevelHandlers.h"
#include "Misc/AutomationTest.h"
#include "UObject/Package.h"

namespace
{
	constexpr const TCHAR* ListDataLayersMethod = TEXT("list_data_layers");

	TSharedPtr<FJsonObject> RunListDataLayers(FMCPHandlerRegistry& Registry, const TSharedPtr<FJsonObject>& Request)
	{
		const TSharedPtr<FJsonValue> Response = Registry.ExecuteHandler(ListDataLayersMethod, Request);
		return (Response.IsValid() && Response->Type == EJson::Object) ? Response->AsObject() : nullptr;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FLevelListDataLayersOpenMapTest,
	"UE.MCP.Level.ListDataLayers.OpenMapReadOnly",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FLevelListDataLayersOpenMapTest::RunTest(const FString& Parameters)
{
	FMCPHandlerRegistry Registry;
	FLevelHandlers::RegisterHandlers(Registry);
	if (!TestTrue(TEXT("list_data_layers is registered"), Registry.HasHandler(ListDataLayersMethod))) return false;

	UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
	if (!World) return true;

	TSharedPtr<FJsonObject> Request = MakeShared<FJsonObject>();
	Request->SetBoolField(TEXT("includeMembers"), true);
	Request->SetNumberField(TEXT("maxMembers"), 5);
	const TSharedPtr<FJsonObject> Response = RunListDataLayers(Registry, Request);
	if (!TestTrue(TEXT("the read answers with an object"), Response.IsValid())) return false;

	bool bSuccess = false;
	Response->TryGetBoolField(TEXT("success"), bSuccess);
	if (!World->IsPartitionedWorld())
	{
		TestFalse(TEXT("a map that is not World Partition is refused"), bSuccess);
		FString Error;
		Response->TryGetStringField(TEXT("error"), Error);
		TestTrue(TEXT("and the refusal says why"), Error.Contains(TEXT("World Partition")));
		return true;
	}

	if (!TestTrue(TEXT("a World Partition map answers"), bSuccess)) return false;
	TestFalse(TEXT("reading dirties no package"), Response->GetBoolField(TEXT("dirtiedPackages")));
	const TArray<TSharedPtr<FJsonValue>>& Layers = Response->GetArrayField(TEXT("dataLayers"));
	TestEqual(TEXT("returned counts the rows"), static_cast<int32>(Response->GetNumberField(TEXT("returned"))), Layers.Num());
	TestTrue(TEXT("no more rows than instances"),
		Layers.Num() <= static_cast<int32>(Response->GetNumberField(TEXT("dataLayerCount"))));
	for (const TSharedPtr<FJsonValue>& Value : Layers)
	{
		const TSharedPtr<FJsonObject> Layer = Value->AsObject();
		const FString Name = Layer->GetStringField(TEXT("instanceName"));
		TestFalse(FString::Printf(TEXT("%s: every layer has an instance name"), *Name), Name.IsEmpty());
		const int32 Actors = static_cast<int32>(Layer->GetNumberField(TEXT("actorCount")));
		const int32 Loaded = static_cast<int32>(Layer->GetNumberField(TEXT("loadedActorCount")));
		TestTrue(FString::Printf(TEXT("%s: loaded actors are a subset of its actors"), *Name), Loaded >= 0 && Loaded <= Actors);
		const TArray<TSharedPtr<FJsonValue>>& Members = Layer->GetArrayField(TEXT("members"));
		TestTrue(FString::Printf(TEXT("%s: members respect maxMembers"), *Name), Members.Num() <= FMath::Min(5, Actors));
		TestTrue(FString::Printf(TEXT("%s: membersTruncated says whether members were cut"), *Name),
			Layer->GetBoolField(TEXT("membersTruncated")) == (Actors > Members.Num()));
		const FString Type = Layer->GetStringField(TEXT("type"));
		TestTrue(FString::Printf(TEXT("%s: isRuntime agrees with its type"), *Name),
			Layer->GetBoolField(TEXT("isRuntime")) == (Type == TEXT("Runtime")));
	}
	return true;
}

#endif
