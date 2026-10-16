export type KeyboardFormPresetId = "default" | "fullScreenForm" | "transactionSheet";

export interface KeyboardFormPreset {
  bottomOffsetNormal: number;
  bottomOffsetMultiline: number;
  extraKeyboardSpaceMultiline: number;
  /** Applied when multiline is focused and no multilineContentContainerStyle is passed. */
  contentPaddingBottomMultiline: number;
}

/**
 * Keyboard scroll tuning by modal shell layout.
 * - transactionSheet: bottom sheet with sticky footer + fixed header rows above the scroll area
 * - fullScreenForm: FullScreenFormModal with save in header
 * - default: plain KeyboardAwareForm behavior
 */
export const KEYBOARD_FORM_PRESETS: Record<KeyboardFormPresetId, KeyboardFormPreset> = {
  default: {
    bottomOffsetNormal: 24,
    bottomOffsetMultiline: 24,
    extraKeyboardSpaceMultiline: 0,
    contentPaddingBottomMultiline: 0,
  },
  fullScreenForm: {
    bottomOffsetNormal: 24,
    bottomOffsetMultiline: 160,
    extraKeyboardSpaceMultiline: 80,
    contentPaddingBottomMultiline: 160,
  },
  transactionSheet: {
    bottomOffsetNormal: 88,
    bottomOffsetMultiline: 180,
    extraKeyboardSpaceMultiline: 0,
    contentPaddingBottomMultiline: 0,
  },
};

export function resolveKeyboardFormScrollProps(
  preset: KeyboardFormPresetId,
  multilineFocused: boolean,
): {
  bottomOffset: number;
  extraKeyboardSpace: number;
  contentPaddingBottomMultiline: number;
} {
  const config = KEYBOARD_FORM_PRESETS[preset];
  return {
    bottomOffset: multilineFocused
      ? config.bottomOffsetMultiline
      : config.bottomOffsetNormal,
    extraKeyboardSpace: multilineFocused ? config.extraKeyboardSpaceMultiline : 0,
    contentPaddingBottomMultiline: multilineFocused
      ? config.contentPaddingBottomMultiline
      : 0,
  };
}
