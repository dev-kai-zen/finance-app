import {
  ModalWalkthroughOverlay,
  type ModalWalkthroughOverlayProps,
} from "../components/modal-walkthrough-overlay";

export type NoteEditorWalkthroughOverlayProps = Omit<
  ModalWalkthroughOverlayProps,
  "maskId"
>;

export function NoteEditorWalkthroughOverlay(
  props: NoteEditorWalkthroughOverlayProps,
) {
  return <ModalWalkthroughOverlay {...props} maskId="noteEditorMask" />;
}

