import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import type { AppTheme } from "@/constants/theme";
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
import { AccountButton, AccountError, AccountText, accountStyles } from "@/modules/accounts/components/account-ui";

type Overlay =
  | { kind: "create" }
  | { kind: "edit" | "actions"; id: string }
  | { kind: "types" }
  | null;

export function AccountsScreen() {
  const theme = useAppTheme();
  const s = useThemeStyles(accountStyles);
  const pillStyles = useThemeStyles(createPillStyles);
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
  const assetAccounts = active.filter(
    (a) => a.accountType?.accountGroup === "asset",
  );
  const liabilityAccounts = active.filter(
    (a) => a.accountType?.accountGroup === "liability",
  );
  const unclassified = active.filter(
    (a) => !["asset", "liability"].includes(a.accountType?.accountGroup ?? ""),
  );
  const select = (account: AccountListItem) =>
    open({ kind: "actions", id: account.id });

  return (
    <PageContainer
      floatingAction={
        <FloatingActionButton
          accessibilityLabel="Add New Account"
          onPress={() => open({ kind: "create" })}
        />
      }
      header={
        <PageHeader
          title="Accounts"
          breadcrumb="Kaizen Finance / Accounts"
          subtitle="Consolidated view of your cash, savings, investments, and liabilities."
          primaryAction={{
            label: "+ Add Account",
            onPress: () => open({ kind: "create" }),
          }}
          secondaryActions={[
            { label: "Manage Types", onPress: () => open({ kind: "types" }) },
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
          size="large"
          style={{ marginVertical: 32 }}
        />
      ) : (
        <>
          {/* Hero Net Worth & Asset/Liability Summary */}
          <AccountOpeningSummary accounts={data.accounts} />

          {/* Filter Pills */}
          <View style={pillStyles.filterRow}>
            <Pressable
              accessibilityLabel={`All accounts (${active.length})`}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === "all" }}
              onPress={() => setFilter("all")}
              style={[
                pillStyles.pill,
                filter === "all" && pillStyles.pillActive,
              ]}
            >
              <Text
                style={[
                  pillStyles.pillText,
                  filter === "all" && pillStyles.pillTextActive,
                ]}
              >
                All Accounts ({active.length})
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={`Assets (${assetAccounts.length})`}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === "asset" }}
              onPress={() => setFilter("asset")}
              style={[
                pillStyles.pill,
                filter === "asset" && pillStyles.pillActive,
              ]}
            >
              <Text
                style={[
                  pillStyles.pillText,
                  filter === "asset" && pillStyles.pillTextActive,
                ]}
              >
                Assets ({assetAccounts.length})
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={`Liabilities (${liabilityAccounts.length})`}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === "liability" }}
              onPress={() => setFilter("liability")}
              style={[
                pillStyles.pill,
                filter === "liability" && pillStyles.pillActive,
              ]}
            >
              <Text
                style={[
                  pillStyles.pillText,
                  filter === "liability" && pillStyles.pillTextActive,
                ]}
              >
                Liabilities ({liabilityAccounts.length})
              </Text>
            </Pressable>
          </View>

          {/* Asset Accounts Section */}
          {(filter === "all" || filter === "asset") && (
            <AccountGroupSection
              group="asset"
              accounts={active}
              types={data.types}
              onSelect={select}
            />
          )}

          {/* Liability Accounts Section */}
          {(filter === "all" || filter === "liability") && (
            <AccountGroupSection
              group="liability"
              accounts={active}
              types={data.types}
              onSelect={select}
            />
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

          {/* Archived Section */}
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

function createPillStyles(theme: AppTheme) {
  return StyleSheet.create({
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    pill: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
    pillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pillText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    pillTextActive: {
      color: theme.colors.onPrimary,
    },
  });
}
