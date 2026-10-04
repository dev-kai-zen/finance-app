import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

import type {
  NoteAttachment,
  NoteAttachmentDraft,
} from "../types/note.types";

export function useNoteAttachments(initialAttachments: NoteAttachment[] = []) {
  const [existingAttachments, setExistingAttachments] =
    useState<NoteAttachment[]>(initialAttachments);
  const [drafts, setDrafts] = useState<NoteAttachmentDraft[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromCamera = async () => {
    try {
      setPicking(true);
      setError(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is required to take an attachment photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newDrafts: NoteAttachmentDraft[] = result.assets.map(toImageDraft);
        setDrafts((prev) => [...prev, ...newDrafts]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open camera.");
    } finally {
      setPicking(false);
    }
  };

  const pickFromLibrary = async () => {
    try {
      setPicking(true);
      setError(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        allowsMultipleSelection: true,
        orderedSelection: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newDrafts: NoteAttachmentDraft[] = result.assets.map(toImageDraft);
        setDrafts((prev) => [...prev, ...newDrafts]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open photo library.");
    } finally {
      setPicking(false);
    }
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const markExistingAttachmentForRemoval = (attachmentId: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    setRemovedAttachmentIds((prev) => [...prev, attachmentId]);
  };

  const reset = (attachments: NoteAttachment[] = []) => {
    setExistingAttachments(attachments);
    setDrafts([]);
    setRemovedAttachmentIds([]);
    setError(null);
  };

  return {
    existingAttachments,
    drafts,
    removedAttachmentIds,
    picking,
    error,
    pickFromCamera,
    pickFromLibrary,
    removeDraft,
    markExistingAttachmentForRemoval,
    reset,
    clearError: () => setError(null),
  };
}

function toImageDraft(asset: ImagePicker.ImagePickerAsset): NoteAttachmentDraft {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? "image/jpeg",
    sizeBytes: asset.fileSize,
  };
}
