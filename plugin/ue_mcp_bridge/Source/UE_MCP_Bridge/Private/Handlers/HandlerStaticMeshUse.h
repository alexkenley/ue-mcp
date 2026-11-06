#pragma once

// Static mesh use lookups shared by level(find_static_mesh_uses) and
// blueprint(find_static_mesh_uses).
//
// Both answer the same question, "where is one of these meshes used, and which
// way is it pointing", over different sources: placed components in a loaded
// world, and component templates in Blueprint assets. They take the same mesh
// selector and report tilt the same way, so the selection and the measurement
// live here once. The module is a unity build, so a helper copied into the
// second handler file would be a redefinition (see HandlerEditorState.h).

#include "CoreMinimal.h"
#include "AssetRegistry/AssetData.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "AssetRegistry/IAssetRegistry.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Engine/StaticMesh.h"
#include "HandlerUtils.h"
#include "Misc/PackageName.h"
#include "UObject/SoftObjectPath.h"

namespace MCPStaticMeshUse
{
	/** Cap on exact mesh paths one request may name. */
	constexpr int32 MaxRequestedMeshPaths = 512;

	/**
	 * The meshes a request selects: exact paths, a path prefix, or both (a mesh
	 * matches either). Paths are compared case-insensitively on the object path,
	 * so /Game/Props/SM_Crate and /Game/Props/SM_Crate.SM_Crate are the same mesh.
	 */
	struct FMeshSelector
	{
		/** Requested exact paths as object paths, in request order, deduplicated. */
		TArray<FString> ExactPaths;
		/** Lower-cased ExactPaths, for matching. */
		TSet<FString> ExactLower;
		/** Lower-cased prefix, empty when none was given. */
		FString PrefixLower;
		/** The prefix as the caller wrote it, normalized. */
		FString Prefix;

		bool IsEmpty() const { return ExactPaths.Num() == 0 && PrefixLower.IsEmpty(); }

		bool MatchesPath(const FString& MeshObjectPath) const
		{
			const FString Lower = MeshObjectPath.ToLower();
			if (ExactLower.Contains(Lower)) return true;
			return !PrefixLower.IsEmpty() && Lower.StartsWith(PrefixLower);
		}

		bool Matches(const UStaticMesh* Mesh) const
		{
			return Mesh && MatchesPath(Mesh->GetPathName());
		}
	};

	/**
	 * A content path as the caller has it, as an object path: backslashes become
	 * slashes, a .uasset suffix goes, and a package path gains its asset name, so
	 * /Game/Props/SM_Crate reads as /Game/Props/SM_Crate.SM_Crate.
	 */
	inline FString NormalizeMeshObjectPath(FString Path)
	{
		Path.TrimStartAndEndInline();
		Path.ReplaceInline(TEXT("\\"), TEXT("/"));
		if (Path.EndsWith(TEXT(".uasset"), ESearchCase::IgnoreCase)) Path.LeftChopInline(7);
		// An export-text path such as StaticMesh'/Game/X.X' names the same object.
		const int32 Quote = Path.Find(TEXT("'"));
		if (Quote != INDEX_NONE && Path.EndsWith(TEXT("'")) && Path.Len() > Quote + 2)
		{
			Path = Path.Mid(Quote + 1, Path.Len() - Quote - 2);
		}
		int32 LastSlash = INDEX_NONE;
		Path.FindLastChar(TEXT('/'), LastSlash);
		const FString Leaf = LastSlash == INDEX_NONE ? Path : Path.Mid(LastSlash + 1);
		if (!Leaf.IsEmpty() && !Leaf.Contains(TEXT(".")))
		{
			Path += TEXT(".") + Leaf;
		}
		return Path;
	}

	/**
	 * Read meshPaths and meshPathPrefix. Returns an error response, or nullptr
	 * with Out filled. At least one of the two must select something.
	 */
	inline TSharedPtr<FJsonValue> ReadMeshSelector(const TSharedPtr<FJsonObject>& Params, FMeshSelector& Out)
	{
		const TArray<TSharedPtr<FJsonValue>>* Values = nullptr;
		if (TryGetArrayParam(Params, TEXT("meshPaths"), Values) && Values)
		{
			for (const TSharedPtr<FJsonValue>& Value : *Values)
			{
				FString Raw;
				if (!Value.IsValid() || !Value->TryGetString(Raw))
				{
					return MCPError(TEXT("'meshPaths' must be an array of static mesh asset paths"));
				}
				const FString Path = NormalizeMeshObjectPath(Raw);
				if (Path.IsEmpty()) continue;
				if (!Path.StartsWith(TEXT("/")))
				{
					return MCPError(FString::Printf(
						TEXT("'meshPaths' entry '%s' is not a mount-rooted asset path such as /Game/Props/SM_Crate"), *Raw));
				}
				const FString Lower = Path.ToLower();
				if (Out.ExactLower.Contains(Lower)) continue;
				Out.ExactLower.Add(Lower);
				Out.ExactPaths.Add(Path);
			}
			if (Out.ExactPaths.Num() > MaxRequestedMeshPaths)
			{
				return MCPError(FString::Printf(
					TEXT("'meshPaths' names %d meshes, above the %d a single call takes. Split the list, or select a folder with meshPathPrefix."),
					Out.ExactPaths.Num(), MaxRequestedMeshPaths));
			}
		}

		FString Prefix = OptionalString(Params, TEXT("meshPathPrefix"));
		Prefix.TrimStartAndEndInline();
		Prefix.ReplaceInline(TEXT("\\"), TEXT("/"));
		if (!Prefix.IsEmpty())
		{
			if (!Prefix.StartsWith(TEXT("/")) || Prefix.Len() < 2)
			{
				return MCPError(FString::Printf(
					TEXT("'meshPathPrefix' must be a mount-rooted path such as /Game/Props/ or /Game/Props/SM_Rock, got '%s'"), *Prefix));
			}
			Out.Prefix = Prefix;
			Out.PrefixLower = Prefix.ToLower();
		}

		if (Out.IsEmpty())
		{
			return MCPError(TEXT("Select the meshes to look for: meshPaths (static mesh asset paths) or meshPathPrefix (a folder or name prefix), or both"));
		}
		return nullptr;
	}

	/**
	 * Requested exact paths no static mesh answers to, neither loaded nor in the
	 * Asset Registry. A typo would otherwise read as "used nowhere".
	 */
	inline TArray<FString> UnknownMeshPaths(const FMeshSelector& Selector)
	{
		TArray<FString> Unknown;
		if (Selector.ExactPaths.Num() == 0) return Unknown;
		IAssetRegistry& Registry = FModuleManager::LoadModuleChecked<FAssetRegistryModule>(TEXT("AssetRegistry")).Get();
		for (const FString& Path : Selector.ExactPaths)
		{
			if (FindObject<UStaticMesh>(nullptr, *Path)) continue;
			const FAssetData Asset = Registry.GetAssetByObjectPath(FSoftObjectPath(Path));
			if (Asset.IsValid() && Asset.IsInstanceOf(UStaticMesh::StaticClass())) continue;
			Unknown.Add(Path);
		}
		return Unknown;
	}

	/**
	 * Degrees between the up axis of a rotation and world +Z: 0 upright, 90 on
	 * its side, 180 upside down. Rotation only, so a negative Z scale that flips
	 * the mesh is not counted as tilt; the row's scale shows it.
	 */
	inline double TiltDegrees(const FQuat& Rotation)
	{
		const FVector Up = Rotation.GetNormalized().GetUpVector();
		return FMath::RadiansToDegrees(FMath::Acos(FMath::Clamp(Up.Z, -1.0, 1.0)));
	}

	/** minTiltDegrees, clamped to [0, 180]; 0 keeps every row. */
	inline double ReadMinTilt(const TSharedPtr<FJsonObject>& Params)
	{
		return FMath::Clamp(OptionalNumber(Params, TEXT("minTiltDegrees"), 0.0), 0.0, 180.0);
	}

	/** The location, rotation, scale, up vector and tilt of one transform. */
	inline void WriteTransformFields(const TSharedPtr<FJsonObject>& Row, const FTransform& Transform)
	{
		Row->SetObjectField(TEXT("location"), MCPVec3ToJsonObject(Transform.GetLocation()));
		Row->SetObjectField(TEXT("rotation"), MCPRotatorToJsonObject(Transform.Rotator()));
		Row->SetObjectField(TEXT("scale"), MCPVec3ToJsonObject(Transform.GetScale3D()));
		Row->SetObjectField(TEXT("upVector"), MCPVec3ToJsonObject(Transform.GetRotation().GetNormalized().GetUpVector()));
		Row->SetNumberField(TEXT("tiltDegrees"), TiltDegrees(Transform.GetRotation()));
	}

	/** A mesh path -> count map as a JSON object, sorted by path. */
	inline TSharedPtr<FJsonObject> CountsToJson(const TMap<FString, int32>& Counts)
	{
		TArray<FString> Keys;
		Counts.GenerateKeyArray(Keys);
		Keys.Sort();
		TSharedPtr<FJsonObject> Obj = MakeShared<FJsonObject>();
		for (const FString& Key : Keys)
		{
			Obj->SetNumberField(Key, Counts.FindChecked(Key));
		}
		return Obj;
	}

	/** Requested exact paths that no row (plain or instanced) used. */
	inline TArray<FString> UnmatchedExactPaths(const FMeshSelector& Selector, const TMap<FString, int32>& UsesByMesh)
	{
		TSet<FString> UsedLower;
		for (const TPair<FString, int32>& Pair : UsesByMesh)
		{
			UsedLower.Add(Pair.Key.ToLower());
		}
		TArray<FString> Unmatched;
		for (const FString& Path : Selector.ExactPaths)
		{
			if (!UsedLower.Contains(Path.ToLower())) Unmatched.Add(Path);
		}
		return Unmatched;
	}

	/** Echo of the selector, so a caller sees what the paths were normalized to. */
	inline void WriteSelector(const TSharedPtr<FJsonObject>& Result, const FMeshSelector& Selector)
	{
		Result->SetArrayField(TEXT("meshPaths"), MCPStringListToJson(Selector.ExactPaths));
		if (!Selector.Prefix.IsEmpty()) Result->SetStringField(TEXT("meshPathPrefix"), Selector.Prefix);
	}
}
