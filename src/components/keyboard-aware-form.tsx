import type { PropsWithChildren } from "react";
import { Platform } from "react-native";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

export interface KeyboardAwareFormProps
  extends PropsWithChildren,
    Omit<KeyboardAwareScrollViewProps, "children"> {}

export function KeyboardAwareForm({
  bottomOffset = 24,
  children,
  keyboardDismissMode = Platform.OS === "ios" ? "interactive" : "on-drag",
  keyboardShouldPersistTaps = "handled",
  mode = "insets",
  ...scrollViewProps
}: KeyboardAwareFormProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      mode={mode}
      {...scrollViewProps}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
