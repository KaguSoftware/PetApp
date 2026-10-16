import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useHousehold, useWeights, type Pet } from "@/data";
import { kgDeltaDisplay, kgToDisplay, kgValue, shortDate } from "@/lib/format";
import { Card, spacing, Text } from "@/ui";
import { TextButton } from "./TextButton";
import { WeightChart } from "./WeightChart";

const MAX_POINTS = 14;

export function WeightCard({ pet }: { pet: Pet }) {
  const { units } = useHousehold();
  const entries = useWeights(pet.id);

  const view = useMemo(() => {
    const recent = entries.slice(-MAX_POINTS);
    const latest = entries[entries.length - 1];
    const prev = entries[entries.length - 2];
    return { recent, latest, prev };
  }, [entries]);

  const { latest, prev, recent } = view;
  const unitLabel = units === "imperial" ? "lb" : "kg";
  const chartLabel = latest
    ? `Weight chart for ${pet.name}, latest ${kgToDisplay(latest.kg, units)}, ${recent.length} entries`
    : "";

  return (
    <Card style={styles.card}>
      <Text variant="headline" accessibilityRole="header">
        Weight
      </Text>
      {latest ? (
        <>
          <View style={styles.big}>
            <Text variant="title">{kgToDisplay(latest.kg, units)}</Text>
            {prev ? (
              <Text tone="ink2" variant="callout">
                {kgDeltaDisplay(latest.kg - prev.kg, units)} since {shortDate(prev.ts)}
              </Text>
            ) : (
              <Text tone="ink2" variant="callout">
                First weigh-in
              </Text>
            )}
          </View>
          {recent.length > 1 ? (
            <WeightChart values={recent.map((e) => kgValue(e.kg, units))} label={chartLabel} />
          ) : null}
        </>
      ) : (
        <Text tone="ink2" variant="callout">No weigh-ins yet ({unitLabel}).</Text>
      )}
      <TextButton
        label="Add weight"
        icon="plus"
        onPress={() => router.push({ pathname: "/log", params: { petId: pet.id, step: "weight" } })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  big: { gap: 2 },
});
