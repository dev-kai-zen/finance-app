export { NotesScreen } from "./screens/notes-screen";
export { useNotes } from "./hooks/use-notes";
export { createNote } from "./services/create-note.service";
export { updateNote } from "./services/update-note.service";
export { deleteNote } from "./services/delete-note.service";
export {
  getNotesAttachmentsDirectory,
  getNoteAttachmentLocalUri,
  prepareNoteAttachments,
  discardPreparedNoteAttachments,
  isNoteAttachmentAvailableLocally,
  deleteNoteAttachmentLocalFile,
  clearNoteAttachmentStorage,
} from "./services/note-attachment-storage.service";
export {
  NOTES_ATTACHMENTS_FOLDER_NAME,
  NOTES_ROOT_FOLDER_NAME,
  DEFAULT_NOTE_SORT_OPTION,
  DEFAULT_NOTE_VIEW_MODE,
  NOTE_COLOR_PRESETS,
} from "./constants/notes.constants";
export type {
  Note,
  NoteAttachment,
  NoteAttachmentDraft,
  NoteViewMode,
  NoteSortOption,
  CreateNoteInput,
  UpdateNoteInput,
} from "./types/note.types";
