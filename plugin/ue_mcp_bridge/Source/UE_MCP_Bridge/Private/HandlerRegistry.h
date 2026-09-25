#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonValue.h"
#include "Dom/JsonObject.h"

// ── Parameter specs (#1057) ──────────────────────────────────────────────────
//
// A handler registered with a spec declares its parameter contract once, here
// in C++. The registry publishes it in get_bridge_capabilities, resolves its
// aliases before the handler runs, and the TS surface for the action is
// generated from a recording of it (tests/golden/handler-specs.json).

/** Wire type of one parameter. Published as the lowercase name MCPParamTypeName returns. */
enum class EMCPParamType : uint8
{
	String,
	Number,
	Integer,
	Boolean,
	Object,
	Array,
	Vec3,
	Rotator,
	Any,
};

/** One declared parameter of a handler. */
struct FMCPParamSpec
{
	FString Name;
	EMCPParamType Type = EMCPParamType::String;
	bool bRequired = false;
	FString Description;
	/** Other names a caller may send it under. The registry renames them to Name before dispatch. */
	TArray<FString> Aliases;
	/** Element type of an Array parameter. Any on every other type. */
	EMCPParamType ItemType = EMCPParamType::Any;

	FMCPParamSpec Alias(const TCHAR* InAlias) const
	{
		FMCPParamSpec Copy = *this;
		Copy.Aliases.Add(InAlias);
		return Copy;
	}

	FMCPParamSpec Items(EMCPParamType InItemType) const
	{
		FMCPParamSpec Copy = *this;
		Copy.ItemType = InItemType;
		return Copy;
	}
};

namespace MCPParam
{
	inline FMCPParamSpec Required(const TCHAR* Name, EMCPParamType Type, const TCHAR* Description)
	{
		FMCPParamSpec Spec;
		Spec.Name = Name;
		Spec.Type = Type;
		Spec.bRequired = true;
		Spec.Description = Description;
		return Spec;
	}

	inline FMCPParamSpec Optional(const TCHAR* Name, EMCPParamType Type, const TCHAR* Description)
	{
		FMCPParamSpec Spec = Required(Name, Type, Description);
		Spec.bRequired = false;
		return Spec;
	}
}

/** A handler's declared parameters. Present, even when empty, only for a handler registered with one. */
struct FMCPHandlerSpec
{
	TArray<FMCPParamSpec> Params;
};

class FMCPHandlerRegistry
{
public:
	// Handler function signature: takes params JSON object, returns result JSON value
	using FHandlerFunction = TFunction<TSharedPtr<FJsonValue>(const TSharedPtr<FJsonObject>& Params)>;

	// Python handler info
	struct FPythonHandlerInfo
	{
		FString ScriptPath;
		FString HandlerName;
	};

	FMCPHandlerRegistry();
	~FMCPHandlerRegistry();

	// #1057: handlers registered while this is alive are tagged with Category.
	class FCategoryScope
	{
	public:
		FCategoryScope(FMCPHandlerRegistry& InRegistry, const FString& Category)
			: Registry(InRegistry)
			, Previous(InRegistry.RegistrationCategory)
		{
			Registry.RegistrationCategory = Category;
		}
		~FCategoryScope()
		{
			Registry.RegistrationCategory = Previous;
		}
		FCategoryScope(const FCategoryScope&) = delete;
		FCategoryScope& operator=(const FCategoryScope&) = delete;
	private:
		FMCPHandlerRegistry& Registry;
		FString Previous;
	};

	// Categories whose handlers report the parameters they never read (#1057).
	static bool ReportsUnreadParams(const FString& Category);

	// Register a C++ handler
	void RegisterHandler(const FString& MethodName, FHandlerFunction Handler);

	// Register a C++ handler together with its parameter spec (#1057). The
	// handler is registered either way; a spec that fails ValidateParamSpecs is
	// logged and dropped, and the call returns false.
	bool RegisterHandler(const FString& MethodName, FHandlerFunction Handler, const TArray<FMCPParamSpec>& Params);

	// Why a spec cannot be published, or empty when it can. Refuses the
	// dispatcher's routing names, duplicates across names and aliases, and an
	// item type on anything but an array.
	static FString ValidateParamSpecs(const TArray<FMCPParamSpec>& Params);

	// Lowercase wire name of a parameter type.
	static const TCHAR* ParamTypeName(EMCPParamType Type);

	// Specs of every handler registered with one, keyed by method name.
	const TMap<FString, FMCPHandlerSpec>& GetHandlerSpecs() const { return HandlerSpecs; }

	// { method: { category?, params: [...] } } for the capabilities payload.
	TSharedPtr<FJsonObject> BuildHandlerSpecsJson() const;

	// Params with every declared alias renamed to its parameter's name. Returns
	// Params itself when nothing needs renaming. An alias sent alongside the
	// name it stands for is left in place, so it reports as not read.
	static TSharedPtr<FJsonObject> ResolveParamAliases(const FMCPHandlerSpec& Spec, const TSharedPtr<FJsonObject>& Params);

	// The registered C++ handler, or nullptr. Calling it bypasses alias
	// resolution and read tracking, which is what the contract test needs.
	const FHandlerFunction* FindCppHandler(const FString& MethodName) const { return CppHandlers.Find(MethodName); }

	// Register a C++ handler with a non-default game-thread execution timeout.
	// Most handlers finish in milliseconds, but a few (create_cpp_class
	// regenerates IDE project files; build-related ops) legitimately need
	// minutes. Pass TimeoutSeconds explicitly for those.
	void RegisterHandlerWithTimeout(const FString& MethodName, FHandlerFunction Handler, float TimeoutSeconds);

	// The same, with a parameter spec (#1057). Returns what RegisterHandler with a spec returns.
	bool RegisterHandlerWithTimeout(const FString& MethodName, FHandlerFunction Handler, float TimeoutSeconds, const TArray<FMCPParamSpec>& Params);

	// Look up a per-handler timeout. Returns 0 if no override registered,
	// in which case the caller should use its default.
	float GetHandlerTimeout(const FString& MethodName) const;

	// Register a Python handler
	void RegisterPythonHandler(const FString& MethodName, const FString& PythonScriptPath);

	// Execute a handler
	TSharedPtr<FJsonValue> ExecuteHandler(const FString& MethodName, const TSharedPtr<FJsonObject>& Params);

	// Check if handler exists
	bool HasHandler(const FString& MethodName) const;

	// Get all registered handler names
	TArray<FString> GetHandlerNames() const;

	// Clear all handlers
	void Clear();

private:
	// C++ handlers
	TMap<FString, FHandlerFunction> CppHandlers;

	// Python handlers
	TMap<FString, FPythonHandlerInfo> PythonHandlers;

	// Per-handler game-thread timeouts (seconds). Absent = use default.
	TMap<FString, float> HandlerTimeouts;

	// Category each C++ handler was registered under, when one was set.
	TMap<FString, FString> HandlerCategories;
	FString RegistrationCategory;

	// Declared parameter contracts (#1057). Written during registration only,
	// so the socket thread may read it for the capabilities payload.
	TMap<FString, FMCPHandlerSpec> HandlerSpecs;

	void TagCategory(const FString& MethodName);

	// Execute Python handler
	TSharedPtr<FJsonValue> ExecutePythonHandler(const FString& MethodName, const TSharedPtr<FJsonObject>& Params);
};
