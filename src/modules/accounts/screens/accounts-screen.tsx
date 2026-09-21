import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageContainer } from "@/components/page-container";
import { SortableListModal, type SortableItem } from "@/components/sortable-list-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { AccountFormModal } from "@/modules/accounts/components/account-form-modal";
import { AccountGroupSection } from "@/modules/accounts/components/account-group-section";
import { AccountOpeningSummary } from "@/modules/accounts/components/account-opening-summary";
import { AccountRow } from "@/modules/accounts/components/account-row";
import { AccountTypeManager } from "@/modules/accounts/components/account-type-manager";
import { AccountTypeFormModal } from "@/modules/accounts/components/account-type-form-modal";
import { AccountsFabSheet } from "@/modules/accounts/components/accounts-fab-sheet";
import { ArchivedAccountsChip } from "@/modules/accounts/components/archived-accounts-chip";
import { ArchivedAccountsModal } from "@/modules/accounts/components/archived-accounts-modal";
import { PocketFormModal } from "@/modules/accounts/components/pocket-form-modal";
import {
  AccountButton,
  AccountError,
  AccountText,
  accountStyles,
} from "@/modules/accounts/components/account-ui";
import { useAccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import type { AccountListItem, AccountType } from "@/modules/accounts/types/account.types";

type Overlay =
  | { kind: "create" }
  | { kind: "edit"; id: string }
  | { kind: "pocket-form"; accountId: string; pocketId?: string }
  | { kind: "types" }
  | { kind: "edit-type"; type: AccountType }
  | null;

export function AccountsScreen() {
  const theme = useAppTheme();
  const s = useThemeStyles(accountStyles);
  const data = useAccounts();
  const mutations = useAccountMutations(data.refresh);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [fabSheetOpen, setFabSheetOpen] = useState(false);
  const [archivedModalOpen, setArchivedModalOpen] = useState(false);
  const [expandedPocketAccountIds, setExpandedPocketAccountIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortModalTitle, setSortModalTitle] = useState("");
  const [sortItems, setSortItems] = useState<SortableItem[]>([]);
  const [onSaveSort, setOnSaveSort] = useState<
    ((orderedIds: string[]) => Promise<void>) | null
  >(null);

  const handleSortAccounts = (
    groupName: string,
    groupAccounts: AccountListItem[],
  ) => {
    setSortModalTitle(`Sort ${groupName}`);
    setSortItems(
      groupAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        icon: a.iconKey ?? a.accountType?.iconKey ?? "landmark",
        color: a.accountType?.hexColorsId ?? (a.accountType as any)?.color ?? null,
      })),
    );
    setOnSaveSort(() => async (orderedIds: string[]) => {
      await mutations.reorderAccounts(orderedIds);
    });
    setSortModalVisible(true);
  };

  const open = (next: Overlay) => {
    if (mutations.pending) return;
    mutations.clearError();
    setOverlay(next);
  };

  const close = () => setOverlay(null);
  const selectedAccountId = overlay
    ? "id" in overlay
      ? overlay.id
      : "accountId" in overlay
        ? overlay.accountId
        : null
    : null;
  const selected = data.accounts.find((a) => a.id === selectedAccountId);
  const selectedPocket =
    overlay?.kind === "pocket-form" && overlay.pocketId
      ? data.pockets.find((pocket) => pocket.id === overlay.pocketId)
      : undefined;
  const active = data.accounts.filter((a) => !a.isArchived);
  const archived = data.accounts.filter((a) => a.isArchived);
  const unclassified = active.filter(
    (a) => !["asset", "liability"].includes(a.accountType?.accountGroup ?? ""),
  );
  const select = (account: AccountListItem) =>
    open({ kind: "edit", id: account.id });
  const togglePockets = (accountId: string) => {
    setExpandedPocketAccountIds((current) => {
      const next = new Set(current);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  };
  const handleSelectArchivedAccount = (account: AccountListItem) => {
    setArchivedModalOpen(false);
    open({ kind: "edit", id: account.id });
  };
  const handleEditType = (type: AccountType) =>
    open({ kind: "edit-type", type });

  const contentSpacing = useThemeStyles((theme) => ({
    paddingTop: theme.spacing.lg,
  }));

  return (
    <PageContainer
      contentContainerStyle={contentSpacing}
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Open accounts menu"
          onPress={() => setFabSheetOpen(true)}
        />
      }
    >
      <AccountError message={data.error} />
      {!overlay && <AccountError message={mutations.error} />}
      {data.error ? (
        <AccountButton label="Retry loading accounts" onPress={data.refresh} />
      ) : null}

      {data.loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading accounts"
          color={theme.colors.primary}
          size="large"
          style={{ marginVertical: 32 }}
        />
      ) : (
        <>
          <ArchivedAccountsChip
            count={archived.length}
            onPress={() => setArchivedModalOpen(true)}
          />

          <AccountOpeningSummary accounts={data.accounts} />

          <AccountGroupSection
            accounts={active}
            group="asset"
            pockets={data.pockets}
            types={data.types}
            onEditType={handleEditType}
            expandedPocketAccountIds={expandedPocketAccountIds}
            onAddPocket={(account) =>
              open({ kind: "pocket-form", accountId: account.id })
            }
            onEditPocket={(pocket) =>
              open({
                kind: "pocket-form",
                accountId: pocket.accountId,
                pocketId: pocket.id,
              })
            }
            onSelect={select}
            onSort={handleSortAccounts}
            onTogglePockets={togglePockets}
          />

          <AccountGroupSection
            accounts={active}
            group="liability"
            pockets={data.pockets}
            types={data.types}
            onEditType={handleEditType}
            expandedPocketAccountIds={expandedPocketAccountIds}
            onAddPocket={(account) =>
              open({ kind: "pocket-form", accountId: account.id })
            }
            onEditPocket={(pocket) =>
              open({
                kind: "pocket-form",
                accountId: pocket.accountId,
                pocketId: pocket.id,
              })
            }
            onSelect={select}
            onSort={handleSortAccounts}
            onTogglePockets={togglePockets}
          />

          {unclassified.length > 0 ? (
            <View style={s.section}>
              <AccountText heading>Accounts needing review</AccountText>
              <AccountText muted>
                These accounts have a missing or unrecognized type. Edit them to
                select the correct type.
              </AccountText>
              {unclassified.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onPress={() => select(account)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}

      <AccountsFabSheet
        visible={fabSheetOpen}
        onAddAccount={() => open({ kind: "create" })}
        onClose={() => setFabSheetOpen(false)}
        onManageTypes={() => open({ kind: "types" })}
      />

      <AccountFormModal
        account={overlay?.kind === "edit" ? selected : undefined}
        error={mutations.error}
        pending={mutations.pending}
        types={data.types}
        visible={
          overlay?.kind === "create" ||
          (overlay?.kind === "edit" && !!selected)
        }
        onClose={close}
        onDelete={(accountId) => mutations.archiveAccount(accountId, true)}
        onRestore={(accountId) => mutations.archiveAccount(accountId, false)}
        onLockStartingBalance={mutations.lockStartingBalance}
        onSave={mutations.saveAccount}
      />

      <PocketFormModal
        account={overlay?.kind === "pocket-form" ? selected ?? null : null}
        mutations={mutations}
        pocket={selectedPocket}
        visible={overlay?.kind === "pocket-form" && !!selected}
        onClose={close}
        onSaved={close}
      />

      <AccountTypeManager
        accounts={data.accounts}
        mutations={mutations}
        types={data.types}
        visible={overlay?.kind === "types"}
        onClose={close}
      />

      <AccountTypeFormModal
        accounts={data.accounts}
        mutations={mutations}
        onClose={close}
        type={overlay?.kind === "edit-type" ? overlay.type : undefined}
        visible={overlay?.kind === "edit-type"}
      />

      <SortableListModal
        items={sortItems}
        title={sortModalTitle}
        visible={sortModalVisible}
        onClose={() => setSortModalVisible(false)}
        onSave={async (orderedIds) => {
          if (onSaveSort) {
            await onSaveSort(orderedIds);
          }
        }}
      />

      <ArchivedAccountsModal
        accounts={archived}
        pending={mutations.pending}
        visible={archivedModalOpen}
        onClose={() => setArchivedModalOpen(false)}
        onRestore={(accountId) => mutations.archiveAccount(accountId, false)}
        onSelect={handleSelectArchivedAccount}
      />
    </PageContainer>
  );
}
