import { useCallback, useEffect, useState } from "react";
import type {
  ChatMessage,
  ParseChatTransactionContext,
  ParsedTransactionProposal,
} from "../types/chat-with-kai.types";
import { parseChatTransaction } from "../services/parse-chat-transaction.service";
import { SAMPLE_PROMPTS } from "../constants/sample-prompts";
import {
  getAccountKeywordMap,
  getCategoryKeywordMap,
  seedDefaultChatKnowledgeIfEmpty,
} from "../repositories/chat-knowledge.repository";
import {
  getActionKeywordMap,
  seedDefaultActionKeywordsIfEmpty,
} from "../repositories/action-keywords.repository";
import type { TransactionType } from "@/modules/transactions";

export function useChatWithKai(context: ParseChatTransactionContext) {
  const lang = context.language ?? "en";
  const initialPrompts = SAMPLE_PROMPTS[lang] ?? SAMPLE_PROMPTS.en;

  const [categoryKeywordsMap, setCategoryKeywordsMap] = useState<
    Map<string, string>
  >(new Map());
  const [accountKeywordsMap, setAccountKeywordsMap] = useState<
    Map<string, string>
  >(new Map());
  const [actionKeywordsMap, setActionKeywordsMap] = useState<
    Map<string, TransactionType>
  >(new Map());

  const reloadKeywords = useCallback(async () => {
    try {
      await Promise.all([
        seedDefaultChatKnowledgeIfEmpty(),
        seedDefaultActionKeywordsIfEmpty(),
      ]);
      const [catMap, accMap, actMap] = await Promise.all([
        getCategoryKeywordMap(),
        getAccountKeywordMap(),
        getActionKeywordMap(),
      ]);
      setCategoryKeywordsMap(catMap);
      setAccountKeywordsMap(accMap);
      setActionKeywordsMap(actMap);
    } catch {
      // In-memory fallback is used if DB query fails
    }
  }, []);

  useEffect(() => {
    reloadKeywords();
  }, [reloadKeywords]);

  const createInitialMessage = useCallback((): ChatMessage => {
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
      timestamp: new Date(),
      suggestedPrompts: initialPrompts.slice(0, 3),
    };
  }, [lang, initialPrompts]);

  const [messages, setMessages] = useState<ChatMessage[]>([createInitialMessage()]);
  const [inputText, setInputText] = useState("");
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

      setInputText("");
      setProcessing(true);

      setMessages((prev) => [...prev, userMessage]);

      // Small async delay for natural conversational rhythm
      setTimeout(() => {
        try {
          const enrichedContext: ParseChatTransactionContext = {
            ...context,
            categoryKeywordsMap:
              context.categoryKeywordsMap ?? categoryKeywordsMap,
            accountKeywordsMap:
              context.accountKeywordsMap ?? accountKeywordsMap,
            actionKeywordsMap:
              context.actionKeywordsMap ?? actionKeywordsMap,
          };
          const result = parseChatTransaction(textToSend, enrichedContext);
          const assistantMessageId = `assistant-${Date.now()}`;

          if (result.success) {
            const assistantMsg: ChatMessage = {
              id: assistantMessageId,
              role: "assistant",
              text: result.explanation,
              timestamp: new Date(),
              proposal: result.proposal,
            };
            setMessages((prev) => [...prev, assistantMsg]);
          } else {
            const assistantMsg: ChatMessage = {
              id: assistantMessageId,
              role: "assistant",
              text: result.message,
              timestamp: new Date(),
              failureReason: result.reason,
              suggestedPrompts: result.suggestedPrompts,
            };
            setMessages((prev) => [...prev, assistantMsg]);
          }
        } finally {
          setProcessing(false);
        }
      }, 180);
    },
    [inputText, processing, context, categoryKeywordsMap, accountKeywordsMap],
  );

  const markProposalSaved = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.proposal) {
          return {
            ...msg,
            proposal: {
              ...msg.proposal,
              isSaved: true,
            },
          };
        }
        return msg;
      }),
    );
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([createInitialMessage()]);
    setInputText("");
  }, [createInitialMessage]);

  return {
    messages,
    inputText,
    setInputText,
    processing,
    sendMessage,
    markProposalSaved,
    clearConversation,
    categoryKeywordsMap,
    accountKeywordsMap,
    reloadKeywords,
  };
}

export const useChatToEncode = useChatWithKai;
