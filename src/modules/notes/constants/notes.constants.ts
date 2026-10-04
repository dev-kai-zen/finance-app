import type { NoteSortOption, NoteViewMode } from "../types/note.types";

export const NOTES_ROOT_FOLDER_NAME = "Kaizen Finance";
export const NOTES_ATTACHMENTS_FOLDER_NAME = "Notes Attachments";

export const DEFAULT_NOTE_VIEW_MODE: NoteViewMode = "tiles";
export const DEFAULT_NOTE_SORT_OPTION: NoteSortOption = "last_modified_desc";

export interface NoteColorOption {
  id: string;
  label: string;
  value: string | null;
  border: string;
  bgLight: string;
  bgDark: string;
}

export const NOTE_COLOR_PRESETS: NoteColorOption[] = [
  {
    id: "default",
    label: "Default",
    value: null,
    border: "#64748b",
    bgLight: "#f8fafc",
    bgDark: "#1e293b",
  },
  {
    id: "amber",
    label: "Amber",
    value: "#f59e0b",
    border: "#f59e0b",
    bgLight: "#fffbeb",
    bgDark: "#451a03",
  },
  {
    id: "emerald",
    label: "Emerald",
    value: "#10b981",
    border: "#10b981",
    bgLight: "#ecfdf5",
    bgDark: "#064e3b",
  },
  {
    id: "sky",
    label: "Sky",
    value: "#0ea5e9",
    border: "#0ea5e9",
    bgLight: "#f0f9ff",
    bgDark: "#0c4a6e",
  },
  {
    id: "purple",
    label: "Purple",
    value: "#8b5cf6",
    border: "#8b5cf6",
    bgLight: "#f5f3ff",
    bgDark: "#3b0764",
  },
  {
    id: "rose",
    label: "Rose",
    value: "#f43f5e",
    border: "#f43f5e",
    bgLight: "#fff1f2",
    bgDark: "#4c0519",
  },
];
