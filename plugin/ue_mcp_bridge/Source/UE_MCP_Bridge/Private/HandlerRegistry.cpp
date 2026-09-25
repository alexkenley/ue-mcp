#include "HandlerRegistry.h"
#include "HAL/PlatformFileManager.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HandlerUtils.h"
#include "MCPHandlerRegistration.h"
#include "UE_MCP_BridgeModule.h"

FMCPHandlerRegistry::FMCPHandlerRegistry()
{
}

FMCPHandlerRegistry::~FMCPHandlerRegistry()
{
	Clear();
}

bool FMCPHandlerRegistry::ReportsUnreadParams(const FString& Category)
{
	// A category joins once scripts/audit-direct-param-reads.mjs lists no
	// direct reads in its handlers, since those are invisible to the tracking.
	static const TCHAR* const Reporting[] = { TEXT("animation"), TEXT("asset"), TEXT("audio"), TEXT("blueprint"), TEXT("chooser"), TEXT("demo"), TEXT("dialog"), TEXT("diff"), TEXT("editor"), TEXT("epic"), TEXT("fab"), TEXT("foliage"), TEXT("gameplay"), TEXT("gas"), TEXT("landscape"), TEXT("level"), TEXT("lock"), TEXT("mass"), TEXT("material"), TEXT("networking"), TEXT("niagara"), TEXT("pcg"), TEXT("physics"), TEXT("project"), TEXT("reflection"), TEXT("sequencer"), TEXT("skeletalmesh"), TEXT("spline"), TEXT("statetree"), TEXT("widget") };
	for (const TCHAR* Name : Reporting)
	{
		if (Category == Name) return true;
	}
	return false;
}

void FMCPHandlerRegistry::TagCategory(const FString& MethodName)
{
	if (RegistrationCategory.IsEmpty())
	{
		HandlerCategories.Remove(MethodName);
	}
	else
	{
		HandlerCategories.Add(MethodName, RegistrationCategory);
	}
}

void FMCPHandlerRegistry::RegisterHandler(const FString& MethodName, FHandlerFunction Handler)
{
	CppHandlers.Add(MethodName, Handler);
	TagCategory(MethodName);
	HandlerSpecs.Remove(MethodName);
}

bool FMCPHandlerRegistry::RegisterHandler(const FString& MethodName, FHandlerFunction Handler, const TArray<FMCPParamSpec>& Params)
{
	RegisterHandler(MethodName, MoveTemp(Handler));
	const FString Problem = ValidateParamSpecs(Params);
	if (!Problem.IsEmpty())
	{
		HandlerSpecs.Remove(MethodName);
		UE_LOG(LogMCPBridge, Error, TEXT("[UE-MCP] Parameter spec for '%s' refused: %s"), *MethodName, *Problem);
		return false;
	}
	FMCPHandlerSpec Spec;
	Spec.Params = Params;
	HandlerSpecs.Add(MethodName, MoveTemp(Spec));
	return true;
}

FString FMCPHandlerRegistry::ValidateParamSpecs(const TArray<FMCPParamSpec>& Params)
{
	auto IsIdentifier = [](const FString& Name)
	{
		if (Name.IsEmpty() || FChar::IsDigit(Name[0])) return false;
		for (const TCHAR C : Name)
		{
			if (!FChar::IsAlnum(C) && C != TEXT('_')) return false;
		}
		return true;
	};

	TSet<FString> Seen;
	auto Claim = [&](const FString& Name, const FString& Owner) -> FString
	{
		if (!IsIdentifier(Name))
		{
			return FString::Printf(TEXT("'%s' (on '%s') is not an identifier"), *Name, *Owner);
		}
		if (MCPRoutingParamNames().Contains(Name))
		{
			return FString::Printf(TEXT("'%s' (on '%s') is a routing name the dispatcher consumes before any handler runs"), *Name, *Owner);
		}
		if (Seen.Contains(Name))
		{
			return FString::Printf(TEXT("'%s' (on '%s') is declared twice"), *Name, *Owner);
		}
		Seen.Add(Name);
		return FString();
	};

	for (const FMCPParamSpec& Param : Params)
	{
		FString Problem = Claim(Param.Name, Param.Name);
		for (int32 Index = 0; Problem.IsEmpty() && Index < Param.Aliases.Num(); ++Index)
		{
			Problem = Claim(Param.Aliases[Index], Param.Name);
		}
		if (Problem.IsEmpty() && Param.Type != EMCPParamType::Array && Param.ItemType != EMCPParamType::Any)
		{
			Problem = FString::Printf(TEXT("'%s' declares an item type but is not an array"), *Param.Name);
		}
		if (!Problem.IsEmpty()) return Problem;
	}
	return FString();
}

const TCHAR* FMCPHandlerRegistry::ParamTypeName(EMCPParamType Type)
{
	switch (Type)
	{
	case EMCPParamType::String:  return TEXT("string");
	case EMCPParamType::Number:  return TEXT("number");
	case EMCPParamType::Integer: return TEXT("integer");
	case EMCPParamType::Boolean: return TEXT("boolean");
	case EMCPParamType::Object:  return TEXT("object");
	case EMCPParamType::Array:   return TEXT("array");
	case EMCPParamType::Vec3:    return TEXT("vec3");
	case EMCPParamType::Rotator: return TEXT("rotator");
	default:                     return TEXT("any");
	}
}

TSharedPtr<FJsonObject> FMCPHandlerRegistry::BuildHandlerSpecsJson() const
{
	TArray<FString> Methods;
	HandlerSpecs.GetKeys(Methods);
	Methods.Sort();

	TSharedPtr<FJsonObject> Out = MakeShared<FJsonObject>();
	for (const FString& Method : Methods)
	{
		const FMCPHandlerSpec& Spec = HandlerSpecs.FindChecked(Method);
		TArray<TSharedPtr<FJsonValue>> ParamValues;
		for (const FMCPParamSpec& Param : Spec.Params)
		{
			TSharedPtr<FJsonObject> Entry = MakeShared<FJsonObject>();
			Entry->SetStringField(TEXT("name"), Param.Name);
			Entry->SetStringField(TEXT("type"), ParamTypeName(Param.Type));
			Entry->SetBoolField(TEXT("required"), Param.bRequired);
			Entry->SetStringField(TEXT("description"), Param.Description);
			if (Param.Aliases.Num() > 0)
			{
				Entry->SetArrayField(TEXT("aliases"), MCPStringListToJson(Param.Aliases));
			}
			if (Param.Type == EMCPParamType::Array && Param.ItemType != EMCPParamType::Any)
			{
				Entry->SetStringField(TEXT("items"), ParamTypeName(Param.ItemType));
			}
			ParamValues.Add(MakeShared<FJsonValueObject>(Entry));
		}

		TSharedPtr<FJsonObject> MethodEntry = MakeShared<FJsonObject>();
		if (const FString* Category = HandlerCategories.Find(Method))
		{
			MethodEntry->SetStringField(TEXT("category"), *Category);
		}
		MethodEntry->SetArrayField(TEXT("params"), ParamValues);
		Out->SetObjectField(Method, MethodEntry);
	}
	return Out;
}

TSharedPtr<FJsonObject> FMCPHandlerRegistry::ResolveParamAliases(const FMCPHandlerSpec& Spec, const TSharedPtr<FJsonObject>& Params)
{
	if (!Params.IsValid()) return Params;

	TSharedPtr<FJsonObject> Resolved;
	for (const FMCPParamSpec& Param : Spec.Params)
	{
		if (Param.Aliases.Num() == 0 || Params->HasField(Param.Name)) continue;
		for (const FString& Alias : Param.Aliases)
		{
			const TSharedPtr<FJsonValue> Value = Params->TryGetField(Alias);
			if (!Value.IsValid()) continue;
			if (!Resolved.IsValid())
			{
				// Copied rather than edited: the caller's object is also what the
				// parameter echo recorded.
				Resolved = MakeShared<FJsonObject>();
				for (const auto& JsonEntry : Params->Values)
				{
					const TPair<FString, TSharedPtr<FJsonValue>> Pair(JsonEntry.Key, JsonEntry.Value);
					Resolved->SetField(Pair.Key, Pair.Value);
				}
			}
			Resolved->RemoveField(Alias);
			Resolved->SetField(Param.Name, Value);
			break;
		}
	}
	return Resolved.IsValid() ? Resolved : Params;
}

void FMCPHandlerRegistry::RegisterHandlerWithTimeout(const FString& MethodName, FHandlerFunction Handler, float TimeoutSeconds)
{
	CppHandlers.Add(MethodName, Handler);
	TagCategory(MethodName);
	if (TimeoutSeconds > 0.0f)
	{
		HandlerTimeouts.Add(MethodName, TimeoutSeconds);
	}
}

float FMCPHandlerRegistry::GetHandlerTimeout(const FString& MethodName) const
{
	if (const float* V = HandlerTimeouts.Find(MethodName))
	{
		return *V;
	}
	// External (plugin-contributed) handlers may register their own timeout.
	UEMCP::FExternalHandlerFn Unused;
	float ExternalTimeout = 0.0f;
	if (UEMCP::LookupExternalHandler(MethodName, Unused, ExternalTimeout) && ExternalTimeout > 0.0f)
	{
		return ExternalTimeout;
	}
	return 0.0f;
}

void FMCPHandlerRegistry::RegisterPythonHandler(const FString& MethodName, const FString& PythonScriptPath)
{
	FPythonHandlerInfo Info;
	Info.ScriptPath = PythonScriptPath;
	Info.HandlerName = MethodName;
	PythonHandlers.Add(MethodName, Info);
}

TSharedPtr<FJsonValue> FMCPHandlerRegistry::ExecuteHandler(const FString& MethodName, const TSharedPtr<FJsonObject>& Params)
{
	// Try C++ handler first
	if (const FHandlerFunction* Handler = CppHandlers.Find(MethodName))
	{
		// #1057: a spec'd handler reads its parameters by their declared names only.
		const FMCPHandlerSpec* Spec = HandlerSpecs.Find(MethodName);
		const TSharedPtr<FJsonObject> Effective = Spec ? ResolveParamAliases(*Spec, Params) : Params;

		const FString* Category = HandlerCategories.Find(MethodName);
		if (!Category || !ReportsUnreadParams(*Category) || !Effective.IsValid())
		{
			return (*Handler)(Effective);
		}
		// #1057: a key the handler never read had no effect, so say so.
		FMCPParamReadScope ReadScope(Effective);
		TSharedPtr<FJsonValue> Result = (*Handler)(Effective);
		MCPAttachParamsNotRead(Result, ReadScope.Unread());
		return Result;
	}

	// Try Python handler
	if (PythonHandlers.Contains(MethodName))
	{
		return ExecutePythonHandler(MethodName, Params);
	}

	// Plugin-contributed external handler (registered via UEMCP::RegisterExternalHandler).
	{
		UEMCP::FExternalHandlerFn External;
		float Unused = 0.0f;
		if (UEMCP::LookupExternalHandler(MethodName, External, Unused))
		{
			return External(Params);
		}
	}

	// Handler not found - return nullptr so BridgeServer sends "Unknown method" error
	return nullptr;
}

bool FMCPHandlerRegistry::HasHandler(const FString& MethodName) const
{
	if (CppHandlers.Contains(MethodName) || PythonHandlers.Contains(MethodName))
	{
		return true;
	}
	UEMCP::FExternalHandlerFn Unused;
	float UnusedTimeout = 0.0f;
	return UEMCP::LookupExternalHandler(MethodName, Unused, UnusedTimeout);
}

TArray<FString> FMCPHandlerRegistry::GetHandlerNames() const
{
	TArray<FString> Names;
	CppHandlers.GetKeys(Names);

	TArray<FString> PythonNames;
	PythonHandlers.GetKeys(PythonNames);
	Names.Append(PythonNames);

	Names.Append(UEMCP::GetExternalHandlerNames());

	return Names;
}

void FMCPHandlerRegistry::Clear()
{
	CppHandlers.Empty();
	PythonHandlers.Empty();
	HandlerTimeouts.Empty();
	HandlerCategories.Empty();
	HandlerSpecs.Empty();
}

TSharedPtr<FJsonValue> FMCPHandlerRegistry::ExecutePythonHandler(const FString& MethodName, const TSharedPtr<FJsonObject>& /*Params*/)
{
	// Python handler dispatch is not implemented. Prior behaviour returned an
	// empty JSON object, which callers could not distinguish from a real
	// empty-success result. Return a typed error instead so callers see the
	// gap clearly; use `execute_python` for ad-hoc Python until the dispatch
	// pipeline lands.
	TSharedPtr<FJsonObject> Err = MakeShared<FJsonObject>();
	Err->SetBoolField(TEXT("success"), false);
	Err->SetStringField(TEXT("error"), FString::Printf(
		TEXT("Python handler '%s' is registered but Python dispatch is not implemented. Use the 'execute_python' action instead."),
		*MethodName));
	return MakeShared<FJsonValueObject>(Err);
}
