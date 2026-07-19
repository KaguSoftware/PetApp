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
  // A standard OPAQUE native header. iOS gives it the system material and
  // auto-blurs it as content scrolls under — a *transparent* header here left a
  // blank gap with no title painted, so we let UIKit own the background.
  headerShadowVisible: false,
  headerTintColor: colors.accent,
  headerTitleStyle: { fontFamily: font.semibold, color: colors.label },
  // Always show the "Back" text next to the chevron (iOS defaults to icon-only
  // "minimal" mode on many screens otherwise).
  headerBackTitle: "Back",
  headerBackButtonDisplayMode: "default" as const,
  headerBackTitleStyle: { fontFamily: font.regular },
  headerStyle: { backgroundColor: colors.bg },
  contentStyle: { backgroundColor: colors.bg },
};

/**
 * Tab stacks render their big title as in-content text (see TabScreen), not as
 * a native large title — the native large-title header did not paint reliably
 * in Expo Go on iOS (blank gap, no title). We keep a normal small header only
 * for the trailing accessories (coins + bell), with no title text of its own.
 */
export const tabStackScreenOptions = {
  ...nativeHeaderOptions,
  headerTitle: "",
};

function HeaderTrailing({ children }: { children: React.ReactNode }) {
  return <View style={styles.headerTrailing}>{children}</View>;
}

/**
 * On iOS, UITabBarController participates in the safe-area chain, so
 * `insets.bottom` already accounts for the real tab bar height. On Android,
 * `NativeTabs` (expo-router/unstable-native-tabs) paints its own opaque bar
 * above the system nav bar, but the safe-area inset it reports only reflects
 * the system nav/gesture inset underneath it — not the bar itself. Without
 * this, the last ~56dp of scrollable content sits behind the opaque tab bar.
 */
const ANDROID_TAB_BAR_HEIGHT = 56;

/**
 * Top-level tab page scaffold. The big page title is rendered as in-content
 * text (reliable everywhere), while the small native header carries only the
 * trailing accessories (coins + bell). Content starts just below that header.
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerRight: trailing ? () => <HeaderTrailing>{trailing}</HeaderTrailing> : undefined,
    });
  }, [navigation, trailing]);

  return (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        // The header is opaque on both platforms, so content already begins
        // below it — just a little breathing room, no header-height offset
        // (that offset was the huge empty gap on Android).
        paddingTop: 8,
        paddingBottom:
          contentBottomPad + Math.max(insets.bottom, 12) + (Platform.OS === "android" ? ANDROID_TAB_BAR_HEIGHT : 0),
        paddingHorizontal: 16,
      }}
      {...scrollProps}
    >
      <Text style={styles.pageTitle}>{title}</Text>
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title ?? "",
      headerRight: trailing ? () => <HeaderTrailing>{trailing}</HeaderTrailing> : undefined,
    });
  }, [navigation, title, trailing]);

  if (!scroll) {
    return <View style={[styles.root, { paddingTop: 10 }]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.root}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        // Opaque header → content already sits below it on both platforms.
        paddingTop: 10,
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
  pageTitle: { fontSize: 32, fontFamily: font.bold, letterSpacing: -0.6, color: colors.label, paddingHorizontal: 4, paddingTop: 4 },
  subtitle: { fontSize: 15, fontFamily: font.medium, color: colors.label2, paddingHorizontal: 4, paddingTop: 2, paddingBottom: 10 },
  headerTrailing: { flexDirection: "row", alignItems: "center", gap: 12, paddingRight: Platform.OS === "android" ? 4 : 0 },
});
