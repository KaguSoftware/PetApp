import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/Icons";
import { colors, font, HIT } from "@/lib/theme";

const TAB_ICON: Record<string, IconName> = {
  index: "home",
  plan: "heart-text",
  logs: "list",
  pets: "paw",
  settings: "gear",
};

/**
 * Floating island tab bar: a frosted pill inset from the screen edges,
 * hovering above the home indicator. Replaces the default full-width bar.
 */
export default function IslandTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
      <View style={styles.island}>
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />
        <View style={styles.rowInner}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;
            const focused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                if (Platform.OS === "ios") Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            };
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={onPress}
                style={styles.tab}
              >
                <View style={[styles.iconBubble, focused && styles.iconBubbleActive]}>
                  <Icon name={TAB_ICON[route.name] ?? "home"} size={23} color={focused ? colors.accent : colors.label3} />
                </View>
                <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
              </Pressable>
            );
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
  rowInner: { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 7 },
  tab: { width: 64, minHeight: HIT, alignItems: "center", justifyContent: "center", gap: 1 },
  iconBubble: { width: 40, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconBubbleActive: { backgroundColor: colors.accentSoft },
  label: { fontSize: 10, fontFamily: font.medium, color: colors.label3 },
  labelActive: { color: colors.accent, fontFamily: font.semibold },
});
