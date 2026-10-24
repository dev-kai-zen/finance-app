import React from "react";
import {
  FlexWidget,
  TextWidget,
} from "react-native-android-widget";
import {
  PRO_PAYWALL_DEEP_LINK,
  WIDGET_THEME,
} from "../constants/widget.constants";

interface LockedProWidgetProps {
  title: string;
  subtitle?: string;
}

/**
 * Android home screen widget locked-preview card for Pro-only chart widgets.
 * Displayed when a user on the Free tier adds or views Monthly Budget, Cashflow, or Net Worth widgets.
 * Tapping anywhere opens the app directly into the Pro Paywall modal.
 */
export function LockedProWidget({ title, subtitle }: LockedProWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: WIDGET_THEME.surface,
        borderRadius: 24,
        borderColor: "#D9770650",
        borderWidth: 1.5,
        padding: 14,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: PRO_PAYWALL_DEEP_LINK }}
      accessibilityLabel={`${title}: Kaizen Pro feature. Tap to unlock on your home screen.`}
    >
      {/* Header: Feature Title + Gold PRO Badge */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "match_parent",
        }}
      >
        <TextWidget
          text={title}
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: WIDGET_THEME.textPrimary,
          }}
        />

        <FlexWidget
          style={{
            backgroundColor: "#D97706",
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TextWidget
            text="PRO"
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: "#000000",
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Middle Banner: Lock Callout + Subtitle */}
      <FlexWidget
        style={{
          flexDirection: "column",
          backgroundColor: "#11231E80",
          borderColor: "#244A40",
          borderWidth: 1,
          borderRadius: 12,
          padding: 10,
          marginVertical: 4,
          width: "match_parent",
        }}
      >
        <TextWidget
          text="🔒 Pro Exclusive Widget"
          style={{
            fontSize: 12,
            fontWeight: "bold",
            color: "#FBBF24",
          }}
        />
        <TextWidget
          text={
            subtitle ??
            "Live interactive charts and real-time financial tracking are available with Kaizen Pro."
          }
          style={{
            fontSize: 10,
            color: WIDGET_THEME.textSecondary,
            marginTop: 4,
          }}
        />
      </FlexWidget>

      {/* Bottom Row: CTA Button */}
      <FlexWidget
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#D9770625",
          borderColor: "#D97706",
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: 6,
          paddingHorizontal: 12,
          width: "match_parent",
        }}
      >
        <TextWidget
          text="Tap to Unlock with Pro →"
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: "#FBBF24",
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
