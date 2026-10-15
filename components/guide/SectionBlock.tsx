import { StyleSheet, View } from "react-native";
import type { GuideSection } from "@/content/guide";
import { Card, Text, useTheme } from "@/ui";

function StepRow({ n, text }: { n: number; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.step} accessible accessibilityLabel={`Step ${n}. ${text}`}>
      <View style={[styles.bubble, { backgroundColor: colors.ink }]}>
        <Text variant="caption" tone="onInk" style={styles.num}>
          {n}
        </Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function Callout({ tone, label, text }: { tone: "butter" | "peach"; label: string; text: string }) {
  return (
    <Card tone={tone} style={styles.callout} accessible accessibilityLabel={`${label}. ${text}`}>
      <Text variant="label">{label}</Text>
      <Text variant="small">{text}</Text>
    </Card>
  );
}

export function SectionBlock({ section }: { section: GuideSection }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" accessibilityRole="header">
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
      {section.tip ? <Callout tone="butter" label="Tip" text={section.tip} /> : null}
      {section.warn ? <Callout tone="peach" label="Good to know" text={section.warn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  steps: { gap: 12 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bubble: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 1 },
  num: { fontSize: 13, lineHeight: 16 },
  stepText: { flex: 1 },
  callout: { gap: 4, padding: 16, borderRadius: 24 },
});
