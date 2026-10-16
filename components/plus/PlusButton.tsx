import { router, useSegments } from "expo-router";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, PressableScale, shadow, useTheme } from "@/ui";
import { PLUS_MARGIN, PLUS_SIZE, plusBottom } from "./layout";

/** The floating + at the bottom right, above the native tab bar. Opens the panel route. */
export function PlusButton() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Only on the three tab roots, e.g. ["(tabs)", "home"]; hidden on pushed screens
  // inside a tab, like a Guide article (["(tabs)", "guide", "[id]"]).
  const segments = useSegments();
  if (segments.length > 2) return null;
  return (
    <PressableScale
      onPress={() => router.push("/log")}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel="Log something"
      style={[styles.btn, shadow.float, { backgroundColor: colors.ink, bottom: plusBottom(insets.bottom) }]}
    >
      <Icon name="plus" size={28} color={colors.bg} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    right: PLUS_MARGIN,
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    borderRadius: PLUS_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
