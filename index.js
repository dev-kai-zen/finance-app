import "expo-router/entry";
import { registerWidgets } from "./src/modules/widgets";

// Ensure Android widget background tasks are registered at the global module scope
// so Headless JS tasks succeed even when the app is completely closed.
registerWidgets();
