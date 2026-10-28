export {
  ChatWithKaiModal,
  ChatToEncodeModal,
} from "./components/chat-with-kai-modal";
export { CategoryKeywordsManagerModal } from "./components/category-keywords-manager-modal";
export {
  KaiKnowledgeModal,
  type KaiKnowledgeModalProps,
  type KnowledgeTab,
} from "./components/kai-knowledge-modal";
export {
  KaiCategoryPickerModal,
  type KaiCategoryPickerModalProps,
} from "./components/kai-category-picker-modal";
export {
  KaiAccountPickerModal,
  type KaiAccountPickerModalProps,
} from "./components/kai-account-picker-modal";
export {
  KaiMerchantPickerModal,
  type KaiMerchantPickerModalProps,
} from "./components/kai-merchant-picker-modal";
export {
  KaiKnowledgeHelpModal,
  type KaiKnowledgeHelpModalProps,
} from "./components/kai-knowledge-help-modal";
export {
  KaiKnowledgeSelectorRow,
  type KaiKnowledgeSelectorRowProps,
} from "./components/kai-knowledge-selector-row";
export { KaiKnowledgeScreen } from "./screens/kai-knowledge-screen";
export {
  useChatWithKai,
  useChatToEncode,
} from "./hooks/use-chat-with-kai";
export { parseChatTransaction } from "./services/parse-chat-transaction.service";
export { extractAmount, extractAmounts } from "./services/extract-amount.service";
export { matchAccounts } from "./services/match-accounts.service";
export { matchCategory } from "./services/match-category.service";
export { extractMerchantNote } from "./services/extract-merchant-note.service";
export {
  EntityKeywordsSection,
  type EntityKeywordsSectionProps,
} from "./components/entity-keywords-section";
export {
  seedDefaultChatKnowledgeIfEmpty,
  listCategoryKeywords,
  getCategoryKeywordMap,
  getCategoryKeywordsByCategoryId,
  addCategoryKeyword,
  updateCategoryKeyword,
  deleteCategoryKeyword,
  checkCategoryKeywordAvailable,
  syncCategoryKeywords,
  listAccountKeywords,
  getAccountKeywordMap,
  getAccountKeywordsByAccountId,
  addAccountKeyword,
  updateAccountKeyword,
  deleteAccountKeyword,
  checkAccountKeywordAvailable,
  syncAccountKeywords,
  DuplicateKeywordError,
} from "./repositories/chat-knowledge.repository";
export {
  listActionKeywords,
  getActionKeywordsByType,
  getActionKeywordMap,
  addActionKeyword,
  updateActionKeyword,
  deleteActionKeyword,
  checkActionKeywordAvailable,
  seedDefaultActionKeywordsIfEmpty,
  resetToDefaultActionKeywords,
} from "./repositories/action-keywords.repository";

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
export {
  listMerchants,
  getMerchantKeywordMap,
  upsertMerchant,
  updateMerchant,
  deleteMerchant,
  addMerchantKeyword,
  updateMerchantKeyword,
  deleteMerchantKeyword,
  checkMerchantKeywordAvailable,
  checkMerchantNameAvailable,
  listMerchantKeywords,
  updateMerchantDefaultCategory,
  seedDefaultMerchantsIfEmpty,
} from "./repositories/merchants.repository";
export { reassignCategoryKeyword } from "./repositories/chat-knowledge.repository";
export type {
  MerchantItem,
  MerchantKeywordItem,
  MerchantLookupResult,
} from "./repositories/merchants.repository";


