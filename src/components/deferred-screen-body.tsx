import { type PropsWithChildren, type ReactNode, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PageLoadingState } from "@/components/page-container";
import { scheduleAfterPaint } from "@/utils/schedule-after-paint";

export interface DeferredScreenBodyProps extends PropsWithChildren {
  header: ReactNode;
  loadingMessage?: string;
  loadingVariant?: "cards" | "list" | "grid" | "dashboard";
}

/**
 * Paints header + skeleton on the first frame, then mounts children (and their hooks).
 */
export function DeferredScreenBody({
  header,
  loadingMessage = "Loading...",
  loadingVariant = "cards",
  children,
}: DeferredScreenBodyProps) {
  const [bodyReady, setBodyReady] = useState(false);

  useEffect(() => {
    scheduleAfterPaint(() => setBodyReady(true));
  }, []);

  if (!bodyReady) {
    return (
      <View style={styles.root}>
        {header}
        <PageLoadingState message={loadingMessage} variant={loadingVariant} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
