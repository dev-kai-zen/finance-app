import type { ReleaseNoteBlock } from "@/modules/whats-new/types/whats-new.types";

/** Newest releases first. Append a block for each store release you want to highlight. */
export const RELEASE_NOTES: ReleaseNoteBlock[] = [
  {
    version: "1.0.0",
    titleKey: "whatsNew.v100.title",
    itemKeys: [
      "whatsNew.v100.item1",
      "whatsNew.v100.item2",
      "whatsNew.v100.item3",
    ],
  },
  {
    version: "1.0.0",
    titleKey: "whatsNew.v100fixes.title",
    itemKeys: [
      "whatsNew.v100fixes.item1",
      "whatsNew.v100fixes.item2",
    ],
  },
];
