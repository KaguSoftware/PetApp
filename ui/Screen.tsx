import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./theme";
import { layout } from "./tokens";

export interface ScreenProps {
  scroll?: boolean;
  /**
   * The screen sits directly in the native tab bar: leave room at the bottom for the floating +
   * button. The tab bar itself is inset by the system.
   */
  tabBarPadding?: boolean;
  /**
   * No native header above this screen (auth, onboarding, not-found): the safe-area top inset is
   * added here so nothing ever sits under the clock.
   */
  headerless?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Kept for callers that import it; the value lives in the layout tokens. */
export const TAB_BAR_CLEARANCE = layout.tabClearance;

/**
 * Padding for a screen's content, aware of who already insets it:
 * - native header screens: the header (and, on iOS, the scroll view's automatic content inset)
 *   already clears the status bar, so the top is just `headerGap`;
 * - headerless screens add the status-bar inset themselves;
 * - bottom: tab screens clear the + button; others add the home-indicator inset on Android (iOS's
 *   automatic content inset already does it).
 */
export function useContentPadding({ tabBarPadding = false, headerless = false, scroll = true } = {}): ViewStyle {
  const insets = useSafeAreaInsets();
  const top = headerless ? insets.top + layout.section : layout.headerGap;
  if (tabBarPadding) return { paddingTop: top, paddingBottom: layout.tabClearance };
  const bottomInset = headerless || !scroll || Platform.OS === "android" ? insets.bottom : 0;
  return { paddingTop: top, paddingBottom: bottomInset + layout.section };
}

/**
 * Page body. On a native-header screen this is the FIRST scroll view, so iOS applies the large-title
 * / tab-bar insets to it automatically (`contentInsetAdjustmentBehavior="automatic"`); the wrapper
 * is `collapsable={false}` so that scroll view stays discoverable by the native tabs.
 */
export function Screen({ scroll = true, tabBarPadding = false, headerless = false, contentStyle, children }: ScreenProps) {
  const { colors } = useTheme();
  const padding = useContentPadding({ tabBarPadding, headerless, scroll });
  return (
    <View collapsable={false} style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior={headerless ? "never" : "automatic"}
          contentContainerStyle={[styles.content, padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, styles.content, padding, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, gap: layout.section },
});
