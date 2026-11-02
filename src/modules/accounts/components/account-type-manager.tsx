import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ConfirmModal, IconHelper, InfoModal, NotificationModal } from "@/components";
import { Layers } from "lucide-react-native";
import { useLocalization } from "@/infrastructure/localization";
import { FullScreenFormModal } from "@/components/full-screen-form-modal";
import { SortableListModal } from "@/components/sortable-list-modal";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useExperiencePreferences } from "@/modules/settings";
import {
  WalkthroughRegistryProvider,
  DraggableTourChip,
  AccountGroupSetupWalkthroughOverlay,
  useAccountGroupSetupWalkthrough,
  WalkthroughIntroModal,
  useWalkthroughIntro,
  useWalkthroughRegistry,
  useWalkthroughTarget,
  WALKTHROUGH_SCROLL_TOP_OFFSET,
  type WalkthroughTargetId,
} from "@/modules/walkthrough";
import { AccountTypeBadge } from "@/modules/accounts/components/account-type-badge";
import { AccountTypeFormModal } from "@/modules/accounts/components/account-type-form-modal";
import { isSystemOthersAccountTypeId } from "@/modules/accounts/constants/account-types.constants";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import type {
  AccountGroup,
  AccountListItem,
  AccountType,
} from "@/modules/accounts/types/account.types";
import { isProtectedAccountType } from "@/modules/accounts/utils/account-type-protection";

export type AccountTypeManagerProps = {
  visible: boolean;
  types: AccountType[];
  accounts: AccountListItem[];
  mutations: AccountMutations;
  onClose: () => void;
};

export function AccountTypeManager(props: AccountTypeManagerProps) {
  if (!props.visible) return null;
  return (
    <WalkthroughRegistryProvider>
      <AccountTypeManagerContent {...props} />
    </WalkthroughRegistryProvider>
  );
}

function AccountTypeManagerContent({
  visible,
  types,
  accounts,
  mutations,
  onClose,
}: AccountTypeManagerProps) {
  const theme = useAppTheme();
  const { t } = useLocalization();
  const styles = useThemeStyles(createStyles);
  const { isPromptDismissed } = useExperiencePreferences();
  const [group, setGroup] = useState<AccountGroup>("asset");
  const [editor, setEditor] = useState<{ type?: AccountType } | null>(null);
  const [deleting, setDeleting] = useState<AccountType | null>(null);
  const [reorderVisible, setReorderVisible] = useState(false);

  const visibleTypes = types.filter((t) => t.accountGroup === group);
  const reorderableTypes = visibleTypes.filter(
    (type) => !isSystemOthersAccountTypeId(type.id),
  );
  const showReorder = reorderableTypes.length > 1;
  const activeColor = group === "asset" ? theme.colors.success : theme.colors.danger;

  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const didAutoStartWalkthroughRef = useRef(false);
  const { measureTargetInAncestor } = useWalkthroughRegistry();
  const pickerRef = useWalkthroughTarget("accountGroupPicker");
  const reorderRef = useWalkthroughTarget(showReorder ? "accountGroupReorder" : null);
  const newGroupRef = useWalkthroughTarget("accountGroupNew");

  const handleScrollToTarget = useCallback(
    (targetId: WalkthroughTargetId) => {
      void (async () => {
        const layout = await measureTargetInAncestor(targetId, scrollContentRef);
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

  const walkthrough = useAccountGroupSetupWalkthrough({
    onScrollToTarget: handleScrollToTarget,
    showReorder,
  });

  const walkthroughIntro = useWalkthroughIntro({
    promptKey: "accountGroupSetupWalkthroughDismissed",
    onStart: walkthrough.startWalkthrough,
    enabled: visible && !editor && !deleting,
  });

  useEffect(() => {
    if (visible && !editor && !deleting && walkthroughIntro.canTrigger) {
      const timer = setTimeout(() => {
        walkthroughIntro.triggerIfFirstTime();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [
    visible,
    editor,
    deleting,
    walkthroughIntro.canTrigger,
    walkthroughIntro.triggerIfFirstTime,
  ]);

  const back = () => {
    setEditor(null);
    setDeleting(null);
    setReorderVisible(false);
    mutations.clearError();
  };

  if (!visible) return null;

  if (editor) {
    return (
      <AccountTypeFormModal
        accounts={accounts}
        initialGroup={group}
        mutations={mutations}
        onClose={back}
        type={editor.type}
        visible={Boolean(editor)}
      />
    );
  }

  if (deleting) {
    const linkedCount = accounts.filter((a) => a.accountTypeId === deleting.id).length;
    const canDelete = linkedCount === 0;

    if (!canDelete) {
      return (
        <InfoModal
          message={
            linkedCount === 1
              ? "This group has 1 linked account. Reassign or remove it before deleting the group."
              : `This group has ${linkedCount} linked accounts. Reassign or remove them before deleting the group.`
          }
          onClose={back}
          title="Cannot Delete Account Type"
          variant="error"
          visible
        />
      );
    }

    return (
      <>
        <ConfirmModal
          cancelLabel="Cancel"
          confirmLabel="Delete group"
          message={`Delete "${deleting.name}" account group permanently? This cannot be undone.`}
          onCancel={back}
          onConfirm={() => {
            void mutations.deleteType(deleting.id).then((saved) => {
              if (saved) back();
            });
          }}
          pending={mutations.pending}
          title="Delete Account Type?"
          visible
        />
        <NotificationModal
          message={mutations.error ?? ""}
          onClose={mutations.clearError}
          title="Unable to delete account group"
          variant="error"
          visible={Boolean(mutations.error)}
        />
      </>
    );
  }

  return (
    <>
      <FullScreenFormModal
        pending={mutations.pending}
        title="Account Group Setup"
        titleAlign="left"
        visible
        onClose={onClose}
      >
        <DraggableTourChip
          onPress={walkthrough.startWalkthrough}
          visible={!walkthrough.isWalkthroughActive}
        />
        <ScrollView
          ref={scrollRef}
          scrollEnabled={
            walkthroughIntro.scrollEnabled && !walkthrough.isWalkthroughActive
          }
        >
          <View ref={scrollContentRef} collapsable={false} style={styles.formContent}>
          <View ref={pickerRef} collapsable={false} style={styles.segmentRow}>
              {(["asset", "liability"] as const).map((item) => (
                <Pressable
                  key={item}
                  disabled={mutations.pending}
                  onPress={() => setGroup(item)}
                  style={[
                    styles.segment,
                    group === item &&
                      (item === "asset" ? styles.segmentActiveAsset : styles.segmentActiveLiability),
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      group === item && styles.segmentTextActive,
                    ]}
                  >
                    {item === "asset" ? "Assets" : "Liabilities"}
                  </Text>
                </Pressable>
              ))}
            </View>

          <View style={styles.toolbar}>
            {showReorder ? (
              <Pressable
                ref={reorderRef as never}
                collapsable={false}
                accessibilityLabel="Reorder account groups"
                  accessibilityRole="button"
                  disabled={mutations.pending}
                  onPress={() => setReorderVisible(true)}
                  style={({ pressed }) => [
                    styles.toolbarChip,
                    { borderColor: `${activeColor}40` },
                    pressed && styles.toolbarChipPressed,
                  ]}
                >
                  <IconHelper color={activeColor} name="arrow-up-down" size={15} />
                  <Text style={[styles.toolbarChipText, { color: activeColor }]}>Reorder</Text>
                </Pressable>
            ) : null}

            <Pressable
              ref={newGroupRef as never}
              collapsable={false}
              accessibilityLabel="New Account Group"
                accessibilityRole="button"
                disabled={mutations.pending}
                onPress={() => {
                  mutations.clearError();
                  setEditor({});
                }}
                style={({ pressed }) => [
                  styles.toolbarChip,
                  styles.toolbarChipPrimary,
                  { borderColor: activeColor },
                  pressed && styles.toolbarChipPressed,
                ]}
              >
                <IconHelper color={activeColor} name="plus" size={15} />
                <Text style={[styles.toolbarChipText, { color: activeColor }]}>New Account Group</Text>
              </Pressable>
          </View>

          {visibleTypes.length === 0 ? (
            <Text style={styles.emptyText}>No types in this group.</Text>
          ) : (
            visibleTypes.map((type, index) => {
              const protectedType = isProtectedAccountType(type);
              return (
                <View key={type.id} style={styles.typeCard}>
                <View style={styles.typeHeader}>
                  <AccountTypeBadge color={type.color ?? null} iconKey={type.iconKey} />
                  <View style={styles.typeInfo}>
                    <Text style={styles.typeName}>{type.name}</Text>
                    <Text style={styles.typeMeta}>
                      {protectedType ? "System type" : "Custom type"} ·{" "}
                      {accounts.filter((a) => a.accountTypeId === type.id).length}{" "}
                      accounts
                    </Text>
                  </View>
                </View>
                <View style={styles.typeActions}>
                  <Pressable
                    disabled={mutations.pending}
                    onPress={() => {
                      mutations.clearError();
                      setEditor({ type });
                    }}
                    style={styles.actionChip}
                  >
                    <Text style={styles.actionChipText}>Edit</Text>
                  </Pressable>
                  {!protectedType ? (
                    <Pressable
                      disabled={mutations.pending}
                      onPress={() => {
                        mutations.clearError();
                        setDeleting(type);
                      }}
                      style={[styles.actionChip, styles.actionChipDanger]}
                    >
                      <Text style={styles.actionChipDangerText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
                </View>
              );
            })
          )}
          </View>
        </ScrollView>
        <AccountGroupSetupWalkthroughOverlay
          visible={walkthrough.isWalkthroughActive}
          stepIndex={walkthrough.activeStepIndex}
          totalSteps={walkthrough.totalSteps}
          step={walkthrough.currentStep}
          targetLayout={walkthrough.activeTargetLayout}
          onNext={walkthrough.nextStep}
          onPrev={walkthrough.prevStep}
          onSkip={walkthrough.skipWalkthrough}
        />
      </FullScreenFormModal>

      <SortableListModal
        items={reorderableTypes.map((type) => ({
          id: type.id,
          name: type.name,
          icon: type.iconKey,
          color: type.color,
        }))}
        onClose={() => setReorderVisible(false)}
        onSave={async (orderedIds) => {
          await mutations.reorderAccountTypes(orderedIds);
        }}
        title={`Reorder ${group === "asset" ? "Asset" : "Liability"} Groups`}
        titleAlign="left"
        visible={reorderVisible}
      />

      <NotificationModal
        message={mutations.error ?? ""}
        onClose={mutations.clearError}
        title="Unable to update account groups"
        variant="error"
        visible={Boolean(mutations.error)}
      />

      <WalkthroughIntroModal
        visible={visible && !editor && walkthroughIntro.isIntroVisible}
        title={t("accountGroupSetupWalkthrough.introTitle")}
        subtitle={t("accountGroupSetupWalkthrough.introSubtitle")}
        message={t("accountGroupSetupWalkthrough.introMessage")}
        icon={<Layers color={theme.colors.primary} size={32} />}
        onStart={walkthroughIntro.handleStart}
        onSkip={walkthroughIntro.handleSkip}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    formContent: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    segmentRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    segment: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      paddingVertical: theme.spacing.sm,
    },
    segmentActiveAsset: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
    },
    segmentActiveLiability: {
      backgroundColor: theme.colors.danger,
      borderColor: theme.colors.danger,
    },
    segmentText: {
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    segmentTextActive: {
      color: theme.colors.onPrimary,
    },
    toolbar: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    toolbarChip: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      minHeight: 42,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    toolbarChipPrimary: {
      borderWidth: 1.5,
      paddingHorizontal: theme.spacing.md,
    },
    toolbarChipPressed: {
      opacity: 0.7,
    },
    toolbarChipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
    typeCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    typeHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    typeInfo: {
      flex: 1,
    },
    typeName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
    },
    typeMeta: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      marginTop: 2,
    },
    typeActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs,
    },
    actionChip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
    },
    actionChipText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    actionChipDanger: {
      borderColor: `${theme.colors.danger}40`,
    },
    actionChipDangerText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
}
