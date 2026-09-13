import { PropsWithChildren } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../../drizzle/migrations";
import { db } from "./client";
export function DatabaseProvider({ children }: PropsWithChildren) {
  const { success, error } = useMigrations(db, migrations);
  if (error)
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Unable to prepare the local database.
        </Text>
      </View>
    );
  if (!success)
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  return children;
}
const styles = StyleSheet.create({
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  errorText: { color: "#B42318" },
});
