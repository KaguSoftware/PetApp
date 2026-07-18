import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icons";
import { colors, font, HIT } from "@/lib/theme";

const TAB_ICON: Record<string, IconName> = {
  home: "home",
  plan: "heart-text",
  logs: "list",
  pets: "paw",
  settings: "gear",
};

const TAB_W = 64;
const PILL_W = 48;
const PILL_H = 30;

function TabItem({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
}) {
  const t = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    t.value = withTiming(focused ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [focused, t]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.08 }] }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(t.value, [0, 1], [colors.label3, colors.accent]),
  }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Icon name={icon} size={23} color={focused ? colors.accent : colors.label3} />
      </Animated.View>
      <Animated.Text style={[styles.label, focused && styles.labelActive, labelStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

/**
 * Floating island tab bar: a frosted pill inset from the screen edges.
 * The active-tab indicator is a soft pill that GLIDES between tabs on a
 * spring (no instant swaps), with icon/label color crossfades.
 */
export default function IslandTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const index = useSharedValue(state.index);

  useEffect(() => {
    index.value = withSpring(state.index, { damping: 18, stiffness: 220, mass: 0.7 });
  }, [state.index, index]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: index.value * TAB_W + (TAB_W - PILL_W) / 2 }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={styles.island}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
        <Animated.View style={[styles.pill, pillStyle]} />
        <View style={styles.rowInner}>
          {state.routes.map((route, i) => {
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;
            const focused = state.index === i;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                if (Platform.OS === "ios") Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            };
            return <TabItem key={route.key} label={label} icon={TAB_ICON[route.name] ?? "home"} focused={focused} onPress={onPress} />;
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  island: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.65)",
    shadowColor: "#3a3945",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.55)" },
  pill: {
    position: "absolute",
    top: 9,
    left: 10,
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    backgroundColor: colors.accentSoft,
  },
  rowInner: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7 },
  tab: { width: TAB_W, minHeight: HIT, alignItems: "center", justifyContent: "center", gap: 2 },
  iconWrap: { height: 26, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, fontFamily: font.medium, color: colors.label3 },
  labelActive: { fontFamily: font.semibold },
});
