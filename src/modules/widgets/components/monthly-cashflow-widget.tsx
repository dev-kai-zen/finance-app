import React from "react";
import {
  FlexWidget,
  TextWidget,
} from "react-native-android-widget";
import {
  DASHBOARD_DEEP_LINK,
  WIDGET_THEME,
} from "../constants/widget.constants";
import type { FinancialWidgetSnapshot } from "../types/widget.types";

interface MonthlyCashflowWidgetProps {
  snapshot?: FinancialWidgetSnapshot;
}

export function MonthlyCashflowWidget({ snapshot }: MonthlyCashflowWidgetProps) {
  const month = snapshot?.monthLabel ?? "This Month";
  const inflow = snapshot?.inflowFormatted ?? "₱0.00";
  const outflow = snapshot?.outflowFormatted ?? "₱0.00";
  const net = snapshot?.netSavingsFormatted ?? "₱0.00";
  const savingsRate = snapshot?.savingsRatePercentage ?? 0;
  const isNetPositive = (snapshot?.netSavingsMinorUnits ?? 0) >= 0;
  const netColor = isNetPositive ? WIDGET_THEME.incomeAccent : WIDGET_THEME.expenseAccent;
  const netBg = isNetPositive ? "#10B98120" : "#EF444420";

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
      clickActionData={{ uri: DASHBOARD_DEEP_LINK }}
      accessibilityLabel={`Cash Flow: Net ${net}. Income: ${inflow}, Expense: ${outflow}`}
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
          text="Cash Flow"
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

      {/* Summary Row: Net Savings Amount + Savings Rate Pill */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
          marginVertical: 4,
        }}
      >
        <TextWidget
          text={net}
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#FFFFFF",
          }}
        />

        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: netBg,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={`${savingsRate}% Saved`}
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: netColor,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Breakdown Row: Dual side-by-side Income and Expense Cards */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "match_parent",
        }}
      >
        {/* Income Card */}
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
              text="Income"
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: WIDGET_THEME.textSecondary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={inflow}
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: WIDGET_THEME.incomeAccent,
              marginTop: 3,
            }}
          />
        </FlexWidget>

        {/* Expense Card */}
        <FlexWidget
          style={{
            flex: 1,
            backgroundColor: WIDGET_THEME.background,
            borderRadius: 10,
            borderLeftWidth: 3,
            borderLeftColor: WIDGET_THEME.expenseAccent,
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
                backgroundColor: WIDGET_THEME.expenseAccent,
                marginRight: 5,
              }}
            />
            <TextWidget
              text="Expense"
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: WIDGET_THEME.textSecondary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={outflow}
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: WIDGET_THEME.expenseAccent,
              marginTop: 3,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
