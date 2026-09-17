import type { PropsWithChildren } from "react";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";

export interface KeyboardAwareFormProps
  extends PropsWithChildren,
    Omit<KeyboardAwareScrollViewProps, "children"> {}

export function KeyboardAwareForm({
  bottomOffset = 16,
  children,
  keyboardShouldPersistTaps = "handled",
  ...scrollViewProps
}: KeyboardAwareFormProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...scrollViewProps}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
