import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, useAnimatedScrollHandler } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icons";
import { colors, font, HIT } from "@/lib/theme";

const CONDENSE_AT = 36;

/**
 * Top-level tab page scaffold: large title that scrolls away while a condensed
 * frosted-glass strip fades in — the native counterpart of the web's Header.
 * `trailing` renders top-right (e.g. the notification bell / coin pill).
 */
export function TabScreen({
  title,
  subtitle,
  trailing,
  children,
  contentBottomPad = 108,
  ...scrollProps
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  /** Space for the floating island tab bar. */
  contentBottomPad?: number;
} & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const condensedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [CONDENSE_AT - 14, CONDENSE_AT + 10], [0, 1], "clamp"),
  }));

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: contentBottomPad, paddingHorizontal: 16 }}
        {...scrollProps}
      >
        <View style={styles.largeTitleRow}>
          <View style={styles.largeTitleCol}>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <Text numberOfLines={1} style={styles.largeTitle}>
              {title}
            </Text>
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
        {children}
      </Animated.ScrollView>
      {/* Condensed glass strip */}
      <Animated.View pointerEvents="none" style={[styles.condensed, { height: insets.top + 44 }, condensedStyle]}>
        <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.condensedInner, { paddingTop: insets.top }]}>
          <Text style={styles.condensedTitle}>{title}</Text>
        </View>
        <View style={styles.hairline} />
      </Animated.View>
    </View>
  );
}

/**
 * Pushed detail screen scaffold: frosted BackBar (chevron + Back, centered
 * title, optional trailing) over a scrollable body — the web's BackBar pages.
 */
export function PushedScreen({
  title,
  trailing,
  children,
  scroll = true,
}: {
  title?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [barH, setBarH] = useState(insets.top + 46);
  const bar = (
    <View style={styles.backBar} onLayout={(e) => setBarH(e.nativeEvent.layout.height)}>
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[styles.backBarInner, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back" hitSlop={8} style={styles.backButton}>
          <Icon name="chevron-left" size={18} color={colors.accent} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        {title ? (
          <Text numberOfLines={1} style={styles.backTitle}>
            {title}
          </Text>
        ) : (
          <View />
        )}
        <View style={styles.backTrailing}>{trailing}</View>
      </View>
      <View style={styles.hairline} />
    </View>
  );
  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: barH + 10, paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: barH + 10 }}>{children}</View>
      )}
      {bar}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  largeTitleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, paddingHorizontal: 4, paddingTop: 34, paddingBottom: 10 },
  largeTitleCol: { flex: 1, minWidth: 0 },
  subtitle: { fontSize: 14, fontFamily: font.medium, color: colors.label2 },
  largeTitle: { fontSize: 28, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label, lineHeight: 34 },
  trailing: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  condensed: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  condensedInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  condensedTitle: { fontSize: 17, fontFamily: font.semibold, color: colors.label },
  hairline: { position: "absolute", bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.sep },
  backBar: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" },
  backBarInner: { minHeight: 46, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 6 },
  backButton: { flexDirection: "row", alignItems: "center", minHeight: HIT - 12, flex: 1 },
  backLabel: { fontSize: 16, fontFamily: font.semibold, color: colors.accent },
  backTitle: { fontSize: 17, fontFamily: font.semibold, color: colors.label, maxWidth: "50%", textAlign: "center" },
  backTrailing: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
});
