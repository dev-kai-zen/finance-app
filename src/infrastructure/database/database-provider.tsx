import { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import migrations from "../../../drizzle/migrations";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { db } from "./client";
import { useAppMigrations } from "./migrator";

export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success, error } = useAppMigrations(db, migrations);
  const styles = useThemeStyles(createStyles);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Unable to prepare the local database.
        </Text>
        {error instanceof Error && error.message ? (
          <Text style={styles.errorDetails}>{error.message}</Text>
        ) : null}
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={styles.spinner.color} />
      </View>
    );
  }

  return children;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    centered: {
      alignItems: "center",
      backgroundColor: theme.colors.background,
      flex: 1,
      justifyContent: "center",
      padding: theme.spacing.xl,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: "center",
    },
    errorDetails: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.sm,
      textAlign: "center",
    },
    spinner: {
      color: theme.colors.primary,
    },
  });
}
