import { router } from "expo-router";
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { spacing } from "./tokens";

export interface ScreenProps {
  /** Large display title at the top. */
  title?: string;
  /** Right-aligned header slot (round icon buttons). */
  headerRight?: React.ReactNode;
  /** Round back button before the title, for pushed screens. */
  back?: boolean;
  scroll?: boolean;
  /**
   * Set on screens that live directly in the native tab bar. The system already insets the
   * content for the tab bar (and, on iOS, the status bar, via automatic scroll-view insets),
   * so the screen only adds room for the floating + button.
   */
  tabBarPadding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Room kept free at the bottom of tab screens so the last row can scroll clear of the floating +
 * button (56pt button + 16pt margin + breathing room). The native tab bar itself is NOT included:
 * NativeTabs insets the content (iOS: the first scroll view's automatic content inset; Android: a
 * SafeAreaView on the bottom edge).
 */
export const TAB_BAR_CLEARANCE = 88;

/** Top/bottom padding for a screen's content, aware of who already insets it. */
export function useScreenPadding(tabBarPadding: boolean): ViewStyle {
  const insets = useSafeAreaInsets();
  if (!tabBarPadding) {
    return { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl };
  }
  return {
    // iOS: the system adds the status-bar inset to the scroll view. Android only handles the bottom.
    paddingTop: (Platform.OS === "ios" ? 0 : insets.top) + spacing.lg,
    paddingBottom: spacing.xl + TAB_BAR_CLEARANCE,
  };
}

/** Back button + title row; exported so list screens that own their scroll view can place it inside. */
export function ScreenHeader({ title, headerRight, back = false }: Pick<ScreenProps, "title" | "headerRight" | "back">) {
  const { colors } = useTheme();
  if (!title && !headerRight && !back) return null;
  return (
    <View style={styles.header}>
      {back ? (
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
          haptic="select"
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.back, { backgroundColor: colors.surface }]}
        >
          <View>
            <Icon name="chevron-left" size={22} color={colors.ink} />
          </View>
        </PressableScale>
      ) : null}
      {title ? (
        <Text variant={back ? "title" : "largeTitle"} accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}
      {headerRight}
    </View>
  );
}

export function Screen({
  title,
  headerRight,
  back = false,
  scroll = true,
  tabBarPadding = false,
  contentStyle,
  children,
}: ScreenProps) {
  const { colors } = useTheme();
  const padding = useScreenPadding(tabBarPadding);
  const header = <ScreenHeader title={title} headerRight={headerRight} back={back} />;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, padding, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.root, padding, contentStyle]}>
          {header}
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { flex: 1 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
