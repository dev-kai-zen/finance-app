import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronRight,
  Clock,
  CreditCard,
  Send,
  Sparkles,
} from "lucide-react-native";

import { AppButton, ModalScreenHeader, ThemedSwitch } from "@/components";
import { PageContainer } from "@/components/page-container";
import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";
import { TransactionDateTimePickerModal } from "@/modules/transactions";
import { ReminderLeadDaysSelector } from "../components/reminder-lead-days-selector";
import { useNotificationPermission } from "../hooks/use-notification-permission";
import { useNotificationSettings } from "../hooks/use-notification-settings";
import { sendTestNotification } from "../services/send-test-notification.service";

type ActivePickerTarget =
  | "dailyReminderTime"
  | "creditCardsReminderTime"
  | "scheduledTransactionsReminderTime"
  | null;

export function ReminderSettingsScreen() {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { hasPermission, openSettings, requestPermission } =
    useNotificationPermission();
  const { settings, toggleLeadDay, updateSetting } = useNotificationSettings();

  const [activePicker, setActivePicker] = useState<ActivePickerTarget>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const formatTimeDisplay = (timeStr: string): string => {
    const parts = timeStr.split(":");
    const h = Number.parseInt(parts[0] || "0", 10);
    const m = Number.parseInt(parts[1] || "0", 10);
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : `${m}`;
    return `${displayH}:${displayM} ${period}`;
  };

  const getPickerInitialDate = (target: ActivePickerTarget): Date => {
    const date = new Date();
    let timeStr = "09:00";
    if (target === "dailyReminderTime") {
      timeStr = settings.dailyReminderTime;
    } else if (target === "creditCardsReminderTime") {
      timeStr = settings.creditCardsReminderTime;
    } else if (target === "scheduledTransactionsReminderTime") {
      timeStr = settings.scheduledTransactionsReminderTime;
    }
    const [h, m] = timeStr.split(":");
    date.setHours(Number.parseInt(h || "9", 10), Number.parseInt(m || "0", 10), 0, 0);
    return date;
  };

  const handleTimeConfirm = (date: Date) => {
    if (!activePicker) return;
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    const timeStr = `${h}:${m}`;

    updateSetting(activePicker, timeStr);
    setActivePicker(null);
  };

  const handleSendTest = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Notice",
        "Notifications are only supported on physical devices and mobile simulators.",
      );
      return;
    }

    setIsSendingTest(true);
    try {
      const sent = await sendTestNotification();
      if (sent) {
        Alert.alert(
          "Test Sent",
          "A test reminder notification was scheduled! You should receive it in a few seconds.",
        );
      } else {
        Alert.alert(
          "Permission Required",
          "Notifications are disabled. Please enable notifications in your device settings to receive reminders.",
        );
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <ModalScreenHeader
        backAccessibilityLabel={t("common.goBack")}
        title={t("settings.remindersTitle", { defaultValue: "Reminder Settings" })}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <PageContainer>
          {/* Permission Warning Banner */}
          {hasPermission === false ? (
            <View style={styles.permissionCard}>
              <View style={styles.permissionHeader}>
                <View style={styles.permissionIconBadge}>
                  <AlertTriangle color={theme.colors.warning} size={20} />
                </View>
                <View style={styles.permissionTextContainer}>
                  <Text style={styles.permissionTitle}>
                    Notifications Disabled
                  </Text>
                  <Text style={styles.permissionSubtitle}>
                    Reminders are disabled at the system level. Enable them in
                    your device settings to get timely alerts.
                  </Text>
                </View>
              </View>
              <View style={styles.permissionButtonRow}>
                <AppButton
                  label="Enable Notifications"
                  onPress={async () => {
                    const granted = await requestPermission();
                    if (!granted) {
                      await openSettings();
                    }
                  }}
                  size="small"
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}

          {/* Section: Daily Reminders */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Reminders</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconContainer, styles.dailyIconContainer]}>
                  <Bell color={theme.colors.primary} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.rowTitle}>Daily Expense Reminder</Text>
                  <Text style={styles.rowSubtitle}>
                    Get a daily nudge to record transactions and review spending
                  </Text>
                </View>
                <ThemedSwitch
                  accessibilityLabel="Enable daily expense reminder"
                  onValueChange={(val) => {
                    void updateSetting("dailyReminderEnabled", val);
                  }}
                  value={settings.dailyReminderEnabled}
                />
              </View>

              {settings.dailyReminderEnabled ? (
                <>
                  <View style={styles.divider} />
                  <Pressable
                    accessibilityLabel={`Reminder time: ${formatTimeDisplay(settings.dailyReminderTime)}`}
                    accessibilityRole="button"
                    onPress={() => setActivePicker("dailyReminderTime")}
                    style={({ pressed }) => [
                      styles.selectableRow,
                      pressed && styles.selectableRowPressed,
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <Clock color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.settingCopy}>
                      <Text style={styles.rowTitle}>Reminder Time</Text>
                      <Text style={styles.rowSubtitle}>
                        When to send the daily notification
                      </Text>
                    </View>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeText}>
                        {formatTimeDisplay(settings.dailyReminderTime)}
                      </Text>
                      <ChevronRight color={theme.colors.textMuted} size={18} />
                    </View>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>

          {/* Section: Credit Card Bills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credit Card Bills</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconContainer, styles.ccIconContainer]}>
                  <CreditCard color={theme.colors.info} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.rowTitle}>Due Credit Card Bills</Text>
                  <Text style={styles.rowSubtitle}>
                    Reminders before statement payment due dates
                  </Text>
                </View>
                <ThemedSwitch
                  accessibilityLabel="Enable due credit card bills reminder"
                  onValueChange={(val) => {
                    void updateSetting("creditCardsReminderEnabled", val);
                  }}
                  value={settings.creditCardsReminderEnabled}
                />
              </View>

              {settings.creditCardsReminderEnabled ? (
                <>
                  <View style={styles.divider} />
                  <Pressable
                    accessibilityLabel={`Alert time: ${formatTimeDisplay(settings.creditCardsReminderTime)}`}
                    accessibilityRole="button"
                    onPress={() => setActivePicker("creditCardsReminderTime")}
                    style={({ pressed }) => [
                      styles.selectableRow,
                      pressed && styles.selectableRowPressed,
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <Clock color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.settingCopy}>
                      <Text style={styles.rowTitle}>Alert Time</Text>
                      <Text style={styles.rowSubtitle}>
                        Time of day to receive bill notifications
                      </Text>
                    </View>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeText}>
                        {formatTimeDisplay(settings.creditCardsReminderTime)}
                      </Text>
                      <ChevronRight color={theme.colors.textMuted} size={18} />
                    </View>
                  </Pressable>

                  <View style={styles.nestedSection}>
                    <ReminderLeadDaysSelector
                      onToggleDay={(day) =>
                        toggleLeadDay("creditCardsLeadDays", day)
                      }
                      selectedDays={settings.creditCardsLeadDays}
                    />
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {/* Section: Due Scheduled Transactions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recurring Transactions</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View
                  style={[styles.iconContainer, styles.schedTxIconContainer]}
                >
                  <CalendarClock color={theme.colors.success} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.rowTitle}>
                    Due Scheduled Transactions
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    Reminders before recurring payments and transfers are due
                  </Text>
                </View>
                <ThemedSwitch
                  accessibilityLabel="Enable due scheduled transactions reminder"
                  onValueChange={(val) => {
                    void updateSetting("scheduledTransactionsReminderEnabled", val);
                  }}
                  value={settings.scheduledTransactionsReminderEnabled}
                />
              </View>

              {settings.scheduledTransactionsReminderEnabled ? (
                <>
                  <View style={styles.divider} />
                  <Pressable
                    accessibilityLabel={`Alert time: ${formatTimeDisplay(settings.scheduledTransactionsReminderTime)}`}
                    accessibilityRole="button"
                    onPress={() =>
                      setActivePicker("scheduledTransactionsReminderTime")
                    }
                    style={({ pressed }) => [
                      styles.selectableRow,
                      pressed && styles.selectableRowPressed,
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <Clock color={theme.colors.textSecondary} size={18} />
                    </View>
                    <View style={styles.settingCopy}>
                      <Text style={styles.rowTitle}>Alert Time</Text>
                      <Text style={styles.rowSubtitle}>
                        Time of day to receive scheduled payment alerts
                      </Text>
                    </View>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeText}>
                        {formatTimeDisplay(
                          settings.scheduledTransactionsReminderTime,
                        )}
                      </Text>
                      <ChevronRight color={theme.colors.textMuted} size={18} />
                    </View>
                  </Pressable>

                  <View style={styles.nestedSection}>
                    <ReminderLeadDaysSelector
                      onToggleDay={(day) =>
                        toggleLeadDay("scheduledTransactionsLeadDays", day)
                      }
                      selectedDays={settings.scheduledTransactionsLeadDays}
                    />
                  </View>
                </>
              ) : null}
            </View>
          </View>

          {/* Section: Diagnostic Test Notification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnostics & Testing</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.iconContainer}>
                  <Sparkles color={theme.colors.accent} size={20} />
                </View>
                <View style={styles.settingCopy}>
                  <Text style={styles.rowTitle}>Send Test Notification</Text>
                  <Text style={styles.rowSubtitle}>
                    Verify that banners, sounds, and permissions are configured
                    properly on your device
                  </Text>
                </View>
              </View>
              <View style={styles.testButtonWrapper}>
                <AppButton
                  disabled={isSendingTest}
                  label={
                    isSendingTest
                      ? "Sending Notification..."
                      : "Send Test Notification"
                  }
                  leading={
                    <Send color={theme.colors.onControlSecondary} size={16} />
                  }
                  loading={isSendingTest}
                  onPress={handleSendTest}
                  size="medium"
                  variant="secondary"
                />
              </View>
            </View>
          </View>
        </PageContainer>
      </ScrollView>

      {/* Reusable Time Picker Modal */}
      {activePicker ? (
        <TransactionDateTimePickerModal
          mode="time"
          onClose={() => setActivePicker(null)}
          onConfirm={handleTimeConfirm}
          title="Select Reminder Time"
          value={getPickerInitialDate(activePicker)}
          visible={Boolean(activePicker)}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    screenWrapper: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      marginTop: 20,
    },
    sectionTitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: 8,
      paddingHorizontal: 4,
      textTransform: "uppercase",
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    selectableRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    selectableRowPressed: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    settingCopy: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    rowSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    iconContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 10,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    dailyIconContainer: {
      backgroundColor: `${theme.colors.primary}1A`,
    },
    ccIconContainer: {
      backgroundColor: `${theme.colors.info}1A`,
    },
    schedTxIconContainer: {
      backgroundColor: `${theme.colors.success}1A`,
    },
    divider: {
      backgroundColor: theme.colors.border,
      height: 1,
      marginLeft: 66,
    },
    timeBadge: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    timeBadgeText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: "600",
    },
    nestedSection: {
      backgroundColor: theme.colors.surfaceMuted,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
      borderTopColor: theme.colors.border,
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    permissionCard: {
      backgroundColor: `${theme.colors.warning}14`,
      borderColor: `${theme.colors.warning}40`,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 16,
      padding: 16,
    },
    permissionHeader: {
      flexDirection: "row",
      gap: 12,
    },
    permissionIconBadge: {
      alignItems: "center",
      backgroundColor: `${theme.colors.warning}26`,
      borderRadius: 8,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    permissionTextContainer: {
      flex: 1,
      gap: 4,
    },
    permissionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    permissionSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    permissionButtonRow: {
      marginTop: 12,
    },
    testButtonWrapper: {
      paddingBottom: 16,
      paddingHorizontal: 16,
      paddingTop: 4,
    },
  });
}
