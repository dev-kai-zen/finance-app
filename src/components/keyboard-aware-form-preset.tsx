import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import {
  KeyboardAwareForm,
  type KeyboardAwareFormProps,
} from "./keyboard-aware-form";
import {
  type KeyboardFormPresetId,
  resolveKeyboardFormScrollProps,
} from "./keyboard-form-presets";

export interface KeyboardAwareFormPresetProps
  extends PropsWithChildren,
    Omit<
      KeyboardAwareFormProps,
      "bottomOffset" | "extraKeyboardSpace" | "contentContainerStyle"
    > {
  preset: KeyboardFormPresetId;
  multilineFocused?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  multilineContentContainerStyle?: StyleProp<ViewStyle>;
}

export function KeyboardAwareFormPreset({
  preset,
  multilineFocused = false,
  contentContainerStyle,
  multilineContentContainerStyle,
  children,
  ...scrollViewProps
}: KeyboardAwareFormPresetProps) {
  const { bottomOffset, extraKeyboardSpace, contentPaddingBottomMultiline } =
    resolveKeyboardFormScrollProps(preset, multilineFocused);

  const resolvedMultilineStyle =
    multilineFocused &&
    (multilineContentContainerStyle ??
      (contentPaddingBottomMultiline > 0
        ? { paddingBottom: contentPaddingBottomMultiline }
        : null));

  return (
    <KeyboardAwareForm
      bottomOffset={bottomOffset}
      contentContainerStyle={[contentContainerStyle, resolvedMultilineStyle]}
      extraKeyboardSpace={extraKeyboardSpace}
      {...scrollViewProps}
    >
      {children}
    </KeyboardAwareForm>
  );
}
