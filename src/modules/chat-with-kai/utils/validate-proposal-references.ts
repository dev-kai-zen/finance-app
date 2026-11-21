import type { AccountListItem, PocketListItem } from "@/modules/accounts";
import type { Category } from "@/modules/categories";
import type { ParsedTransactionProposal } from "../types/chat-with-kai.types";

/**
 * Validates that an unsaved Kai proposal still references active (non-deleted,
 * non-archived) accounts, pockets, and categories before saving.
 * Returns a user-facing error message if a reference is stale, or null if valid.
 */
export function validateProposalReferences(
  proposal: ParsedTransactionProposal,
  accounts: readonly AccountListItem[],
  pockets: readonly PocketListItem[],
  categories: readonly Category[],
): string | null {
  const hasActiveAccount = (id: string | null | undefined) =>
    Boolean(id && accounts.some((account) => account.id === id && !account.isArchived));

  const hasActivePocket = (id: string | null | undefined, accountId: string) =>
    Boolean(
      id &&
        pockets.some(
          (pocket) =>
            pocket.id === id &&
            pocket.accountId === accountId &&
            !pocket.isArchived,
        ),
    );

  if (!hasActiveAccount(proposal.accountId)) {
    return `The account "${proposal.accountName}" is no longer available. Tap Edit to pick another account.`;
  }

  if (proposal.pocketId && !hasActivePocket(proposal.pocketId, proposal.accountId)) {
    return `The pocket "${proposal.pocketName ?? ""}" is no longer available. Tap Edit to update it.`;
  }

  if (proposal.type === "transfer") {
    if (
      proposal.transferAccountId &&
      !hasActiveAccount(proposal.transferAccountId)
    ) {
      return `The destination account "${proposal.transferAccountName ?? ""}" is no longer available. Tap Edit to pick another account.`;
    }
    if (
      proposal.transferPocketId &&
      proposal.transferAccountId &&
      !hasActivePocket(proposal.transferPocketId, proposal.transferAccountId)
    ) {
      return `The destination pocket "${proposal.transferPocketName ?? ""}" is no longer available. Tap Edit to update it.`;
    }
    return null;
  }

  if (proposal.categoryId) {
    const categoryExists = categories.some(
      (cat) =>
        cat.id === proposal.categoryId ||
        (cat.subcategories?.some((sub) => sub.id === proposal.categoryId) ??
          false),
    );
    if (!categoryExists) {
      return `The category "${proposal.categoryName ?? ""}" is no longer available. Tap Edit or pick another category.`;
    }
  }

  return null;
}
