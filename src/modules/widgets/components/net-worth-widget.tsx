import React from "react";
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
} from "react-native-android-widget";
import {
  DASHBOARD_DEEP_LINK,
  WIDGET_THEME,
} from "../constants/widget.constants";
import type { FinancialWidgetSnapshot } from "../types/widget.types";

interface NetWorthWidgetProps {
  snapshot?: FinancialWidgetSnapshot;
}

export function NetWorthWidget({ snapshot }: NetWorthWidgetProps) {
  const netWorth = snapshot?.netWorthFormatted ?? "₱0.00";
  const assets = snapshot?.totalAssetsFormatted ?? "₱0.00";
  const liabilities = snapshot?.totalLiabilitiesFormatted ?? "₱0.00";
  const changePct = snapshot?.netWorthChangePercentage;

  const isPositiveChange = changePct !== null && changePct !== undefined && changePct > 0;
  const isNegativeChange = changePct !== null && changePct !== undefined && changePct < 0;

  const trendText =
    changePct === null || changePct === undefined
      ? "Overall"
      : isPositiveChange
        ? `▲ +${changePct}%`
        : isNegativeChange
          ? `▼ ${changePct}%`
          : "0.0%";

  const trendColor = isPositiveChange
    ? WIDGET_THEME.incomeAccent
    : isNegativeChange
      ? WIDGET_THEME.expenseAccent
      : WIDGET_THEME.textSecondary;

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
      accessibilityLabel={`Net Worth: ${netWorth}. Assets: ${assets}, Debts: ${liabilities}`}
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
            text="Net Worth"
            style={{
              fontSize: 12,
              fontWeight: "bold",
              color: WIDGET_THEME.textSecondary,
              marginLeft: 6,
            }}
          />
        </FlexWidget>

        {/* Trend / Status Badge */}
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
            text={trendText}
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: trendColor,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Main Net Worth Display */}
      <FlexWidget
        style={{
          flexDirection: "column",
          justifyContent: "center",
          width: "match_parent",
          marginVertical: 4,
        }}
      >
        <TextWidget
          text={netWorth}
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#FFFFFF",
          }}
        />
      </FlexWidget>

      {/* Breakdown Row: Assets vs Liabilities */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
          backgroundColor: WIDGET_THEME.surface,
          borderRadius: 10,
          borderColor: WIDGET_THEME.border,
          borderWidth: 1,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextWidget
            text={`Assets: ${assets}`}
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: WIDGET_THEME.textPrimary,
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TextWidget
            text={`Debts: ${liabilities}`}
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: WIDGET_THEME.expenseAccent,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
