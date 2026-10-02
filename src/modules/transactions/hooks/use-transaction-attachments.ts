import { useCallback, useEffect, useMemo, useState } from "react";
import { randomUUID } from "expo-crypto";
import * as Sharing from "expo-sharing";

import type {
  TransactionAttachment,
  TransactionAttachmentChanges,
  TransactionAttachmentDraft,
  TransactionAttachmentSyncStatus,
} from "../types/transaction.types";
import {
  addTransactionAttachments,
  getAvailableTransactionAttachmentUri,
  listTransactionAttachments,
  removeTransactionAttachment,
  retryTransactionAttachmentSync,
  triggerTransactionAttachmentSync,
} from "../services/transaction-attachments.service";
import {
  getTransactionAttachmentLocalUri,
  isTransactionAttachmentAvailableLocally,
} from "../services/transaction-attachment-storage.service";

export interface AttachmentManagerItem {
  key: string;
  attachmentId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uri: string | null;
  syncStatus: TransactionAttachmentSyncStatus | "draft";
  syncError: string | null;
  isDraft: boolean;
}

interface DraftItem extends TransactionAttachmentDraft {
  draftId: string;
}

const ATTACHMENT_PAGE_SIZE = 50;

export function useTransactionAttachmentDraft(options: {
  visible: boolean;
  isEditing: boolean;
  transactionId?: string | null;
}) {
  const [existing, setExisting] = useState<TransactionAttachment[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [existingTotalCount, setExistingTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.visible) return;
    setDrafts([]);
    setRemovedIds([]);
    setError(null);
    if (options.isEditing && options.transactionId) {
      try {
        const page = listTransactionAttachments(options.transactionId, {
          limit: ATTACHMENT_PAGE_SIZE,
          offset: 0,
        });
        setExisting(page.items);
        setExistingTotalCount(page.totalCount);
      } catch (loadError) {
        setExisting([]);
        setExistingTotalCount(0);
        setError(getErrorMessage(loadError));
      }
    } else {
      setExisting([]);
      setExistingTotalCount(0);
    }
  }, [options.isEditing, options.transactionId, options.visible]);

  const items = useMemo<AttachmentManagerItem[]>(
    () => [
      ...existing
        .filter((attachment) => !removedIds.includes(attachment.id))
        .map(toManagerItem),
      ...drafts.map((draft) => ({
        key: `draft:${draft.draftId}`,
        attachmentId: null,
        name: draft.name,
        mimeType: draft.mimeType,
        sizeBytes: draft.sizeBytes ?? 0,
        uri: draft.uri,
        syncStatus: "draft" as const,
        syncError: null,
        isDraft: true,
      })),
    ],
    [drafts, existing, removedIds],
  );

  const addDrafts = useCallback((values: TransactionAttachmentDraft[]) => {
    setError(null);
    setDrafts((current) => [
      ...current,
      ...values.map((value) => ({ ...value, draftId: randomUUID() })),
    ]);
  }, []);

  const loadMore = useCallback(() => {
    if (
      loadingMore ||
      !options.isEditing ||
      !options.transactionId ||
      existing.length >= existingTotalCount
    ) {
      return;
    }
    try {
      setLoadingMore(true);
      const page = listTransactionAttachments(options.transactionId, {
        limit: ATTACHMENT_PAGE_SIZE,
        offset: existing.length,
      });
      setExisting((current) => [
        ...current,
        ...page.items.filter(
          (item) => !current.some((currentItem) => currentItem.id === item.id),
        ),
      ]);
      setExistingTotalCount(page.totalCount);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  }, [
    existing.length,
    existingTotalCount,
    loadingMore,
    options.isEditing,
    options.transactionId,
  ]);

  const removeItem = useCallback((item: AttachmentManagerItem) => {
    setError(null);
    if (item.isDraft) {
      setDrafts((current) =>
        current.filter((draft) => `draft:${draft.draftId}` !== item.key),
      );
      return;
    }
    if (item.attachmentId) {
      setRemovedIds((current) =>
        current.includes(item.attachmentId!)
          ? current
          : [...current, item.attachmentId!],
      );
    }
  }, []);

  const openItem = useCallback(async (item: AttachmentManagerItem) => {
    try {
      setError(null);
      const uri = item.isDraft
        ? item.uri
        : item.attachmentId
          ? await getAvailableTransactionAttachmentUri(item.attachmentId)
          : null;
      if (!uri) throw new Error("The attachment file is unavailable.");
      await shareAttachment(uri, item);
    } catch (openError) {
      setError(getErrorMessage(openError));
    }
  }, []);

  const changes = useMemo<TransactionAttachmentChanges>(
    () => ({
      added: drafts.map(({ draftId: _draftId, ...draft }) => draft),
      removedIds,
    }),
    [drafts, removedIds],
  );

  return {
    changes,
    error,
    items,
    loadingMore,
    totalCount: Math.max(0, existingTotalCount - removedIds.length) + drafts.length,
    addDrafts,
    clearError: () => setError(null),
    openItem,
    loadMore,
    removeItem,
  };
}

export function useTransactionAttachments(
  transactionId: string | null | undefined,
  active: boolean,
) {
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!transactionId) {
      setAttachments([]);
      setTotalCount(0);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const page = listTransactionAttachments(transactionId, {
        limit: ATTACHMENT_PAGE_SIZE,
        offset: 0,
      });
      setAttachments(page.items);
      setTotalCount(page.totalCount);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  const loadMore = useCallback(() => {
    if (
      loading ||
      loadingMore ||
      !transactionId ||
      attachments.length >= totalCount
    ) {
      return;
    }
    try {
      setLoadingMore(true);
      const page = listTransactionAttachments(transactionId, {
        limit: ATTACHMENT_PAGE_SIZE,
        offset: attachments.length,
      });
      setAttachments((current) => [
        ...current,
        ...page.items.filter(
          (item) => !current.some((currentItem) => currentItem.id === item.id),
        ),
      ]);
      setTotalCount(page.totalCount);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  }, [attachments.length, loading, loadingMore, totalCount, transactionId]);

  useEffect(() => {
    if (active) refresh();
  }, [active, refresh]);

  const add = useCallback(
    async (drafts: TransactionAttachmentDraft[]) => {
      if (!transactionId || drafts.length === 0) return;
      try {
        setPending(true);
        setError(null);
        await addTransactionAttachments(transactionId, drafts);
        refresh();
      } catch (addError) {
        setError(getErrorMessage(addError));
      } finally {
        setPending(false);
      }
    },
    [refresh, transactionId],
  );

  const remove = useCallback(
    async (item: AttachmentManagerItem) => {
      if (!item.attachmentId) return;
      try {
        setPending(true);
        setError(null);
        removeTransactionAttachment(item.attachmentId);
        refresh();
      } catch (removeError) {
        setError(getErrorMessage(removeError));
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const open = useCallback(async (item: AttachmentManagerItem) => {
    if (!item.attachmentId) return;
    try {
      setPending(true);
      setError(null);
      const uri = await getAvailableTransactionAttachmentUri(item.attachmentId);
      await shareAttachment(uri, item);
      refresh();
    } catch (openError) {
      setError(getErrorMessage(openError));
    } finally {
      setPending(false);
    }
  }, [refresh]);

  const retrySync = useCallback(() => {
    for (const attachment of attachments) {
      if (attachment.syncStatus === "failed") {
        retryTransactionAttachmentSync(attachment.id);
      }
    }
    triggerTransactionAttachmentSync();
    refresh();
  }, [attachments, refresh]);

  return {
    attachments,
    items: attachments.map(toManagerItem),
    loading,
    loadingMore,
    pending,
    totalCount,
    error,
    add,
    clearError: () => setError(null),
    open,
    loadMore,
    refresh,
    remove,
    retrySync,
  };
}

function toManagerItem(
  attachment: TransactionAttachment,
): AttachmentManagerItem {
  const isLocal = isTransactionAttachmentAvailableLocally(attachment);
  return {
    key: attachment.id,
    attachmentId: attachment.id,
    name: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uri: isLocal
      ? getTransactionAttachmentLocalUri(attachment.storageKey)
      : null,
    syncStatus: attachment.syncStatus,
    syncError: attachment.lastSyncError,
    isDraft: false,
  };
}

export async function shareAttachment(
  uri: string,
  item: Pick<AttachmentManagerItem, "mimeType" | "name">,
): Promise<void> {
  if (activeShareRequest) return activeShareRequest;

  const request = performShare(uri, item).catch((error: unknown) => {
    if (!isBenignShareInterruption(error)) throw error;
  });
  activeShareRequest = request;
  try {
    await request;
  } finally {
    if (shareReleaseTimer) clearTimeout(shareReleaseTimer);
    shareReleaseTimer = setTimeout(() => {
      if (activeShareRequest === request) activeShareRequest = null;
      shareReleaseTimer = null;
    }, 600);
  }
}

let activeShareRequest: Promise<void> | null = null;
let shareReleaseTimer: ReturnType<typeof setTimeout> | null = null;

async function performShare(
  uri: string,
  item: Pick<AttachmentManagerItem, "mimeType" | "name">,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Opening attachments is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    dialogTitle: item.name,
    mimeType: item.mimeType,
  });
}

function isBenignShareInterruption(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("another share request is being processed") ||
    message.includes("cancel") ||
    message.includes("dismiss")
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "The attachment operation failed.";
}
