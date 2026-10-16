import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { Stack } from "expo-router";
import { useTheme } from "./theme";

type ToolbarIcon = ComponentProps<typeof Stack.Toolbar.Button>["icon"];
type SF = Extract<ToolbarIcon, string>;
type MaterialName = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Icon for a native header item. iOS takes an SF Symbol name; Android needs an image source, so
 * the Material glyph is rendered to a bitmap once (undefined until it is ready: hide the item).
 */
export function useHeaderIcon(sf: SF, material: MaterialName): ToolbarIcon | undefined {
  const { colors } = useTheme();
  const [source, setSource] = useState<ToolbarIcon | undefined>(undefined);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let alive = true;
    MaterialIcons.getImageSource(material, 24, colors.ink)
      .then((s) => {
        if (alive && s) setSource(s);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [material, colors.ink]);
  return Platform.OS === "android" ? source : sf;
}
