import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { petDayProgress, type LeverSummary } from "@/lib/careDashboard";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

const CELL_W = 60;

/**
 * The household's day in one card: how much of today's care is done, and how
 * that splits across the pets. It is the answer to the question the old pet
 * picker made you ask one pet at a time.
 *
 * Nothing here filters anything — each pet is a link to its own profile, and
 * the card carries no selected state, so it can't be mistaken for the picker it
 * replaced.
 */
export default function HouseholdToday({
  pets,
  summaries,
  onPetPress,
}: {
  pets: Pet[];
  summaries: LeverSummary[];
  onPetPress: (petId: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const rows = useMemo(() => pets.map((pet) => ({ pet, ...petDayProgress(pet, summaries) })), [pets, summaries]);
  const total = rows.reduce((n, r) => n + r.required, 0);
  const done = rows.reduce((n, r) => n + r.done, 0);
  const overdue = rows.reduce((n, r) => n + r.overdue, 0);

  const headline =
    total === 0 ? "Nothing due yet" : done >= total ? "All caught up" : overdue > 0 ? `${overdue} overdue` : `${done} of ${total} done`;
  const headlineColor = total === 0 ? colors.label3 : overdue > 0 ? colors.red : done >= total ? colors.green : colors.label;

  const cells = rows.map((r) => {
    const ratio = r.required === 0 ? 0 : r.done / r.required;
    const complete = r.required > 0 && r.done >= r.required;
    return (
      <PressableScale
        key={r.pet.id}
        onPress={() => onPetPress(r.pet.id)}
        accessibilityRole="button"
        accessibilityLabel={`${r.pet.name}, ${r.required === 0 ? "nothing due" : `${r.done} of ${r.required} done`}`}
        accessibilityHint="Opens this pet's profile"
      >
        <View style={styles.cell}>
          <View>
            <PetAvatar pet={r.pet} size="sm" />
            {r.overdue > 0 ? <View style={styles.alertDot} /> : null}
          </View>
          <Text numberOfLines={1} style={styles.name}>
            {r.pet.name}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.round(ratio * 100)}%`, backgroundColor: r.overdue > 0 ? colors.red : complete ? colors.green : colors.accent },
              ]}
            />
          </View>
        </View>
      </PressableScale>
    );
  });

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>Today</Text>
        <Text style={[styles.headline, { color: headlineColor }]}>{headline}</Text>
      </View>
      {pets.length > 4 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cells}>
          {cells}
        </ScrollView>
      ) : (
        <View style={styles.cells}>{cells}</View>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      marginTop: 12,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
    },
    head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
    eyebrow: { fontSize: 11.5, fontFamily: font.semibold, letterSpacing: 0.8, textTransform: "uppercase", color: colors.label3 },
    headline: { fontSize: 15, fontFamily: font.semibold, letterSpacing: -0.2 },
    cells: { flexDirection: "row", gap: 6 },
    cell: { width: CELL_W, alignItems: "center" },
    alertDot: {
      position: "absolute",
      top: -1,
      right: -1,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.red,
      borderWidth: 2,
      borderColor: colors.card,
    },
    name: { marginTop: 6, maxWidth: CELL_W, fontSize: 12, fontFamily: font.medium, color: colors.label2, textAlign: "center" },
    track: { marginTop: 5, width: 40, height: 4, borderRadius: 2, backgroundColor: withAlpha(colors.label, 0.12), overflow: "hidden" },
    fill: { height: 4, borderRadius: 2 },
  });
