import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { FadeInItem } from "@/components/Motion";
import { PushedScreen } from "@/components/Screen";
import { PressableScale } from "@/components/ui";
import { GUIDES } from "@/lib/guides";
import { cardShadow, colors, font, radius } from "@/lib/theme";

export default function GuidesListScreen() {
  const router = useRouter();

  return (
    <PushedScreen title="How-to guides">
      <Text style={styles.intro}>Short, practical walkthroughs for everyday pet care. Tap one to open it.</Text>

      <View style={styles.list}>
        {GUIDES.map((g, i) => (
          <FadeInItem key={g.id} index={i}>
            <PressableScale onPress={() => router.push(`/instructions/${g.id}`)} accessibilityRole="button" accessibilityLabel={g.title}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: g.bg }]}>
                  <Icon name={g.icon} size={22} color={g.tint} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{g.title}</Text>
                  <Text numberOfLines={2} style={styles.summary}>
                    {g.summary}
                  </Text>
                  <View style={styles.metaRow}>
                    <Icon name="clock" size={12} color={colors.label3} />
                    <Text style={styles.meta}>{g.minutes} min read</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={16} color={colors.label3} />
              </View>
            </PressableScale>
          </FadeInItem>
        ))}
      </View>

      <View style={{ height: 20 }} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 20, paddingHorizontal: 4, paddingBottom: 16 },
  list: { gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    ...cardShadow,
  },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 17, fontFamily: font.semibold, color: colors.label },
  summary: { fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { fontSize: 12, fontFamily: font.medium, color: colors.label3 },
});
