import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { useAccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import type { AccountListItem } from "@/modules/accounts/types/account.types";
import { AccountOpeningSummary } from "@/modules/accounts/components/account-opening-summary";
import { AccountGroupSection } from "@/modules/accounts/components/account-group-section";
import { ArchivedAccountsSection } from "@/modules/accounts/components/archived-accounts-section";
import { AccountFormModal } from "@/modules/accounts/components/account-form-modal";
import { AccountActionsSheet } from "@/modules/accounts/components/account-actions-sheet";
import { AccountTypeManager } from "@/modules/accounts/components/account-type-manager";
import { AccountRow } from "@/modules/accounts/components/account-row";
import {
  AccountButton,
  AccountError,
  AccountText,
  accountStyles,
} from "@/modules/accounts/components/account-ui";

type Overlay =
  | { kind: "create" }
  | { kind: "edit" | "actions"; id: string }
  | { kind: "types" }
  | null;

export function AccountsScreen() {
  const theme = useAppTheme();
  const s = useThemeStyles(accountStyles);
  const data = useAccounts();
  const mutations = useAccountMutations(data.refresh);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [filter, setFilter] = useState<"all" | "asset" | "liability">("all");
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
    open({ kind: "actions", id: account.id });

  return (
    <PageContainer
      header={
        <PageHeader
          title="Accounts"
          breadcrumb="Kaizen Finance / Accounts"
          subtitle="A clear starting point for your assets and liabilities."
          primaryAction={{
            label: "+ Add account",
            onPress: () => open({ kind: "create" }),
          }}
          secondaryActions={[
            { label: "Manage types", onPress: () => open({ kind: "types" }) },
          ]}
        />
      }
    >
      <AccountError message={data.error} />
      {!overlay && <AccountError message={mutations.error} />}
      {data.error && (
        <AccountButton label="Retry loading accounts" onPress={data.refresh} />
      )}
      {data.loading ? (
        <ActivityIndicator
          color={theme.colors.primary}
          accessibilityLabel="Loading accounts"
        />
      ) : (
        <>
          <AccountOpeningSummary accounts={data.accounts} />
          <View style={[s.row, s.section]}>
            {(["all", "asset", "liability"] as const).map((group) => (
              <AccountButton
                key={group}
                label={
                  group === "all"
                    ? "All accounts"
                    : group === "asset"
                      ? "Assets"
                      : "Liabilities"
                }
                selected={filter === group}
                onPress={() => setFilter(group)}
              />
            ))}
          </View>
          {(["asset", "liability"] as const).map(
            (group) =>
              (filter === "all" || filter === group) && (
                <AccountGroupSection
                  key={group}
                  group={group}
                  accounts={active}
                  types={data.types}
                  onSelect={select}
                />
              ),
          )}
          {unclassified.length > 0 && (
            <View style={s.section}>
              <AccountText heading>Accounts needing review</AccountText>
              <AccountText muted>
                These accounts have a missing or unrecognized type. They are
                excluded from group totals; edit them to select the correct
                type.
              </AccountText>
              {unclassified.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onPress={() => select(account)}
                />
              ))}
            </View>
          )}
          <ArchivedAccountsSection accounts={archived} onSelect={select} />
        </>
      )}
      {(overlay?.kind === "create" ||
        (overlay?.kind === "edit" && selected)) && (
        <AccountFormModal
          key={selected?.id ?? "new-account"}
          account={selected}
          types={data.types}
          pending={mutations.pending}
          error={mutations.error}
          onClose={close}
          onSave={mutations.saveAccount}
        />
      )}
      {overlay?.kind === "actions" && selected && (
        <AccountActionsSheet
          account={selected}
          siblings={data.accounts.filter(
            (a) =>
              a.accountTypeId === selected.accountTypeId &&
              a.isArchived === selected.isArchived,
          )}
          mutations={mutations}
          onClose={close}
          onEdit={() => open({ kind: "edit", id: selected.id })}
        />
      )}
      {overlay?.kind === "types" && (
        <AccountTypeManager
          types={data.types}
          accounts={data.accounts}
          mutations={mutations}
          onClose={close}
        />
      )}
    </PageContainer>
  );
}
