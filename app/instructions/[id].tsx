import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PushedScreen } from "@/components/Screen";
import { AccentButton } from "@/components/ui";
import { GuideDiagram, guideById } from "@/lib/guides";
import { colors, font, radius } from "@/lib/theme";

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const guide = guideById(id);

  if (!guide) {
    return (
      <PushedScreen title="Guide">
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Guide not found</Text>
          <AccentButton size="sm" variant="tinted" onPress={() => router.replace("/instructions")}>
            Back to guides
          </AccentButton>
        </View>
      </PushedScreen>
    );
  }

  return (
    <PushedScreen title={guide.title}>
      <View style={[styles.hero, { backgroundColor: guide.bg }]}>
        <View style={styles.heroIcon}>
          <Icon name={guide.icon} size={30} color={guide.tint} />
        </View>
        <Text style={styles.heroSummary}>{guide.summary}</Text>
        <View style={styles.heroMeta}>
          <Icon name="clock" size={12} color={guide.tint} />
          <Text style={[styles.heroMetaText, { color: guide.tint }]}>{guide.minutes} min read</Text>
        </View>
      </View>

      {guide.diagram ? (
        <View style={styles.diagramCard}>
          <GuideDiagram kind={guide.diagram} />
        </View>
      ) : null}

      {guide.sections.map((sec) => (
        <View key={sec.heading} style={styles.section}>
          <Text style={styles.sectionHeading}>{sec.heading}</Text>
          <View style={styles.steps}>
            {sec.steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {guide.tip ? (
        <View style={styles.tipCard}>
          <Icon name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.tipText}>{guide.tip}</Text>
        </View>
      ) : null}

      <View style={{ height: 24 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, padding: 20, alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  heroSummary: { fontSize: 16, fontFamily: font.semibold, color: colors.label, lineHeight: 22 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroMetaText: { fontSize: 12, fontFamily: font.semibold },

  diagramCard: { marginTop: 16, paddingVertical: 18, borderRadius: radius.md, backgroundColor: colors.card, alignItems: "center" },

  section: { marginTop: 24 },
  sectionHeading: { fontSize: 12, fontFamily: font.bold, letterSpacing: 0.6, color: colors.label3, textTransform: "uppercase" },
  steps: { marginTop: 12, gap: 14 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 13, fontFamily: font.bold, color: colors.accent },
  stepText: { flex: 1, fontSize: 15, fontFamily: font.regular, color: colors.label, lineHeight: 21 },

  tipCard: {
    marginTop: 26,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "flex-start",
  },
  tipText: { flex: 1, fontSize: 14, fontFamily: font.medium, color: colors.label, lineHeight: 20 },

  notFound: { marginTop: 40, alignItems: "center", gap: 16 },
  notFoundTitle: { fontSize: 18, fontFamily: font.semibold, color: colors.label },
});
