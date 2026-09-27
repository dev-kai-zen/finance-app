import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";

export interface ManualSetupStep {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  actionLabel: string;
  onPress: () => void;
}

export function ManualSetupChecklist({
  steps,
}: {
  steps: ManualSetupStep[];
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const completedCount = steps.filter(({ complete }) => complete).length;
  const nextStep = steps.find(({ complete }) => !complete);

  if (!nextStep) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>
            Finish setting up your workspace
          </Text>
          <Text style={styles.description}>
            You chose to start from scratch. Complete these steps in your own
            way before recording transactions.
          </Text>
        </View>
        <Text style={styles.progress}>
          {completedCount}/{steps.length}
        </Text>
      </View>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const Icon = step.complete ? CheckCircle2 : CircleDashed;
          const active = step.id === nextStep.id;
          return (
            <View key={step.id} style={[styles.step, active && styles.activeStep]}>
              <Icon
                color={step.complete ? theme.colors.success : theme.colors.textMuted}
                size={21}
              />
              <View style={styles.stepCopy}>
                <Text style={[styles.stepTitle, step.complete && styles.doneText]}>
                  {index + 1}. {step.title}
                </Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel={nextStep.actionLabel}
        accessibilityRole="button"
        onPress={nextStep.onPress}
        style={({ pressed }) => [
          styles.action,
          pressed && styles.actionPressed,
        ]}
      >
        <Text style={styles.actionText}>{nextStep.actionLabel}</Text>
        <ArrowRight color={theme.colors.onPrimary} size={18} />
      </Pressable>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: `${theme.colors.primary}45`,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      gap: theme.spacing.lg,
      padding: theme.spacing.xl,
      ...theme.shadows.card,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    headerCopy: { flex: 1, gap: theme.spacing.xs },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
    },
    progress: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    steps: { gap: theme.spacing.sm },
    step: {
      alignItems: "flex-start",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
    },
    activeStep: { backgroundColor: `${theme.colors.primary}0D` },
    stepCopy: { flex: 1, gap: 2 },
    stepTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    doneText: { color: theme.colors.textMuted },
    stepDescription: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: theme.typography.lineHeight.xs,
    },
    action: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.sm,
      minHeight: 44,
      paddingHorizontal: theme.spacing.lg,
    },
    actionPressed: { opacity: 0.78 },
    actionText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
  });
}
