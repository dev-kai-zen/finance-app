import { useLocalSearchParams } from "expo-router";
import { NotesScreen } from "@/modules/notes";

export default function NotesRoute() {
  const { action } = useLocalSearchParams<{ action?: string }>();
  return (
    <NotesScreen initialAction={action === "new" ? "new" : undefined} />
  );
}
