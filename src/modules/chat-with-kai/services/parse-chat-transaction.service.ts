import type {
  ParseChatTransactionContext,
  ParseChatTransactionResult,
  ParsedTransactionProposal,
} from "../types/chat-with-kai.types";
import { INTENT_VOCABULARY } from "../constants/intent-vocabulary";
import { SAMPLE_PROMPTS } from "../constants/sample-prompts";
import { extractAmount } from "./extract-amount.service";
import { matchAccounts } from "./match-accounts.service";
import { matchCategory } from "./match-category.service";
import { extractMerchantNote } from "./extract-merchant-note.service";
import type { TransactionType } from "@/modules/transactions";

/**
 * Main Orchestrator: Parses a natural language sentence into a structured transaction proposal.
 */
export function parseChatTransaction(
  rawInput: string,
  context: ParseChatTransactionContext,
): ParseChatTransactionResult {
  const text = rawInput.trim();
  const lang = context.language ?? "en";
  const defaultPrompts = SAMPLE_PROMPTS[lang] ?? SAMPLE_PROMPTS.en;

  if (!text) {
    return {
      success: false,
      reason: "empty",
      message: getLocalizedMessage("empty", lang),
      suggestedPrompts: defaultPrompts.slice(0, 3),
    };
  }

  // 1. Amount Extraction
  const amountResult = extractAmount(text);
  if (!amountResult) {
    return {
      success: false,
      reason: "missing_amount",
      message: getLocalizedMessage("missing_amount", lang),
      suggestedPrompts: defaultPrompts.slice(0, 3),
    };
  }

  // 2. Intent / Transaction Type Detection
  const detectedType = detectTransactionType(
    text,
    lang,
    context.actionKeywordsMap,
  );

  // 3. Accounts Matching (Source & Destination)
  const defaultAccId =
    detectedType === "income"
      ? context.defaultIncomeAccountId || context.defaultExpenseAccountId
      : context.defaultExpenseAccountId;

  const accountsResult = matchAccounts(
    text,
    context.accounts,
    detectedType,
    defaultAccId,
    context.accountKeywordsMap,
  );

  if (accountsResult.unmatchedAccountAttempt) {
    return {
      success: false,
      reason: "unknown_account",
      message: getLocalizedMessage(
        "unknown_account",
        lang,
        accountsResult.unmatchedAccountAttempt,
      ),
      suggestedPrompts: defaultPrompts.slice(0, 3),
    };
  }

  if (detectedType === "transfer") {
    if (!accountsResult.sourceAccount || !accountsResult.destinationAccount) {
      if (context.accounts.length < 2) {
        return {
          success: false,
          reason: "missing_accounts",
          message: getLocalizedMessage("need_two_accounts_for_transfer", lang),
          suggestedPrompts: defaultPrompts.slice(0, 3),
        };
      }
      return {
        success: false,
        reason: "missing_transfer_destination",
        message: getLocalizedMessage("missing_transfer_destination", lang),
        suggestedPrompts: [
          `Transfer ${amountResult.rawAmount} from ${context.accounts[0]?.name ?? "Cash"} to ${context.accounts[1]?.name ?? "Bank"}`,
        ],
      };
    }
  }

  // Fallback source account if none matched
  const effectiveSourceAccount =
    accountsResult.sourceAccount ?? context.accounts[0] ?? null;

  if (!effectiveSourceAccount) {
    return {
      success: false,
      reason: "missing_accounts",
      message: getLocalizedMessage("no_accounts_available", lang),
      suggestedPrompts: [],
    };
  }

  // 4. Category Matching (For Expense / Income)
  const categoryResult = matchCategory(
    text,
    context.categories,
    detectedType,
    context.categoryKeywordsMap,
  );

  // 5. Merchant & Note Extraction
  const merchantNoteResult = extractMerchantNote({
    rawText: text,
    matchedAmountText: amountResult.matchedText,
    matchedAccountTexts: accountsResult.matchedTexts,
    matchedCategoryKeyword: categoryResult.matchedKeyword,
  });

  const currencyCode =
    effectiveSourceAccount.currencyCode || context.defaultCurrency || "PHP";

  const proposal: ParsedTransactionProposal = {
    type: detectedType,
    amountMinorUnits: amountResult.amountMinorUnits,
    currencyCode,
    name: merchantNoteResult.name,
    note: merchantNoteResult.note,
    occurredAt: new Date(),
    accountId: effectiveSourceAccount.id,
    accountName: effectiveSourceAccount.name,
    categoryId: categoryResult.category?.id ?? null,
    categoryName: categoryResult.category?.name ?? null,
    categoryIcon: categoryResult.category?.icon ?? null,
    categoryColor: categoryResult.category?.hexColorsId ?? null,
    transferAccountId: accountsResult.destinationAccount?.id ?? null,
    transferAccountName: accountsResult.destinationAccount?.name ?? null,
    isSaved: false,
  };

  return {
    success: true,
    proposal,
    confidence: categoryResult.confidence,
    explanation: getSuccessExplanation(proposal, lang),
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detects whether the prompt is an expense, income, or transfer.
 */
function detectTransactionType(
  text: string,
  lang: "en" | "fil" | "es",
  actionKeywordsMap?: Map<string, TransactionType>,
): TransactionType {
  const lower = text.toLowerCase();

  // 1. Dynamic Action Keywords from SQLite if provided
  if (actionKeywordsMap && actionKeywordsMap.size > 0) {
    const sortedKeywords = Array.from(actionKeywordsMap.keys()).sort(
      (a, b) => b.length - a.length,
    );

    // Check transfer cues first
    for (const kw of sortedKeywords) {
      if (actionKeywordsMap.get(kw) === "transfer") {
        if (new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(lower)) {
          return "transfer";
        }
      }
    }

    // Check income cues
    for (const kw of sortedKeywords) {
      if (actionKeywordsMap.get(kw) === "income") {
        if (new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(lower)) {
          return "income";
        }
      }
    }

    // Check expense cues explicitly
    for (const kw of sortedKeywords) {
      if (actionKeywordsMap.get(kw) === "expense") {
        if (new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i").test(lower)) {
          return "expense";
        }
      }
    }
  }

  // 2. Static vocabulary fallback
  const vocab = INTENT_VOCABULARY[lang] ?? INTENT_VOCABULARY.en;

  // Check transfer cues first
  for (const cue of vocab.transfer) {
    if (new RegExp(`\\b${escapeRegExp(cue)}\\b`, "i").test(lower)) {
      return "transfer";
    }
  }

  // Check income cues
  for (const cue of vocab.income) {
    if (new RegExp(`\\b${escapeRegExp(cue)}\\b`, "i").test(lower)) {
      return "income";
    }
  }

  // Default to expense
  return "expense";
}

function getLocalizedMessage(
  key:
    | "empty"
    | "missing_amount"
    | "missing_transfer_destination"
    | "need_two_accounts_for_transfer"
    | "no_accounts_available"
    | "unknown_account",
  lang: "en" | "fil" | "es",
  param?: string,
): string {
  const messages: Record<string, Record<"en" | "fil" | "es", string>> = {
    empty: {
      en: "Please type a message, for example: 'Spent 500 on lunch'.",
      fil: "Mangyaring mag-type ng mensahe, halimbawa: 'Nagastos ng 500 sa tanghalian'.",
      es: "Por favor escribe un mensaje, por ejemplo: 'Gasté 500 en almuerzo'.",
    },
    missing_amount: {
      en: "I couldn't identify the amount. How much was spent, received, or transferred? (e.g., 'Spent 500 on lunch').",
      fil: "Hindi ko nakita ang halaga. Magkano ang nagastos, natanggap, o inilipat? (hal., 'Nagastos ng 500 sa tanghalian').",
      es: "No pude identificar el monto. ¿Cuánto gastaste, recibiste o transferiste? (ej., 'Gasté 500 en almuerzo').",
    },
    missing_transfer_destination: {
      en: "I recognize a transfer, but where would you like to transfer to? (e.g. 'to GCash')",
      fil: "Naiintindihan ko na ito ay paglipat, ngunit saan mo gustong ilipat? (hal., 'papuntang GCash')",
      es: "Reconozco una transferencia, pero ¿a qué cuenta deseas transferir? (ej., 'a BBVA')",
    },
    need_two_accounts_for_transfer: {
      en: "You need at least two accounts to record a transfer.",
      fil: "Kailangan mo ng kahit dalawang account upang magtala ng paglipat.",
      es: "Necesitas al menos dos cuentas para registrar una transferencia.",
    },
    no_accounts_available: {
      en: "No active accounts found. Please create an account first.",
      fil: "Walang nahanap na aktibong account. Mangyaring gumawa muna ng account.",
      es: "No se encontraron cuentas activas. Por favor crea una cuenta primero.",
    },
    unknown_account: {
      en: `I couldn't find an account matching '${param ?? "account"}'. Please check your account name or add it in Manage Kai Knowledge.`,
      fil: `Hindi ko mahanap ang account na tumutugma sa '${param ?? "account"}'. Pakitingnan ang pangalan ng iyong account o idagdag ito sa Kaalaman ni Kai.`,
      es: `No pude encontrar una cuenta que coincida con '${param ?? "cuenta"}'. Por favor verifica el nombre de tu cuenta o agrégala en Conocimiento de Kai.`,
    },
  };

  return messages[key]?.[lang] ?? messages[key]?.en ?? "Could not understand prompt.";
}

function getSuccessExplanation(
  proposal: ParsedTransactionProposal,
  lang: "en" | "fil" | "es",
): string {
  if (proposal.type === "transfer") {
    if (lang === "fil") {
      return `Naihanda ko ang paglipat mula ${proposal.accountName} papuntang ${proposal.transferAccountName ?? "Account"}.`;
    }
    if (lang === "es") {
      return `Preparé la transferencia de ${proposal.accountName} hacia ${proposal.transferAccountName ?? "Cuenta"}.`;
    }
    return `I prepared the transfer from ${proposal.accountName} to ${proposal.transferAccountName ?? "Account"}.`;
  }

  if (proposal.type === "income") {
    if (lang === "fil") {
      return `Naihanda ko ang kita para sa ${proposal.accountName}.`;
    }
    if (lang === "es") {
      return `Preparé el ingreso para ${proposal.accountName}.`;
    }
    return `I prepared the income for ${proposal.accountName}.`;
  }

  if (lang === "fil") {
    return `Naihanda ko ang iyong nagastos para sa ${proposal.categoryName ?? "gastusin"}.`;
  }
  if (lang === "es") {
    return `Preparé tu gasto para ${proposal.categoryName ?? "gastos"}.`;
  }
  return `I prepared your transaction for ${proposal.categoryName ?? "expenses"}.`;
}
