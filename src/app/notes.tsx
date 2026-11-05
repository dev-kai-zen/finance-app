import { useLocalSearchParams } from "expo-router";
import { NotesScreen } from "@/modules/notes";

export default function NotesRoute() {
  const { action, noteId } = useLocalSearchParams<{
    action?: string;
    noteId?: string;
  }>();
  return (
    <NotesScreen
      initialAction={action === "new" ? "new" : undefined}
      initialNoteId={
        typeof noteId === "string" && noteId.length > 0 ? noteId : undefined
      }
    />
  );
}
