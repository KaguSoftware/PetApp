import type { ComponentProps } from "react";
import type { Stack } from "expo-router";
import { useTheme } from "./theme";

export type StackOptions = NonNullable<ComponentProps<typeof Stack.Screen>["options"]>;

/**
 * Native header look shared by every Stack: flat, opaque, theme colours, a large title on iOS
 * (ignored on Android) and a minimal back button. `large: false` gives a plain inline title.
 */
export function useStackOptions(large = true): StackOptions {
  const { colors } = useTheme();
  return {
    headerShown: true,
    headerLargeTitleEnabled: large,
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.bg },
    headerLargeStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.ink,
    headerTitleStyle: { color: colors.ink },
    headerLargeTitleStyle: { color: colors.ink },
    headerBackButtonDisplayMode: "minimal",
    contentStyle: { backgroundColor: colors.bg },
  };
}
