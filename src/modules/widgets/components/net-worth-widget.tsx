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
import { LockedProWidget } from "./locked-pro-widget";

interface NetWorthWidgetProps {
  snapshot?: FinancialWidgetSnapshot;
}

export function NetWorthWidget({ snapshot }: NetWorthWidgetProps) {
  if (!snapshot?.isPro) {
    return (
      <LockedProWidget
        title="Net Worth"
        subtitle="Track total assets, liabilities, and portfolio growth over time."
      />
    );
  }

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

  const trendBg = isNegativeChange ? "#EF444420" : "#10B98120";

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
      accessibilityLabel={`Net Worth: ${netWorth}. Assets: ${assets}, Liabilities: ${liabilities}`}
    >
      {/* Header: Clean title matching collapsed dashboard card */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
        }}
      >
        <TextWidget
          text="Net Worth"
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: WIDGET_THEME.textPrimary,
          }}
        />
      </FlexWidget>

      {/* Summary Row: Net Worth Amount + Trend Pill */}
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
          text={netWorth}
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
            backgroundColor: trendBg,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <TextWidget
            text={trendText}
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: trendColor,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Breakdown Row: Dual side-by-side Assets and Liabilities Cards */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          width: "match_parent",
        }}
      >
        {/* Assets Card */}
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
              text="Assets"
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: WIDGET_THEME.textSecondary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={assets}
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: WIDGET_THEME.incomeAccent,
              marginTop: 3,
            }}
          />
        </FlexWidget>

        {/* Liabilities Card */}
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
              text="Liabilities"
              style={{
                fontSize: 11,
                fontWeight: "bold",
                color: WIDGET_THEME.textSecondary,
              }}
            />
          </FlexWidget>
          <TextWidget
            text={liabilities}
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
