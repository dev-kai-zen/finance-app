import {
  ModalWalkthroughOverlay,
  type ModalWalkthroughOverlayProps,
} from "../components/modal-walkthrough-overlay";

export type CustomizeDashboardWalkthroughOverlayProps = Omit<
  ModalWalkthroughOverlayProps,
  "maskId"
>;

export function CustomizeDashboardWalkthroughOverlay(
  props: CustomizeDashboardWalkthroughOverlayProps,
) {
  return <ModalWalkthroughOverlay {...props} maskId="customizeDashMask" />;
}

