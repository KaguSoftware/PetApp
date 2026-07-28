import { router, useNavigation } from "expo-router";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewProps } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icons";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * ONE header system — same mechanism on both platforms, on every screen.
 *
 * Every stack takes its options from `useNativeHeaderOptions`, and every page
 * body is either a `TabScreen` (the top level of a tab) or a `PushedScreen`
 * (anything pushed on top of one). That is the whole system. A screen that
 * reaches for `navigation.setOptions` to build its own bar, or draws a top bar
 * in its own content, drifts out of step with every other page — which is what
 * made the header read as unreliable before this pass:
 *
 *  - tab pages hid the native header on Android and drew a 48pt stand-in
 *    instead, so the bar was a different height, and briefly a DOUBLE bar on
 *    mount (the native one showed for a frame before the effect hid it);
 *  - the tab stacks defaulted `headerTitle: ""`, and a string headerTitle wins
 *    over `title`, so screens pushed inside a tab (/logs/all) had no title;
 *  - pushed screens let UIKit adjust their content insets while ALSO adding
 *    their own, so the bottom gap was applied twice;
 *  - screens pushed inside a tab reserved no room for the tab bar, which stays
 *    on screen there, so their last rows sat behind it.
 *
 * Geometry that is now fixed rather than per page:
 *  - the bar is the platform's native one everywhere (44pt + inset on iOS,
 *    56pt + inset on Android) — no stand-in on either platform;
 *  - every accessory lays out at HEADER_ITEM_HEIGHT, so a page with taller
 *    controls can't stretch the bar (Android sizes its toolbar to its children);
 *  - a tab page's title block occupies the same space with or without a
 *    subtitle, and hands off to the compact title only once the big title has
 *    actually scrolled away — never both at once;
 *  - content insets are always set explicitly (`never`), never left to UIKit.
 */

/** Height every header accessory lays out at — see the geometry note above. */
const HEADER_ITEM_HEIGHT = 38;

/**
 * `NativeTabs` (expo-router/unstable-native-tabs) does not feed the tab bar's
 * height into the safe-area chain on either platform: `insets.bottom` only
 * reflects the home-indicator/gesture inset underneath the bar, not the bar
 * itself. Without an explicit allowance, the last ~50pt of scrollable content
 * sits behind the bar.
 */
const IOS_TAB_BAR_HEIGHT = 49;
/**
 * NOT 56 (the old Material 2 `design_bottom_navigation_height`). RNScreens'
 * `TabsHost` builds its `BottomNavigationView` under a
 * `Theme_Material3_DayNight_NoActionBar` context wrapper, so it lays out at the
 * Material 3 navigation-bar height of 80dp — and, being a Material
 * `NavigationBarView`, it also pads itself by the system navigation-bar inset
 * on top of that (this app is `edgeToEdgeEnabled`). Under-reserving by those
 * 24dp is what pushed the Community composer down into the system nav bar.
 */
const ANDROID_TAB_BAR_HEIGHT = 80;
export const TAB_BAR_HEIGHT = Platform.OS === "android" ? ANDROID_TAB_BAR_HEIGHT : IOS_TAB_BAR_HEIGHT;

/** Gap between the nav bar and the first row of content on a pushed screen. */
const CONTENT_TOP_PAD = 10;
/** Gap between a tab page's title block and its content — constant whether or
 * not that page has a subtitle, so tabs don't start at different heights. */
const TITLE_BLOCK_BOTTOM_PAD = 12;
/** Page-body side padding. Shared so both scaffolds gutter identically. */
const CONTENT_SIDE_PAD = 16;

/**
 * True for every screen rendered inside the tab navigator — including screens
 * PUSHED inside a tab's own stack (/logs/all), where the tab bar is still on
 * screen and still has to be cleared. Provided statically by
 * app/(tabs)/_layout.tsx rather than derived from the current route, so an
 * unfocused screen re-rendering can never flip it.
 */
const InsideTabsContext = createContext(false);
export const InsideTabs = InsideTabsContext.Provider;

/** Bottom space a page must reserve: its own breathing room, the home
 * indicator (with a floor so content never hugs the edge) and, under the tab
 * navigator, the tab bar. One formula for every scroll view in the app. */
function useBottomAllowance(extra: number) {
  const insets = useSafeAreaInsets();
  const insideTabs = useContext(InsideTabsContext);
  return extra + Math.max(insets.bottom, 12) + (insideTabs ? TAB_BAR_HEIGHT : 0);
}

/**
 * The compact nav-bar title (WhatsApp/iOS style). It stays hidden while the big
 * in-content title is visible, then fades in once that title has scrolled up
 * and out of view. Driven by the shared scroll offset from TabScreen.
 *
 * The handoff range is MEASURED, not guessed: `handoff` is the scroll offset at
 * which the big title's bottom edge crosses under the bar. Fixed thresholds
 * (the old 24→60) fade in while the big title is still on screen on some pages
 * and long after it's gone on others — i.e. two titles stacked, or a bar that
 * reads as empty, depending on the page's type scale.
 */
function CollapsingHeaderTitle({
  title,
  scrollY,
  handoff,
}: {
  title: string;
  scrollY: SharedValue<number>;
  handoff: SharedValue<number>;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const style = useAnimatedStyle(() => {
    // Starts fading in when the big title is a bit under halfway gone and is
    // fully in exactly as it disappears, then eased with a smoothstep
    // (3t²−2t³) so it accelerates in and decelerates out instead of snapping
    // at the thresholds — the "smooth" feel.
    const end = Math.max(handoff.value, 1);
    const t = interpolate(scrollY.value, [end * 0.45, end], [0, 1], Extrapolation.CLAMP);
    const eased = t * t * (3 - 2 * t);
    return {
      opacity: eased,
      // Slide up a few px as it appears (and down as it leaves) for a gentle
      // WhatsApp-style rise into place rather than a flat cross-fade.
      transform: [{ translateY: (1 - eased) * 6 }],
    };
  });
  return (
    // Fixed-height wrapper: Android measures its toolbar against this view, so
    // letting it size to the text would make the bar's height depend on the
    // font metrics of whatever page you're on.
    <View style={styles.headerTitleWrap} pointerEvents="none">
      <Animated.Text numberOfLines={1} style={[styles.collapsedTitle, style]}>
        {title}
      </Animated.Text>
    </View>
  );
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
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      <Icon name="chevron-left" size={24} color={colors.label} />
      <Text style={styles.backLabel} numberOfLines={1}>
        Back
      </Text>
    </Pressable>
  );
}

/**
 * Native UINavigationBar/Toolbar options for EVERY stack in the app — root,
 * onboarding and the five tab stacks all pass this same object, so the bar can
 * only ever look and measure one way. Real system chrome: blur under the bar as
 * content scrolls, interactive edge-swipe pop. The back button is the one
 * exception to "no hand-rolled chrome" (see HeaderBackButton for why).
 *
 * Call it inside a Stack's parent component — it's theme-aware.
 */
export function useNativeHeaderOptions() {
  const colors = useColors();
  return useMemo(
    () => ({
      // Blank unless a screen sets its own. Without this every screen falls
      // back to its ROUTE NAME ("[id]", "index") the moment its own title
      // hasn't been applied yet.
      title: "",
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
      // header height (react-navigation maps it straight to the header's
      // `topInsetEnabled`). iOS ignores this option — its header already
      // accounts for the notch/Dynamic Island on its own.
      statusBarTranslucent: true,
    }),
    [colors]
  );
}

/**
 * The header's trailing island. Always exactly ONE view at a fixed height:
 * `headerRight` is wrapped in a single UIBarButtonItem and react-native-screens'
 * hit test returns on the first right subview it finds, and on Android the
 * toolbar grows to fit whatever it's given. See components/HeaderActions.tsx.
 */
function HeaderTrailing({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={styles.headerTrailing}>{children}</View>;
}

/**
 * Top-level tab page scaffold: the native bar carries the trailing accessories
 * (coins + bell + gear) and the compact title that fades in on scroll, while
 * the page's big title is in-content text right beneath it — the iOS
 * large-title idiom, hand-driven because the native large title did not paint
 * reliably in Expo Go on iOS (blank gap, no title).
 */
export function TabScreen({
  title,
  subtitle,
  trailing,
  children,
  overlay,
  contentBottomPad = 16,
  ...scrollProps
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned above the scroll content (floating action buttons). Rendered
   * outside the ScrollView so it stays put while content moves under it. */
  overlay?: React.ReactNode;
  /** Extra bottom breathing room, on top of the tab-bar + safe-area allowance. */
  contentBottomPad?: number;
} & ScrollViewProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const paddingBottom = useBottomAllowance(contentBottomPad);

  // WhatsApp-style collapsing title: the big in-content title stays as the
  // page's main heading; a compact title fades into the nav bar only once the
  // big one has scrolled away. `scrollY` is the live scroll offset that drives
  // that fade, `handoff` the offset at which the big title clears the bar.
  const scrollY = useSharedValue(0);
  const handoff = useSharedValue(HEADER_ITEM_HEIGHT);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // The big title's bottom edge, in content coordinates. `layout.y` already
  // includes the block's top padding, and the block is the first child of a
  // container with no top padding, so this IS the scroll offset at which the
  // title disappears under the bar.
  const onTitleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      handoff.value = e.nativeEvent.layout.y + e.nativeEvent.layout.height;
    },
    [handoff]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <CollapsingHeaderTitle title={title} scrollY={scrollY} handoff={handoff} />,
      headerRight: trailing ? () => <HeaderTrailing>{trailing}</HeaderTrailing> : undefined,
    });
  }, [navigation, title, trailing, scrollY, handoff]);

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        style={styles.root}
        // `never` on every scroll view in the app: the opaque header already
        // lays content out beneath itself (react-native-screens sets
        // edgesForExtendedLayout minus the top edge), so letting UIKit adjust
        // insets on top of that only ever double-counts. It also keeps the
        // scroll offset starting at 0, which is what makes the title handoff
        // above predictable.
        contentInsetAdjustmentBehavior="never"
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom, paddingHorizontal: CONTENT_SIDE_PAD }}
        {...scrollProps}
      >
        {/* One block, one constant gap to the content below it — a page with a
            subtitle and a page without must still start at the same height. */}
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle} onLayout={onTitleLayout}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </Animated.ScrollView>
      {overlay}
    </View>
  );
}

/**
 * Pushed detail screen scaffold: the same native bar as everywhere else, with
 * the title in the bar (back chevron on the left, optional accessory island on
 * the right) and the body scrolling beneath it.
 */
export function PushedScreen({
  title,
  trailing,
  children,
  scroll = true,
  contentBottomPad = 32,
  ...scrollProps
}: {
  title?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  /** Extra bottom breathing room, on top of the tab-bar + safe-area allowance. */
  contentBottomPad?: number;
} & ScrollViewProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();
  const paddingBottom = useBottomAllowance(contentBottomPad);

  useLayoutEffect(() => {
    navigation.setOptions({
      // `title`, never `headerTitle` — a string headerTitle anywhere in the
      // options chain wins over every screen's own title (getHeaderTitle in
      // @react-navigation/elements), which is how pushed screens inside a tab
      // stack ended up with a blank bar.
      title: title ?? "",
      headerRight: trailing ? () => <HeaderTrailing>{trailing}</HeaderTrailing> : undefined,
    });
  }, [navigation, title, trailing]);

  if (!scroll) {
    return (
      <View style={[styles.root, { paddingTop: CONTENT_TOP_PAD, paddingBottom, paddingHorizontal: CONTENT_SIDE_PAD }]}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.root}
      // See the matching note in TabScreen — insets are ours, not UIKit's.
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: CONTENT_TOP_PAD,
        paddingBottom,
        paddingHorizontal: CONTENT_SIDE_PAD,
      }}
      // Spread last so callers can pass `refreshControl` (usePullToRefresh) and
      // override the defaults above, matching TabScreen.
      {...scrollProps}
    >
      {children}
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  titleBlock: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: TITLE_BLOCK_BOTTOM_PAD },
  pageTitle: { fontSize: 32, fontFamily: font.bold, letterSpacing: -0.6, color: colors.label },
  subtitle: { fontSize: 15, fontFamily: font.medium, color: colors.label2, paddingTop: 2 },
  // Both header accessories are pinned to the same height so the bar measures
  // the same on every page (Android sizes its toolbar to its children).
  headerTitleWrap: { height: HEADER_ITEM_HEIGHT, justifyContent: "center", flexShrink: 1, minWidth: 0 },
  headerTrailing: {
    height: HEADER_ITEM_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: Platform.OS === "android" ? 4 : 0,
  },
  // Custom back item (see HeaderBackButton). Mirrors the system metrics: 17pt
  // label, chevron tucked 4px left of it, 44pt-tall touch area via hitSlop.
  // flexShrink: 0 on both: the UIBarButtonItem width-constrains this row, and
  // without it the label gets squeezed down to a single glyph ("< B").
  backButton: { flexDirection: "row", alignItems: "center", minHeight: 32, paddingRight: 6, flexShrink: 0 },
  backLabel: { fontSize: 17, fontFamily: font.regular, color: colors.label, marginLeft: 2, flexShrink: 0 },
  // Compact nav-bar title that fades in on scroll (WhatsApp-style). Larger than
  // the stock 17pt inline title so it reads prominently, still well below the
  // big in-content pageTitle.
  collapsedTitle: { fontSize: 20, fontFamily: font.bold, color: colors.label, letterSpacing: -0.3 },
});
