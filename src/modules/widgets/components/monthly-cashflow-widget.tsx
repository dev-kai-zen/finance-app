import React from "react";
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
} from "react-native-android-widget";
import {
  DASHBOARD_DEEP_LINK,
  QUICK_EXPENSE_DEEP_LINK,
  QUICK_INCOME_DEEP_LINK,
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
  const isNetPositive = (snapshot?.netSavingsMinorUnits ?? 0) >= 0;
  const netColor = isNetPositive ? WIDGET_THEME.incomeAccent : WIDGET_THEME.expenseAccent;

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: WIDGET_THEME.background,
        borderRadius: 24,
        borderColor: WIDGET_THEME.border,
        borderWidth: 1,
        padding: 12,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: DASHBOARD_DEEP_LINK }}
      accessibilityLabel={`Monthly Cashflow for ${month}: Inflow ${inflow}, Outflow ${outflow}, Net ${net}`}
    >
      {/* Header Row */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
        }}
      >
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <ImageWidget
            image={require("../../../../assets/finance-app-logo.png")}
            imageWidth={20}
            imageHeight={20}
            radius={5}
          />
          <TextWidget
            text={month}
            style={{
              fontSize: 12,
              fontWeight: "bold",
              color: WIDGET_THEME.textSecondary,
              marginLeft: 6,
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: WIDGET_THEME.surface,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderColor: WIDGET_THEME.border,
            borderWidth: 1,
          }}
        >
          <TextWidget
            text="Cashflow"
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: WIDGET_THEME.textPrimary,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Middle Stats Columns */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
          marginVertical: 4,
        }}
      >
        {/* Inflow Card */}
        <FlexWidget
          style={{
            flex: 1,
            backgroundColor: WIDGET_THEME.surface,
            borderRadius: 12,
            borderColor: WIDGET_THEME.border,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginRight: 4,
            flexDirection: "column",
          }}
        >
          <TextWidget
            text="Income"
            style={{
              fontSize: 10,
              color: WIDGET_THEME.incomeAccent,
              fontWeight: "bold",
            }}
          />
          <TextWidget
            text={inflow}
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginTop: 2,
            }}
          />
        </FlexWidget>

        {/* Outflow Card */}
        <FlexWidget
          style={{
            flex: 1,
            backgroundColor: WIDGET_THEME.surface,
            borderRadius: 12,
            borderColor: WIDGET_THEME.border,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginLeft: 4,
            flexDirection: "column",
          }}
        >
          <TextWidget
            text="Expense"
            style={{
              fontSize: 10,
              color: WIDGET_THEME.expenseAccent,
              fontWeight: "bold",
            }}
          />
          <TextWidget
            text={outflow}
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: "#FFFFFF",
              marginTop: 2,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Bottom Summary & Quick Buttons */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
        }}
      >
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextWidget
            text={`Net: ${net}`}
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: netColor,
            }}
          />
        </FlexWidget>

        {/* Mini 1-tap capture buttons */}
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <FlexWidget
            style={{
              backgroundColor: WIDGET_THEME.incomeAccent,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              marginRight: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: QUICK_INCOME_DEEP_LINK }}
            accessibilityLabel="Record new income"
          >
            <TextWidget
              text="+ Income"
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            />
          </FlexWidget>

          <FlexWidget
            style={{
              backgroundColor: WIDGET_THEME.expenseAccent,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              alignItems: "center",
              justifyContent: "center",
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: QUICK_EXPENSE_DEEP_LINK }}
            accessibilityLabel="Record new expense"
          >
            <TextWidget
              text="− Expense"
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: "#FFFFFF",
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
