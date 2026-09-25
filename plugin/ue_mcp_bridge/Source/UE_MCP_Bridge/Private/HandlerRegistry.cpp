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
	return RegisterHandler(MethodName, MoveTemp(Handler), Params, FMCPSpecRules());
}

bool FMCPHandlerRegistry::RegisterHandler(const FString& MethodName, FHandlerFunction Handler, const TArray<FMCPParamSpec>& Params, const FMCPSpecRules& Rules)
{
	RegisterHandler(MethodName, MoveTemp(Handler));
	FMCPHandlerSpec Spec;
	Spec.Params = Params;
	Spec.Choices = Rules.Choices;
	Spec.ContractExemptReason = Rules.ContractExemptReason;
	const FString Problem = ValidateHandlerSpec(Spec);
	if (!Problem.IsEmpty())
	{
		HandlerSpecs.Remove(MethodName);
		UE_LOG(LogMCPBridge, Error, TEXT("[UE-MCP] Parameter spec for '%s' refused: %s"), *MethodName, *Problem);
		return false;
	}
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
		if (Problem.IsEmpty())
		{
			Problem = ValidateValueShape(Param);
		}
		if (!Problem.IsEmpty()) return Problem;
	}
	return FString();
}

FString FMCPHandlerRegistry::ValidateHandlerSpec(const FMCPHandlerSpec& Spec)
{
	const FString ParamsProblem = ValidateParamSpecs(Spec.Params);
	if (!ParamsProblem.IsEmpty()) return ParamsProblem;

	TMap<FString, bool> RequiredByName;
	for (const FMCPParamSpec& Param : Spec.Params)
	{
		RequiredByName.Add(Param.Name, Param.bRequired);
	}

	TSet<FString> Chosen;
	for (int32 ChoiceIndex = 0; ChoiceIndex < Spec.Choices.Num(); ++ChoiceIndex)
	{
		const FMCPParamChoice& Choice = Spec.Choices[ChoiceIndex];
		if (Choice.Branches.Num() < 2)
		{
			return FString::Printf(TEXT("choice %d offers fewer than two branches"), ChoiceIndex);
		}
		for (const TArray<FString>& Branch : Choice.Branches)
		{
			if (Branch.Num() == 0)
			{
				return FString::Printf(TEXT("choice %d has an empty branch"), ChoiceIndex);
			}
			for (const FString& Name : Branch)
			{
				const bool* bRequired = RequiredByName.Find(Name);
				if (!bRequired)
				{
					return FString::Printf(TEXT("choice %d names '%s', which is not a declared parameter"), ChoiceIndex, *Name);
				}
				if (*bRequired)
				{
					return FString::Printf(TEXT("'%s' is required and also a side of choice %d; the choice is what is required"), *Name, ChoiceIndex);
				}
				if (Chosen.Contains(Name))
				{
					return FString::Printf(TEXT("'%s' appears in more than one branch or choice"), *Name);
				}
				Chosen.Add(Name);
			}
		}
	}

	if (!Spec.ContractExemptReason.IsEmpty() && Spec.ContractExemptReason.TrimStartAndEnd().IsEmpty())
	{
		return TEXT("a contract exemption needs a reason");
	}
	return FString();
}

FString FMCPHandlerRegistry::ValidateValueShape(const FMCPParamSpec& Param)
{
	for (int32 Index = 0; Index < Param.OrTypes.Num(); ++Index)
	{
		const EMCPParamType OrType = Param.OrTypes[Index];
		if (OrType == EMCPParamType::Any || Param.Type == EMCPParamType::Any)
		{
			return FString::Printf(TEXT("'%s' is a union with any, which already accepts everything"), *Param.Name);
		}
		if (OrType == EMCPParamType::Array)
		{
			return FString::Printf(TEXT("'%s' lists array as an alternative type; declare the array as the parameter's own type"), *Param.Name);
		}
		if (OrType == Param.Type)
		{
			return FString::Printf(TEXT("'%s' lists its own type as an alternative"), *Param.Name);
		}
		for (int32 Other = 0; Other < Index; ++Other)
		{
			if (Param.OrTypes[Other] == OrType)
			{
				return FString::Printf(TEXT("'%s' lists an alternative type twice"), *Param.Name);
			}
		}
	}

	if (Param.LiteralValue.IsValid())
	{
		const EJson Kind = Param.LiteralValue->Type;
		const bool bFits =
			(Param.Type == EMCPParamType::Boolean && Kind == EJson::Boolean)
			|| (Param.Type == EMCPParamType::String && Kind == EJson::String)
			|| ((Param.Type == EMCPParamType::Number || Param.Type == EMCPParamType::Integer) && Kind == EJson::Number);
		if (!bFits)
		{
			return FString::Printf(TEXT("'%s' declares a literal that is not a value of its type"), *Param.Name);
		}
		if (Param.OrTypes.Num() > 0)
		{
			return FString::Printf(TEXT("'%s' is both a literal and a union"), *Param.Name);
		}
	}

	if (Param.Fields.Num() > 0)
	{
		const bool bObject = Param.Type == EMCPParamType::Object
			|| (Param.Type == EMCPParamType::Array && Param.ItemType == EMCPParamType::Object);
		if (!bObject)
		{
			return FString::Printf(TEXT("'%s' declares fields but is neither an object nor an array of objects"), *Param.Name);
		}
		TSet<FString> FieldNames;
		for (const FMCPParamField& Field : Param.Fields)
		{
			if (Field.Name.IsEmpty() || FieldNames.Contains(Field.Name))
			{
				return FString::Printf(TEXT("'%s' declares a field twice, or one with no name ('%s')"), *Param.Name, *Field.Name);
			}
			FieldNames.Add(Field.Name);
			if (Field.Type != EMCPParamType::Array && Field.ItemType != EMCPParamType::Any)
			{
				return FString::Printf(TEXT("'%s.%s' declares an item type but is not an array"), *Param.Name, *Field.Name);
			}
		}
	}
	return FString();
}

const TCHAR* FMCPHandlerRegistry::ChoiceModeName(EMCPChoiceMode Mode)
{
	return Mode == EMCPChoiceMode::AtLeastOne ? TEXT("atLeastOne") : TEXT("exactlyOne");
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
	case EMCPParamType::Color:   return TEXT("color");
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
			// Written only when set, so a spec that uses none of them publishes
			// exactly what it did before they existed.
			if (Param.bNullable)
			{
				Entry->SetBoolField(TEXT("nullable"), true);
			}
			if (Param.OrTypes.Num() > 0)
			{
				TArray<FString> OrNames;
				for (const EMCPParamType OrType : Param.OrTypes)
				{
					OrNames.Add(ParamTypeName(OrType));
				}
				Entry->SetArrayField(TEXT("orTypes"), MCPStringListToJson(OrNames));
			}
			if (Param.LiteralValue.IsValid())
			{
				Entry->SetField(TEXT("literal"), Param.LiteralValue);
			}
			if (Param.Fields.Num() > 0)
			{
				TArray<TSharedPtr<FJsonValue>> FieldValues;
				for (const FMCPParamField& Field : Param.Fields)
				{
					TSharedPtr<FJsonObject> FieldEntry = MakeShared<FJsonObject>();
					FieldEntry->SetStringField(TEXT("name"), Field.Name);
					FieldEntry->SetStringField(TEXT("type"), ParamTypeName(Field.Type));
					FieldEntry->SetBoolField(TEXT("required"), Field.bRequired);
					FieldEntry->SetStringField(TEXT("description"), Field.Description);
					if (Field.Type == EMCPParamType::Array && Field.ItemType != EMCPParamType::Any)
					{
						FieldEntry->SetStringField(TEXT("items"), ParamTypeName(Field.ItemType));
					}
					FieldValues.Add(MakeShared<FJsonValueObject>(FieldEntry));
				}
				Entry->SetArrayField(TEXT("fields"), FieldValues);
			}
			ParamValues.Add(MakeShared<FJsonValueObject>(Entry));
		}

		TSharedPtr<FJsonObject> MethodEntry = MakeShared<FJsonObject>();
		if (const FString* Category = HandlerCategories.Find(Method))
		{
			MethodEntry->SetStringField(TEXT("category"), *Category);
		}
		MethodEntry->SetArrayField(TEXT("params"), ParamValues);
		if (Spec.Choices.Num() > 0)
		{
			TArray<TSharedPtr<FJsonValue>> ChoiceValues;
			for (const FMCPParamChoice& Choice : Spec.Choices)
			{
				TArray<TSharedPtr<FJsonValue>> BranchValues;
				for (const TArray<FString>& Branch : Choice.Branches)
				{
					BranchValues.Add(MakeShared<FJsonValueArray>(MCPStringListToJson(Branch)));
				}
				TSharedPtr<FJsonObject> ChoiceEntry = MakeShared<FJsonObject>();
				ChoiceEntry->SetStringField(TEXT("mode"), ChoiceModeName(Choice.Mode));
				ChoiceEntry->SetArrayField(TEXT("branches"), BranchValues);
				ChoiceValues.Add(MakeShared<FJsonValueObject>(ChoiceEntry));
			}
			MethodEntry->SetArrayField(TEXT("choices"), ChoiceValues);
		}
		if (!Spec.ContractExemptReason.IsEmpty())
		{
			MethodEntry->SetStringField(TEXT("contractExempt"), Spec.ContractExemptReason);
		}
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

bool FMCPHandlerRegistry::RegisterHandlerWithTimeout(const FString& MethodName, FHandlerFunction Handler, float TimeoutSeconds, const TArray<FMCPParamSpec>& Params)
{
	return RegisterHandlerWithTimeout(MethodName, MoveTemp(Handler), TimeoutSeconds, Params, FMCPSpecRules());
}

bool FMCPHandlerRegistry::RegisterHandlerWithTimeout(const FString& MethodName, FHandlerFunction Handler, float TimeoutSeconds, const TArray<FMCPParamSpec>& Params, const FMCPSpecRules& Rules)
{
	const bool bAccepted = RegisterHandler(MethodName, MoveTemp(Handler), Params, Rules);
	if (TimeoutSeconds > 0.0f)
	{
		HandlerTimeouts.Add(MethodName, TimeoutSeconds);
	}
	return bAccepted;
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
