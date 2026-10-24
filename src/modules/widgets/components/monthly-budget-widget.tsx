import React from "react";
import {
  FlexWidget,
  TextWidget,
} from "react-native-android-widget";
import {
  BUDGETS_DEEP_LINK,
  WIDGET_THEME,
} from "../constants/widget.constants";
import type { FinancialWidgetSnapshot } from "../types/widget.types";
import { LockedProWidget } from "./locked-pro-widget";

interface MonthlyBudgetWidgetProps {
  snapshot?: FinancialWidgetSnapshot;
}

export function MonthlyBudgetWidget({ snapshot }: MonthlyBudgetWidgetProps) {
  if (!snapshot?.isPro) {
    return (
      <LockedProWidget
        title="Monthly Budget"
        subtitle="Monitor category spending progress and limit alerts in real time."
      />
    );
  }

  const month = snapshot?.monthLabel ?? "This Month";
  const hasActiveBudgets = snapshot?.hasActiveBudgets ?? false;
  const isBudgetExceeded = snapshot?.isBudgetExceeded ?? false;
  const percentage = snapshot?.budgetPercentage ?? 0;
  const totalBudget = snapshot?.budgetTotalFormatted ?? "₱0.00";
  const totalSpent = snapshot?.budgetSpentFormatted ?? "₱0.00";
  const remaining = snapshot?.budgetRemainingFormatted ?? "₱0.00";

  const isNearLimit = percentage >= 80 && !isBudgetExceeded;

  const statusColor = isBudgetExceeded
    ? WIDGET_THEME.expenseAccent
    : isNearLimit
      ? "#F59E0B"
      : WIDGET_THEME.incomeAccent;

  const statusBg = isBudgetExceeded
    ? "#EF444420"
    : isNearLimit
      ? "#F59E0B20"
      : "#10B98120";

  const statusText = !hasActiveBudgets
    ? "Set Budget"
    : isBudgetExceeded
      ? `${percentage}% (Over)`
      : `${percentage}% Used`;

  const primaryValue = !hasActiveBudgets
    ? "No Budget Set"
    : isBudgetExceeded
      ? `${remaining} Over`
      : `${remaining} Left`;

  const primaryColor = isBudgetExceeded ? WIDGET_THEME.expenseAccent : "#FFFFFF";
  const clampedPercent = Math.min(100, Math.max(hasActiveBudgets ? 4 : 0, percentage));

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: WIDGET_THEME.surface,
        borderRadius: 24,
        borderColor: WIDGET_THEME.border,
        borderWidth: 1,
        padding: 14,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: BUDGETS_DEEP_LINK }}
      accessibilityLabel={`Monthly Budget: ${primaryValue}. Budget: ${totalBudget}, Spent: ${totalSpent}`}
    >
      {/* Header: Title and Month label */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
        }}
      >
        <TextWidget
          text="Monthly Budget"
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: WIDGET_THEME.textPrimary,
          }}
        />

        <TextWidget
          text={month}
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: WIDGET_THEME.textSecondary,
          }}
        />
      </FlexWidget>

      {/* Summary Row: Remaining / Status Amount + Health Pill */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
          marginTop: 2,
        }}
      >
        <TextWidget
          text={primaryValue}
          style={{
            fontSize: hasActiveBudgets ? 22 : 18,
            fontWeight: "bold",
            color: primaryColor,
          }}
        />

        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: hasActiveBudgets ? statusBg : "#FFFFFF15",
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={statusText}
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: hasActiveBudgets ? statusColor : WIDGET_THEME.textSecondary,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Progress Bar Container */}
      <FlexWidget
        style={{
          height: 6,
          width: "match_parent",
          backgroundColor: WIDGET_THEME.background,
          borderRadius: 3,
          marginVertical: 4,
          flexDirection: "row",
        }}
      >
        {clampedPercent > 0 ? (
          <FlexWidget
            style={{
              height: "match_parent",
              flex: clampedPercent,
              backgroundColor: statusColor,
              borderRadius: 3,
            }}
          />
        ) : null}
        {clampedPercent < 100 ? (
          <FlexWidget
            style={{
              height: "match_parent",
              flex: 100 - clampedPercent,
            }}
          />
        ) : null}
      </FlexWidget>

      {/* Breakdown Row: Dual side-by-side Budget and Spent Cards */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "match_parent",
        }}
      >
        {/* Total Budget Card */}
        <FlexWidget
          style={{
            flex: 1,
            backgroundColor: WIDGET_THEME.background,
            borderRadius: 10,
            borderLeftWidth: 3,
            borderLeftColor: WIDGET_THEME.incomeAccent,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginRight: 4,
            flexDirection: "column",
          }}
        >
          <FlexWidget
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <FlexWidget
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: WIDGET_THEME.incomeAccent,
                marginRight: 5,
              }}
            />
            <TextWidget
              text="Budget"
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: WIDGET_THEME.textSecondary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={totalBudget}
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: WIDGET_THEME.incomeAccent,
              marginTop: 3,
            }}
          />
        </FlexWidget>

        {/* Total Spent Card */}
        <FlexWidget
          style={{
            flex: 1,
            backgroundColor: WIDGET_THEME.background,
            borderRadius: 10,
            borderLeftWidth: 3,
            borderLeftColor: isBudgetExceeded ? WIDGET_THEME.expenseAccent : statusColor,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginLeft: 4,
            flexDirection: "column",
          }}
        >
          <FlexWidget
            style={{
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <FlexWidget
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isBudgetExceeded ? WIDGET_THEME.expenseAccent : statusColor,
                marginRight: 5,
              }}
            />
            <TextWidget
              text="Spent"
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: WIDGET_THEME.textSecondary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={totalSpent}
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: isBudgetExceeded ? WIDGET_THEME.expenseAccent : "#FFFFFF",
              marginTop: 3,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
