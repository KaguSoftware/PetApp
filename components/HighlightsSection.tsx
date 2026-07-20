import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { IconCircle, PressableScale, SectionHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/Icons";
import type { Pet, Supply } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

/** Supply categories surfaced collectively, keyed by the supply's icon. */
const CATEGORIES: { key: string; title: string; icon: IconName; tint: string; bg: string; matchIcon: string }[] = [
  { key: "food", title: "Food", icon: "bowl", tint: "#c2410c", bg: "rgba(234,88,12,0.10)", matchIcon: "bowl" },
  { key: "litter", title: "Litter", icon: "broom", tint: "#636366", bg: "rgba(120,120,128,0.12)", matchIcon: "broom" },
];

function statusFor(level: number): { label: string; color: string } {
  if (level < 20) return { label: "Restock soon", color: colors.red };
  if (level < 50) return { label: "Getting low", color: colors.orange };
  return { label: "Well stocked", color: colors.green };
}

/**
 * Home "Highlights" — the household's collective food and litter levels across
 * every pet, so the family sees at a glance what needs buying next. Each card
 * surfaces the worst-off supply in its category and opens that pet's detail
 * (where restocking lives) on tap.
 */
export default function HighlightsSection() {
  const { state } = useStore();
  const router = useRouter();

  const cards = CATEGORIES.map((cat) => {
    const entries: { pet: Pet; supply: Supply }[] = state.pets.flatMap((pet) =>
      pet.supplies.filter((s) => s.icon === cat.matchIcon).map((supply) => ({ pet, supply }))
    );
    if (entries.length === 0) return null;
    const worst = entries.reduce((a, b) => (b.supply.level < a.supply.level ? b : a));
    const lowCount = entries.filter((e) => e.supply.level < 20).length;
    return { cat, worst, lowCount, multiPet: state.pets.length > 1 };
  }).filter((c): c is NonNullable<typeof c> => c != null);

  if (cards.length === 0) return null;

  return (
    <View>
      <SectionHeader>Highlights</SectionHeader>
      <View style={styles.row}>
        {cards.map(({ cat, worst, lowCount, multiPet }) => {
          const status = statusFor(worst.supply.level);
          const detail =
            lowCount > 1
              ? `${lowCount} pets running low`
              : multiPet
                ? `${worst.pet.name} · ${worst.supply.name}`
                : worst.supply.name;
          return (
            <PressableScale
              key={cat.key}
              onPress={() => router.push(`/pet/${worst.pet.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${cat.title}, ${worst.supply.level} percent, ${status.label}`}
              style={styles.cardWrap}
            >
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <IconCircle icon={cat.icon} tint={cat.tint} bg={cat.bg} size={36} iconSize={19} />
                  <Text style={styles.cardTitle}>{cat.title}</Text>
                </View>
                <View style={styles.meterTrack}>
                  <View style={[styles.meterFill, { width: `${Math.max(4, worst.supply.level)}%`, backgroundColor: status.color }]} />
                </View>
                <View style={styles.cardFoot}>
                  <Text style={[styles.pct, { color: status.color }]}>{worst.supply.level}%</Text>
                  <View style={styles.statusRow}>
                    {worst.supply.level < 20 ? <Icon name="bag" size={12} color={status.color} /> : null}
                    <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.detail}>
                  {detail}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  cardWrap: { flex: 1 },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 16,
    ...cardShadow,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
  meterTrack: { marginTop: 14, height: 8, borderRadius: 4, backgroundColor: colors.fill, overflow: "hidden" },
  meterFill: { height: "100%", borderRadius: 4 },
  cardFoot: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pct: { fontSize: 17, fontFamily: font.bold, letterSpacing: -0.2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusLabel: { fontSize: 12, fontFamily: font.semibold },
  detail: { marginTop: 6, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
});
