import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { FloatingActionButton } from "@/components/floating-action-button";
import { PageContainer } from "@/components/page-container";
import { NotificationModal } from "@/components/notification-modal";
import { SortableListModal, type SortableItem } from "@/components/sortable-list-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useExperiencePreferences } from "@/modules/settings";
import { useLocalization } from "@/infrastructure/localization";
import { Wallet } from "lucide-react-native";
import {
  WalkthroughRegistryProvider,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  DraggableTourChip,
  WalkthroughIntroModal,
  AccountsWalkthroughOverlay,
  useAccountsWalkthrough,
  useWalkthroughIntro,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { AccountFormModal } from "@/modules/accounts/components/account-form-modal";
import { AccountGroupSection } from "@/modules/accounts/components/account-group-section";
import { AccountRow } from "@/modules/accounts/components/account-row";
import { AccountSearchBox } from "@/modules/accounts/components/account-search-box";
import { AccountTypeManager } from "@/modules/accounts/components/account-type-manager";
import { AccountTypeFormModal } from "@/modules/accounts/components/account-type-form-modal";
import { AccountsFabSheet } from "@/modules/accounts/components/accounts-fab-sheet";
import { ArchivedAccountsChip } from "@/modules/accounts/components/archived-accounts-chip";
import { ArchivedAccountsModal } from "@/modules/accounts/components/archived-accounts-modal";
import { FundGroupsChip } from "@/modules/accounts/components/fund-groups-chip";
import { FundGroupsModal } from "@/modules/accounts/components/fund-groups-modal";
import { PocketFormModal } from "@/modules/accounts/components/pocket-form-modal";
import {
  AccountButton,
  AccountError,
  AccountText,
  accountStyles,
} from "@/modules/accounts/components/account-ui";
import { useAccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import { useAccounts } from "@/modules/accounts/hooks/use-accounts";
import { useFundGroups } from "@/modules/accounts/hooks/use-fund-groups";
import type {
  AccountListItem,
  AccountType,
  PocketListItem,
} from "@/modules/accounts/types/account.types";
import { PRO_LIMITS, ProFeatureModal, useProGuard } from "@/modules/pro";
import { AdBanner } from "@/modules/ads";

type Overlay =
  | { kind: "create" }
  | { kind: "edit"; id: string }
  | { kind: "pocket-form"; accountId: string; pocketId?: string }
  | { kind: "types" }
  | { kind: "edit-type"; type: AccountType }
  | null;

export function AccountsScreen(props: {
  initialView?: "types" | "account" | "archived";
}) {
  return (
    <WalkthroughRegistryProvider>
      <AccountsScreenContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function AccountsScreenContent({
  initialView,
}: {
  initialView?: "types" | "account" | "archived";
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useLocalization();
  const s = useThemeStyles(accountStyles);
  const data = useAccounts();
  const fundGroups = useFundGroups();
  const mutations = useAccountMutations(data.refresh);
  const { guardAction, paywallVisible, closePaywall, guardMeta } = useProGuard();
  const [overlay, setOverlay] = useState<Overlay>(() => {
    if (initialView === "types") return { kind: "types" };
    if (initialView === "account") return { kind: "create" };
    return null;
  });

  const [fabSheetOpen, setFabSheetOpen] = useState(false);
  const [archivedModalOpen, setArchivedModalOpen] = useState(
    () => initialView === "archived",
  );

  useEffect(() => {
    if (initialView === "account") {
      setOverlay({ kind: "create" });
      router.setParams({ setup: undefined, view: undefined });
    } else if (initialView === "types") {
      setOverlay({ kind: "types" });
      router.setParams({ setup: undefined, view: undefined });
    } else if (initialView === "archived") {
      setArchivedModalOpen(true);
      router.setParams({ setup: undefined, view: undefined });
    }
  }, [initialView, router]);
  const [archivedRestorePocketError, setArchivedRestorePocketError] = useState<
    string | null
  >(null);
  const [fundGroupsModalOpen, setFundGroupsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPocketAccountIds, setExpandedPocketAccountIds] = useState<Set<string>>(
    () => new Set(),
  );

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const fabRef = useRef<View>(null);
  const searchRef = useWalkthroughTarget("searchBox");
  const { registerTarget, measureTargetInAncestor } = useWalkthroughRegistry();
  const { isPromptDismissed } = useExperiencePreferences();

  useEffect(() => {
    registerTarget("accountsFab", fabRef);
    return () => registerTarget("accountsFab", null);
  }, [registerTarget]);

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      if (targetId === "accountsFab") {
        return;
      }

      void (async () => {
        const layout = await measureTargetInAncestor(
          targetId,
          scrollContentRef,
        );
        if (!layout) {
          return;
        }

        scrollRef.current?.scrollTo({
          y: Math.max(0, layout.y - WALKTHROUGH_SCROLL_TOP_OFFSET),
          animated: true,
        });
      })();
    },
    [measureTargetInAncestor],
  );

  const walkthrough = useAccountsWalkthrough({
    onScrollToTarget: handleScrollToTarget,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "accountsWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
  });

  useEffect(() => {
    if (!data.loading && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [data.loading, walkthroughIntro.canTrigger, walkthroughIntro.triggerIfFirstTime]);

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
  const archivedPockets = data.pockets.filter((pocket) => pocket.isArchived);
  const accountById = useMemo(
    () => new Map(data.accounts.map((account) => [account.id, account])),
    [data.accounts],
  );
  const archivedCount = archived.length + archivedPockets.length;
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredActive = normalizedSearchQuery
    ? active.filter((account) =>
        account.name.toLocaleLowerCase().includes(normalizedSearchQuery),
      )
    : active;
  const unclassified = filteredActive.filter(
    (a) => !["asset", "liability"].includes(a.accountType?.accountGroup ?? ""),
  );
  const hasSearchResults = filteredActive.length > 0;
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
    if (active.length >= PRO_LIMITS.FREE_MAX_ACCOUNTS) {
      guardAction(() => {
        setArchivedModalOpen(false);
        open({ kind: "edit", id: account.id });
      });
      return;
    }
    setArchivedModalOpen(false);
    open({ kind: "edit", id: account.id });
  };
  const handleSelectArchivedPocket = (pocket: PocketListItem) => {
    const accountPockets = data.pockets.filter(
      (p) => p.accountId === pocket.accountId && !p.isArchived,
    );
    if (accountPockets.length >= PRO_LIMITS.FREE_MAX_POCKETS_PER_ACCOUNT) {
      guardAction(() => {
        setArchivedModalOpen(false);
        open({ kind: "pocket-form", accountId: pocket.accountId, pocketId: pocket.id });
      });
      return;
    }
    setArchivedModalOpen(false);
    open({ kind: "pocket-form", accountId: pocket.accountId, pocketId: pocket.id });
  };
  const handleEditType = (type: AccountType) =>
    open({ kind: "edit-type", type });

  const handleOpenCreatePocket = (account: AccountListItem) => {
    const accountPockets = data.pockets.filter(
      (p) => p.accountId === account.id && !p.isArchived,
    );
    if (accountPockets.length >= PRO_LIMITS.FREE_MAX_POCKETS_PER_ACCOUNT) {
      guardAction(() => {
        open({ kind: "pocket-form", accountId: account.id });
      }, {
        featureTitle: t("pro.limits.accountsTitle"),
        featureDescription: t("pro.limits.pocketsDesc"),
      });
      return;
    }
    open({ kind: "pocket-form", accountId: account.id });
  };

  const contentSpacing = useThemeStyles((theme) => ({
    paddingTop: theme.spacing.lg,
  }));
  const managementActions = useThemeStyles((theme) => ({
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  }));
  const searchSpacing = useThemeStyles((theme) => ({
    marginBottom: theme.spacing.lg,
  }));

  return (
    <PageContainer
      contentContainerStyle={contentSpacing}
      scrollContentRef={scrollContentRef}
      scrollRef={scrollRef}
      floatingAction={
        <>
          <FloatingActionButton
            accessibilityLabel="Open accounts menu"
            fabRef={fabRef}
            onPress={() => {
              if (walkthrough.isWalkthroughActive) {
                walkthrough.completeWalkthrough();
              }
              setFabSheetOpen(true);
            }}
          />
          <DraggableTourChip
            onPress={walkthrough.startWalkthrough}
            visible={!walkthrough.isWalkthroughActive}
          />
        </>
      }
    >
      <AccountError message={data.error} />
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
          <View style={managementActions}>
            <ArchivedAccountsChip
              count={archivedCount}
              onPress={() => setArchivedModalOpen(true)}
            />
            <FundGroupsChip
              count={fundGroups.groups.length}
              onPress={() => {
                fundGroups.refresh();
                setFundGroupsModalOpen(true);
              }}
            />
          </View>

          <AccountSearchBox
            style={searchSpacing}
            targetRef={searchRef}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {!normalizedSearchQuery || hasSearchResults ? (
            <>
              {filteredActive.some(
                (account) => account.accountType?.accountGroup === "asset",
              ) || !normalizedSearchQuery ? (
                <AccountGroupSection
                  accounts={filteredActive}
                  group="asset"
                  pockets={data.pockets}
                  types={data.types}
                  onEditType={handleEditType}
                  expandedPocketAccountIds={expandedPocketAccountIds}
                  onAddPocket={handleOpenCreatePocket}
                  onEditPocket={(pocket) =>
                    open({
                      kind: "pocket-form",
                      accountId: pocket.accountId,
                      pocketId: pocket.id,
                    })
                  }
                  onSelect={select}
                  onSort={normalizedSearchQuery ? undefined : handleSortAccounts}
                  onTogglePockets={togglePockets}
                  walkthroughTargetId="assetsSection"
                />
              ) : null}

              <AdBanner
                placement="accounts"
                variant="card"
                style={{ marginVertical: theme.spacing.sm }}
              />

              {filteredActive.some(
                (account) => account.accountType?.accountGroup === "liability",
              ) || !normalizedSearchQuery ? (
                <AccountGroupSection
                  accounts={filteredActive}
                  group="liability"
                  pockets={data.pockets}
                  types={data.types}
                  onEditType={handleEditType}
                  expandedPocketAccountIds={expandedPocketAccountIds}
                  onAddPocket={handleOpenCreatePocket}
                  onEditPocket={(pocket) =>
                    open({
                      kind: "pocket-form",
                      accountId: pocket.accountId,
                      pocketId: pocket.id,
                    })
                  }
                  onSelect={select}
                  onSort={normalizedSearchQuery ? undefined : handleSortAccounts}
                  onTogglePockets={togglePockets}
                  walkthroughTargetId="liabilitiesSection"
                />
              ) : null}
            </>
          ) : (
            <View style={s.section}>
              <AccountText heading>No matching accounts</AccountText>
              <AccountText muted>
                No active account matches “{searchQuery.trim()}”.
              </AccountText>
            </View>
          )}

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
        onAddAccount={() => {
          if (active.length >= PRO_LIMITS.FREE_MAX_ACCOUNTS) {
            guardAction(() => {
              open({ kind: "create" });
            }, {
              featureTitle: t("pro.limits.accountsTitle"),
              featureDescription: t("pro.limits.accountsDesc", {
                count: PRO_LIMITS.FREE_MAX_ACCOUNTS,
              }),
            });
            return;
          }
          open({ kind: "create" });
        }}
        onClose={() => setFabSheetOpen(false)}
        onManageTypes={() => open({ kind: "types" })}
      />

      <AccountFormModal
        account={overlay?.kind === "edit" ? selected : undefined}
        accounts={data.accounts}
        error={mutations.error}
        onClearError={mutations.clearError}
        pending={mutations.pending}
        typeMutations={mutations}
        types={data.types}
        visible={
          overlay?.kind === "create" ||
          (overlay?.kind === "edit" && !!selected)
        }
        onClose={close}
        onDelete={(accountId) => mutations.archiveAccount(accountId, true)}
        onRestore={(accountId) => mutations.archiveAccount(accountId, false)}
        onPermanentDelete={mutations.deleteAccount}
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
        accountById={accountById}
        accounts={archived}
        pockets={archivedPockets}
        pending={mutations.pending}
        restorePocketError={archivedRestorePocketError}
        visible={archivedModalOpen}
        onClose={() => {
          setArchivedModalOpen(false);
          setArchivedRestorePocketError(null);
        }}
        onDismissRestorePocketError={() => setArchivedRestorePocketError(null)}
        onPermanentDeleteAccount={mutations.deleteAccount}
        onPermanentDeletePocket={mutations.deletePocket}
        onRestoreAccount={async (accountId) => {
          if (active.length >= PRO_LIMITS.FREE_MAX_ACCOUNTS) {
            setArchivedModalOpen(false);
            guardAction(() => {}, {
              featureTitle: t("pro.limits.accountsTitle"),
              featureDescription: t("pro.limits.restoreAccountDesc", {
                count: PRO_LIMITS.FREE_MAX_ACCOUNTS,
              }),
            });
            return false;
          }
          return mutations.archiveAccount(accountId, false);
        }}
        onRestorePocket={async (pocketId) => {
          const pocket = archivedPockets.find((p) => p.id === pocketId);
          if (pocket) {
            const accountPockets = data.pockets.filter(
              (p) => p.accountId === pocket.accountId && !p.isArchived,
            );
            if (accountPockets.length >= PRO_LIMITS.FREE_MAX_POCKETS_PER_ACCOUNT) {
              setArchivedModalOpen(false);
              guardAction(() => {}, {
                featureTitle: t("pro.limits.accountsTitle"),
                featureDescription: t("pro.limits.restorePocketDesc", {
                  count: PRO_LIMITS.FREE_MAX_POCKETS_PER_ACCOUNT,
                }),
              });
              return false;
            }
          }
          setArchivedRestorePocketError(null);
          mutations.clearError();
          const restored = await mutations.archivePocket(pocketId, false);
          if (!restored && mutations.error) {
            setArchivedRestorePocketError(mutations.error);
          }
          return restored;
        }}
        onSelectAccount={handleSelectArchivedAccount}
        onSelectPocket={handleSelectArchivedPocket}
      />

      <FundGroupsModal
        accounts={fundGroups.accounts}
        groups={fundGroups.groups}
        loadError={fundGroups.error}
        loading={fundGroups.loading}
        pockets={fundGroups.pockets}
        visible={fundGroupsModalOpen}
        onClose={() => setFundGroupsModalOpen(false)}
        onRefresh={fundGroups.refresh}
      />

      <NotificationModal
        message={mutations.error ?? ""}
        onClose={mutations.clearError}
        title="Unable to update accounts"
        variant="error"
        visible={!overlay && Boolean(mutations.error)}
      />

      <ProFeatureModal
        featureDescription={guardMeta?.featureDescription}
        featureTitle={guardMeta?.featureTitle}
        onClose={closePaywall}
        visible={paywallVisible}
      />

      <WalkthroughIntroModal
        visible={walkthroughIntro.isIntroVisible}
        title={t("accountsWalkthrough.introTitle")}
        subtitle={t("accountsWalkthrough.introSubtitle")}
        message={t("accountsWalkthrough.introMessage")}
        icon={<Wallet color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />

      <AccountsWalkthroughOverlay
        visible={walkthrough.isWalkthroughActive}
        stepIndex={walkthrough.activeStepIndex}
        totalSteps={walkthrough.totalSteps}
        step={walkthrough.currentStep}
        targetLayout={walkthrough.activeTargetLayout}
        onNext={walkthrough.nextStep}
        onPrev={walkthrough.prevStep}
        onSkip={walkthrough.skipWalkthrough}
        onFabPress={() => {
          walkthrough.nextStep();
        }}
      />
    </PageContainer>
  );
}
