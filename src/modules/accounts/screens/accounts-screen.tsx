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
import { ArchivedAccountsSection } from "@/modules/accounts/components/archived-accounts-section";
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
        color: a.accountType?.color ?? null,
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
  const selected =
    overlay && "id" in overlay
      ? data.accounts.find((a) => a.id === overlay.id)
      : undefined;
  const active = data.accounts.filter((a) => !a.isArchived);
  const archived = data.accounts.filter((a) => a.isArchived);
  const unclassified = active.filter(
    (a) => !["asset", "liability"].includes(a.accountType?.accountGroup ?? ""),
  );
  const select = (account: AccountListItem) =>
    open({ kind: "edit", id: account.id });
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
          <AccountOpeningSummary accounts={data.accounts} />

          <AccountGroupSection
            accounts={active}
            group="asset"
            types={data.types}
            onEditType={handleEditType}
            onSelect={select}
            onSort={handleSortAccounts}
          />

          <AccountGroupSection
            accounts={active}
            group="liability"
            types={data.types}
            onEditType={handleEditType}
            onSelect={select}
            onSort={handleSortAccounts}
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

          <ArchivedAccountsSection
            accounts={archived}
            pending={mutations.pending}
            onRestore={(accountId) => mutations.archiveAccount(accountId, false)}
            onSelect={select}
          />
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
        onSave={mutations.saveAccount}
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
    </PageContainer>
  );
}
