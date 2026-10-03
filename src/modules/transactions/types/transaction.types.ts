import type { LabelBadgeItem } from "@/modules/labels";

export type TransactionType = "income" | "expense" | "transfer";

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  pocketId: string | null;
  transactionGroupId: string | null;
  type: TransactionType;
  amountCents: number;
  name: string | null;
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt" | "deletedAt"> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export interface TransactionListItem extends Transaction {
  attachmentCount: number;
  accountName: string;
  accountCurrency: string;
  accountTypeName: string;
  accountPocketEnabled: boolean;
  accountBalanceAfterMinorUnits: number | null;
  locationBalanceAfterMinorUnits: number | null;
  deletedAt: Date | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  pocketName: string | null;
  /** Destination account on grouped transfer rows */
  transferAccountId: string | null;
  transferAccountName: string | null;
  transferAccountCurrency: string | null;
  transferAccountTypeName: string | null;
  transferAccountPocketEnabled: boolean | null;
  transferPocketId: string | null;
  transferPocketName: string | null;
  destinationBalanceAfterMinorUnits: number | null;
  destinationLocationBalanceAfterMinorUnits: number | null;
  /** Transfer fee details on grouped transfer rows */
  transferFeeAmountMinorUnits?: number | null;
  transferFeeAccountId?: string | null;
  transferFeeAccountName?: string | null;
  transferFeePocketId?: string | null;
  transferFeePocketName?: string | null;
  transferFeeCategoryId?: string | null;
  transferFeeCategoryName?: string | null;
  labels?: LabelBadgeItem[];
}

export type TransactionAttachmentSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed";

export interface TransactionAttachment {
  id: string;
  transactionId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  driveFileId: string | null;
  syncStatus: TransactionAttachmentSyncStatus;
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TransactionAttachmentDraft {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface TransactionAttachmentChanges {
  added: TransactionAttachmentDraft[];
  removedIds: string[];
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId: string;
  pocketId?: string | null;
  type: "income" | "expense";
  amountCents: number;
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
  installment?: {
    termMonths: number;
    deferredMonths?: number;
  } | null;
  labelIds?: string[];
}

export interface TransferFeeInput {
  amountCents: number;
  accountId: string;
  pocketId?: string | null;
  categoryId: string;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  fromPocketId?: string | null;
  toPocketId?: string | null;
  amountCents: number;
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
  fee?: TransferFeeInput | null;
  labelIds?: string[];
}

export interface UpdateTransferInput {
  transactionGroupId: string;
  fromAccountId: string;
  toAccountId: string;
  fromPocketId?: string | null;
  toPocketId?: string | null;
  amountCents: number;
  name?: string | null;
  note?: string | null;
  occurredAt: Date;
  fee?: TransferFeeInput | null;
  labelIds?: string[];
}

export interface TransactionFilter {
  type?: "all" | "income" | "expense" | "transfer";
  accountId?: string;
  categoryId?: string;
  searchQuery?: string;
  labelIds?: string[];
}

export interface TransactionStats {
  totalInflowMinorUnits: number;
  totalOutflowMinorUnits: number;
  netCashflowMinorUnits: number;
  transactionCount: number;
}

export interface TransferResult {
  transactionGroupId: string;
  outLeg: Transaction;
  inLeg: Transaction;
  feeLeg?: Transaction | null;
}
