import { RELEASE_NOTES } from "@/modules/version-history/constants/release-notes";
import type {
  ReleaseNoteBlock,
  VersionHistoryPresentation,
} from "@/modules/version-history/types/version-history.types";
import {
  getAppFingerprint,
  getMarketingVersionFromFingerprint,
} from "@/modules/version-history/utils/app-fingerprint";
import { compareSemver } from "@/modules/version-history/utils/compare-app-versions";
import {
  getLastSeenAppFingerprint as readLastSeenAppFingerprint,
  saveLastSeenAppFingerprint,
} from "@/modules/version-history/repositories/version-history.repository";

type VersionHistoryListener = () => void;
const listeners = new Set<VersionHistoryListener>();

export function subscribeToVersionHistory(listener: VersionHistoryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyVersionHistoryListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
}

export function getLastSeenAppFingerprint(): string | null {
  return readLastSeenAppFingerprint();
}

export function markVersionHistorySeen(fingerprint = getAppFingerprint()): void {
  saveLastSeenAppFingerprint(fingerprint);
  notifyVersionHistoryListeners();
}

export function isVersionHistoryPending(): boolean {
  return evaluateAutoShowPresentation() !== null;
}

export function getAllReleaseNotes(): ReleaseNoteBlock[] {
  return [...RELEASE_NOTES].sort((left, right) =>
    compareSemver(right.version, left.version),
  );
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

export function evaluateAutoShowPresentation(): VersionHistoryPresentation | null {
  const currentFingerprint = getAppFingerprint();
  const lastSeenFingerprint = getLastSeenAppFingerprint();

  if (lastSeenFingerprint === currentFingerprint) {
    return null;
  }

  const allBlocks = getAllReleaseNotes();
  if (allBlocks.length === 0) {
    markVersionHistorySeen(currentFingerprint);
    return null;
  }

  return { blocks: allBlocks };
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
