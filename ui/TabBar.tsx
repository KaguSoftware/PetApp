import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReduceMotion } from "@/lib/a11y";
import { Icon, type IconName } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { borderWidth, radius, shadow, spacing } from "./tokens";

const BAR_H = 68;
const LOG_SIZE = 72;
/** How far the Log button rises above the bar's top edge. */
const LOG_RISE = 26;
const NOTCH = 6;

const TAB_ICONS: Record<string, { icon: IconName; label: string }> = {
  home: { icon: "home", label: "Home" },
  history: { icon: "history", label: "History" },
  guide: { icon: "book", label: "Guide" },
};

export interface TabBarProps extends BottomTabBarProps {
  onLogPress: () => void;
  /** Optional gear on the right side; keeps the bar visually balanced around Log. */
  onSettingsPress?: () => void;
}

function LogButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const turn = useSharedValue(0);
  const plus = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 90}deg` }] }));

  return (
    <PressableScale
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) turn.value = withSpring(1, { damping: 12, stiffness: 260 });
      }}
      onPressOut={() => {
        if (!reduceMotion) turn.value = withSpring(0, { damping: 12, stiffness: 200 });
      }}
      scaleTo={0.88}
      haptic="heavy"
      accessibilityRole="button"
      accessibilityLabel="Log something"
      accessibilityHint="Opens the log menu"
      style={[
        styles.logButton,
        shadow.float,
        // The ring in the page colour reads as the bar being notched around the button.
        { backgroundColor: colors.ink, borderColor: colors.bg },
      ]}
    >
      <Animated.View style={plus}>
        <Icon name="plus" size={36} color={colors.onInk} strokeWidth={2.8} />
      </Animated.View>
    </PressableScale>
  );
}

function TabItem({
  routeName,
  focused,
  onPress,
  onLongPress,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const meta = TAB_ICONS[routeName];
  if (!meta) return null;
  const color = focused ? colors.ink : colors.ink3;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="select"
      scaleTo={0.9}
      accessibilityRole="tab"
      accessibilityLabel={meta.label}
      accessibilityState={{ selected: focused }}
      style={styles.item}
    >
      <View style={[styles.itemPill, focused && { backgroundColor: colors.tones.butter.bg }]}>
        <Icon name={meta.icon} size={24} color={color} strokeWidth={focused ? 2.5 : 2.2} />
      </View>
      <Text variant="caption" style={{ color, fontFamily: focused ? "Inter_600SemiBold" : "Inter_500Medium" }}>
        {meta.label}
      </Text>
    </PressableScale>
  );
}

/**
 * Floating rounded bar with a raised round Log button in the middle.
 * The wrapper is taller than the bar so the button's overhang stays inside
 * its parent's bounds; Android drops touches outside them.
 */
export function TabBar({ state, navigation, onLogPress, onSettingsPress }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const items = state.routes.map((route, index) => {
    const focused = state.index === index;
    return (
      <TabItem
        key={route.key}
        routeName={route.name}
        focused={focused}
        onPress={() => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
      />
    );
  });
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.stage} pointerEvents="box-none">
        <View style={[styles.bar, shadow.float, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.group}>{left}</View>
          <View style={styles.gap} />
          <View style={styles.group}>
            {right}
            {onSettingsPress ? (
              <PressableScale
                onPress={onSettingsPress}
                haptic="select"
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={styles.item}
              >
                <View style={styles.itemPill}>
                  <Icon name="settings" size={24} color={colors.ink3} />
                </View>
                <Text variant="caption" style={{ color: colors.ink3 }}>
                  Settings
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </View>
        <View style={styles.logSlot} pointerEvents="box-none">
          <LogButton onPress={onLogPress} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg },
  stage: { height: BAR_H + LOG_RISE, justifyContent: "flex-end" },
  bar: {
    height: BAR_H,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth,
    paddingHorizontal: spacing.sm,
  },
  group: { flex: 1, flexDirection: "row", alignItems: "center" },
  gap: { width: LOG_SIZE + NOTCH * 2 - 8 },
  item: { flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 2 },
  itemPill: { width: 52, height: 30, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  logSlot: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" },
  logButton: {
    width: LOG_SIZE + NOTCH * 2,
    height: LOG_SIZE + NOTCH * 2,
    borderRadius: (LOG_SIZE + NOTCH * 2) / 2,
    borderWidth: NOTCH,
    alignItems: "center",
    justifyContent: "center",
  },
});
