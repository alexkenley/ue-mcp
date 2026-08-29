// Dialog policy and dialog answering.
//
// THERE ARE TWO KINDS OF MODAL AND ONLY ONE OF THEM IS A MESSAGE DIALOG.
//
// FMessageDialog::Open routes through FCoreDelegates::ModalMessageDialog when
// something is bound to it, so HandleModalDialog below can answer those without
// a window ever reaching the screen. That covers "already exists", "Overwrite?"
// and the other FMessageDialog prompts.
//
// It covers nothing else. The editor's own modals are ordinary Slate windows
// shown with FSlateApplication::AddModalWindow, and they never touch that
// delegate. The shutdown "Save Content" prompt is the important one: FileHelpers
// builds it through FPackagesDialogModule, its title is
// NSLOCTEXT("PackagesDialogModule", "PackagesDialogTitle", "Save Content")
// (Editor/UnrealEd/Public/FileHelpers.h), and its buttons are Save Selected /
// Don't Save / Cancel. None of those are EAppReturnType values, and the delegate
// is never called, so a policy armed against it could never fire no matter how
// well its pattern matched. An automated stop therefore hung on it every time,
// and answering it by hand with respond_to_dialog was the only way out.
//
// ApplyPolicyToActiveModal is the missing half: it presses a real button on a
// real modal window, from Slate's modal-loop tick, which keeps running while
// the game thread is parked inside the modal loop.

#include "DialogHandlers.h"
#include "UE_MCP_BridgeModule.h"
#include "HandlerRegistry.h"
#include "HandlerUtils.h"
#include "Misc/CoreDelegates.h"
#include "Misc/MessageDialog.h"     // #603 re-show real dialog
#include "GameThreadExecutor.h"     // #603 IsHandlerInFlight
#include "GenericPlatform/GenericPlatformMisc.h" // EAppMsgCategory
#include "HAL/PlatformTime.h"
#include "Framework/Application/SlateApplication.h"
#include "Widgets/SWindow.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SButton.h"

// Static member definitions
TArray<FDialogHandlers::FDialogPolicy> FDialogHandlers::Policies;
FDelegateHandle FDialogHandlers::OriginalDelegateHandle;
bool FDialogHandlers::bHookInstalled = false;

// A NAMED namespace, not an anonymous one: this module is a unity build, so an
// anonymous namespace here merges with whatever other .cpp shares the blob and
// a same-named helper elsewhere becomes a C2084 redefinition.
namespace MCPDialogPolicy
{
	/**
	 * Compare button labels the way a human reads them. Slate ships the
	 * typographic apostrophe in "Don't Save" in some builds while a caller
	 * types the ASCII one, and a label may carry padding.
	 */
	static FString Normalise(const FString& In)
	{
		static const FString CurlyApostrophe = FString::Chr(TCHAR(0x2019));
		FString Out = In.Replace(*CurlyApostrophe, TEXT("'"));
		Out.TrimStartAndEndInline();
		return Out.ToLower();
	}

	/**
	 * Button labels a response keyword is willing to press, most preferred
	 * first.
	 *
	 * This is where the vocabulary problem is solved. EAppReturnType has eight
	 * values and an editor dialog can offer any label it likes, so "no" on a
	 * Save Content prompt has to be allowed to mean "Don't Save" or the keyword
	 * names nothing on the dialog at all. Extending EAppReturnType was not an
	 * option: the FMessageDialog path has to RETURN one of its values, so a
	 * "dontsave" keyword would have nothing to return. A policy that needs to
	 * name a button precisely carries a literal buttonLabel instead.
	 */
	static const TArray<FString>& SynonymsFor(EAppReturnType::Type Response)
	{
		static const TArray<FString> Yes      = { TEXT("Yes"), TEXT("Save Selected"), TEXT("Save All"), TEXT("Save") };
		static const TArray<FString> No       = { TEXT("No"), TEXT("Don't Save"), TEXT("Do Not Save"), TEXT("Discard"), TEXT("Skip") };
		static const TArray<FString> Ok       = { TEXT("OK"), TEXT("Continue"), TEXT("Yes") };
		static const TArray<FString> Cancel   = { TEXT("Cancel"), TEXT("Abort"), TEXT("Close") };
		static const TArray<FString> Retry    = { TEXT("Retry"), TEXT("Try Again") };
		static const TArray<FString> Continue = { TEXT("Continue"), TEXT("OK") };
		static const TArray<FString> YesAll   = { TEXT("Yes to All"), TEXT("Yes All"), TEXT("Save All"), TEXT("Yes") };
		static const TArray<FString> NoAll    = { TEXT("No to All"), TEXT("No All"), TEXT("Don't Save"), TEXT("No") };
		static const TArray<FString> Empty;

		switch (Response)
		{
		case EAppReturnType::Yes:      return Yes;
		case EAppReturnType::No:       return No;
		case EAppReturnType::Ok:       return Ok;
		case EAppReturnType::Cancel:   return Cancel;
		case EAppReturnType::Retry:    return Retry;
		case EAppReturnType::Continue: return Continue;
		case EAppReturnType::YesAll:   return YesAll;
		case EAppReturnType::NoAll:    return NoAll;
		default:                       return Empty;
		}
	}

	/** Index of the first button whose label equals Needle once normalised. */
	static int32 FindExact(const TArray<FDialogHandlers::FModalButton>& Buttons, const FString& Needle)
	{
		const FString Want = Normalise(Needle);
		for (int32 i = 0; i < Buttons.Num(); ++i)
		{
			if (Normalise(Buttons[i].Label) == Want)
			{
				return i;
			}
		}
		return INDEX_NONE;
	}

	/** Index of the first button whose label contains Needle once normalised. */
	static int32 FindContains(const TArray<FDialogHandlers::FModalButton>& Buttons, const FString& Needle)
	{
		const FString Want = Normalise(Needle);
		if (Want.IsEmpty())
		{
			return INDEX_NONE;
		}
		for (int32 i = 0; i < Buttons.Num(); ++i)
		{
			if (Normalise(Buttons[i].Label).Contains(Want))
			{
				return i;
			}
		}
		return INDEX_NONE;
	}

	static FString JoinLabels(const TArray<FDialogHandlers::FModalButton>& Buttons)
	{
		TArray<FString> Labels;
		for (const FDialogHandlers::FModalButton& B : Buttons)
		{
			Labels.Add(B.Label);
		}
		return FString::Join(Labels, TEXT(", "));
	}

	// The modal this process last pressed a button on, and when. The modal-loop
	// tick fires many times a second and a window does not close on the frame
	// its button is pressed, so without this the policy would press again and
	// again. The pointer is an identity token only and is NEVER dereferenced;
	// the timestamp is what lets a genuinely new dialog through if the
	// allocator happens to hand back the same address.
	static const SWindow* LastAnsweredWindow = nullptr;
	static double LastAnsweredSeconds = 0.0;
	static const double AnswerCooldownSeconds = 2.0;

	// A modal we deliberately left alone, so the reason is logged once rather
	// than every frame of the modal loop.
	static const SWindow* LastDeclinedWindow = nullptr;
}

void FDialogHandlers::RegisterHandlers(FMCPHandlerRegistry& Registry)
{
	Registry.RegisterHandler(TEXT("set_dialog_policy"), &SetDialogPolicy);
	Registry.RegisterHandler(TEXT("clear_dialog_policy"), &ClearDialogPolicy);
	Registry.RegisterHandler(TEXT("get_dialog_policy"), &GetDialogPolicy);
	Registry.RegisterHandler(TEXT("list_dialogs"), &ListDialogs);
	Registry.RegisterHandler(TEXT("respond_to_dialog"), &RespondToDialog);
}

void FDialogHandlers::InstallDialogHook()
{
	if (bHookInstalled)
	{
		return;
	}

	// UE 5.7 routes FMessageDialog::Open through FCoreDelegates::ModalMessageDialog
	// when bound. Bind our handler so SetDialogPolicy can auto-answer "save changes?",
	// "overwrite?", and other prompts that would otherwise block the editor.
	//
	// This delegate is only half the coverage. Slate modal WINDOWS never reach
	// it; ApplyPolicyToActiveModal answers those, driven from the modal-loop
	// tick hook installed by FMCPEngineStatusHooks.
	FCoreDelegates::ModalMessageDialog.BindStatic(&FDialogHandlers::HandleModalDialogV2);
	bHookInstalled = true;

	UE_LOG(LogMCPBridge, Log, TEXT("[UE-MCP] Dialog hook installed (ModalMessageDialog delegate bound)"));
}

void FDialogHandlers::RemoveDialogHook()
{
	if (!bHookInstalled)
	{
		return;
	}

	FCoreDelegates::ModalMessageDialog.Unbind();
	bHookInstalled = false;
	Policies.Empty();

	UE_LOG(LogMCPBridge, Log, TEXT("[UE-MCP] Dialog hook removed"));
}

EAppReturnType::Type FDialogHandlers::HandleModalDialogV2(EAppMsgCategory /*Category*/, EAppMsgType::Type MsgType, const FText& Text, const FText& Title)
{
	return HandleModalDialog(MsgType, Text, Title);
}

void FDialogHandlers::AddDefaultPolicy(const FString& Pattern, EAppReturnType::Type Response)
{
	FDialogPolicy Policy;
	Policy.Pattern = Pattern;
	Policy.Response = Response;
	Policy.bExplicit = false;
	Policies.Add(Policy);
}

auto FDialogHandlers::FindMatchingPolicy(const FString& Title, const FString& Message) -> const FDialogPolicy*
{
	// FString::Contains is case-insensitive by default, which is what the
	// FMessageDialog path has always done; both halves match the same way.
	for (const FDialogPolicy& Policy : Policies)
	{
		if (Policy.Pattern.IsEmpty())
		{
			continue;
		}
		if (Title.Contains(Policy.Pattern) || Message.Contains(Policy.Pattern))
		{
			return &Policy;
		}
	}
	return nullptr;
}

int32 FDialogHandlers::ResolveButtonForPolicy(const FDialogPolicy& Policy, const TArray<FModalButton>& Buttons, FString& OutReason)
{
	using namespace MCPDialogPolicy;

	OutReason.Empty();
	if (Buttons.Num() == 0)
	{
		OutReason = TEXT("the dialog exposes no button this walk can press");
		return INDEX_NONE;
	}

	// A literal label is the precise instrument and wins outright. Exact before
	// substring, because "Save" is a substring of "Don't Save" and a substring
	// hit on the wrong button is the one mistake that cannot be undone.
	if (!Policy.ButtonLabel.IsEmpty())
	{
		int32 Index = FindExact(Buttons, Policy.ButtonLabel);
		if (Index == INDEX_NONE)
		{
			Index = FindContains(Buttons, Policy.ButtonLabel);
		}
		if (Index == INDEX_NONE)
		{
			OutReason = FString::Printf(
				TEXT("buttonLabel '%s' matches none of [%s]"),
				*Policy.ButtonLabel, *JoinLabels(Buttons));
		}
		return Index;
	}

	const TArray<FString>& Synonyms = SynonymsFor(Policy.Response);
	for (const FString& Synonym : Synonyms)
	{
		const int32 Index = FindExact(Buttons, Synonym);
		if (Index != INDEX_NONE)
		{
			return Index;
		}
	}
	for (const FString& Synonym : Synonyms)
	{
		const int32 Index = FindContains(Buttons, Synonym);
		if (Index != INDEX_NONE)
		{
			return Index;
		}
	}

	OutReason = FString::Printf(
		TEXT("response '%s' names none of [%s]; set the policy with a literal buttonLabel to press one of them"),
		*ResponseTypeToString(Policy.Response), *JoinLabels(Buttons));
	return INDEX_NONE;
}

bool FDialogHandlers::ApplyPolicyToActiveModal()
{
	using namespace MCPDialogPolicy;

	if (!IsInGameThread() || !FSlateApplication::IsInitialized())
	{
		return false;
	}

	FString Title;
	FString Message;
	TArray<FModalButton> Buttons;
	TSharedPtr<SWindow> Modal = CollectActiveModal(Title, Message, Buttons);
	if (!Modal.IsValid())
	{
		LastAnsweredWindow = nullptr;
		LastDeclinedWindow = nullptr;
		return false;
	}

	const SWindow* WindowId = Modal.Get();
	const double Now = FPlatformTime::Seconds();
	if (WindowId == LastAnsweredWindow && (Now - LastAnsweredSeconds) < AnswerCooldownSeconds)
	{
		return false;
	}

	const FDialogPolicy* Policy = FindMatchingPolicy(Title, Message);
	if (!Policy)
	{
		return false;
	}

	// A policy a caller armed applies to any modal, because the caller asked
	// for it. The module's own safety nets are narrower on this path: they were
	// written to stop a BRIDGE request wedging the game thread, and pressing
	// "Don't Save" on a prompt a human raised by closing their own editor would
	// throw that person's work away without being asked. The FMessageDialog
	// path keeps its existing wider contract; only this one is gated.
	if (!Policy->bExplicit && !FMCPGameThreadExecutor::IsHandlerInFlight())
	{
		if (WindowId != LastDeclinedWindow)
		{
			LastDeclinedWindow = WindowId;
			UE_LOG(LogMCPBridge, Log,
				TEXT("[UE-MCP] Modal '%s' matches the built-in safety net '%s' but no bridge request is in flight, so it is left for the user. Arm it explicitly with editor(set_dialog_policy) to have the bridge answer it."),
				*Title, *Policy->Pattern);
		}
		return false;
	}

	FString Reason;
	const int32 Index = ResolveButtonForPolicy(*Policy, Buttons, Reason);
	if (Index == INDEX_NONE)
	{
		if (WindowId != LastDeclinedWindow)
		{
			LastDeclinedWindow = WindowId;
			UE_LOG(LogMCPBridge, Warning,
				TEXT("[UE-MCP] Modal '%s' matched policy '%s' but no button was pressed: %s"),
				*Title, *Policy->Pattern, *Reason);
		}
		return false;
	}

	LastAnsweredWindow = WindowId;
	LastAnsweredSeconds = Now;
	LastDeclinedWindow = nullptr;

	UE_LOG(LogMCPBridge, Log,
		TEXT("[UE-MCP] Modal '%s' answered by policy '%s': pressed '%s' of [%s]"),
		*Title, *Policy->Pattern, *Buttons[Index].Label, *JoinLabels(Buttons));

	// SimulateClick, for the same reason respond_to_dialog uses it: synthetic
	// mouse events bypass the capture bookkeeping SButton uses to decide a
	// click happened, and the dialog stays on screen while the caller is told
	// it was answered.
	FSlateApplication::Get().SetKeyboardFocus(Buttons[Index].Button);
	Buttons[Index].Button->SimulateClick();
	return true;
}

EAppReturnType::Type FDialogHandlers::HandleModalDialog(EAppMsgType::Type MsgType, const FText& Text, const FText& Title)
{
	FString MessageStr = Text.ToString();
	FString TitleStr = Title.ToString();

	// Check policies for a match
	for (const FDialogPolicy& Policy : Policies)
	{
		if (MessageStr.Contains(Policy.Pattern) || TitleStr.Contains(Policy.Pattern))
		{
			UE_LOG(LogMCPBridge, Log, TEXT("[UE-MCP] Dialog auto-responded: pattern='%s' title='%s' response=%s"),
				*Policy.Pattern, *TitleStr, *ResponseTypeToString(Policy.Response));
			return Policy.Response;
		}
	}

	// #603: No policy matched. If this modal was NOT raised by an in-flight
	// bridge request, it belongs to the human (e.g. a Content Browser rename
	// confirm) - synthesizing Cancel/No silently eats the user's action. Detach
	// the hook momentarily and re-show the real dialog so the user can answer.
	// The always-on safety-net policies above still auto-answer overwrite/save/
	// shutdown prompts regardless of origin, so automation and editor-stop never hang.
	if (!FMCPGameThreadExecutor::IsHandlerInFlight())
	{
		UE_LOG(LogMCPBridge, Log, TEXT("[UE-MCP] User-initiated dialog passed through (no bridge request in flight): title='%s'"), *TitleStr);
		FCoreDelegates::ModalMessageDialog.Unbind();
		const EAppReturnType::Type UserAnswer = FMessageDialog::Open(MsgType, Text, Title);
		// Reattach for subsequent dialogs.
		FCoreDelegates::ModalMessageDialog.BindStatic(&FDialogHandlers::HandleModalDialogV2);
		return UserAnswer;
	}

	// Bridge-initiated dialog with no matching policy - synthesize a safe default
	// so the in-flight request does not block forever.
	UE_LOG(LogMCPBridge, Log, TEXT("[UE-MCP] Bridge dialog auto-defaulted (no policy match): title='%s' message='%s'"),
		*TitleStr, *MessageStr.Left(200));

	// Return the "default" response based on message type
	switch (MsgType)
	{
	case EAppMsgType::Ok:
		return EAppReturnType::Ok;
	case EAppMsgType::YesNo:
	case EAppMsgType::YesNoCancel:
		return EAppReturnType::No;
	case EAppMsgType::OkCancel:
	case EAppMsgType::YesNoYesAllNoAll:
	case EAppMsgType::YesNoYesAllNoAllCancel:
	case EAppMsgType::YesNoYesAll:
		return EAppReturnType::Cancel;
	case EAppMsgType::CancelRetryContinue:
		return EAppReturnType::Cancel;
	default:
		return EAppReturnType::No;
	}
}

TSharedPtr<FJsonValue> FDialogHandlers::SetDialogPolicy(const TSharedPtr<FJsonObject>& Params)
{
	FString Pattern;
	if (!Params->TryGetStringField(TEXT("pattern"), Pattern) || Pattern.IsEmpty())
	{
		return MCPError(TEXT("Missing or empty 'pattern' parameter. It is matched case-insensitively against the dialog title and message."));
	}

	const FString ButtonLabel = OptionalString(Params, TEXT("buttonLabel"));
	FString ResponseStr = OptionalString(Params, TEXT("response"));

	if (ResponseStr.IsEmpty() && ButtonLabel.IsEmpty())
	{
		return MCPError(FString::Printf(
			TEXT("A policy needs a 'response' or a 'buttonLabel'. Valid responses are %s. Use 'buttonLabel' for a dialog whose buttons are not those, such as the shutdown 'Save Content' prompt whose buttons are Save Selected, Don't Save and Cancel."),
			*ValidResponseList()));
	}

	// A response keyword is still required for the FMessageDialog path, which
	// has to RETURN an EAppReturnType and cannot press a label. A policy given
	// only a buttonLabel gets Cancel there, which is the non-destructive answer.
	EAppReturnType::Type Response = EAppReturnType::Cancel;
	if (!ResponseStr.IsEmpty())
	{
		bool bValidResponse = false;
		Response = ParseResponseType(ResponseStr, bValidResponse);
		if (!bValidResponse)
		{
			return MCPError(FString::Printf(
				TEXT("Unknown response '%s'. Valid responses are %s."),
				*ResponseStr, *ValidResponseList()));
		}
	}

	// Idempotency: an identical policy is already armed.
	for (const FDialogPolicy& P : Policies)
	{
		if (P.Pattern == Pattern && P.Response == Response && P.ButtonLabel == ButtonLabel && P.bExplicit)
		{
			auto Existed = MCPSuccess();
			MCPSetExisted(Existed);
			Existed->SetStringField(TEXT("pattern"), Pattern);
			Existed->SetStringField(TEXT("response"), ResponseTypeToString(Response));
			Existed->SetStringField(TEXT("buttonLabel"), ButtonLabel);
			Existed->SetNumberField(TEXT("policyCount"), Policies.Num());
			// Still worth trying: the policy may have been armed before the
			// modal that it matches came up.
			Existed->SetBoolField(TEXT("answeredActiveModal"), ApplyPolicyToActiveModal());
			return MCPResult(Existed);
		}
	}

	// Remove existing policy with same pattern
	Policies.RemoveAll([&Pattern](const FDialogPolicy& P) { return P.Pattern == Pattern; });

	// Add new policy
	FDialogPolicy NewPolicy;
	NewPolicy.Pattern = Pattern;
	NewPolicy.Response = Response;
	NewPolicy.ButtonLabel = ButtonLabel;
	NewPolicy.bExplicit = true;
	// Explicit policies go in front of the module's safety nets, and behind the
	// explicit policies already armed. Matching is first-wins, so a caller who
	// says what to do with "Save Content" must not lose to the built-in default
	// for the same words, and two calls in a row must keep the order they were
	// made in rather than reversing it.
	int32 InsertAt = 0;
	while (InsertAt < Policies.Num() && Policies[InsertAt].bExplicit)
	{
		++InsertAt;
	}
	Policies.Insert(NewPolicy, InsertAt);

	// Ensure hook is installed
	if (!bHookInstalled)
	{
		InstallDialogHook();
	}

	auto Result = MCPSuccess();
	MCPSetCreated(Result);
	Result->SetStringField(TEXT("pattern"), Pattern);
	Result->SetStringField(TEXT("response"), ResponseTypeToString(Response));
	Result->SetStringField(TEXT("buttonLabel"), ButtonLabel);
	Result->SetNumberField(TEXT("policyCount"), Policies.Num());

	// A policy armed while a modal is ALREADY up has to answer it now. This
	// handler is modal-safe, so it runs from inside the modal loop, which is
	// precisely the case where nothing else will get a chance to.
	Result->SetBoolField(TEXT("answeredActiveModal"), ApplyPolicyToActiveModal());

	// Rollback: clear_dialog_policy with same pattern
	TSharedPtr<FJsonObject> Payload = MakeShared<FJsonObject>();
	Payload->SetStringField(TEXT("pattern"), Pattern);
	MCPSetRollback(Result, TEXT("clear_dialog_policy"), Payload);

	return MCPResult(Result);
}

TSharedPtr<FJsonValue> FDialogHandlers::ClearDialogPolicy(const TSharedPtr<FJsonObject>& Params)
{
	auto Result = MCPSuccess();

	FString Pattern = OptionalString(Params, TEXT("pattern"));
	if (!Pattern.IsEmpty())
	{
		int32 Removed = Policies.RemoveAll([&Pattern](const FDialogPolicy& P) { return P.Pattern == Pattern; });
		Result->SetStringField(TEXT("pattern"), Pattern);
		Result->SetNumberField(TEXT("removed"), Removed);
	}
	else
	{
		int32 Count = Policies.Num();
		Policies.Empty();
		Result->SetNumberField(TEXT("removed"), Count);
	}

	Result->SetNumberField(TEXT("policyCount"), Policies.Num());

	return MCPResult(Result);
}

TSharedPtr<FJsonValue> FDialogHandlers::GetDialogPolicy(const TSharedPtr<FJsonObject>& Params)
{
	auto Result = MCPSuccess();

	TArray<TSharedPtr<FJsonValue>> PoliciesArray;
	for (const FDialogPolicy& Policy : Policies)
	{
		TSharedPtr<FJsonObject> P = MakeShared<FJsonObject>();
		P->SetStringField(TEXT("pattern"), Policy.Pattern);
		P->SetStringField(TEXT("response"), ResponseTypeToString(Policy.Response));
		P->SetStringField(TEXT("buttonLabel"), Policy.ButtonLabel);
		// Which policies answer a Slate modal that no bridge request raised.
		P->SetStringField(TEXT("source"), Policy.bExplicit ? TEXT("caller") : TEXT("built-in safety net"));
		P->SetBoolField(TEXT("answersUserRaisedModals"), Policy.bExplicit);
		PoliciesArray.Add(MakeShared<FJsonValueObject>(P));
	}

	Result->SetArrayField(TEXT("policies"), PoliciesArray);
	Result->SetNumberField(TEXT("count"), Policies.Num());
	Result->SetBoolField(TEXT("hookInstalled"), bHookInstalled);

	return MCPResult(Result);
}

TSharedPtr<SWindow> FDialogHandlers::CollectActiveModal(FString& OutTitle, FString& OutMessage, TArray<FModalButton>& OutButtons)
{
	OutTitle.Empty();
	OutMessage.Empty();
	OutButtons.Empty();

	if (!FSlateApplication::IsInitialized())
	{
		return nullptr;
	}

	TSharedPtr<SWindow> ActiveModal = FSlateApplication::Get().GetActiveModalWindow();
	if (!ActiveModal.IsValid())
	{
		return nullptr;
	}

	OutTitle = ActiveModal->GetTitle().ToString();

	TArray<FString> TextContents;

	TFunction<void(const TSharedRef<SWidget>&)> TraverseWidgets = [&](const TSharedRef<SWidget>& Widget)
	{
		if (Widget->GetType() == TEXT("STextBlock"))
		{
			TSharedRef<STextBlock> TextBlock = StaticCastSharedRef<STextBlock>(Widget);
			FString Text = TextBlock->GetText().ToString();
			if (!Text.IsEmpty())
			{
				TextContents.Add(Text);
			}
		}

		if (Widget->GetType() == TEXT("SButton"))
		{
			FModalButton Entry;
			Entry.Button = StaticCastSharedRef<SButton>(Widget);

			// The label is the first text block inside the button.
			FChildren* ButtonChildren = Widget->GetChildren();
			if (ButtonChildren)
			{
				for (int32 i = 0; i < ButtonChildren->Num(); ++i)
				{
					TSharedRef<SWidget> Child = ButtonChildren->GetChildAt(i);
					if (Child->GetType() == TEXT("STextBlock"))
					{
						Entry.Label = StaticCastSharedRef<STextBlock>(Child)->GetText().ToString();
						break;
					}
				}
			}
			OutButtons.Add(Entry);
		}

		FChildren* Children = Widget->GetChildren();
		if (Children)
		{
			for (int32 i = 0; i < Children->Num(); ++i)
			{
				TraverseWidgets(Children->GetChildAt(i));
			}
		}
	};

	TraverseWidgets(ActiveModal.ToSharedRef());

	for (const FString& T : TextContents)
	{
		if (T != OutTitle)
		{
			if (!OutMessage.IsEmpty()) OutMessage += TEXT("\n");
			OutMessage += T;
		}
	}

	return ActiveModal;
}

bool FDialogHandlers::DescribeActiveModal(FString& OutTitle, FString& OutMessage, TArray<FString>& OutButtons)
{
	OutButtons.Empty();

	TArray<FModalButton> Buttons;
	TSharedPtr<SWindow> Modal = CollectActiveModal(OutTitle, OutMessage, Buttons);
	if (!Modal.IsValid())
	{
		return false;
	}

	for (const FModalButton& Button : Buttons)
	{
		if (!Button.Label.IsEmpty())
		{
			OutButtons.Add(Button.Label);
		}
	}
	return true;
}

TSharedPtr<FJsonValue> FDialogHandlers::ListDialogs(const TSharedPtr<FJsonObject>& Params)
{
	auto Result = MCPSuccess();
	TArray<TSharedPtr<FJsonValue>> DialogsArray;

	FString Title;
	FString Message;
	TArray<FModalButton> Buttons;
	if (CollectActiveModal(Title, Message, Buttons).IsValid())
	{
		TSharedPtr<FJsonObject> DialogObj = MakeShared<FJsonObject>();
		DialogObj->SetStringField(TEXT("title"), Title);
		DialogObj->SetStringField(TEXT("message"), Message);

		TArray<TSharedPtr<FJsonValue>> ButtonsJsonArray;
		for (const FModalButton& Button : Buttons)
		{
			if (!Button.Label.IsEmpty())
			{
				ButtonsJsonArray.Add(MakeShared<FJsonValueString>(Button.Label));
			}
		}
		DialogObj->SetArrayField(TEXT("buttons"), ButtonsJsonArray);

		// Why an armed policy is or is not clearing this dialog. Without it the
		// caller sees a dialog, sees a matching policy, and has nothing that
		// says which of the two failed to meet the other.
		const FDialogPolicy* Policy = FindMatchingPolicy(Title, Message);
		if (!Policy)
		{
			DialogObj->SetBoolField(TEXT("policyMatched"), false);
			DialogObj->SetStringField(TEXT("policyNote"),
				TEXT("No armed policy matches this dialog. Arm one with editor(set_dialog_policy) or answer it with editor(respond_to_dialog)."));
		}
		else
		{
			FString Reason;
			const int32 Index = ResolveButtonForPolicy(*Policy, Buttons, Reason);
			DialogObj->SetBoolField(TEXT("policyMatched"), true);
			DialogObj->SetStringField(TEXT("policyPattern"), Policy->Pattern);
			DialogObj->SetStringField(TEXT("policyResponse"), ResponseTypeToString(Policy->Response));
			DialogObj->SetStringField(TEXT("policySource"), Policy->bExplicit ? TEXT("caller") : TEXT("built-in safety net"));
			if (Index != INDEX_NONE)
			{
				DialogObj->SetStringField(TEXT("policyWouldPress"), Buttons[Index].Label);
			}
			else
			{
				DialogObj->SetStringField(TEXT("policyNote"),
					FString::Printf(TEXT("The policy matches but presses nothing: %s"), *Reason));
			}
			if (!Policy->bExplicit && !FMCPGameThreadExecutor::IsHandlerInFlight())
			{
				DialogObj->SetStringField(TEXT("policyHeldBack"),
					TEXT("This is a built-in safety net and no bridge request raised the dialog, so it is left for the user. Arm the same pattern with editor(set_dialog_policy) to have the bridge answer it."));
			}
		}

		DialogsArray.Add(MakeShared<FJsonValueObject>(DialogObj));
	}

	Result->SetArrayField(TEXT("dialogs"), DialogsArray);
	Result->SetNumberField(TEXT("count"), DialogsArray.Num());

	return MCPResult(Result);
}

TSharedPtr<FJsonValue> FDialogHandlers::RespondToDialog(const TSharedPtr<FJsonObject>& Params)
{
	using namespace MCPDialogPolicy;

	if (!FSlateApplication::IsInitialized())
	{
		return MCPError(TEXT("Slate not initialized"));
	}

	FString Title;
	FString Message;
	TArray<FModalButton> Buttons;
	TSharedPtr<SWindow> ActiveModal = CollectActiveModal(Title, Message, Buttons);
	if (!ActiveModal.IsValid())
	{
		return MCPError(TEXT("No active modal dialog"));
	}

	// Determine action: buttonIndex, buttonLabel, or key simulation
	FString ButtonLabel = OptionalString(Params, TEXT("buttonLabel"));
	int32 ButtonIndex = OptionalInt(Params, TEXT("buttonIndex"), -1);

	// Resolve which button to click. Exact match before substring: "Save" is a
	// substring of "Don't Save", so a substring-first search can press the
	// opposite of what was asked for on the one dialog where it matters most.
	int32 TargetIndex = -1;

	if (!ButtonLabel.IsEmpty())
	{
		TargetIndex = FindExact(Buttons, ButtonLabel);
		if (TargetIndex == INDEX_NONE)
		{
			TargetIndex = FindContains(Buttons, ButtonLabel);
		}
	}
	else if (ButtonIndex >= 0 && ButtonIndex < Buttons.Num())
	{
		TargetIndex = ButtonIndex;
	}

	auto Result = MCPSuccess();

	if (TargetIndex >= 0 && TargetIndex < Buttons.Num())
	{
		TSharedPtr<SButton> TargetButton = Buttons[TargetIndex].Button;
		FSlateApplication::Get().SetKeyboardFocus(TargetButton);

		// SButton::SimulateClick, not synthetic mouse events. Feeding
		// OnMouseButtonDown/Up straight to the widget bypasses the capture
		// bookkeeping SButton uses to decide a click happened, so the handler
		// reported a successful click while the dialog stayed on screen -
		// the worst possible failure for a call whose entire job is unblocking
		// the editor.
		TargetButton->SimulateClick();

		Result->SetStringField(TEXT("clickedButton"), Buttons[TargetIndex].Label);
		Result->SetNumberField(TEXT("buttonIndex"), TargetIndex);
	}
	else
	{
		// Last resort for a dialog with no button we can name: close the window
		// itself, which ends the modal loop and releases the game thread. A
		// synthetic Escape keypress alone does not reach a modal window that
		// never took keyboard focus, so send both.
		FString Action = OptionalString(Params, TEXT("action"));
		if (Action == TEXT("escape") || Action == TEXT("close"))
		{
			FSlateApplication::Get().ProcessKeyDownEvent(FKeyEvent(EKeys::Escape, FModifierKeysState(), 0, false, 0, 0));
			FSlateApplication::Get().ProcessKeyUpEvent(FKeyEvent(EKeys::Escape, FModifierKeysState(), 0, false, 0, 0));
			ActiveModal->RequestDestroyWindow();
			Result->SetStringField(TEXT("action"), TEXT("closed window"));
		}
		else
		{
			TArray<TSharedPtr<FJsonValue>> AvailableButtons;
			for (const FModalButton& Button : Buttons)
			{
				AvailableButtons.Add(MakeShared<FJsonValueString>(Button.Label));
			}
			Result->SetBoolField(TEXT("success"), false);
			Result->SetArrayField(TEXT("availableButtons"), AvailableButtons);
			Result->SetStringField(TEXT("error"), FString::Printf(
				TEXT("Button not found on dialog '%s'. Pass buttonLabel as one of [%s], or buttonIndex between 0 and %d, or action='close'."),
				*Title, *JoinLabels(Buttons), FMath::Max(0, Buttons.Num() - 1)));
		}
	}

	return MCPResult(Result);
}

EAppReturnType::Type FDialogHandlers::ParseResponseType(const FString& ResponseStr, bool& bOutValid)
{
	bOutValid = true;
	FString Lower = ResponseStr.ToLower();
	if (Lower == TEXT("yes"))       return EAppReturnType::Yes;
	if (Lower == TEXT("no"))        return EAppReturnType::No;
	if (Lower == TEXT("ok"))        return EAppReturnType::Ok;
	if (Lower == TEXT("cancel"))    return EAppReturnType::Cancel;
	if (Lower == TEXT("retry"))     return EAppReturnType::Retry;
	if (Lower == TEXT("continue"))  return EAppReturnType::Continue;
	if (Lower == TEXT("yesall"))    return EAppReturnType::YesAll;
	if (Lower == TEXT("noall"))     return EAppReturnType::NoAll;
	bOutValid = false;
	return EAppReturnType::Ok;
}

FString FDialogHandlers::ValidResponseList()
{
	return TEXT("yes, no, ok, cancel, retry, continue, yesall, noall");
}

FString FDialogHandlers::ResponseTypeToString(EAppReturnType::Type Response)
{
	switch (Response)
	{
	case EAppReturnType::Yes:      return TEXT("yes");
	case EAppReturnType::No:       return TEXT("no");
	case EAppReturnType::Ok:       return TEXT("ok");
	case EAppReturnType::Cancel:   return TEXT("cancel");
	case EAppReturnType::Retry:    return TEXT("retry");
	case EAppReturnType::Continue: return TEXT("continue");
	case EAppReturnType::YesAll:   return TEXT("yesall");
	case EAppReturnType::NoAll:    return TEXT("noall");
	default:                       return TEXT("unknown");
	}
}

FString FDialogHandlers::MsgTypeToString(EAppMsgType::Type MsgType)
{
	switch (MsgType)
	{
	case EAppMsgType::Ok:                         return TEXT("Ok");
	case EAppMsgType::YesNo:                      return TEXT("YesNo");
	case EAppMsgType::OkCancel:                   return TEXT("OkCancel");
	case EAppMsgType::YesNoCancel:                return TEXT("YesNoCancel");
	case EAppMsgType::CancelRetryContinue:        return TEXT("CancelRetryContinue");
	case EAppMsgType::YesNoYesAllNoAll:            return TEXT("YesNoYesAllNoAll");
	case EAppMsgType::YesNoYesAllNoAllCancel:      return TEXT("YesNoYesAllNoAllCancel");
	case EAppMsgType::YesNoYesAll:                return TEXT("YesNoYesAll");
	default:                                      return TEXT("Unknown");
	}
}
