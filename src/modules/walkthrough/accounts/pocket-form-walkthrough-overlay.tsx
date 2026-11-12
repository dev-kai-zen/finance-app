import {
  ModalWalkthroughOverlay,
  type ModalWalkthroughOverlayProps,
} from "../components/modal-walkthrough-overlay";

export type PocketFormWalkthroughOverlayProps = Omit<
  ModalWalkthroughOverlayProps,
  "maskId"
>;

export function PocketFormWalkthroughOverlay(
  props: PocketFormWalkthroughOverlayProps,
) {
  return <ModalWalkthroughOverlay {...props} maskId="pocketFormMask" />;
}

