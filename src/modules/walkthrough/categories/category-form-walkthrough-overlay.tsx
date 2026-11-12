import {
  ModalWalkthroughOverlay,
  type ModalWalkthroughOverlayProps,
} from "../components/modal-walkthrough-overlay";

export type CategoryFormWalkthroughOverlayProps = Omit<
  ModalWalkthroughOverlayProps,
  "maskId"
>;

export function CategoryFormWalkthroughOverlay(
  props: CategoryFormWalkthroughOverlayProps,
) {
  return <ModalWalkthroughOverlay {...props} maskId="categoryFormMask" />;
}

