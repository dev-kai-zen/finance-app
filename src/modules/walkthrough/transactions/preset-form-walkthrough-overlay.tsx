import {
  ModalWalkthroughOverlay,
  type ModalWalkthroughOverlayProps,
} from "../components/modal-walkthrough-overlay";

export type PresetFormWalkthroughOverlayProps = Omit<
  ModalWalkthroughOverlayProps,
  "maskId"
>;

export function PresetFormWalkthroughOverlay(
  props: PresetFormWalkthroughOverlayProps,
) {
  return <ModalWalkthroughOverlay {...props} maskId="presetFormMask" />;
}

