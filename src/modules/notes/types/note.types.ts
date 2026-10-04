export type NoteViewMode = "tiles" | "table";

export type NoteSortOption =
  | "last_modified_desc"
  | "last_modified_asc"
  | "title_asc"
  | "title_desc";

export interface NoteAttachment {
  id: string;
  noteId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  driveFileId?: string | null;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  lastSyncError?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  uri?: string; // Resolved local file URI for displaying
}

export interface NoteAttachmentDraft {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string | null;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  attachments: NoteAttachment[];
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  color?: string | null;
  isPinned?: boolean;
  attachments?: NoteAttachmentDraft[];
}

export interface UpdateNoteInput {
  id: string;
  title: string;
  content?: string;
  color?: string | null;
  isPinned?: boolean;
  addedAttachments?: NoteAttachmentDraft[];
  removedAttachmentIds?: string[];
}
