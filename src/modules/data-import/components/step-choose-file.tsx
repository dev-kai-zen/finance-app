import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  FileSpreadsheet,
  Download,
  Share2,
  History,
  FileUp,
  CheckCircle2,
  Users,
} from "lucide-react-native";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { ImportType, ParsedCsvFile } from "../types/data-import.types";
import { pickAndParseImportFile } from "../services/parse-import-file.service";
import { downloadSampleFile, shareSampleFile } from "../services/sample-import-files.service";

interface StepChooseFileProps {
  importType: ImportType;
  onSelectImportType: (type: ImportType) => void;
  onFileLoaded: (file: ParsedCsvFile) => void;
  onOpenPastImports: () => void;
  onError: (msg: string) => void;
}

export function StepChooseFile({
  importType,
  onSelectImportType,
  onFileLoaded,
  onOpenPastImports,
  onError,
}: StepChooseFileProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [picking, setPicking] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handlePickFile = async () => {
    setPicking(true);
    setActionNotice(null);
    try {
      const res = await pickAndParseImportFile();
      if (res.canceled) return;
      if (res.error) {
        onError(res.error);
        return;
      }
      if (res.file) {
        onFileLoaded(res.file);
      }
    } catch (err: any) {
      onError(err?.message || "Could not read the chosen file.");
    } finally {
      setPicking(false);
    }
  };

  const handleDownloadExample = async () => {
    setActionNotice("Preparing example file...");
    try {
      const info = await downloadSampleFile(importType);
      setActionNotice(`Example file ready: ${info.name}`);
    } catch (err: any) {
      onError(err?.message || "Failed to download example file.");
    }
  };

  const handleShareExample = async () => {
    setActionNotice("Preparing example file to share...");
    try {
      await shareSampleFile(importType);
      setActionNotice(null);
    } catch (err: any) {
      onError(err?.message || "Failed to share example file.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Intro Question */}
      <View style={styles.introCard}>
        <Text style={styles.sectionTitle}>What would you like to bring into Kaizen?</Text>
        <Text style={styles.introSubtitle}>
          Choose what kind of data is in your file. We will guide you step by step.
        </Text>

        <View style={styles.typeOptions}>
          <Pressable
            accessibilityLabel="Import transaction history"
            accessibilityRole="radio"
            onPress={() => onSelectImportType("transactions")}
            style={[
              styles.typeCard,
              importType === "transactions" && styles.typeCardSelected,
            ]}
          >
            <View style={styles.typeIconRow}>
              <FileSpreadsheet
                color={importType === "transactions" ? theme.colors.primary : theme.colors.textSecondary}
                size={22}
              />
              {importType === "transactions" && (
                <CheckCircle2 color={theme.colors.primary} size={18} />
              )}
            </View>
            <Text style={[styles.typeTitle, importType === "transactions" && styles.typeTitleSelected]}>
              Transaction history
            </Text>
            <Text style={styles.typeDescription}>
              Bring in your past spending, earnings, and transfers from your bank or money app.
            </Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Import accounts only"
            accessibilityRole="radio"
            onPress={() => onSelectImportType("accounts")}
            style={[
              styles.typeCard,
              importType === "accounts" && styles.typeCardSelected,
            ]}
          >
            <View style={styles.typeIconRow}>
              <Users
                color={importType === "accounts" ? theme.colors.primary : theme.colors.textSecondary}
                size={22}
              />
              {importType === "accounts" && (
                <CheckCircle2 color={theme.colors.primary} size={18} />
              )}
            </View>
            <Text style={[styles.typeTitle, importType === "accounts" && styles.typeTitleSelected]}>
              Accounts only
            </Text>
            <Text style={styles.typeDescription}>
              Set up your bank accounts, cash wallets, and starting balances without past transactions.
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Choose File Action */}
      <View style={styles.actionCard}>
        <Text style={styles.cardHeader}>Select your file</Text>
        <Text style={styles.cardHint}>
          Accepts CSV, TSV, or plain text files up to 2 MB and 1,000 data rows. Your original file will never be changed.
        </Text>

        <Pressable
          accessibilityLabel="Choose a file to import"
          accessibilityRole="button"
          disabled={picking}
          onPress={handlePickFile}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
        >
          {picking ? (
            <ActivityIndicator color={theme.colors.primaryContrast} />
          ) : (
            <>
              <FileUp color={theme.colors.primaryContrast} size={20} />
              <Text style={styles.primaryButtonText}>Choose file from phone</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Example and History Tools */}
      <View style={styles.toolsCard}>
        <Text style={styles.toolsTitle}>Helpful tools</Text>

        <View style={styles.toolsGrid}>
          <Pressable
            accessibilityLabel="Download an example file"
            accessibilityRole="button"
            onPress={handleDownloadExample}
            style={styles.toolItem}
          >
            <Download color={theme.colors.primary} size={18} />
            <Text style={styles.toolItemText}>Save example file</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Share an example file"
            accessibilityRole="button"
            onPress={handleShareExample}
            style={styles.toolItem}
          >
            <Share2 color={theme.colors.primary} size={18} />
            <Text style={styles.toolItemText}>Share example file</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Open past imports"
            accessibilityRole="button"
            onPress={onOpenPastImports}
            style={styles.toolItem}
          >
            <History color={theme.colors.textSecondary} size={18} />
            <Text style={styles.toolItemText}>Past imports</Text>
          </Pressable>
        </View>

        {actionNotice ? <Text style={styles.actionNoticeText}>{actionNotice}</Text> : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.lg,
    },
    introCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 6,
    },
    introSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    typeOptions: {
      gap: theme.spacing.md,
    },
    typeCard: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    typeCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}0D`,
    },
    typeIconRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
    },
    typeTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
    },
    typeTitleSelected: {
      color: theme.colors.primary,
    },
    typeDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    actionCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      alignItems: "center",
      textAlign: "center",
    },
    cardHeader: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 6,
    },
    cardHint: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: theme.spacing.lg,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.xl,
      width: "100%",
    },
    primaryButtonPressed: {
      opacity: 0.85,
    },
    primaryButtonText: {
      color: theme.colors.primaryContrast,
      fontSize: 16,
      fontWeight: "700",
    },
    toolsCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
    },
    toolsTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: theme.spacing.sm,
    },
    toolsGrid: {
      gap: theme.spacing.xs,
    },
    toolItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
    },
    toolItemText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    actionNoticeText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: "600",
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
  });
}

