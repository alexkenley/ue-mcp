// #1057: a handler registered with a parameter spec reads exactly what it
// declares. Every declared parameter is sent under its declared name and the
// read set is compared both ways: a declared name the handler never reads is
// a parameter the surface advertises for nothing, and a name it reads that the
// spec does not declare is one the surface can never deliver.
//
// The values point at an asset that does not exist, so every handler fails at
// its first load and nothing is written. That is also why each spec'd handler
// reads all of its parameters before loading anything. A spec'd handler with
// nothing to load either only reads, or refuses these values (an unknown mode,
// a zero factor, an empty path list) before it acts; one that would act on
// them is left unspecified.
// reads all of its parameters before loading anything. An actor selector gets
// the same path, which names no actor, so nothing is spawned or edited either;
// a handler that would create or spawn before failing is left unspecified.
// The values point at an asset that does not exist, so every handler stops
// before it writes: at its first load, or at a validation these values fail
// (a zero duration, two sources where one is allowed). A handler with nothing
// to load before it creates is left unspecced rather than given a spec this
// test would run. That is also why each spec'd handler reads all of its
// parameters before loading anything.
// The values point at an asset that does not exist, so every handler that
// writes fails at its first load, or on a refused value such as limit 0 or
// step 0, before anything is written; a read-only handler may run to the end.
// That is also why each spec'd handler reads all of its parameters before
// loading or validating anything. A handler whose contract values could reach
// a write (an asset create, an ini write, a demo scene step) carries no spec.

#if WITH_DEV_AUTOMATION_TESTS

#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Handlers/AnimationHandlers.h"
#include "Handlers/AudioHandlers.h"
#include "Handlers/FabHandlers.h"
#include "Handlers/NetworkingHandlers.h"
#include "Handlers/ProjectHandlers.h"
#include "Handlers/StateTreeHandlers.h"
#include "Handlers/GameplayHandlers.h"
#include "Handlers/GasHandlers.h"
#include "Handlers/DialogHandlers.h"
#include "Handlers/EditorHandlers.h"
#include "Handlers/SequencerHandlers.h"
#include "Handlers/PCGHandlers.h"
#include "Handlers/NiagaraHandlers.h"
#include "Handlers/MaterialHandlers.h"
#include "Handlers/WidgetHandlers.h"
#include "Handlers/AssetHandlers.h"
#include "Handlers/AssetHandlers_Geometry.h"
#include "Handlers/BlueprintHandlers.h"
#include "Handlers/BlueprintHandlers_Collision.h"
#include "Handlers/ChooserHandlers.h"
#include "Handlers/DemoHandlers.h"
#include "Handlers/ReflectionHandlers.h"
#include "Handlers/FoliageHandlers.h"
#include "Misc/AutomationTest.h"

namespace MCPHandlerSpecTests
{
	const TCHAR* const MissingAsset = TEXT("/Game/UEMCP/HandlerSpecContract/NoSuchAsset");

	TSharedPtr<FJsonValue> ValueFor(EMCPParamType Type)
	{
		switch (Type)
		{
		case EMCPParamType::String:
			return MakeShared<FJsonValueString>(MissingAsset);
		case EMCPParamType::Number:
		case EMCPParamType::Integer:
			return MakeShared<FJsonValueNumber>(0.0);
		case EMCPParamType::Boolean:
			return MakeShared<FJsonValueBoolean>(false);
		case EMCPParamType::Array:
			return MakeShared<FJsonValueArray>(TArray<TSharedPtr<FJsonValue>>());
		case EMCPParamType::Vec3:
		{
			TSharedPtr<FJsonObject> Vec = MakeShared<FJsonObject>();
			Vec->SetNumberField(TEXT("x"), 0.0);
			Vec->SetNumberField(TEXT("y"), 0.0);
			Vec->SetNumberField(TEXT("z"), 0.0);
			return MakeShared<FJsonValueObject>(Vec);
		}
		case EMCPParamType::Rotator:
		{
			TSharedPtr<FJsonObject> Rot = MakeShared<FJsonObject>();
			Rot->SetNumberField(TEXT("pitch"), 0.0);
			Rot->SetNumberField(TEXT("yaw"), 0.0);
			Rot->SetNumberField(TEXT("roll"), 0.0);
			return MakeShared<FJsonValueObject>(Rot);
		}
		default:
			return MakeShared<FJsonValueObject>(MakeShared<FJsonObject>());
		}
	}

	/** Reads `assetPath` and echoes it back, so alias resolution is visible in the result. */
	TSharedPtr<FJsonValue> AliasProbe(const TSharedPtr<FJsonObject>& Params)
	{
		TSharedPtr<FJsonObject> Result = MCPSuccess();
		Result->SetStringField(TEXT("assetPath"), OptionalString(Params, TEXT("assetPath")));
		return MCPResult(Result);
	}

	TSharedPtr<FJsonObject> ObjectOf(const TSharedPtr<FJsonValue>& Value)
	{
		return Value.IsValid() && Value->Type == EJson::Object ? Value->AsObject() : nullptr;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FMCPHandlerSpecContractTest,
	"UE.MCP.Bridge.HandlerSpec.Contract",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FMCPHandlerSpecContractTest::RunTest(const FString& Parameters)
{
	using namespace MCPHandlerSpecTests;
	// Loading a path with nothing behind it logs through the editor asset library,
	// and a direct LoadObject names the missing path in its warning.
	AddExpectedError(TEXT("LoadAsset failed"), EAutomationExpectedErrorFlags::Contains, 0);
	AddExpectedError(TEXT("HandlerSpecContract/NoSuchAsset"), EAutomationExpectedErrorFlags::Contains, 0);
	FMCPHandlerRegistry Registry;
	FAnimationHandlers::RegisterHandlers(Registry);
	FAudioHandlers::RegisterHandlers(Registry);
	FNetworkingHandlers::RegisterHandlers(Registry);
	FFabHandlers::RegisterHandlers(Registry);
	FProjectHandlers::RegisterHandlers(Registry);
	FStateTreeHandlers::RegisterHandlers(Registry);
	FGameplayHandlers::RegisterHandlers(Registry);
	FGasHandlers::RegisterHandlers(Registry);
	FEditorHandlers::RegisterHandlers(Registry);
	FSequencerHandlers::RegisterHandlers(Registry);
	FDialogHandlers::RegisterHandlers(Registry);
	FPCGHandlers::RegisterHandlers(Registry);
	FNiagaraHandlers::RegisterHandlers(Registry);
	FMaterialHandlers::RegisterHandlers(Registry);
	FWidgetHandlers::RegisterHandlers(Registry);
	// asset's create actions are spec'd only where a validation the contract
	// values fail (an unresolvable class or struct, a name holding '/', an
	// invalid package name) runs before anything is created.
	FAssetHandlers::RegisterHandlers(Registry);
	FAssetGeometryHandlers::RegisterHandlers(Registry);
	FBlueprintHandlers::RegisterHandlers(Registry);
	FCollisionQueryHandlers::RegisterHandlers(Registry);
	FChooserHandlers::RegisterHandlers(Registry);
	FDemoHandlers::RegisterHandlers(Registry);
	FReflectionHandlers::RegisterHandlers(Registry);
	FFoliageHandlers::RegisterHandlers(Registry);

	const TMap<FString, FMCPHandlerSpec>& Specs = Registry.GetHandlerSpecs();
	TestTrue(TEXT("handlers register with a parameter spec"), Specs.Num() > 0);

	TArray<FString> Methods;
	Specs.GetKeys(Methods);
	Methods.Sort();
	for (const FString& Method : Methods)
	{
		const FMCPHandlerSpec& Spec = Specs.FindChecked(Method);
		const FMCPHandlerRegistry::FHandlerFunction* Handler = Registry.FindCppHandler(Method);
		if (!TestNotNull(*FString::Printf(TEXT("%s is registered"), *Method), Handler))
		{
			continue;
		}

		TestTrue(*FString::Printf(TEXT("%s: the spec validates"), *Method), FMCPHandlerRegistry::ValidateParamSpecs(Spec.Params).IsEmpty());

		TSet<FString> Declared;
		TSharedPtr<FJsonObject> Params = MakeShared<FJsonObject>();
		for (const FMCPParamSpec& Param : Spec.Params)
		{
			Declared.Add(Param.Name);
			Params->SetField(Param.Name, ValueFor(Param.Type));
		}

		TSet<FString> Read;
		{
			FMCPParamReadScope Scope(Params);
			(*Handler)(Params);
			Read = Scope.ReadKeys();
		}

		for (const FString& Name : Declared)
		{
			TestTrue(*FString::Printf(TEXT("%s reads its declared parameter '%s'"), *Method, *Name), Read.Contains(Name));
		}
		for (const FString& Name : Read)
		{
			TestTrue(*FString::Printf(TEXT("%s reads only declared parameters, not '%s'"), *Method, *Name), Declared.Contains(Name));
		}
	}
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FMCPHandlerSpecRegistrationTest,
	"UE.MCP.Bridge.HandlerSpec.Registration",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FMCPHandlerSpecRegistrationTest::RunTest(const FString& Parameters)
{
	using namespace MCPHandlerSpecTests;

	// Every routing name is refused as a parameter and as an alias.
	for (const FString& Routing : MCPRoutingParamNames())
	{
		const FMCPParamSpec AsName = MCPParam::Optional(*Routing, EMCPParamType::String, TEXT("probe"));
		TestFalse(*FString::Printf(TEXT("'%s' is refused as a name"), *Routing),
			FMCPHandlerRegistry::ValidateParamSpecs({ AsName }).IsEmpty());
		const FMCPParamSpec AsAlias = MCPParam::Optional(TEXT("probeName"), EMCPParamType::String, TEXT("probe")).Alias(*Routing);
		TestFalse(*FString::Printf(TEXT("'%s' is refused as an alias"), *Routing),
			FMCPHandlerRegistry::ValidateParamSpecs({ AsAlias }).IsEmpty());
	}
	TestFalse(TEXT("a name declared twice is refused"), FMCPHandlerRegistry::ValidateParamSpecs({
		MCPParam::Optional(TEXT("probeName"), EMCPParamType::String, TEXT("probe")),
		MCPParam::Optional(TEXT("other"), EMCPParamType::String, TEXT("probe")).Alias(TEXT("probeName")),
	}).IsEmpty());
	TestFalse(TEXT("an item type off an array is refused"), FMCPHandlerRegistry::ValidateParamSpecs({
		MCPParam::Optional(TEXT("probeName"), EMCPParamType::String, TEXT("probe")).Items(EMCPParamType::Number),
	}).IsEmpty());
	TestTrue(TEXT("an ordinary spec validates"), FMCPHandlerRegistry::ValidateParamSpecs({
		MCPParam::Required(TEXT("assetPath"), EMCPParamType::String, TEXT("probe")).Alias(TEXT("path")),
		MCPParam::Optional(TEXT("frames"), EMCPParamType::Array, TEXT("probe")).Items(EMCPParamType::Integer),
	}).IsEmpty());

	FMCPHandlerRegistry Registry;
	{
		FMCPHandlerRegistry::FCategoryScope Scope(Registry, TEXT("animation"));

		// A refused spec leaves the handler registered and unspecified.
		AddExpectedError(TEXT("Parameter spec for 'mcp_test_spec_refused' refused"), EAutomationExpectedErrorFlags::Contains, 1);
		TestFalse(TEXT("a routing-name spec is refused at registration"), Registry.RegisterHandler(
			TEXT("mcp_test_spec_refused"), &AliasProbe,
			{ MCPParam::Required(TEXT("action"), EMCPParamType::String, TEXT("probe")) }));
		TestTrue(TEXT("the refused handler is still registered"), Registry.HasHandler(TEXT("mcp_test_spec_refused")));
		TestFalse(TEXT("but carries no spec"), Registry.GetHandlerSpecs().Contains(TEXT("mcp_test_spec_refused")));

		TestTrue(TEXT("a valid spec is accepted"), Registry.RegisterHandler(
			TEXT("mcp_test_spec_alias"), &AliasProbe,
			{ MCPParam::Required(TEXT("assetPath"), EMCPParamType::String, TEXT("probe")).Alias(TEXT("path")) }));
	}

	// The alias arrives as the declared name, and is not reported as unread.
	{
		TSharedPtr<FJsonObject> Params = MakeShared<FJsonObject>();
		Params->SetStringField(TEXT("path"), TEXT("/Game/Probe"));
		const TSharedPtr<FJsonObject> Result = ObjectOf(Registry.ExecuteHandler(TEXT("mcp_test_spec_alias"), Params));
		if (TestNotNull(TEXT("the alias call answers an object"), Result.Get()))
		{
			TestEqual(TEXT("the handler read the alias under its declared name"), Result->GetStringField(TEXT("assetPath")), FString(TEXT("/Game/Probe")));
			TestFalse(TEXT("a resolved alias is not reported as unread"), Result->HasField(TEXT("paramsNotRead")));
		}
		TestTrue(TEXT("the caller's object is left as it was sent"), Params->HasField(TEXT("path")) && !Params->HasField(TEXT("assetPath")));
	}

	// Sent next to the name it stands for, the alias is not used and says so.
	{
		TSharedPtr<FJsonObject> Params = MakeShared<FJsonObject>();
		Params->SetStringField(TEXT("assetPath"), TEXT("/Game/Declared"));
		Params->SetStringField(TEXT("path"), TEXT("/Game/Alias"));
		const TSharedPtr<FJsonObject> Result = ObjectOf(Registry.ExecuteHandler(TEXT("mcp_test_spec_alias"), Params));
		if (TestNotNull(TEXT("the conflicting call answers an object"), Result.Get()))
		{
			TestEqual(TEXT("the declared name wins"), Result->GetStringField(TEXT("assetPath")), FString(TEXT("/Game/Declared")));
			const TArray<TSharedPtr<FJsonValue>>* NotRead = nullptr;
			const bool bReported = Result->TryGetArrayField(TEXT("paramsNotRead"), NotRead) && NotRead
				&& NotRead->Num() == 1 && (*NotRead)[0]->AsString() == TEXT("path");
			TestTrue(TEXT("the unused alias is reported as not read"), bReported);
		}
	}

	// The published form carries name, type, required, description and aliases.
	{
		const TSharedPtr<FJsonObject> Json = Registry.BuildHandlerSpecsJson();
		TestFalse(TEXT("a refused spec is not published"), Json->HasField(TEXT("mcp_test_spec_refused")));
		const TSharedPtr<FJsonObject>* Entry = nullptr;
		if (TestTrue(TEXT("the accepted spec is published"), Json->TryGetObjectField(TEXT("mcp_test_spec_alias"), Entry) && Entry))
		{
			TestEqual(TEXT("with its category"), (*Entry)->GetStringField(TEXT("category")), FString(TEXT("animation")));
			const TArray<TSharedPtr<FJsonValue>>* Params = nullptr;
			if (TestTrue(TEXT("and its params"), (*Entry)->TryGetArrayField(TEXT("params"), Params) && Params && Params->Num() == 1))
			{
				const TSharedPtr<FJsonObject> Param = (*Params)[0]->AsObject();
				TestEqual(TEXT("name"), Param->GetStringField(TEXT("name")), FString(TEXT("assetPath")));
				TestEqual(TEXT("type"), Param->GetStringField(TEXT("type")), FString(TEXT("string")));
				TestTrue(TEXT("required"), Param->GetBoolField(TEXT("required")));
				const TArray<TSharedPtr<FJsonValue>>* Aliases = nullptr;
				TestTrue(TEXT("aliases"), Param->TryGetArrayField(TEXT("aliases"), Aliases) && Aliases
					&& Aliases->Num() == 1 && (*Aliases)[0]->AsString() == TEXT("path"));
			}
		}
	}
	return true;
}

#endif
