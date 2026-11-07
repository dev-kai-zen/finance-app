import React, { useEffect, useState } from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, X, FileSpreadsheet, AlertTriangle } from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { ConfirmModal } from "@/components/confirm-modal";
import { NotificationModal } from "@/components/notification-modal";
import { useDataImportWizard } from "../hooks/use-data-import-wizard";
import { StepChooseFile } from "../components/step-choose-file";
import { StepMatchColumns } from "../components/step-match-columns";
import { StepMatchAccounts } from "../components/step-match-accounts";
import { StepMatchCategories } from "../components/step-match-categories";
import { StepReview } from "../components/step-review";
import { StepResult } from "../components/step-result";
import { PastImportsModal } from "../components/past-imports-modal";

export function DataImportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const wizard = useDataImportWizard();
  const [discardModalVisible, setDiscardModalVisible] = useState(false);
  const [pastImportsVisible, setPastImportsVisible] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Handle back button / gesture
  const handleBack = () => {
    if (wizard.step > 1 && wizard.step < 6) {
      wizard.goBack();
      return true;
    } else if (wizard.step === 1 || wizard.step === 6) {
      router.back();
      return true;
    }
    return false;
  };

  const handleClose = () => {
    if (wizard.parsedFile && wizard.step < 6) {
      setDiscardModalVisible(true);
    } else {
      router.back();
    }
  };

  useEffect(() => {
    if (Platform.OS === "android") {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        return handleBack();
      });
      return () => sub.remove();
    }
  }, [wizard.step]);

  // Steps breadcrumb label
  const stepTitles: Record<number, string> = {
    1: "Select file",
    2: "Match columns",
    3: "Match accounts",
    4: "Match categories",
    5: "Review rows",
    6: "Result",
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={handleBack}
          style={styles.iconButton}
        >
          <ArrowLeft color={theme.colors.text} size={22} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Import data</Text>
          <Text style={styles.stepSubtitle}>
            Step {wizard.step} of {wizard.importType === "accounts" ? 5 : 6}: {stepTitles[wizard.step]}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Close import"
          accessibilityRole="button"
          onPress={handleClose}
          style={styles.iconButton}
        >
          <X color={theme.colors.textSecondary} size={22} />
        </Pressable>
      </View>

      {/* File status banner (Visible on steps 2-5 after file chosen) */}
      {wizard.parsedFile && wizard.step >= 2 && wizard.step <= 5 ? (
        <View style={styles.fileInfoBanner}>
          <FileSpreadsheet color={theme.colors.primary} size={16} />
          <Text numberOfLines={1} style={styles.fileInfoText}>
            {wizard.parsedFile.fileName} • {wizard.parsedFile.rawRows.length} rows
          </Text>
        </View>
      ) : null}

      {/* Wizard Step Body */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {wizard.step === 1 && (
          <StepChooseFile
            importType={wizard.importType}
            onError={(msg) => setErrorNotice(msg)}
            onFileLoaded={wizard.handleFileChosen}
            onOpenPastImports={() => setPastImportsVisible(true)}
            onSelectImportType={wizard.setImportType}
          />
        )}

        {wizard.step === 2 && wizard.parsedFile && (
          <StepMatchColumns
            activeCurrencyCodes={new Set(wizard.activeCurrencies.map((c) => c.code.toUpperCase()))}
            config={wizard.config}
            defaultCurrencyCode={wizard.defaultCurrencyCode}
            importType={wizard.importType}
            onContinue={() => wizard.goToStep(3)}
            onUpdateColumn={wizard.updateColumnMapping}
            onUpdateConfig={wizard.updateConfig}
            parsedFile={wizard.parsedFile}
          />
        )}

        {wizard.step === 3 && (
          <StepMatchAccounts
            accountMatches={wizard.accountMatches}
            activeCurrencies={wizard.activeCurrencies}
            availableAccountTypes={wizard.availableAccountTypes}
            defaultCurrencyCode={wizard.defaultCurrencyCode}
            existingAccounts={wizard.existingAccounts}
            importType={wizard.importType}
            onContinue={() => wizard.goToStep(4)}
            onUpdateAccountMatch={(k, dec) =>
              wizard.setAccountMatches((prev) => ({ ...prev, [k]: dec }))
            }
          />
        )}

        {wizard.step === 4 && wizard.importType === "transactions" && (
          <StepMatchCategories
            categoryMatches={wizard.categoryMatches}
            existingCategories={wizard.existingCategories}
            onContinue={() => wizard.goToStep(5)}
            onUpdateCategoryMatch={(k, dec) =>
              wizard.setCategoryMatches((prev) => ({ ...prev, [k]: dec }))
            }
          />
        )}

        {wizard.step === 5 && wizard.preview && (
          <StepReview
            defaultCurrencyCode={wizard.defaultCurrencyCode}
            existingAccounts={wizard.existingAccounts}
            importType={wizard.importType}
            isSaving={wizard.isSaving}
            onApplyOverride={wizard.setRowOverride}
            onConfirmImport={wizard.performImport}
            onConfirmSimilar={wizard.confirmRowSimilar}
            onToggleExclude={wizard.toggleRowExcluded}
            rows={wizard.preview.rows}
            summary={wizard.preview.summary}
          />
        )}

        {wizard.step === 6 && wizard.importResult && (
          <StepResult
            defaultCurrencyCode={wizard.defaultCurrencyCode}
            importType={wizard.importType}
            onDone={() => router.back()}
            result={wizard.importResult}
          />
        )}
      </ScrollView>

      {/* Discard draft confirmation modal */}
      <ConfirmModal
        cancelLabel="Keep editing"
        confirmLabel="Discard draft"
        message="Are you sure you want to discard this import draft? Your choices will be lost."
        onCancel={() => setDiscardModalVisible(false)}
        onConfirm={() => {
          setDiscardModalVisible(false);
          router.back();
        }}
        title="Discard import draft?"
        variant="destructive"
        visible={discardModalVisible}
      />

      {/* Past imports history modal */}
      <PastImportsModal
        onClose={() => setPastImportsVisible(false)}
        visible={pastImportsVisible}
      />

      {/* Error notification modal */}
      <NotificationModal
        message={errorNotice || wizard.error || ""}
        onClose={() => {
          setErrorNotice(null);
        }}
        title="Import notice"
        variant="warning"
        visible={Boolean(errorNotice || wizard.error)}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    iconButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    headerCenter: {
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
    },
    stepSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    fileInfoBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: `${theme.colors.primary}12`,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: `${theme.colors.primary}30`,
    },
    fileInfoText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.md,
    },
  });
}

