// Engine-free coverage for reflection actions that must refuse before they
// touch the project: nothing here writes an ini or loads content.

#if WITH_DEV_AUTOMATION_TESTS

#include "HandlerRegistry.h"
#include "Handlers/ReflectionHandlers.h"

#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FReflectionCreateTagRefusesInvalidTest,
	"UE.MCP.Reflection.CreateTag.RefusesInvalidTagBeforeWriting",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FReflectionCreateTagRefusesInvalidTest::RunTest(const FString& Parameters)
{
	FMCPHandlerRegistry Registry;
	FReflectionHandlers::RegisterHandlers(Registry);

	// #1106: an invalid tag string is refused up front with the manager's
	// reason, rather than written to the ini and failing later.
	TSharedPtr<FJsonObject> Params = MakeShared<FJsonObject>();
	Params->SetStringField(TEXT("tag"), TEXT(".UEMCP Invalid Tag."));
	const TSharedPtr<FJsonValue> Response = Registry.ExecuteHandler(TEXT("create_gameplay_tag"), Params);
	if (TestTrue(TEXT("create_gameplay_tag returns an object"), Response.IsValid() && Response->Type == EJson::Object))
	{
		const TSharedPtr<FJsonObject> Object = Response->AsObject();
		TestFalse(TEXT("an invalid tag is refused"), Object->GetBoolField(TEXT("success")));
		TestTrue(TEXT("the refusal says the tag is invalid"),
			Object->GetStringField(TEXT("error")).Contains(TEXT("not a valid gameplay tag")));
	}

	return true;
}

#endif
