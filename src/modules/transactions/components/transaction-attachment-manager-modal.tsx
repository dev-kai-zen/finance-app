import { useEffect, useRef, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  Cloud,
  CloudDownload,
  FileText,
  ImageIcon,
  Images,
  Paperclip,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import {
  ActionBottomSheet,
  ConfirmModal,
  NotificationModal,
} from "@/components";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AttachmentManagerItem } from "../hooks/use-transaction-attachments";
import type { TransactionAttachmentDraft } from "../types/transaction.types";

export interface TransactionAttachmentManagerModalProps {
  visible: boolean;
  items: AttachmentManagerItem[];
  totalCount?: number;
  loading?: boolean;
  loadingMore?: boolean;
  pending?: boolean;
  error?: string | null;
  onAdd: (drafts: TransactionAttachmentDraft[]) => void | Promise<void>;
  onClearError?: () => void;
  onClose: () => void;
  onOpen: (item: AttachmentManagerItem) => void | Promise<void>;
  onRemove: (item: AttachmentManagerItem) => void | Promise<void>;
  onLoadMore?: () => void;
}

const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
] as const;

export function TransactionAttachmentManagerModal({
  visible,
  items,
  totalCount = items.length,
  loading = false,
  loadingMore = false,
  pending = false,
  error = null,
  onAdd,
  onClearError,
  onClose,
  onOpen,
  onRemove,
  onLoadMore,
}: TransactionAttachmentManagerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] =
    useState<AttachmentManagerItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const pickerLaunchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setSourceSheetOpen(false);
      setPickerError(null);
      setRemoveTarget(null);
    }
    return () => {
      if (pickerLaunchTimer.current) {
        clearTimeout(pickerLaunchTimer.current);
        pickerLaunchTimer.current = null;
      }
    };
  }, [visible]);

  const runPicker = (picker: () => Promise<TransactionAttachmentDraft[]>) => {
    setSourceSheetOpen(false);
    if (pickerLaunchTimer.current) clearTimeout(pickerLaunchTimer.current);
    pickerLaunchTimer.current = setTimeout(() => {
      pickerLaunchTimer.current = null;
      setPicking(true);
      setPickerError(null);
      void picker()
        .then(async (drafts) => {
          if (drafts.length > 0) await onAdd(drafts);
        })
        .catch((pickerFailure: unknown) => {
          setPickerError(getErrorMessage(pickerFailure));
        })
        .finally(() => setPicking(false));
    }, 400);
  };

  const dismissError = () => {
    setPickerError(null);
    onClearError?.();
  };

  const confirmRemove = (item: AttachmentManagerItem) => {
    setRemoveTarget(item);
  };

  const removeConfirmedAttachment = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    dismissError();
    try {
      await onRemove(removeTarget);
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  };

  const busy = pending || picking || removing;
  const displayError = pickerError || error;

  return (
    <>
      <Modal
        animationType="slide"
        onRequestClose={onClose}
        presentationStyle="fullScreen"
        visible={visible}
      >
        <View
          style={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, theme.spacing.md),
              paddingBottom: insets.bottom,
            },
          ]}
        >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Attachments</Text>
            <Text style={styles.countText}>
              {totalCount} {totalCount === 1 ? "file" : "files"}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Add attachment"
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setSourceSheetOpen(true)}
            style={[styles.addButton, busy && styles.disabledButton]}
          >
            <Plus color={theme.colors.onPrimary} size={18} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Close attachments"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <X color={theme.colors.textSecondary} size={22} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.helperText}>Loading attachments…</Text>
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[
              styles.listContent,
              items.length === 0 && styles.emptyListContent,
            ]}
            contentInsetAdjustmentBehavior="automatic"
            data={items}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  color={theme.colors.primary}
                  style={styles.loadMoreIndicator}
                />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Paperclip color={theme.colors.primary} size={28} />
                </View>
                <Text style={styles.emptyTitle}>No attachments yet</Text>
                <Text style={styles.helperText}>
                  Add receipt photos, PDFs, or documents to this transaction.
                </Text>
                <Pressable
                  accessibilityLabel="Add first attachment"
                  onPress={() => setSourceSheetOpen(true)}
                  style={styles.emptyAddButton}
                >
                  <Plus color={theme.colors.primary} size={18} />
                  <Text style={styles.emptyAddText}>Add attachment</Text>
                </Pressable>
              </View>
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.35}
            renderItem={({ item }) => (
              <AttachmentRow
                disabled={busy}
                item={item}
                onOpen={() => void onOpen(item)}
                onRemove={() => confirmRemove(item)}
              />
            )}
          />
        )}

        {busy ? (
          <View style={styles.busyOverlay} pointerEvents="none">
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : null}

        </View>
      </Modal>

      <ActionBottomSheet
        items={[
          {
            id: "camera",
            label: "Camera",
            description: "Take a new receipt or document photo",
            icon: <Camera color={theme.colors.primary} size={22} />,
            onPress: () => runPicker(pickFromCamera),
          },
          {
            id: "photo-library",
            label: "Photo Library",
            description: "Select one or more images",
            icon: <Images color={theme.colors.primary} size={22} />,
            onPress: () => runPicker(pickFromPhotoLibrary),
          },
          {
            id: "files",
            label: "Files",
            description: "PDF, Word, OpenDocument, or text files",
            icon: <FileText color={theme.colors.primary} size={22} />,
            onPress: () => runPicker(pickDocuments),
          },
        ]}
        onClose={() => setSourceSheetOpen(false)}
        title="Add attachment"
        visible={visible && sourceSheetOpen}
      />

      <ConfirmModal
        confirmLabel="Remove"
        message={
          removeTarget
            ? `Remove “${removeTarget.name}” from this transaction?`
            : "Remove this attachment from the transaction?"
        }
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void removeConfirmedAttachment()}
        pending={removing}
        title="Remove attachment?"
        variant="destructive"
        visible={visible && removeTarget !== null}
      />

      <NotificationModal
        message={displayError ?? ""}
        onClose={dismissError}
        title="Attachment error"
        variant="error"
        visible={visible && Boolean(displayError) && removeTarget === null}
      />
    </>
  );
}

function AttachmentRow({
  item,
  disabled,
  onOpen,
  onRemove,
}: {
  item: AttachmentManagerItem;
  disabled: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const isImage = item.mimeType.startsWith("image/");
  const status = getStatusLabel(item);
  const statusColor =
    item.syncStatus === "failed"
      ? theme.colors.danger
      : item.syncStatus === "synced"
        ? theme.colors.success
        : theme.colors.info;

  return (
    <View style={styles.attachmentRow}>
      <Pressable
        accessibilityLabel={`Open ${item.name}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onOpen}
        style={styles.attachmentMain}
      >
        <View style={styles.preview}>
          {isImage && item.uri ? (
            <Image
              contentFit="cover"
              source={{ uri: item.uri }}
              style={styles.previewImage}
            />
          ) : isImage ? (
            <ImageIcon color={theme.colors.primary} size={22} />
          ) : (
            <FileText color={theme.colors.primary} size={22} />
          )}
        </View>
        <View style={styles.attachmentCopy}>
          <Text numberOfLines={1} style={styles.attachmentName}>
            {item.name}
          </Text>
          <View style={styles.attachmentMetaRow}>
            <Text style={styles.attachmentMeta}>{formatBytes(item.sizeBytes)}</Text>
            <Text style={[styles.attachmentStatus, { color: statusColor }]}>
              · {status}
            </Text>
            {!item.uri && !item.isDraft ? (
              <CloudDownload color={statusColor} size={13} />
            ) : item.syncStatus === "synced" ? (
              <Cloud color={statusColor} size={13} />
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Remove ${item.name}`}
        accessibilityRole="button"
        disabled={disabled}
        hitSlop={8}
        onPress={onRemove}
        style={styles.removeButton}
      >
        <Trash2 color={theme.colors.danger} size={18} />
      </Pressable>
    </View>
  );
}

async function pickFromCamera(): Promise<TransactionAttachmentDraft[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission is required to take an attachment photo.");
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 0.9,
  });
  return result.canceled ? [] : result.assets.map(toImageDraft);
}

async function pickFromPhotoLibrary(): Promise<TransactionAttachmentDraft[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: 0,
    quality: 0.9,
    shouldDownloadFromNetwork: true,
  });
  return result.canceled ? [] : result.assets.map(toImageDraft);
}

async function pickDocuments(): Promise<TransactionAttachmentDraft[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...DOCUMENT_TYPES],
    copyToCacheDirectory: true,
    multiple: true,
  });
  return result.canceled
    ? []
    : result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? inferMimeType(asset.name),
        sizeBytes: asset.size,
      }));
}

function toImageDraft(
  asset: ImagePicker.ImagePickerAsset,
): TransactionAttachmentDraft {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? inferMimeType(asset.fileName ?? "photo.jpg"),
    sizeBytes: asset.fileSize,
  };
}

function inferMimeType(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    heic: "image/heic",
    webp: "image/webp",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    odt: "application/vnd.oasis.opendocument.text",
    txt: "text/plain",
  };
  return types[extension ?? ""] ?? "application/octet-stream";
}

function getStatusLabel(item: AttachmentManagerItem): string {
  if (item.isDraft) return "Ready to save";
  if (!item.uri && item.syncStatus === "synced") return "Download from Drive";
  if (item.syncStatus === "syncing") return "Uploading";
  if (item.syncStatus === "synced") return "Synced";
  if (item.syncStatus === "failed") return "Sync failed";
  return "Waiting to sync";
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Unable to add the selected attachment.";
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      alignItems: "center",
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    headerCopy: { flex: 1 },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
    },
    countText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
      fontVariant: ["tabular-nums"],
    },
    addButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      flexDirection: "row",
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    disabledButton: { opacity: 0.55 },
    addButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.round,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    centered: {
      alignItems: "center",
      flex: 1,
      gap: theme.spacing.sm,
      justifyContent: "center",
    },
    listContent: {
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    loadMoreIndicator: { marginVertical: theme.spacing.md },
    emptyListContent: { flexGrow: 1 },
    emptyState: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIcon: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}16`,
      borderRadius: 32,
      height: 64,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 64,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
    },
    helperText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.lineHeight.sm,
      textAlign: "center",
    },
    emptyAddButton: {
      alignItems: "center",
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.round,
      borderWidth: 1,
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    emptyAddText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.bold,
    },
    attachmentRow: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.medium,
      borderWidth: 1,
      flexDirection: "row",
      minHeight: 72,
      padding: theme.spacing.sm,
    },
    attachmentMain: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    preview: {
      alignItems: "center",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.small,
      height: 52,
      justifyContent: "center",
      overflow: "hidden",
      width: 52,
    },
    previewImage: { height: "100%", width: "100%" },
    attachmentCopy: { flex: 1 },
    attachmentName: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    attachmentMetaRow: {
      alignItems: "center",
      flexDirection: "row",
      marginTop: 4,
    },
    attachmentMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.fontSize.xs,
    },
    attachmentStatus: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
    },
    removeButton: {
      alignItems: "center",
      borderRadius: theme.borderRadius.round,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    busyOverlay: {
      alignItems: "center",
      backgroundColor: `${theme.colors.background}99`,
      bottom: 0,
      justifyContent: "center",
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
  });
}
