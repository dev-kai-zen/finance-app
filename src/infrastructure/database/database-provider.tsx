import { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../../drizzle/migrations";
import type { AppTheme } from "@/constants/theme";
import { useThemeStyles } from "@/hooks/use-app-theme";
import { db } from "./client";

export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);
  const styles = useThemeStyles(createStyles);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Unable to prepare the local database.
        </Text>
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
    },
    spinner: {
      color: theme.colors.primary,
    },
  });
}
