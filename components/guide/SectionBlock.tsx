import { StyleSheet, View } from "react-native";
import type { GuideSection } from "@/content/guide";
import { Card, Icon, layout, Text, useTheme, type IconName } from "@/ui";

function StepRow({ n, text }: { n: number; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.step} accessible accessibilityLabel={`Step ${n}. ${text}`}>
      <View style={[styles.bubble, { backgroundColor: colors.ink }]}>
        <Text variant="caption" style={[styles.num, { color: colors.bg }]}>
          {n}
        </Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function Callout({ icon, label, text }: { icon: IconName; label: string; text: string }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.callout} accessible accessibilityLabel={`${label}. ${text}`}>
      <Icon name={icon} size={22} color={colors.ink} />
      <View style={styles.calloutText}>
        <Text variant="headline">{label}</Text>
        <Text variant="callout">{text}</Text>
      </View>
    </Card>
  );
}

export function SectionBlock({ section }: { section: GuideSection }) {
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header">
        {section.heading}
      </Text>
      {section.body ? <Text tone="ink2">{section.body}</Text> : null}
      {section.steps ? (
        <View style={styles.steps}>
          {section.steps.map((s, i) => (
            <StepRow key={i} n={i + 1} text={s} />
          ))}
        </View>
      ) : null}
      {section.tip ? <Callout icon="info" label="Tip" text={section.tip} /> : null}
      {section.warn ? <Callout icon="alert" label="Good to know" text={section.warn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: layout.item },
  steps: { gap: layout.item },
  step: { flexDirection: "row", alignItems: "flex-start", gap: layout.item },
  bubble: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 1 },
  num: { fontSize: 13, lineHeight: 16 },
  stepText: { flex: 1 },
  callout: { flexDirection: "row", gap: layout.item, alignItems: "flex-start" },
  calloutText: { flex: 1, gap: 2 },
});
