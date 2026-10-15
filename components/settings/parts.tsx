import { StyleSheet, View } from "react-native";
import { Card, Icon, PressableScale, Text, spacing, useTheme, type Tone } from "@/ui";

/** A soft grouped card with a heading. */
export function Section({ title, tone, children }: { title: string; tone?: Tone; children: React.ReactNode }) {
  return (
    <Card tone={tone} style={styles.section}>
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

interface RowProps {
  label: string;
  hint?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  tone?: "ink" | "danger";
  chevron?: boolean;
}

/** One 44pt+ row inside a section; pressable when `onPress` is given. */
export function Row({ label, hint, left, right, onPress, tone = "ink", chevron = false }: RowProps) {
  const { colors } = useTheme();
  const body = (
    <>
      {left}
      <View style={styles.rowText}>
        <Text variant="bodyStrong" tone={tone} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text variant="small" tone="ink2">
            {hint}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevron" size={18} color={colors.ink3} /> : null}
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
  section: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52 },
  rowText: { flex: 1 },
});
