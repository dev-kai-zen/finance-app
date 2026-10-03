import { deferComponent } from "@/utils/deferred-module";

export const CalendarScreen = deferComponent(
  () => require("./screens/calendar-screen").CalendarScreen,
  "CalendarScreen",
) as typeof import("./screens/calendar-screen").CalendarScreen;

export type {
  CalendarMonth,
  CalendarTab,
  CalendarDayCellData,
  CalendarSummaryMetrics,
} from "./types/calendar.types";
