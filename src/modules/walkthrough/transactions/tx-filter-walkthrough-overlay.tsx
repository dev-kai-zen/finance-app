import {
  ModalWalkthroughOverlay,
  type ModalWalkthroughOverlayProps,
} from "../components/modal-walkthrough-overlay";

export type TxFilterWalkthroughOverlayProps = Omit<
  ModalWalkthroughOverlayProps,
  "maskId"
>;

export function TxFilterWalkthroughOverlay(
  props: TxFilterWalkthroughOverlayProps,
) {
  return <ModalWalkthroughOverlay {...props} maskId="txFilterMask" />;
}

