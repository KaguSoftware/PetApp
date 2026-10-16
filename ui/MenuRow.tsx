import MenuView from "@expo/ui/community/menu";
import { StyleSheet, View } from "react-native";
import { Icon } from "./icons";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { layout, radius } from "./tokens";

export interface MenuOption<T extends string> {
  value: T;
  label: string;
}

export interface MenuRowProps<T extends string> {
  label: string;
  options: MenuOption<T>[];
  /** Currently selected value; the row shows its label. */
  selected: T | null;
  /** Shown when nothing matches `selected`. */
  placeholder?: string;
  onSelect: (value: T) => void;
  /** `field` is a filled form row; `plain` sits inside a settings card. */
  variant?: "field" | "plain";
}

/**
 * A "label ........ value v" row that opens the platform's native menu (UIMenu on iOS, a Material
 * dropdown on Android) to pick one option. Replaces segmented controls, chips and picker sheets.
 */
export function MenuRow<T extends string>({ label, options, selected, placeholder = "Not set", onSelect, variant = "field" }: MenuRowProps<T>) {
  const { colors } = useTheme();
  const current = options.find((o) => o.value === selected)?.label ?? null;
  return (
    <MenuView
      title={label}
      actions={options.map((o) => ({ id: o.value, title: o.label, state: o.value === selected ? "on" : "off" }))}
      onPressAction={({ nativeEvent }) => {
        const hit = options.find((o) => o.value === nativeEvent.event);
        if (hit) onSelect(hit.value);
      }}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${current ?? placeholder}`}
        accessibilityHint="Opens a menu"
        style={[styles.row, variant === "field" && { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: layout.gutter - 4 }]}
      >
        <Text style={styles.label}>{label}</Text>
        <Text tone={current ? "ink2" : "ink3"}>{current ?? placeholder}</Text>
        <Icon name="chevron-down" size={16} color={colors.ink3} />
      </View>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: layout.item, minHeight: layout.rowMinHeight, paddingVertical: layout.rowPadV },
  label: { flex: 1 },
});
