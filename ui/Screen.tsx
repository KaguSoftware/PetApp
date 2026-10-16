import { router } from "expo-router";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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
  /** Extra bottom padding so content clears the floating tab bar. */
  tabBarPadding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Height reserved for the native tab bar plus the floating + button. */
export const TAB_BAR_CLEARANCE = 110;

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
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingTop: insets.top + spacing.lg,
    paddingBottom: insets.bottom + spacing.xl + (tabBarPadding ? TAB_BAR_CLEARANCE : 0),
  };
  const header =
    title || headerRight || back ? (
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
    ) : null;

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
