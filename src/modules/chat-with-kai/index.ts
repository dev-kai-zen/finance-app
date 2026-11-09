import { deferComponent, deferFunction } from "@/utils/deferred-module";

export const ChatWithKaiModal = deferComponent(
  () => require("./components/chat-with-kai-modal").ChatWithKaiModal,
  "ChatWithKaiModal",
) as typeof import("./components/chat-with-kai-modal").ChatWithKaiModal;

export const ChatToEncodeModal = deferComponent(
  () => require("./components/chat-with-kai-modal").ChatToEncodeModal,
  "ChatToEncodeModal",
) as typeof import("./components/chat-with-kai-modal").ChatToEncodeModal;

export const CategoryKeywordsManagerModal = deferComponent(
  () =>
    require("./components/category-keywords-manager-modal")
      .CategoryKeywordsManagerModal,
  "CategoryKeywordsManagerModal",
) as typeof import("./components/category-keywords-manager-modal").CategoryKeywordsManagerModal;

export const KaiKnowledgeModal = deferComponent(
  () => require("./components/kai-knowledge-modal").KaiKnowledgeModal,
  "KaiKnowledgeModal",
) as typeof import("./components/kai-knowledge-modal").KaiKnowledgeModal;

export const KaiCategoryPickerModal = deferComponent(
  () => require("./components/kai-category-picker-modal").KaiCategoryPickerModal,
  "KaiCategoryPickerModal",
) as typeof import("./components/kai-category-picker-modal").KaiCategoryPickerModal;

export const KaiAccountPickerModal = deferComponent(
  () => require("./components/kai-account-picker-modal").KaiAccountPickerModal,
  "KaiAccountPickerModal",
) as typeof import("./components/kai-account-picker-modal").KaiAccountPickerModal;

export const KaiMerchantPickerModal = deferComponent(
  () => require("./components/kai-merchant-picker-modal").KaiMerchantPickerModal,
  "KaiMerchantPickerModal",
) as typeof import("./components/kai-merchant-picker-modal").KaiMerchantPickerModal;

export const KaiKnowledgeHelpModal = deferComponent(
  () =>
    require("./components/kai-knowledge-help-modal").KaiKnowledgeHelpModal,
  "KaiKnowledgeHelpModal",
) as typeof import("./components/kai-knowledge-help-modal").KaiKnowledgeHelpModal;

export const KaiKnowledgeSelectorRow = deferComponent(
  () =>
    require("./components/kai-knowledge-selector-row").KaiKnowledgeSelectorRow,
  "KaiKnowledgeSelectorRow",
) as typeof import("./components/kai-knowledge-selector-row").KaiKnowledgeSelectorRow;

export const KaiKnowledgeScreen = deferComponent(
  () => require("./screens/kai-knowledge-screen").KaiKnowledgeScreen,
  "KaiKnowledgeScreen",
) as typeof import("./screens/kai-knowledge-screen").KaiKnowledgeScreen;

export const EntityKeywordsSection = deferComponent(
  () => require("./components/entity-keywords-section").EntityKeywordsSection,
  "EntityKeywordsSection",
) as typeof import("./components/entity-keywords-section").EntityKeywordsSection;

export type {
  KaiKnowledgeModalProps,
  KnowledgeTab,
} from "./components/kai-knowledge-modal";
export type { KaiCategoryPickerModalProps } from "./components/kai-category-picker-modal";
export type { KaiAccountPickerModalProps } from "./components/kai-account-picker-modal";
export type { KaiMerchantPickerModalProps } from "./components/kai-merchant-picker-modal";
export type { KaiKnowledgeHelpModalProps } from "./components/kai-knowledge-help-modal";
export type { KaiKnowledgeSelectorRowProps } from "./components/kai-knowledge-selector-row";
export type { EntityKeywordsSectionProps } from "./components/entity-keywords-section";

export const useChatWithKai = deferFunction(
  () => require("./hooks/use-chat-with-kai").useChatWithKai,
) as typeof import("./hooks/use-chat-with-kai").useChatWithKai;

export const useChatToEncode = deferFunction(
  () => require("./hooks/use-chat-with-kai").useChatToEncode,
) as typeof import("./hooks/use-chat-with-kai").useChatToEncode;
export { parseChatTransaction } from "./services/parse-chat-transaction.service";
export { extractAmount, extractAmounts } from "./services/extract-amount.service";
export { matchAccounts } from "./services/match-accounts.service";
export { matchCategory } from "./services/match-category.service";
export { matchCategoryWithKnowledge } from "./services/match-category-with-knowledge.service";
export { extractMerchantNote } from "./services/extract-merchant-note.service";
export { DuplicateKeywordError } from "./types/chat-with-kai.types";

export const seedDefaultChatKnowledgeIfEmpty = deferFunction(
  () => require("./repositories/chat-knowledge.repository").seedDefaultChatKnowledgeIfEmpty,
) as typeof import("./repositories/chat-knowledge.repository").seedDefaultChatKnowledgeIfEmpty;

export const listCategoryKeywords = deferFunction(
  () => require("./repositories/chat-knowledge.repository").listCategoryKeywords,
) as typeof import("./repositories/chat-knowledge.repository").listCategoryKeywords;

export const getCategoryKeywordMap = deferFunction(
  () => require("./repositories/chat-knowledge.repository").getCategoryKeywordMap,
) as typeof import("./repositories/chat-knowledge.repository").getCategoryKeywordMap;

export const getCategoryKeywordMapSync = deferFunction(
  () => require("./repositories/chat-knowledge.repository").getCategoryKeywordMapSync,
) as typeof import("./repositories/chat-knowledge.repository").getCategoryKeywordMapSync;

export const getCategoryKeywordsByCategoryId = deferFunction(
  () => require("./repositories/chat-knowledge.repository").getCategoryKeywordsByCategoryId,
) as typeof import("./repositories/chat-knowledge.repository").getCategoryKeywordsByCategoryId;

export const addCategoryKeyword = deferFunction(
  () => require("./repositories/chat-knowledge.repository").addCategoryKeyword,
) as typeof import("./repositories/chat-knowledge.repository").addCategoryKeyword;

export const updateCategoryKeyword = deferFunction(
  () => require("./repositories/chat-knowledge.repository").updateCategoryKeyword,
) as typeof import("./repositories/chat-knowledge.repository").updateCategoryKeyword;

export const deleteCategoryKeyword = deferFunction(
  () => require("./repositories/chat-knowledge.repository").deleteCategoryKeyword,
) as typeof import("./repositories/chat-knowledge.repository").deleteCategoryKeyword;

export const checkCategoryKeywordAvailable = deferFunction(
  () => require("./repositories/chat-knowledge.repository").checkCategoryKeywordAvailable,
) as typeof import("./repositories/chat-knowledge.repository").checkCategoryKeywordAvailable;

export const syncCategoryKeywords = deferFunction(
  () => require("./repositories/chat-knowledge.repository").syncCategoryKeywords,
) as typeof import("./repositories/chat-knowledge.repository").syncCategoryKeywords;

export const listAccountKeywords = deferFunction(
  () => require("./repositories/chat-knowledge.repository").listAccountKeywords,
) as typeof import("./repositories/chat-knowledge.repository").listAccountKeywords;

export const getAccountKeywordMap = deferFunction(
  () => require("./repositories/chat-knowledge.repository").getAccountKeywordMap,
) as typeof import("./repositories/chat-knowledge.repository").getAccountKeywordMap;

export const getAccountKeywordsByAccountId = deferFunction(
  () => require("./repositories/chat-knowledge.repository").getAccountKeywordsByAccountId,
) as typeof import("./repositories/chat-knowledge.repository").getAccountKeywordsByAccountId;

export const addAccountKeyword = deferFunction(
  () => require("./repositories/chat-knowledge.repository").addAccountKeyword,
) as typeof import("./repositories/chat-knowledge.repository").addAccountKeyword;

export const updateAccountKeyword = deferFunction(
  () => require("./repositories/chat-knowledge.repository").updateAccountKeyword,
) as typeof import("./repositories/chat-knowledge.repository").updateAccountKeyword;

export const deleteAccountKeyword = deferFunction(
  () => require("./repositories/chat-knowledge.repository").deleteAccountKeyword,
) as typeof import("./repositories/chat-knowledge.repository").deleteAccountKeyword;

export const checkAccountKeywordAvailable = deferFunction(
  () => require("./repositories/chat-knowledge.repository").checkAccountKeywordAvailable,
) as typeof import("./repositories/chat-knowledge.repository").checkAccountKeywordAvailable;

export const syncAccountKeywords = deferFunction(
  () => require("./repositories/chat-knowledge.repository").syncAccountKeywords,
) as typeof import("./repositories/chat-knowledge.repository").syncAccountKeywords;

export const listActionKeywords = deferFunction(
  () => require("./repositories/action-keywords.repository").listActionKeywords,
) as typeof import("./repositories/action-keywords.repository").listActionKeywords;

export const getActionKeywordsByType = deferFunction(
  () => require("./repositories/action-keywords.repository").getActionKeywordsByType,
) as typeof import("./repositories/action-keywords.repository").getActionKeywordsByType;

export const getActionKeywordMap = deferFunction(
  () => require("./repositories/action-keywords.repository").getActionKeywordMap,
) as typeof import("./repositories/action-keywords.repository").getActionKeywordMap;

export const addActionKeyword = deferFunction(
  () => require("./repositories/action-keywords.repository").addActionKeyword,
) as typeof import("./repositories/action-keywords.repository").addActionKeyword;

export const updateActionKeyword = deferFunction(
  () => require("./repositories/action-keywords.repository").updateActionKeyword,
) as typeof import("./repositories/action-keywords.repository").updateActionKeyword;

export const deleteActionKeyword = deferFunction(
  () => require("./repositories/action-keywords.repository").deleteActionKeyword,
) as typeof import("./repositories/action-keywords.repository").deleteActionKeyword;

export const checkActionKeywordAvailable = deferFunction(
  () => require("./repositories/action-keywords.repository").checkActionKeywordAvailable,
) as typeof import("./repositories/action-keywords.repository").checkActionKeywordAvailable;

export const seedDefaultActionKeywordsIfEmpty = deferFunction(
  () => require("./repositories/action-keywords.repository").seedDefaultActionKeywordsIfEmpty,
) as typeof import("./repositories/action-keywords.repository").seedDefaultActionKeywordsIfEmpty;

export const resetToDefaultActionKeywords = deferFunction(
  () => require("./repositories/action-keywords.repository").resetToDefaultActionKeywords,
) as typeof import("./repositories/action-keywords.repository").resetToDefaultActionKeywords;

export const listMerchants = deferFunction(
  () => require("./repositories/merchants.repository").listMerchants,
) as typeof import("./repositories/merchants.repository").listMerchants;

export const getMerchantKeywordMap = deferFunction(
  () => require("./repositories/merchants.repository").getMerchantKeywordMap,
) as typeof import("./repositories/merchants.repository").getMerchantKeywordMap;

export const upsertMerchant = deferFunction(
  () => require("./repositories/merchants.repository").upsertMerchant,
) as typeof import("./repositories/merchants.repository").upsertMerchant;

export const updateMerchant = deferFunction(
  () => require("./repositories/merchants.repository").updateMerchant,
) as typeof import("./repositories/merchants.repository").updateMerchant;

export const deleteMerchant = deferFunction(
  () => require("./repositories/merchants.repository").deleteMerchant,
) as typeof import("./repositories/merchants.repository").deleteMerchant;

export const addMerchantKeyword = deferFunction(
  () => require("./repositories/merchants.repository").addMerchantKeyword,
) as typeof import("./repositories/merchants.repository").addMerchantKeyword;

export const updateMerchantKeyword = deferFunction(
  () => require("./repositories/merchants.repository").updateMerchantKeyword,
) as typeof import("./repositories/merchants.repository").updateMerchantKeyword;

export const deleteMerchantKeyword = deferFunction(
  () => require("./repositories/merchants.repository").deleteMerchantKeyword,
) as typeof import("./repositories/merchants.repository").deleteMerchantKeyword;

export const checkMerchantKeywordAvailable = deferFunction(
  () => require("./repositories/merchants.repository").checkMerchantKeywordAvailable,
) as typeof import("./repositories/merchants.repository").checkMerchantKeywordAvailable;

export const checkMerchantNameAvailable = deferFunction(
  () => require("./repositories/merchants.repository").checkMerchantNameAvailable,
) as typeof import("./repositories/merchants.repository").checkMerchantNameAvailable;

export const listMerchantKeywords = deferFunction(
  () => require("./repositories/merchants.repository").listMerchantKeywords,
) as typeof import("./repositories/merchants.repository").listMerchantKeywords;

export const updateMerchantDefaultCategory = deferFunction(
  () => require("./repositories/merchants.repository").updateMerchantDefaultCategory,
) as typeof import("./repositories/merchants.repository").updateMerchantDefaultCategory;

export const seedDefaultMerchantsIfEmpty = deferFunction(
  () => require("./repositories/merchants.repository").seedDefaultMerchantsIfEmpty,
) as typeof import("./repositories/merchants.repository").seedDefaultMerchantsIfEmpty;

export const reassignCategoryKeyword = deferFunction(
  () => require("./repositories/chat-knowledge.repository").reassignCategoryKeyword,
) as typeof import("./repositories/chat-knowledge.repository").reassignCategoryKeyword;

export type {
  ChatWithKaiModalProps,
  ChatToEncodeModalProps,
  ChatSavedTransactionResult,
  ChatMessage,
  ParsedTransactionProposal,
  ParseChatTransactionResult,
  ParseChatTransactionSuccess,
  ParseChatTransactionFailure,
  ParseChatTransactionContext,
  CategoryKeywordItem,
  AccountKeywordItem,
  ActionKeywordItem,
  PendingKeywordReassignment,
} from "./types/chat-with-kai.types";

export type {
  MerchantItem,
  MerchantKeywordItem,
  MerchantLookupResult,
} from "./repositories/merchants.repository";


