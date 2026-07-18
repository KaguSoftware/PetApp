import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font } from "@/lib/theme";

/**
 * Native UINavigationBar styling shared by every stack in the app. Real
 * system chrome — large titles that collapse with UIKit physics, blur under
 * the bar, the platform back chevron, interactive edge-swipe pop. No
 * hand-rolled headers anywhere.
 */
export const nativeHeaderOptions = {
  headerTransparent: Platform.OS === "ios",
  headerBlurEffect: "systemChromeMaterial" as const,
  headerShadowVisible: false,
  headerTintColor: colors.accent,
  headerTitleStyle: { fontFamily: font.semibold, color: colors.label },
  headerBackTitle: "Back",
  headerBackTitleStyle: { fontFamily: font.regular },
  headerStyle: Platform.OS === "ios" ? undefined : { backgroundColor: colors.bg },
  contentStyle: { backgroundColor: colors.bg },
};

/** Tab stacks add the collapsing large title on top of the shared chrome. */
export const tabStackScreenOptions = {
  ...nativeHeaderOptions,
  headerLargeTitle: true,
  headerLargeTitleShadowVisible: false,
  headerLargeStyle: { backgroundColor: colors.bg },
  headerLargeTitleStyle: { fontFamily: font.bold, color: colors.label },
};

function HeaderTrailing({ children }: { children: React.ReactNode }) {
  return <View style={styles.headerTrailing}>{children}</View>;
}

/**
 * Top-level tab page scaffold. The title lives in the REAL native large-title
 * header (configured by the tab's stack layout); this component wires the
 * title + trailing accessories into it and provides the scroll container
 * whose content insets drive the native collapse.
 */
export function TabScreen({
  title,
  subtitle,
  trailing,
  children,
  contentBottomPad = 16,
  ...scrollProps
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  /** Extra bottom breathing room — the native tab bar inset is handled by the system. */
  contentBottomPad?: number;
} & ScrollViewProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  useLayoutEffect(() => {
    navigation.setOptions({
      title,
      headerRight: trailing ? () => <HeaderTrailing>{trailing}</HeaderTrailing> : undefined,
    });
  }, [navigation, title, trailing]);

  return (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: Platform.OS === "android" ? headerHeight + 6 : 6,
        paddingBottom: contentBottomPad + Math.max(insets.bottom, 12),
        paddingHorizontal: 16,
      }}
      {...scrollProps}
    >
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </ScrollView>
  );
}

/**
 * Pushed detail screen scaffold: native inline header (back chevron comes from
 * the system), scrollable body inset under the transparent bar.
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title ?? "",
      headerRight: trailing ? () => <HeaderTrailing>{trailing}</HeaderTrailing> : undefined,
    });
  }, [navigation, title, trailing]);

  if (!scroll) {
    return <View style={[styles.root, { paddingTop: headerHeight + 10 }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: Platform.OS === "android" ? headerHeight + 10 : 10,
        paddingBottom: insets.bottom + 32,
        paddingHorizontal: 16,
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  subtitle: { fontSize: 14, fontFamily: font.medium, color: colors.label2, paddingHorizontal: 4, paddingBottom: 8 },
  headerTrailing: { flexDirection: "row", alignItems: "center", gap: 12, paddingRight: Platform.OS === "android" ? 4 : 0 },
});
