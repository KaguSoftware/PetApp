import { Children, Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { borderWidth, Card, Icon, layout, PressableScale, Text, useTheme, type IconName } from "@/ui";

/** A small grey heading above a surface card; rows inside are split by hairlines. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const items = Children.toArray(children);
  return (
    <View style={styles.section}>
      <Text variant="footnote" tone="ink2" style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Card style={styles.card}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            {child}
          </Fragment>
        ))}
      </Card>
    </View>
  );
}

interface RowProps {
  label: string;
  hint?: string;
  left?: React.ReactNode;
  /** Convenience for a leading line icon. */
  icon?: IconName;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
}

/** One list row (min 56, 16 above and below the text) inside a section; pressable when `onPress` is given. */
export function Row({ label, hint, left, icon, right, onPress, chevron = false }: RowProps) {
  const { colors } = useTheme();
  const body = (
    <>
      {icon ? <Icon name={icon} size={22} color={colors.ink} /> : null}
      {left}
      <View style={styles.rowText}>
        <Text variant="body" numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text variant="callout" tone="ink2">
            {hint}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={18} color={colors.ink3} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      style={styles.row}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  section: { gap: layout.headerGap },
  title: { fontWeight: "600", paddingHorizontal: 4 },
  card: { paddingVertical: 0, paddingHorizontal: layout.cardPad - 4 },
  divider: { height: borderWidth },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.item,
    minHeight: layout.rowMinHeight,
    paddingVertical: layout.rowPadV,
  },
  rowText: { flex: 1 },
});
