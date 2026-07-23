import { router, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icons";
import { colors, font } from "@/lib/theme";

/**
 * The compact nav-bar title (WhatsApp/iOS style). It stays hidden while the big
 * in-content title is visible, then fades in once that title has scrolled up
 * and out of view. Driven by the shared scroll offset from TabScreen.
 */
// Scroll offsets (px) over which the big title hands off to the compact one.
// The compact title stays hidden until FADE_START, then eases fully in by
// FADE_END — roughly the span where the big in-content title scrolls away.
const FADE_START = 24;
const FADE_END = 60;

function CollapsingHeaderTitle({ title, scrollY }: { title: string; scrollY: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    // Linear progress across the handoff range, then eased with a smoothstep
    // (3t²−2t³) so the fade accelerates in and decelerates out instead of
    // snapping at the thresholds — the "smooth" feel.
    const t = interpolate(scrollY.value, [FADE_START, FADE_END], [0, 1], Extrapolation.CLAMP);
    const eased = t * t * (3 - 2 * t);
    return {
      opacity: eased,
      // Slide up a few px as it appears (and down as it leaves) for a gentle
      // WhatsApp-style rise into place rather than a flat cross-fade.
      transform: [{ translateY: (1 - eased) * 6 }],
    };
  });
  return <Animated.Text style={[styles.collapsedTitle, style]}>{title}</Animated.Text>;
}

/**
 * Custom back button rendered into the header's LEFT slot.
 *
 * Why not the system back chevron: react-native-screens 4.16.0 (the version
 * baked into Expo Go for SDK 54) has a native iOS 26 bug where the system
 * back button renders but taps do nothing when `headerShown: false` or a
 * custom header exists anywhere in the ancestry — exactly this app's setup
 * (root stack hides headers for (tabs); tab stacks use a custom collapsing
 * headerTitle). Edge-swipe still pops, and `router.back()` works, so we ship
 * our own left item through the header-subview path (the same mechanism the
 * headerRight island already uses, which DOES receive taps).
 * See software-mansion/react-native-screens#3294 / #3270.
 *
 * SCOPE(EAS cutover): remove this + `headerBackVisible: false` once dev
 * builds pin a react-native-screens with the iOS 26 fix — the real system
 * chevron is always preferable.
 *
 * Deliberately a plain Pressable (opacity dim, no scale): UIKit's own back
 * item dims while held, and a spring-scale transform inside a UIBarButtonItem
 * can clip against the bar's bounds.
 */
function HeaderBackButton() {
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) router.back();
      }}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={{ top: 12, bottom: 12, left: 16, right: 8 }}
      style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.35 }]}
    >
      <Icon name="chevron-left" size={24} color={colors.accent} />
      <Text style={styles.backLabel}>Back</Text>
    </Pressable>
  );
}

/**
 * Native UINavigationBar styling shared by every stack in the app. Real
 * system chrome — large titles that collapse with UIKit physics, blur under
 * the bar, interactive edge-swipe pop. The back button is the one exception
 * to "no hand-rolled chrome" (see HeaderBackButton for why).
 */
export const nativeHeaderOptions = {
  // A standard OPAQUE native header. iOS gives it the system material and
  // auto-blurs it as content scrolls under — a *transparent* header here left a
  // blank gap with no title painted, so we let UIKit own the background.
  headerShadowVisible: false,
  headerTintColor: colors.accent,
  headerTitleStyle: { fontFamily: font.semibold, color: colors.label },
  // iOS only: hide the system back item (unresponsive on iOS 26 in Expo Go —
  // see HeaderBackButton above) and render our own tappable one in its place.
  // Android keeps the working native back arrow. Edge-swipe pop is unaffected.
  ...(Platform.OS === "ios"
    ? {
        headerBackVisible: false,
        headerLeft: ({ canGoBack }: { canGoBack?: boolean }) => (canGoBack ? <HeaderBackButton /> : null),
      }
    : {}),
  headerStyle: { backgroundColor: colors.bg },
  contentStyle: { backgroundColor: colors.bg },
  // `android.edgeToEdgeEnabled` in app.json draws the window behind the status
  // bar, but react-native-screens defaults `statusBarTranslucent` to false —
  // so on Android it computed the header's status-bar inset from the (now
  // meaningless) frame y-position instead of the real inset, and the header
  // rendered too short: its icons (gear/bell/coin) landed underneath the
  // system status bar instead of below it. This tells screens the status bar
  // really is translucent/overlaid, so it adds the correct inset to the
  // header height. iOS ignores this option — its header already accounts for
  // the notch/Dynamic Island on its own.
  statusBarTranslucent: true,
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

  // iOS keeps the native header for the trailing accessories (it clears the
  // notch reliably). On Android the native header's status-bar inset proved
  // unreliable under edge-to-edge (accessories rendered UNDER the status bar,
  // whatever we set for statusBarTranslucent/topInsetEnabled), so instead we
  // hide the native header on Android and render the same accessories as an
  // in-content row, offset by the real measured `insets.top`. That inset is
  // ours to control, so the row is guaranteed to sit below the status bar.
  const isAndroid = Platform.OS === "android";

  // WhatsApp-style collapsing title: the big in-content title stays as the
  // page's main heading; a compact title fades into the nav bar only once the
  // big one has scrolled away. `scrollY` is the live scroll offset that drives
  // that fade (see CollapsingHeaderTitle).
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      // Compact nav-bar title that fades in on scroll (iOS only — Android has
      // no native header here). Empty on Android.
      headerTitle: !isAndroid ? () => <CollapsingHeaderTitle title={title} scrollY={scrollY} /> : "",
      headerShown: !isAndroid,
      headerRight: !isAndroid && trailing ? () => <HeaderTrailing>{trailing}</HeaderTrailing> : undefined,
    });
  }, [navigation, title, trailing, isAndroid, scrollY]);

  return (
    <Animated.ScrollView
      style={styles.root}
      // `never` so the scroll offset starts at 0 (not the header inset), making
      // the fade thresholds in CollapsingHeaderTitle predictable. The big title
      // sits directly under the opaque header.
      contentInsetAdjustmentBehavior="never"
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        // Content begins just below the opaque header. On Android there is no
        // native header, so the in-content accessory row carries the status-bar
        // inset itself (added below). iOS: no extra gap (pageTitle has its own
        // small top padding) — keeps the big title tucked under the header.
        paddingTop: isAndroid ? insets.top + 8 : 0,
        paddingBottom:
          contentBottomPad + Math.max(insets.bottom, 12) + (isAndroid ? ANDROID_TAB_BAR_HEIGHT : 0),
        paddingHorizontal: 16,
      }}
      {...scrollProps}
    >
      {isAndroid && trailing ? <View style={styles.inContentHeader}>{trailing}</View> : null}
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </Animated.ScrollView>
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
  // Android-only in-content stand-in for the native headerRight island: a
  // right-aligned row sitting above the page title, replacing the native
  // header that couldn't be trusted to clear the status bar under edge-to-edge.
  inContentHeader: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", minHeight: 44, marginBottom: 4 },
  pageTitle: { fontSize: 32, fontFamily: font.bold, letterSpacing: -0.6, color: colors.label, paddingHorizontal: 4, paddingTop: 4 },
  subtitle: { fontSize: 15, fontFamily: font.medium, color: colors.label2, paddingHorizontal: 4, paddingTop: 2, paddingBottom: 10 },
  headerTrailing: { flexDirection: "row", alignItems: "center", gap: 12, paddingRight: Platform.OS === "android" ? 4 : 0 },
  // Custom back item (see HeaderBackButton). Mirrors the system metrics: 17pt
  // label, chevron tucked 4px left of it, 44pt-tall touch area via hitSlop.
  backButton: { flexDirection: "row", alignItems: "center", minHeight: 32, paddingRight: 6 },
  backLabel: { fontSize: 17, fontFamily: font.regular, color: colors.accent, marginLeft: 2 },
  // Compact nav-bar title that fades in on scroll (WhatsApp-style). Larger than
  // the stock 17pt inline title so it reads prominently, still well below the
  // big in-content pageTitle.
  collapsedTitle: { fontSize: 20, fontFamily: font.bold, color: colors.label, letterSpacing: -0.3 },
});
