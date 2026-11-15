import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { recordCrashlyticsError } from "@/infrastructure/telemetry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const SafeComponent: typeof Component =
  typeof Component === "function" && Component.prototype
    ? Component
    : (class {} as any);

export class CrashBoundary extends SafeComponent<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    recordCrashlyticsError(error, {
      componentStack: errorInfo.componentStack?.slice(0, 500) ?? "",
    });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred. Kaizen Finance automatically recorded this
            issue so we can fix it. Your financial data is safely saved on this
            device.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={this.handleReset}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#11231E",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#A0AEC0",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
