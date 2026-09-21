import { PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import migrations from "../../../drizzle/migrations";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { db } from "./client";
import { subscribeToDatabaseReplacement } from "./database-replacement";
import { useAppMigrations } from "./migrator";

export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success, error } = useAppMigrations(db, migrations);
  const [databaseRevision, setDatabaseRevision] = useState(0);
  const styles = useThemeStyles(createStyles);

  useEffect(
    () =>
      subscribeToDatabaseReplacement(() => {
        setDatabaseRevision((revision) => revision + 1);
      }),
    [],
  );

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

  return (
    <View key={databaseRevision} style={styles.content}>
      {children}
    </View>
  );
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
    content: {
      flex: 1,
    },
  });
}
