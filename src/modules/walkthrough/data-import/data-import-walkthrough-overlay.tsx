import {
  ModalWalkthroughOverlay,
  type ModalWalkthroughOverlayProps,
} from "../components/modal-walkthrough-overlay";

export type DataImportWalkthroughOverlayProps = Omit<
  ModalWalkthroughOverlayProps,
  "maskId"
>;

export function DataImportWalkthroughOverlay(
  props: DataImportWalkthroughOverlayProps,
) {
  return <ModalWalkthroughOverlay {...props} maskId="dataImportMask" />;
}

