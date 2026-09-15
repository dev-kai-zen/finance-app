import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check } from "lucide-react-native";
import { ConfirmModal, FullScreenFormModal, IconHelper, IconPickerModal } from "@/components";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import {
  ACCOUNT_COLOR_KEYS,
  ACCOUNT_ICON_KEYS,
} from "@/modules/accounts/constants/account-appearance.constants";
import type { AccountMutations } from "@/modules/accounts/hooks/use-account-mutations";
import type {
  AccountGroup,
  AccountListItem,
  AccountType,
} from "@/modules/accounts/types/account.types";
import { isProtectedAccountType } from "@/modules/accounts/utils/account-type-protection";

export interface AccountTypeFormModalProps {
  visible: boolean;
  type?: AccountType | null;
  initialGroup?: AccountGroup;
  accounts: AccountListItem[];
  mutations: AccountMutations;
  onClose: () => void;
}

export function AccountTypeFormModal({
  visible,
  type,
  initialGroup = "asset",
  accounts,
  mutations,
  onClose,
}: AccountTypeFormModalProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  type AccountColorKey = (typeof ACCOUNT_COLOR_KEYS)[number];

  const [name, setName] = useState("");
  const [accountGroup, setAccountGroup] = useState<AccountGroup>("asset");
  const [iconKey, setIconKey] = useState("landmark");
  const [color, setColor] = useState<AccountColorKey>("blue");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isProtected = type ? isProtectedAccountType(type) : false;
  const isEditing = Boolean(type);

  useEffect(() => {
    if (visible) {
      if (type) {
        setName(type.name);
        setAccountGroup(type.accountGroup === "liability" ? "liability" : "asset");
        setIconKey(type.iconKey ?? "landmark");
        const foundColor = ACCOUNT_COLOR_KEYS.find((c) => c === type.color);
        setColor(foundColor ?? "blue");
      } else {
        setName("");
        setAccountGroup(initialGroup);
        setIconKey("landmark");
        setColor(initialGroup === "liability" ? "amber" : "blue");
      }
      setLocalError(null);
      setIsConfirmDeleteOpen(false);
    }
  }, [visible, type, initialGroup]);

  const currentColorHex =
    color in theme.colors.categorical
      ? theme.colors.categorical[color as keyof AppTheme["colors"]["categorical"]]
      : theme.colors.primary;

  const linkedAccountsCount = type
    ? accounts.filter((a) => a.accountTypeId === type.id).length
    : 0;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setLocalError("Account group name is required.");
      return;
    }

    setLocalError(null);
    const success = await mutations.saveType(
      {
        name: trimmed,
        accountGroup,
        iconKey,
        color,
      },
      type?.id,
    );

    if (success) {
      onClose();
    }
  };

  const handleDeleteTrigger = () => {
    if (isProtected) return;
    if (linkedAccountsCount > 0) {
      setLocalError(
        linkedAccountsCount === 1
          ? "Reassign or remove the linked account before deleting this group."
          : `Reassign or remove the ${linkedAccountsCount} linked accounts before deleting this group.`,
      );
      return;
    }
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!type) return;
    const success = await mutations.deleteType(type.id);
    if (success) {
      setIsConfirmDeleteOpen(false);
      onClose();
    }
  };

  const displayError = localError || mutations.error;

  return (
    <>
      <FullScreenFormModal
        deleteDisabled={isProtected || !isEditing}
        onClose={onClose}
        onDelete={isEditing && !isProtected ? handleDeleteTrigger : undefined}
        onSave={handleSave}
        pending={mutations.pending}
        title={isEditing ? "Edit Account Group" : "New Account Group"}
        visible={visible}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {displayError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          ) : null}

          {/* Group Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>GROUP NAME</Text>
            <TextInput
              editable={!mutations.pending && !isProtected}
              maxLength={60}
              onChangeText={(text) => {
                setName(text);
                if (localError) setLocalError(null);
              }}
              placeholder="e.g. Bank Accounts, Investments, Credit Cards..."
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.textInput,
                isProtected && styles.textInputDisabled,
              ]}
              value={name}
            />
            {isProtected ? (
              <Text style={styles.helperText}>
                This system group name is protected. You can customize its appearance below.
              </Text>
            ) : null}
          </View>

          {/* Group Classification: Asset vs Liability */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>CLASSIFICATION</Text>
            <View style={styles.segmentContainer}>
              <Pressable
                accessibilityLabel="Set as Asset"
                accessibilityRole="button"
                disabled={mutations.pending || isProtected}
                onPress={() => setAccountGroup("asset")}
                style={[
                  styles.segmentOption,
                  accountGroup === "asset" && styles.segmentOptionActiveAsset,
                  isProtected && styles.segmentOptionDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    accountGroup === "asset" && styles.segmentTextActiveOnColor,
                  ]}
                >
                  Asset
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Set as Liability"
                accessibilityRole="button"
                disabled={mutations.pending || isProtected}
                onPress={() => setAccountGroup("liability")}
                style={[
                  styles.segmentOption,
                  accountGroup === "liability" && styles.segmentOptionActiveLiability,
                  isProtected && styles.segmentOptionDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    accountGroup === "liability" && styles.segmentTextActiveOnColor,
                  ]}
                >
                  Liability
                </Text>
              </Pressable>
            </View>
            {isProtected ? (
              <Text style={styles.helperText}>
                System default groups cannot change classification.
              </Text>
            ) : null}
          </View>

          {/* Icon Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>ICON</Text>
            <Pressable
              accessibilityLabel={`Current icon: ${iconKey}. Tap to change icon.`}
              accessibilityRole="button"
              disabled={mutations.pending}
              onPress={() => setIsIconPickerOpen(true)}
              style={styles.iconCard}
            >
              <View style={styles.iconCardLeft}>
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: `${currentColorHex}20`,
                      borderColor: `${currentColorHex}50`,
                    },
                  ]}
                >
                  <IconHelper color={currentColorHex} name={iconKey} size={22} />
                </View>
                <View style={styles.iconInfo}>
                  <Text style={styles.iconNameText}>{iconKey}</Text>
                  <Text style={styles.iconSubtext}>Tap to choose from icon library</Text>
                </View>
              </View>

              <View
                style={[
                  styles.changeBadge,
                  {
                    backgroundColor: `${theme.colors.primary}15`,
                    borderColor: `${theme.colors.primary}40`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.changeBadgeText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Change Icon
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Theme Color Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>THEME COLOR</Text>
            <View style={styles.colorPalette}>
              {ACCOUNT_COLOR_KEYS.map((colorKey) => {
                const hex =
                  colorKey in theme.colors.categorical
                    ? theme.colors.categorical[
                        colorKey as keyof AppTheme["colors"]["categorical"]
                      ]
                    : theme.colors.primary;
                const isSelected = color === colorKey;

                return (
                  <Pressable
                    key={colorKey}
                    accessibilityLabel={`Theme color ${colorKey}`}
                    accessibilityRole="button"
                    disabled={mutations.pending}
                    onPress={() => setColor(colorKey)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: hex },
                      isSelected
                        ? styles.colorSwatchSelected
                        : styles.colorSwatchUnselected,
                    ]}
                  >
                    {isSelected ? (
                      <Check color="#FFFFFF" size={20} strokeWidth={3} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Linked accounts count info */}
          {isEditing ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Group Details</Text>
              <Text style={styles.infoBoxText}>
                {linkedAccountsCount}{" "}
                {linkedAccountsCount === 1 ? "account belongs" : "accounts belong"} to
                this group.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </FullScreenFormModal>

      {/* Full Icon Picker Modal */}
      <IconPickerModal
        onClose={() => setIsIconPickerOpen(false)}
        onSelectIcon={(selected) => {
          setIconKey(selected);
          setIsIconPickerOpen(false);
        }}
        selectedIcon={iconKey}
        themeColor={currentColorHex}
        title="Select Group Icon"
        visible={isIconPickerOpen}
      />

      {/* Delete Confirmation Modal */}
      {isEditing && !isProtected ? (
        <ConfirmModal
          cancelLabel="Cancel"
          confirmLabel={mutations.pending ? "Deleting..." : "Delete Group"}
          message="Delete this account group permanently? This cannot be undone."
          onCancel={() => setIsConfirmDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          pending={mutations.pending}
          title={`Delete "${name || "Account Group"}"?`}
          variant="destructive"
          visible={isConfirmDeleteOpen}
        />
      ) : null}
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    formContent: {
      gap: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    errorBanner: {
      backgroundColor: `${theme.colors.danger}15`,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      padding: theme.spacing.md,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    inputGroup: {
      gap: theme.spacing.xs,
    },
    fieldLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.8,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    textInputDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textSecondary,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 16,
      marginTop: 2,
    },
    segmentContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      padding: 4,
    },
    segmentOption: {
      alignItems: "center",
      borderRadius: theme.borderRadius.small,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 10,
    },
    segmentOptionActiveAsset: {
      backgroundColor: theme.colors.success,
    },
    segmentOptionActiveLiability: {
      backgroundColor: theme.colors.danger,
    },
    segmentOptionDisabled: {
      opacity: 0.6,
    },
    segmentText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    segmentTextActiveOnColor: {
      color: theme.colors.onPrimary,
      fontWeight: theme.typography.fontWeight.bold,
    },
    iconCard: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      padding: theme.spacing.md,
      ...theme.shadows.card,
    },
    iconCardLeft: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    iconBadge: {
      alignItems: "center",
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      height: 44,
      justifyContent: "center",
      width: 44,
    },
    iconInfo: {
      gap: 2,
    },
    iconNameText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      textTransform: "capitalize",
    },
    iconSubtext: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    changeBadge: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    changeBadgeText: {
      fontSize: 12,
      fontWeight: "600",
    },
    colorPalette: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      minHeight: 64,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    colorSwatch: {
      alignItems: "center",
      justifyContent: "center",
    },
    colorSwatchUnselected: {
      borderRadius: 15,
      height: 30,
      opacity: 0.82,
      width: 30,
    },
    colorSwatchSelected: {
      borderColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: 22,
      borderWidth: 2.5,
      height: 44,
      width: 44,
      ...theme.shadows.card,
    },
    infoBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      gap: 4,
    },
    infoBoxTitle: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    infoBoxText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
