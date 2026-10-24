import { RELEASE_NOTES } from "@/modules/whats-new/constants/release-notes";
import type {
  ReleaseNoteBlock,
  WhatsNewPresentation,
} from "@/modules/whats-new/types/whats-new.types";
import {
  getAppFingerprint,
  getMarketingVersionFromFingerprint,
} from "@/modules/whats-new/utils/app-fingerprint";
import { compareSemver } from "@/modules/whats-new/utils/compare-app-versions";
import {
  getLastSeenAppFingerprint as readLastSeenAppFingerprint,
  saveLastSeenAppFingerprint,
} from "@/modules/whats-new/repositories/whats-new.repository";

export function getLastSeenAppFingerprint(): string | null {
  return readLastSeenAppFingerprint();
}

export function markWhatsNewSeen(fingerprint = getAppFingerprint()): void {
  saveLastSeenAppFingerprint(fingerprint);
}

export function getLatestReleaseNotes(): ReleaseNoteBlock[] {
  if (RELEASE_NOTES.length === 0) return [];
  const currentMarketing = getMarketingVersionFromFingerprint(getAppFingerprint());
  const blocksForVersion = RELEASE_NOTES.filter(
    (block) => block.version === currentMarketing,
  );
  if (blocksForVersion.length > 0) {
    return [blocksForVersion[blocksForVersion.length - 1]!];
  }
  return [RELEASE_NOTES[0]!];
}

export function evaluateAutoShowPresentation(): WhatsNewPresentation | null {
  const currentFingerprint = getAppFingerprint();
  const lastSeenFingerprint = getLastSeenAppFingerprint();

  if (lastSeenFingerprint === currentFingerprint) {
    return null;
  }

  if (lastSeenFingerprint === null) {
    const initialBlocks = getLatestReleaseNotes();
    if (initialBlocks.length === 0) {
      markWhatsNewSeen(currentFingerprint);
      return null;
    }
    return { blocks: initialBlocks };
  }

  const blocks = resolveReleaseNotesForUpdate(
    lastSeenFingerprint,
    currentFingerprint,
  );

  if (blocks.length === 0) {
    markWhatsNewSeen(currentFingerprint);
    return null;
  }

  return { blocks };
}

export function resolveReleaseNotesForUpdate(
  lastSeenFingerprint: string,
  currentFingerprint: string,
): ReleaseNoteBlock[] {
  const lastMarketing = getMarketingVersionFromFingerprint(lastSeenFingerprint);
  const currentMarketing =
    getMarketingVersionFromFingerprint(currentFingerprint);

  const newerBlocks = RELEASE_NOTES.filter(
    (block) =>
      compareSemver(block.version, lastMarketing) > 0 &&
      compareSemver(block.version, currentMarketing) <= 0,
  ).sort((left, right) => compareSemver(left.version, right.version));

  if (newerBlocks.length > 0) {
    return newerBlocks;
  }

  if (lastSeenFingerprint !== currentFingerprint && lastMarketing === currentMarketing) {
    const blocksForCurrentVersion = RELEASE_NOTES.filter(
      (block) => block.version === currentMarketing,
    );
    if (blocksForCurrentVersion.length === 0) return [];
    return [blocksForCurrentVersion[blocksForCurrentVersion.length - 1]];
  }

  return [];
}
