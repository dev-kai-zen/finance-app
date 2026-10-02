import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  RefreshCw,
  Share2,
  X,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import type { AttachmentManagerItem } from "../hooks/use-transaction-attachments";
import { shareAttachment } from "../hooks/use-transaction-attachments";
import { getAvailableTransactionAttachmentUri } from "../services/transaction-attachments.service";

export interface AttachmentViewerModalProps {
  visible: boolean;
  items: AttachmentManagerItem[];
  initialIndex?: number;
  onClose: () => void;
  onShare?: (item: AttachmentManagerItem, uri: string) => void | Promise<void>;
}

export function AttachmentViewerModal({
  visible,
  items,
  initialIndex = 0,
  onClose,
  onShare,
}: AttachmentViewerModalProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Sync initialIndex when modal becomes visible or initialIndex changes
  useEffect(() => {
    if (visible) {
      const safeIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
      setCurrentIndex(safeIndex);
    }
  }, [visible, initialIndex, items.length]);

  const currentItem: AttachmentManagerItem | undefined = items[currentIndex];
  const isImage = currentItem?.mimeType.startsWith("image/") ?? false;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;

  useEffect(() => {
    if (!visible || !currentItem) {
      setCurrentUri(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const resolveUri = async (): Promise<string> => {
      if (currentItem.isDraft) {
        if (!currentItem.uri) {
          throw new Error("Draft attachment file is unavailable.");
        }
        return currentItem.uri;
      }

      if (currentItem.attachmentId) {
        return await getAvailableTransactionAttachmentUri(currentItem.attachmentId);
      }

      if (currentItem.uri) {
        return currentItem.uri;
      }

      throw new Error("Attachment file location is unavailable.");
    };

    resolveUri()
      .then((resolvedUri) => {
        if (isMounted) {
          setCurrentUri(resolvedUri);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load attachment file.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible, currentItem, reloadKey]);

  const handleShare = async () => {
    if (!currentItem || !currentUri) return;
    try {
      if (onShare) {
        await onShare(currentItem, currentUri);
      } else {
        await shareAttachment(currentUri, currentItem);
      }
    } catch {
      // Benign share errors handled in shareAttachment
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (!visible || !currentItem) return null;

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Top Navigation Bar */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Close attachment viewer"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={styles.iconButton}
          >
            <X color="#ffffff" size={24} />
          </Pressable>

          <View style={styles.titleColumn}>
            <Text numberOfLines={1} style={styles.titleText}>
              {currentItem.name}
            </Text>
            <Text style={styles.subtitleText}>
              {items.length > 1
                ? `${currentIndex + 1} of ${items.length} · ${formatBytes(currentItem.sizeBytes)}`
                : formatBytes(currentItem.sizeBytes)}
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Share attachment"
            accessibilityRole="button"
            disabled={loading || !currentUri}
            hitSlop={12}
            onPress={handleShare}
            style={[styles.iconButton, (loading || !currentUri) && styles.iconButtonDisabled]}
          >
            <Share2 color="#ffffff" size={20} />
          </Pressable>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          {loading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading attachment…</Text>
            </View>
          ) : error ? (
            <View style={styles.centeredState}>
              <Text style={styles.errorTitle}>Could not open file</Text>
              <Text style={styles.errorDescription}>{error}</Text>
              <Pressable
                accessibilityLabel="Retry loading attachment"
                accessibilityRole="button"
                onPress={() => setReloadKey((k) => k + 1)}
                style={styles.retryButton}
              >
                <RefreshCw color="#ffffff" size={16} />
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : isImage && currentUri ? (
            <ScrollView
              centerContent
              contentContainerStyle={styles.imageScrollContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              pinchGestureEnabled
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              style={styles.imageScrollView}
            >
              <Image
                contentFit="contain"
                priority="high"
                source={{ uri: currentUri }}
                style={styles.fullscreenImage}
              />
            </ScrollView>
          ) : (
            <View style={styles.documentPreviewCard}>
              <View style={styles.documentIconWrap}>
                <FileText color={theme.colors.primary} size={48} />
              </View>
              <Text numberOfLines={2} style={styles.documentName}>
                {currentItem.name}
              </Text>
              <Text style={styles.documentMeta}>
                {formatBytes(currentItem.sizeBytes)} · {currentItem.mimeType}
              </Text>

              <Pressable
                accessibilityLabel="Open document in system viewer"
                accessibilityRole="button"
                disabled={!currentUri}
                onPress={handleShare}
                style={styles.openDocumentButton}
              >
                <ExternalLink color="#ffffff" size={18} />
                <Text style={styles.openDocumentButtonText}>Open in System Viewer</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Share document"
                accessibilityRole="button"
                disabled={!currentUri}
                onPress={handleShare}
                style={styles.shareDocumentButton}
              >
                <Share2 color={theme.colors.textSecondary} size={16} />
                <Text style={styles.shareDocumentButtonText}>Share File</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Bottom Bar: Multi-item Navigation & Hints */}
        <View style={styles.bottomBar}>
          {items.length > 1 ? (
            <View style={styles.navigationRow}>
              <Pressable
                accessibilityLabel="Previous attachment"
                accessibilityRole="button"
                disabled={!canGoPrevious}
                hitSlop={8}
                onPress={handlePrevious}
                style={[styles.navArrowButton, !canGoPrevious && styles.navArrowButtonDisabled]}
              >
                <ChevronLeft color={canGoPrevious ? "#ffffff" : "#444444"} size={26} />
              </Pressable>

              <View style={styles.counterPill}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {items.length}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Next attachment"
                accessibilityRole="button"
                disabled={!canGoNext}
                hitSlop={8}
                onPress={handleNext}
                style={[styles.navArrowButton, !canGoNext && styles.navArrowButtonDisabled]}
              >
                <ChevronRight color={canGoNext ? "#ffffff" : "#444444"} size={26} />
              </Pressable>
            </View>
          ) : isImage ? (
            <Text style={styles.hintText}>Pinch or double-tap to zoom</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export function formatBytes(bytes: number): string {
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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: "#07090e",
      flex: 1,
      justifyContent: "space-between",
    },
    topBar: {
      alignItems: "center",
      backgroundColor: "rgba(7, 9, 14, 0.85)",
      borderBottomColor: "rgba(255, 255, 255, 0.08)",
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      zIndex: 10,
    },
    titleColumn: {
      alignItems: "center",
      flex: 1,
      marginHorizontal: theme.spacing.md,
    },
    titleText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    subtitleText: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: 12,
      marginTop: 2,
    },
    iconButton: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: 20,
      height: 40,
      justifyContent: "center",
      width: 40,
    },
    iconButtonDisabled: {
      opacity: 0.35,
    },
    contentArea: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      width: "100%",
    },
    centeredState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.xl,
    },
    loadingText: {
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: 14,
      marginTop: theme.spacing.md,
    },
    errorTitle: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    errorDescription: {
      color: "rgba(255, 255, 255, 0.6)",
      fontSize: 13,
      marginTop: theme.spacing.xs,
      textAlign: "center",
    },
    retryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    retryButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.medium,
    },
    imageScrollView: {
      flex: 1,
      width: "100%",
    },
    imageScrollContent: {
      alignItems: "center",
      flexGrow: 1,
      justifyContent: "center",
    },
    fullscreenImage: {
      height: "100%",
      minHeight: 300,
      width: "100%",
    },
    documentPreviewCard: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.05)",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: theme.borderRadius.large,
      borderWidth: 1,
      maxWidth: 340,
      padding: theme.spacing.xl,
      width: "88%",
    },
    documentIconWrap: {
      alignItems: "center",
      backgroundColor: `${theme.colors.primary}20`,
      borderRadius: theme.borderRadius.large,
      height: 80,
      justifyContent: "center",
      marginBottom: theme.spacing.md,
      width: 80,
    },
    documentName: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: theme.typography.fontWeight.semibold,
      textAlign: "center",
    },
    documentMeta: {
      color: "rgba(255, 255, 255, 0.5)",
      fontSize: 12,
      marginBottom: theme.spacing.xl,
      marginTop: 4,
      textAlign: "center",
    },
    openDocumentButton: {
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      paddingVertical: 12,
      width: "100%",
    },
    openDocumentButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    shareDocumentButton: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.08)",
      borderRadius: theme.borderRadius.medium,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "center",
      marginTop: theme.spacing.sm,
      paddingVertical: 10,
      width: "100%",
    },
    shareDocumentButtonText: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.medium,
    },
    bottomBar: {
      alignItems: "center",
      backgroundColor: "rgba(7, 9, 14, 0.85)",
      borderTopColor: "rgba(255, 255, 255, 0.08)",
      borderTopWidth: StyleSheet.hairlineWidth,
      justifyContent: "center",
      minHeight: 56,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    navigationRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: theme.spacing.lg,
      justifyContent: "center",
    },
    navArrowButton: {
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderRadius: 18,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    navArrowButtonDisabled: {
      backgroundColor: "rgba(255, 255, 255, 0.04)",
      opacity: 0.35,
    },
    counterPill: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    counterText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: theme.typography.fontWeight.medium,
    },
    hintText: {
      color: "rgba(255, 255, 255, 0.4)",
      fontSize: 12,
    },
  });
}
