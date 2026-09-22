// Coverage for #1088: native USTRUCTs are registered without the leading F, so
// FTableRowBase and /Script/Engine.FTableRowBase must resolve the same object
// as TableRowBase. MCPResolveScriptStruct is the shared lookup; reflect_struct
// and create_datatable are the two handlers that call it.
//
// run_automation_tests dispatches every EditorContext/EngineFilter test against
// whatever project the bridge is attached to. The DataTable create goes onto a
// private mount in the system temp area and is deleted before the mount comes
// down, so nothing here can reach a user's content.

#if WITH_DEV_AUTOMATION_TESTS

#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Handlers/AssetHandlers.h"
#include "Handlers/ReflectionHandlers.h"

#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Engine/DataTable.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformProcess.h"
#include "Misc/AutomationTest.h"
#include "Misc/Guid.h"
#include "Misc/PackageName.h"
#include "Misc/Paths.h"
#include "UObject/Package.h"

namespace MCPNativeStructPrefixTests
{
	struct FScopedNativeStructPrefixMount
	{
		FString RootPath;
		FString ContentPath;

		FScopedNativeStructPrefixMount()
			: RootPath(TEXT("/UEMCPNativeStructPrefix_") + FGuid::NewGuid().ToString(EGuidFormats::Digits) + TEXT("/"))
			, ContentPath(FPaths::Combine(
				FPaths::ConvertRelativePathToFull(FString(FPlatformProcess::UserTempDir())),
				FString(TEXT("UEMCPNativeStructPrefixTest")),
				FGuid::NewGuid().ToString(EGuidFormats::Digits)))
		{
			IFileManager::Get().MakeDirectory(*ContentPath, /*Tree=*/true);
			FPackageName::RegisterMountPoint(RootPath, ContentPath);
		}

		~FScopedNativeStructPrefixMount()
		{
			FPackageName::UnRegisterMountPoint(RootPath, ContentPath);
			IFileManager::Get().DeleteDirectory(*ContentPath, /*RequireExists=*/false, /*Tree=*/true);
		}

		FScopedNativeStructPrefixMount(const FScopedNativeStructPrefixMount&) = delete;
		FScopedNativeStructPrefixMount& operator=(const FScopedNativeStructPrefixMount&) = delete;
	};

	TSharedPtr<FJsonObject> StructPrefixResponseObject(const TSharedPtr<FJsonValue>& Response)
	{
		return (Response.IsValid() && Response->Type == EJson::Object)
			? Response->AsObject()
			: TSharedPtr<FJsonObject>();
	}

	FString StructPrefixResponseString(const TSharedPtr<FJsonValue>& Response, const TCHAR* Field)
	{
		const TSharedPtr<FJsonObject> Obj = StructPrefixResponseObject(Response);
		if (!Obj.IsValid()) return FString();
		FString Value;
		Obj->TryGetStringField(Field, Value);
		return Value;
	}

	bool StructPrefixResponseSucceeded(const TSharedPtr<FJsonValue>& Response)
	{
		const TSharedPtr<FJsonObject> Obj = StructPrefixResponseObject(Response);
		bool bSuccess = false;
		return Obj.IsValid() && Obj->TryGetBoolField(TEXT("success"), bSuccess) && bSuccess;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
	FMCPNativeStructFPrefixTest,
	"UE.MCP.Reflection.Struct.NativeFPrefix",
	EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FMCPNativeStructFPrefixTest::RunTest(const FString& Parameters)
{
	using namespace MCPNativeStructPrefixTests;
	UScriptStruct* const TableRow = FTableRowBase::StaticStruct();
	UScriptStruct* const VectorStruct = TBaseStructure<FVector>::Get();
	if (!TestNotNull(TEXT("FTableRowBase::StaticStruct is available"), TableRow)) return false;
	if (!TestNotNull(TEXT("FVector StaticStruct is available"), VectorStruct)) return false;

	TestEqual(TEXT("the native row struct is registered without the F"),
		TableRow->GetName(), FString(TEXT("TableRowBase")));

	const FString QualifiedNative = TableRow->GetPathName();
	const FString QualifiedFPrefixed = [&QualifiedNative]()
	{
		FString PackagePart, ObjectPart;
		if (QualifiedNative.Split(TEXT("."), &PackagePart, &ObjectPart, ESearchCase::CaseSensitive, ESearchDir::FromEnd))
		{
			return PackagePart + TEXT(".F") + ObjectPart;
		}
		return FString(TEXT("/Script/Engine.FTableRowBase"));
	}();

	// Shared resolver: short names, qualified paths, and literal precedence.
	TestTrue(TEXT("TableRowBase resolves by exact short name"),
		MCPResolveScriptStruct(TEXT("TableRowBase")) == TableRow);
	TestTrue(TEXT("FTableRowBase strips one leading F"),
		MCPResolveScriptStruct(TEXT("FTableRowBase")) == TableRow);
	TestTrue(TEXT("the native /Script path resolves as written"),
		MCPResolveScriptStruct(QualifiedNative) == TableRow);
	TestTrue(TEXT("an F-prefixed /Script leaf keeps the module qualification"),
		MCPResolveScriptStruct(QualifiedFPrefixed) == TableRow);
	TestNull(TEXT("a qualified miss does not fall back to another module"),
		MCPResolveScriptStruct(TEXT("/Script/NoSuchModule1088.FTableRowBase")));
	const FString LiteralName = TEXT("FPrefixProbe_") + FGuid::NewGuid().ToString(EGuidFormats::Digits);
	UScriptStruct* Literal = NewObject<UScriptStruct>(GetTransientPackage(), FName(*LiteralName), RF_Transient);
	NewObject<UScriptStruct>(GetTransientPackage(), FName(*LiteralName.RightChop(1)), RF_Transient);
	TestTrue(TEXT("an existing F-prefixed name wins over its stripped counterpart"),
		MCPResolveScriptStruct(LiteralName) == Literal);

	TestTrue(TEXT("Vector wins by exact name before any F is added"),
		MCPResolveScriptStruct(TEXT("Vector")) == VectorStruct);
	TestTrue(TEXT("FVector strips to Vector"),
		MCPResolveScriptStruct(TEXT("FVector")) == VectorStruct);

	TestTrue(TEXT("a double F prefix is not stripped twice"),
		MCPResolveScriptStruct(TEXT("FFTableRowBase")) == nullptr);
	TestTrue(TEXT("an unknown native name stays a miss"),
		MCPResolveScriptStruct(TEXT("FNoSuchNativeStruct1088")) == nullptr);

	FMCPHandlerRegistry ReflectionRegistry;
	FReflectionHandlers::RegisterHandlers(ReflectionRegistry);
	if (!TestTrue(TEXT("reflect_struct is registered"), ReflectionRegistry.HasHandler(TEXT("reflect_struct"))))
	{
		return false;
	}

	auto Reflect = [&](const TCHAR* StructName) -> TSharedPtr<FJsonValue>
	{
		TSharedPtr<FJsonObject> Params = MakeShared<FJsonObject>();
		Params->SetStringField(TEXT("structName"), StructName);
		return ReflectionRegistry.ExecuteHandler(TEXT("reflect_struct"), Params);
	};

	const TSharedPtr<FJsonValue> ReflectF = Reflect(TEXT("FTableRowBase"));
	TestTrue(TEXT("reflect_struct accepts FTableRowBase"), StructPrefixResponseSucceeded(ReflectF));
	TestEqual(TEXT("and reports the registered name"),
		StructPrefixResponseString(ReflectF, TEXT("structName")), FString(TEXT("TableRowBase")));

	const TSharedPtr<FJsonValue> ReflectQualified = Reflect(*QualifiedFPrefixed);
	TestTrue(TEXT("reflect_struct accepts /Script/Engine.FTableRowBase"), StructPrefixResponseSucceeded(ReflectQualified));
	TestEqual(TEXT("and still reports TableRowBase"),
		StructPrefixResponseString(ReflectQualified, TEXT("structName")), FString(TEXT("TableRowBase")));

	const TSharedPtr<FJsonValue> ReflectExact = Reflect(TEXT("TableRowBase"));
	TestTrue(TEXT("reflect_struct still accepts the unprefixed name"), StructPrefixResponseSucceeded(ReflectExact));

	const TSharedPtr<FJsonValue> ReflectMiss = Reflect(TEXT("FNoSuchNativeStruct1088"));
	TestFalse(TEXT("reflect_struct still misses an unknown name"), StructPrefixResponseSucceeded(ReflectMiss));
	TestTrue(TEXT("and the error names the requested struct"),
		StructPrefixResponseString(ReflectMiss, TEXT("error")).Contains(TEXT("FNoSuchNativeStruct1088")));

	const FScopedNativeStructPrefixMount Mount;
	FMCPHandlerRegistry AssetRegistry;
	FAssetHandlers::RegisterHandlers(AssetRegistry);
	if (!TestTrue(TEXT("create_datatable is registered"), AssetRegistry.HasHandler(TEXT("create_datatable"))))
	{
		return false;
	}

	for (const FString& RowName : { FString(TEXT("FTableRowBase")), QualifiedFPrefixed })
	{
		const FString TableName = FString::Printf(TEXT("DT_UEMCP_FPrefix_%s"), *FGuid::NewGuid().ToString(EGuidFormats::Digits));
		FString CreatedPath;

		{
			TSharedPtr<FJsonObject> Params = MakeShared<FJsonObject>();
			Params->SetStringField(TEXT("name"), TableName);
			Params->SetStringField(TEXT("rowStruct"), RowName);
			Params->SetStringField(TEXT("packagePath"), Mount.RootPath.LeftChop(1));
			Params->SetStringField(TEXT("onConflict"), TEXT("error"));

			const TSharedPtr<FJsonValue> Created = AssetRegistry.ExecuteHandler(TEXT("create_datatable"), Params);
			if (!TestTrue(
					FString::Printf(TEXT("create_datatable accepts FTableRowBase (%s)"), *StructPrefixResponseString(Created, TEXT("error"))),
					StructPrefixResponseSucceeded(Created)))
			{
				return false;
			}
			TestEqual(TEXT("and stores the registered row struct name"),
				StructPrefixResponseString(Created, TEXT("rowStruct")), FString(TEXT("TableRowBase")));
			CreatedPath = StructPrefixResponseString(Created, TEXT("assetPath"));
			if (CreatedPath.IsEmpty()) CreatedPath = StructPrefixResponseString(Created, TEXT("path"));
		}

		if (!CreatedPath.IsEmpty() && AssetRegistry.HasHandler(TEXT("delete_asset")))
		{
			TSharedPtr<FJsonObject> DeleteParams = MakeShared<FJsonObject>();
			DeleteParams->SetStringField(TEXT("assetPath"), CreatedPath);
			DeleteParams->SetBoolField(TEXT("force"), true);
			TestTrue(TEXT("created DataTable is deleted"), StructPrefixResponseSucceeded(AssetRegistry.ExecuteHandler(TEXT("delete_asset"), DeleteParams)));
		}
	}

	return true;
}

#endif // WITH_DEV_AUTOMATION_TESTS
