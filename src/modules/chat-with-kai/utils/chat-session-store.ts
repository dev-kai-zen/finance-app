import { subscribeToDatabaseReplacement } from "@/infrastructure/database/database-replacement";
import type {
  ChatMessage,
  ParsedTransactionProposal,
} from "../types/chat-with-kai.types";

export interface ChatSessionSnapshot {
  messages: ChatMessage[];
  inputText: string;
}

const listeners = new Set<() => void>();

let snapshot: ChatSessionSnapshot = {
  messages: [],
  inputText: "",
};

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeChatSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getChatSessionSnapshot(): ChatSessionSnapshot {
  return snapshot;
}

export function setChatSessionInputText(inputText: string): void {
  if (snapshot.inputText === inputText) return;
  snapshot = { ...snapshot, inputText };
  emitChange();
}

export function appendChatSessionMessage(message: ChatMessage): void {
  snapshot = {
    ...snapshot,
    messages: [...snapshot.messages, message],
  };
  emitChange();
}

export function updateChatSessionMessages(
  updater: (prev: ChatMessage[]) => ChatMessage[],
): void {
  const nextMessages = updater(snapshot.messages);
  if (nextMessages === snapshot.messages) return;
  snapshot = {
    ...snapshot,
    messages: nextMessages,
  };
  emitChange();
}

export function markChatSessionProposalSaved(
  messageId: string,
  transactionId?: string | null,
): void {
  updateChatSessionMessages((prev) =>
    prev.map((msg) => {
      if (msg.id === messageId && msg.proposal) {
        return {
          ...msg,
          proposal: {
            ...msg.proposal,
            isSaved: true,
            transactionId: transactionId ?? msg.proposal.transactionId,
          },
        };
      }
      return msg;
    }),
  );
}

export function updateChatSessionProposalData(
  messageId: string,
  updated?: Partial<ParsedTransactionProposal>,
): void {
  updateChatSessionMessages((prev) =>
    prev.map((msg) => {
      if (msg.id !== messageId) return msg;
      const baseProposal = msg.proposal ?? msg.partialProposal;
      if (!baseProposal) return msg;

      return {
        ...msg,
        failureReason: msg.partialProposal ? null : msg.failureReason,
        partialProposal: msg.partialProposal ? null : msg.partialProposal,
        proposal: {
          ...baseProposal,
          ...(updated ?? {}),
          isSaved: true,
          transactionId: updated?.transactionId ?? baseProposal.transactionId,
        },
      };
    }),
  );
}

export function markChatSessionProposalDeleted(messageId: string): void {
  updateChatSessionMessages((prev) =>
    prev.map((msg) => {
      if (msg.id === messageId && msg.proposal) {
        return {
          ...msg,
          proposal: {
            ...msg.proposal,
            isDeleted: true,
          },
        };
      }
      return msg;
    }),
  );
}

export function resetChatSession(): void {
  if (snapshot.messages.length === 0 && snapshot.inputText === "") return;
  snapshot = {
    messages: [],
    inputText: "",
  };
  emitChange();
}

subscribeToDatabaseReplacement(resetChatSession);
