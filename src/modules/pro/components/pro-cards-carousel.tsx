import React, { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Check,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Infinity as InfinityIcon,
  ShieldCheck,
  Smartphone,
  TrendingUp,
} from "lucide-react-native";

import type { AppTheme } from "@/constants/theme";
import { useAppTheme, useThemeStyles } from "@/hooks/use-app-theme";
import { useLocalization } from "@/infrastructure/localization";

import {
  PRO_CAROUSEL_CARDS,
  type ProCarouselCardItem,
} from "../constants/pro.constants";

interface ProCardsCarouselProps {
  cards?: ProCarouselCardItem[];
  onCardChange?: (index: number) => void;
}

export function ProCardsCarousel({
  cards = PRO_CAROUSEL_CARDS,
  onCardChange,
}: ProCardsCarouselProps) {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const { t } = useLocalization();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = Math.min(width - 48, 360);
  const gap = 12;
  const snapToInterval = cardWidth + gap;
  const horizontalPadding = Math.max((width - cardWidth) / 2, 16);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / snapToInterval);
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
      onCardChange?.(clamped);
    }
  };

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    scrollRef.current?.scrollTo({
      x: clamped * snapToInterval,
      animated: true,
    });
    setActiveIndex(clamped);
    onCardChange?.(clamped);
  };

  const renderCardIcon = (iconName: ProCarouselCardItem["iconName"], color: string) => {
    const iconSize = 20;
    switch (iconName) {
      case "TrendingUp":
        return <TrendingUp color={color} size={iconSize} />;
      case "Cloud":
        return <Cloud color={color} size={iconSize} />;
      case "Infinity":
        return <InfinityIcon color={color} size={iconSize} />;
      case "ShieldCheck":
        return <ShieldCheck color={color} size={iconSize} />;
      case "Smartphone":
        return <Smartphone color={color} size={iconSize} />;
      default:
        return <TrendingUp color={color} size={iconSize} />;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: horizontalPadding,
            gap,
          },
        ]}
        decelerationRate="fast"
        disableIntervalMomentum
        horizontal
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={handleScroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        snapToInterval={snapToInterval}
      >
        {cards.map((card, idx) => {
          const isActive = idx === activeIndex;
          return (
            <View
              key={card.id}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  borderColor: isActive
                    ? `${card.accentColor}55`
                    : theme.colors.border,
                },
              ]}
            >
              {/* Header row: Category Pill + Icon */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.badgePill,
                    { backgroundColor: `${card.accentColor}18` },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgePillText,
                      { color: card.accentColor },
                    ]}
                  >
                    {card.badge}
                  </Text>
                </View>
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor: `${card.accentColor}20`,
                      borderColor: `${card.accentColor}40`,
                    },
                  ]}
                >
                  {renderCardIcon(card.iconName, card.accentColor)}
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text
                style={[styles.cardSubtitle, { color: card.accentColor }]}
              >
                {card.subtitle}
              </Text>

              {/* Description */}
              <Text style={styles.cardDescription}>
                {card.description}
              </Text>

              {/* Highlight Chips */}
              <View style={styles.highlightsContainer}>
                {card.highlights.map((highlight, hIdx) => (
                  <View
                    key={hIdx}
                    style={[
                      styles.highlightChip,
                      {
                        backgroundColor:
                          theme.mode === "dark"
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.04)",
                        borderColor: `${card.accentColor}30`,
                      },
                    ]}
                  >
                    <Check color={card.accentColor} size={12} strokeWidth={2.5} />
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Pagination row: arrow buttons + animated dots */}
      <View style={styles.paginationRow}>
        <Pressable
          accessibilityLabel="Previous card"
          accessibilityRole="button"
          disabled={activeIndex === 0}
          hitSlop={8}
          onPress={() => scrollToIndex(activeIndex - 1)}
          style={[
            styles.navArrow,
            activeIndex === 0 && styles.navArrowDisabled,
          ]}
        >
          <ChevronLeft
            color={
              activeIndex === 0
                ? theme.colors.textMuted
                : theme.colors.textSecondary
            }
            size={18}
          />
        </Pressable>

        <View style={styles.dotsWrapper}>
          {cards.map((card, idx) => {
            const isDotActive = idx === activeIndex;
            return (
              <Pressable
                key={card.id}
                accessibilityLabel={`Go to card ${idx + 1}`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={() => scrollToIndex(idx)}
              >
                <View
                  style={[
                    styles.dot,
                    isDotActive
                      ? [
                          styles.dotActive,
                          { backgroundColor: card.accentColor },
                        ]
                      : styles.dotInactive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityLabel="Next card"
          accessibilityRole="button"
          disabled={activeIndex === cards.length - 1}
          hitSlop={8}
          onPress={() => scrollToIndex(activeIndex + 1)}
          style={[
            styles.navArrow,
            activeIndex === cards.length - 1 && styles.navArrowDisabled,
          ]}
        >
          <ChevronRight
            color={
              activeIndex === cards.length - 1
                ? theme.colors.textMuted
                : theme.colors.textSecondary
            }
            size={18}
          />
        </Pressable>
      </View>

      <Text style={styles.swipeHintText}>{t("pro.swipeCardsHint")}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      paddingVertical: 4,
    },
    scrollContainer: {
      alignItems: "center",
      paddingVertical: 6,
    },
    card: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.borderRadius.large,
      borderWidth: 1.5,
      padding: theme.spacing.lg,
      minHeight: 228,
      justifyContent: "space-between",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    badgePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.round,
    },
    badgePillText: {
      fontSize: 10,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 0.8,
    },
    iconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.bold,
      marginBottom: 2,
    },
    cardSubtitle: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      marginBottom: 6,
    },
    cardDescription: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      lineHeight: 17,
      marginBottom: 10,
    },
    highlightsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 2,
    },
    highlightChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: theme.borderRadius.small,
      borderWidth: 1,
    },
    highlightText: {
      color: theme.colors.textPrimary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.medium,
    },
    paginationRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginTop: 10,
    },
    navArrow: {
      padding: 4,
      borderRadius: theme.borderRadius.round,
    },
    navArrowDisabled: {
      opacity: 0.35,
    },
    dotsWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dot: {
      height: 6,
      borderRadius: 3,
    },
    dotActive: {
      width: 22,
    },
    dotInactive: {
      width: 6,
      backgroundColor: theme.colors.border,
    },
    swipeHintText: {
      color: theme.colors.textMuted,
      fontSize: 10,
      textAlign: "center",
      marginTop: 6,
      letterSpacing: 0.3,
    },
  });
}
