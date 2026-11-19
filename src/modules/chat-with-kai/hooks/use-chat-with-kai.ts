import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ChatMessage,
  ParseChatTransactionContext,
  ParsedTransactionProposal,
} from "../types/chat-with-kai.types";
import { parseChatTransaction } from "../services/parse-chat-transaction.service";
import { buildSuggestedPrompts } from "../services/build-suggested-prompts.service";
import {
  appendChatSessionMessage,
  getChatSessionSnapshot,
  markChatSessionProposalDeleted,
  markChatSessionProposalSaved,
  resetChatSession,
  setChatSessionInputText,
  subscribeChatSession,
  updateChatSessionMessages,
  updateChatSessionProposalData,
} from "../utils/chat-session-store";
import {
  getCachedChatKeywords,
  setCachedChatKeywords,
} from "../utils/chat-keywords-cache";
import {
  addCategoryKeyword,
  getAccountKeywordMap,
  getCategoryKeywordMap,
  reassignCategoryKeyword,
  seedDefaultChatKnowledgeIfEmpty,
} from "../repositories/chat-knowledge.repository";
import {
  getActionKeywordMap,
  seedDefaultActionKeywordsIfEmpty,
} from "../repositories/action-keywords.repository";
import {
  getMerchantKeywordMap,
  seedDefaultMerchantsIfEmpty,
  upsertMerchant,
} from "../repositories/merchants.repository";
import type { MerchantLookupInfo } from "../services/extract-merchant-note.service";
import {
  findRecentDuplicateTransaction,
  getMerchantHistory,
  type TransactionType,
} from "@/modules/transactions";
import type { Category } from "@/modules/categories";
import { formatCurrency } from "@/utils/currency";

export interface UseChatWithKaiOptions {
  mode?: "review" | "auto";
  onAutoSave?: (proposal: ParsedTransactionProposal) => Promise<string | boolean | null>;
}

export function useChatWithKai(
  context: ParseChatTransactionContext,
  options?: UseChatWithKaiOptions,
) {
  const lang = context.language ?? "en";
  const currentMode = options?.mode ?? "review";
  const onAutoSave = options?.onAutoSave;
  const isMountedRef = useRef(true);
  const welcomeTimestampRef = useRef(new Date());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initialKeywords = getCachedChatKeywords();
  const [categoryKeywordsMap, setCategoryKeywordsMap] = useState<
    Map<string, string>
  >(() => initialKeywords?.categoryKeywordsMap ?? new Map());
  const [accountKeywordsMap, setAccountKeywordsMap] = useState<
    Map<string, string>
  >(() => initialKeywords?.accountKeywordsMap ?? new Map());
  const [actionKeywordsMap, setActionKeywordsMap] = useState<
    Map<string, TransactionType>
  >(() => initialKeywords?.actionKeywordsMap ?? new Map());
  const [merchantKeywordsMap, setMerchantKeywordsMap] = useState<
    Map<string, MerchantLookupInfo>
  >(() => initialKeywords?.merchantKeywordsMap ?? new Map());

  const reloadKeywords = useCallback(async () => {
    try {
      await Promise.all([
        seedDefaultChatKnowledgeIfEmpty(),
        seedDefaultActionKeywordsIfEmpty(),
        seedDefaultMerchantsIfEmpty(),
      ]);
      const [catMap, accMap, actMap, merchMap] = await Promise.all([
        getCategoryKeywordMap(),
        getAccountKeywordMap(),
        getActionKeywordMap(),
        getMerchantKeywordMap(),
      ]);
      setCachedChatKeywords({
        categoryKeywordsMap: catMap,
        accountKeywordsMap: accMap,
        actionKeywordsMap: actMap,
        merchantKeywordsMap: merchMap,
      });
      if (!isMountedRef.current) return;
      setCategoryKeywordsMap(catMap);
      setAccountKeywordsMap(accMap);
      setActionKeywordsMap(actMap);
      setMerchantKeywordsMap(merchMap);
    } catch {
      // In-memory fallback is used if DB query fails
    }
  }, []);

  useEffect(() => {
    const cached = getCachedChatKeywords();
    if (cached) {
      setCategoryKeywordsMap(cached.categoryKeywordsMap);
      setAccountKeywordsMap(cached.accountKeywordsMap);
      setActionKeywordsMap(cached.actionKeywordsMap);
      setMerchantKeywordsMap(cached.merchantKeywordsMap);
      return;
    }
    void reloadKeywords();
  }, [reloadKeywords]);

  const initialPrompts = useMemo(
    () =>
      buildSuggestedPrompts({
        accounts: context.accounts,
        defaultExpenseAccountId: context.defaultExpenseAccountId,
        defaultIncomeAccountId: context.defaultIncomeAccountId,
        language: lang,
      }),
    [
      context.accounts,
      context.defaultExpenseAccountId,
      context.defaultIncomeAccountId,
      lang,
    ],
  );

  const welcomeMessage = useMemo<ChatMessage>(() => {
    let welcomeText =
      "Hi! I'm Kai, your personal finance companion. Just type what you spent, received, or transferred!";
    if (lang === "fil") {
      welcomeText =
        "Kumusta! Ako si Kai, ang iyong kasama sa pananalapi. I-type lamang ang iyong nagastos, natanggap, o inilipat!";
    } else if (lang === "es") {
      welcomeText =
        "¡Hola! Soy Kai, tu asistente de finanzas personales. ¡Solo escribe lo que gastaste, recibiste o transferiste!";
    }

    return {
      id: "welcome-msg",
      role: "assistant",
      text: welcomeText,
      timestamp: welcomeTimestampRef.current,
      suggestedPrompts: initialPrompts,
    };
  }, [lang, initialPrompts]);

  const session = useSyncExternalStore(
    subscribeChatSession,
    getChatSessionSnapshot,
    getChatSessionSnapshot,
  );
  const messages = useMemo(
    () => [welcomeMessage, ...session.messages],
    [welcomeMessage, session.messages],
  );
  const inputText = session.inputText;
  const setInputText = setChatSessionInputText;
  const [processing, setProcessing] = useState(false);

  const sendMessage = useCallback(
    (customText?: string) => {
      const textToSend = (customText ?? inputText).trim();
      if (!textToSend || processing) return;

      const userMessageId = `user-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        text: textToSend,
        timestamp: new Date(),
      };

      setChatSessionInputText("");
      setProcessing(true);

      appendChatSessionMessage(userMessage);

      // Small async delay for natural conversational rhythm
      setTimeout(async () => {
        try {
          const enrichedContext: ParseChatTransactionContext = {
            ...context,
            categoryKeywordsMap:
              context.categoryKeywordsMap ?? categoryKeywordsMap,
            accountKeywordsMap:
              context.accountKeywordsMap ?? accountKeywordsMap,
            actionKeywordsMap:
              context.actionKeywordsMap ?? actionKeywordsMap,
            merchantKeywordsMap:
              context.merchantKeywordsMap ?? merchantKeywordsMap,
            getMerchantHistory:
              context.getMerchantHistory ?? getMerchantHistory,
            findRecentDuplicateTransaction:
              context.findRecentDuplicateTransaction ??
              findRecentDuplicateTransaction,
          };
          const result = parseChatTransaction(textToSend, enrichedContext);
          const assistantMessageId = `assistant-${Date.now()}`;

          if (result.success) {
            let proposal = result.proposal;
            let explanation = result.explanation;

            // Auto-Save mode: immediately save if all required fields are present
            if (currentMode === "auto" && onAutoSave) {
              try {
                const saveResult = await onAutoSave(proposal);
                if (saveResult) {
                  proposal = {
                    ...proposal,
                    isSaved: true,
                    transactionId: typeof saveResult === "string" ? saveResult : undefined,
                  };
                  const formatted = formatCurrency(
                    proposal.amountMinorUnits,
                    proposal.currencyCode,
                  );
                  const label =
                    proposal.categoryName ?? proposal.name ?? "transaction";
                  if (lang === "fil") {
                    explanation = `Naitala ang ${formatted} para sa ${label}.`;
                  } else if (lang === "es") {
                    explanation = `Se registró ${formatted} para ${label}.`;
                  } else {
                    explanation = `Recorded ${formatted} for ${label}.`;
                  }
                }
              } catch {
                // If auto-save encounters an error, proposal remains ready to save manually
              }
            }

            const assistantMsg: ChatMessage = {
              id: assistantMessageId,
              role: "assistant",
              text: explanation,
              timestamp: new Date(),
              proposal,
            };
            appendChatSessionMessage(assistantMsg);
          } else {
            const assistantMsg: ChatMessage = {
              id: assistantMessageId,
              role: "assistant",
              text: result.message,
              timestamp: new Date(),
              failureReason: result.reason,
              suggestedPrompts: result.suggestedPrompts,
              suggestedAmounts: result.suggestedAmounts,
              partialProposal: result.partialProposal,
            };
            appendChatSessionMessage(assistantMsg);
          }
        } finally {
          if (isMountedRef.current) {
            setProcessing(false);
          }
        }
      }, 180);
    },
    [
      inputText,
      processing,
      context,
      categoryKeywordsMap,
      accountKeywordsMap,
      actionKeywordsMap,
      merchantKeywordsMap,
      currentMode,
      onAutoSave,
      lang,
    ],
  );

  const markProposalSaved = markChatSessionProposalSaved;
  const updateProposalData = updateChatSessionProposalData;
  const markProposalDeleted = markChatSessionProposalDeleted;

  const assignCategoryToProposal = useCallback(
    async (messageId: string, category: Category) => {
      let candidateMerchantName: string | null = null;
      let completedProposalToSave: ParsedTransactionProposal | null = null;

      updateChatSessionMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.partialProposal) {
            candidateMerchantName = msg.partialProposal.name;
            const completedProposal: ParsedTransactionProposal = {
              ...msg.partialProposal,
              categoryId: category.id,
              categoryName: category.name,
              categoryIcon: category.icon ?? null,
              categoryColor: category.hexColorsId ?? null,
            };
            completedProposalToSave = completedProposal;

            let explanation = `I prepared your transaction for ${category.name}.`;
            if (lang === "fil") {
              explanation = `Naihanda ko ang iyong nagastos para sa ${category.name}.`;
            } else if (lang === "es") {
              explanation = `Preparé tu transacción para ${category.name}.`;
            }

            return {
              ...msg,
              text: explanation,
              failureReason: null,
              proposal: completedProposal,
              partialProposal: null,
            };
          }
          return msg;
        }),
      );

      // In Auto-Save mode, automatically record once category is chosen
      if (currentMode === "auto" && onAutoSave && completedProposalToSave) {
        try {
          const saveResult = await onAutoSave(completedProposalToSave);
          if (saveResult) {
            const formatted = formatCurrency(
              (completedProposalToSave as ParsedTransactionProposal).amountMinorUnits,
              (completedProposalToSave as ParsedTransactionProposal).currencyCode,
            );
            let explanation = `Recorded ${formatted} for ${category.name}.`;
            if (lang === "fil") {
              explanation = `Naitala ang ${formatted} para sa ${category.name}.`;
            } else if (lang === "es") {
              explanation = `Se registró ${formatted} para ${category.name}.`;
            }

            updateChatSessionMessages((prev) =>
              prev.map((msg) => {
                if (msg.id === messageId && msg.proposal) {
                  return {
                    ...msg,
                    text: explanation,
                    proposal: {
                      ...msg.proposal,
                      isSaved: true,
                      transactionId:
                        typeof saveResult === "string" ? saveResult : undefined,
                    },
                  };
                }
                return msg;
              }),
            );
          }
        } catch {
          // If auto-save encounters an error, proposal remains ready to save manually
        }
      }

      // Teach-Me-Once Learning: Persist merchant -> category keyword and merchant record
      if (candidateMerchantName) {
        try {
          await upsertMerchant(candidateMerchantName, category.id);
          await addCategoryKeyword(category.id, candidateMerchantName);
          await reloadKeywords();
        } catch {
          // If keyword is already assigned or conflicts, ignore gracefully
        }
      }
    },
    [lang, reloadKeywords, currentMode, onAutoSave],
  );

  const updateProposalCategory = useCallback(
    async (messageId: string, category: Category) => {
      let candidateMerchantName: string | null = null;

      updateChatSessionMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.proposal) {
            const originalCatId =
              msg.proposal.originalCategoryId ?? msg.proposal.categoryId;
            const matchedKw = msg.proposal.matchedKeyword;

            candidateMerchantName = msg.proposal.name;

            const updatedProposal: ParsedTransactionProposal = {
              ...msg.proposal,
              categoryId: category.id,
              categoryName: category.name,
              categoryIcon: category.icon ?? null,
              categoryColor: category.hexColorsId ?? null,
            };

            // Check if user changed the category of a matched keyword
            let pendingReassignment = null;
            if (matchedKw && originalCatId && originalCatId !== category.id) {
              pendingReassignment = {
                keyword: matchedKw,
                newCategoryId: category.id,
                newCategoryName: category.name,
              };
            }

            return {
              ...msg,
              proposal: updatedProposal,
              pendingKeywordReassignment: pendingReassignment,
            };
          }
          return msg;
        }),
      );

      // Auto-update merchant's default category if merchant name exists
      if (candidateMerchantName) {
        try {
          await upsertMerchant(candidateMerchantName, category.id);
          await reloadKeywords();
        } catch {
          // Ignore
        }
      }
    },
    [reloadKeywords],
  );

  const confirmReassignKeyword = useCallback(
    async (messageId: string) => {
      let kwToReassign: string | null = null;
      let newCatId: string | null = null;

      updateChatSessionMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.pendingKeywordReassignment) {
            kwToReassign = msg.pendingKeywordReassignment.keyword;
            newCatId = msg.pendingKeywordReassignment.newCategoryId;
            return {
              ...msg,
              pendingKeywordReassignment: null,
            };
          }
          return msg;
        }),
      );

      if (kwToReassign && newCatId) {
        try {
          await reassignCategoryKeyword(kwToReassign, newCatId);
          await reloadKeywords();
        } catch {
          // Ignore
        }
      }
    },
    [reloadKeywords],
  );

  const dismissReassignKeyword = useCallback((messageId: string) => {
    updateChatSessionMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, pendingKeywordReassignment: null }
          : msg,
      ),
    );
  }, []);

  const clearConversation = useCallback(() => {
    welcomeTimestampRef.current = new Date();
    resetChatSession();
  }, []);

  return {
    messages,
    inputText,
    setInputText,
    processing,
    sendMessage,
    markProposalSaved,
    updateProposalData,
    markProposalDeleted,
    assignCategoryToProposal,
    updateProposalCategory,
    confirmReassignKeyword,
    dismissReassignKeyword,
    clearConversation,
    categoryKeywordsMap,
    accountKeywordsMap,
    merchantKeywordsMap,
    reloadKeywords,
  };
}

export const useChatToEncode = useChatWithKai;
