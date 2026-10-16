import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { LoadErrorState } from "@/components/home/LoadErrorState";
import { PetMenu } from "@/components/home/PetMenu";
import { useSelectedPet } from "@/components/home/selectedPet";
import { TodayList } from "@/components/home/TodayList";
import { todayItems } from "@/components/home/today";
import { useNow } from "@/components/home/useNow";
import { useHousehold, useLogs, useMeds, useMembers, useNotes, useWeights, type Pet } from "@/data";
import { EmptyState, Icon, PressableScale, RoundButton, Screen, Text, spacing, useTheme } from "@/ui";

function PetHome({ pet }: { pet: Pet }) {
  const now = useNow();
  const { units } = useHousehold();
  const logs = useLogs({ petId: pet.id });
  const weights = useWeights(pet.id);
  const notes = useNotes(pet.id);
  const meds = useMeds(pet.id);
  const members = useMembers();
  const items = useMemo(() => todayItems({ logs, weights, notes, meds, units, now }), [logs, weights, notes, meds, units, now]);

  return <TodayList items={items} members={members} />;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { ready, householdId, streak, loadError } = useHousehold();
  const { pet, pets, select } = useSelectedPet();
  const [menuOpen, setMenuOpen] = useState(false);

  // First run: go straight into adoption. Only when the load SUCCEEDED and found no
  // household — a failed load shows LoadErrorState instead, never onboarding. The
  // adopt flow hides Back in this state, so this can't loop; the EmptyState below
  // stays as the fallback if the user lands here anyway (e.g. after leaving).
  const needsAdoption = ready && !householdId && !loadError;
  useEffect(() => {
    if (needsAdoption) router.replace("/(onboarding)/adopt" as Href);
  }, [needsAdoption]);

  return (
    <Screen tabBarPadding>
      <View style={styles.top}>
        <View style={styles.greet}>
          {pet ? (
            <PressableScale
              onPress={() => setMenuOpen(true)}
              haptic="select"
              accessibilityRole="button"
              accessibilityLabel={`${pet.name}, switch pet`}
              style={styles.nameRow}
            >
              <Text variant="largeTitle" accessibilityRole="header" numberOfLines={1} style={styles.name}>
                {pet.name}
              </Text>
              <Icon name="chevron-down" size={22} color={colors.ink} />
            </PressableScale>
          ) : (
            <Text variant="largeTitle" accessibilityRole="header">
              Home
            </Text>
          )}
          {pet && streak > 0 ? (
            <Text variant="callout" tone="ink2">{`${streak} day${streak === 1 ? "" : "s"}`}</Text>
          ) : null}
        </View>
        <RoundButton icon="settings" accessibilityLabel="Settings" onPress={() => router.push("/settings")} />
      </View>
      {ready && loadError && !householdId ? <LoadErrorState /> : null}
      {pet ? (
        <PetHome key={pet.id} pet={pet} />
      ) : ready && householdId ? (
        <EmptyState
          icon="heart"
          title="Welcome home"
          message="Adopt your first pet and start logging their day."
          actionLabel="Adopt your first pet"
          onAction={() => router.push("/pet/new")}
        />
      ) : ready && !householdId && !loadError ? (
        <EmptyState
          icon="heart"
          title="Let's find your first pet"
          message="Adopt a pet to start your family's care log."
          actionLabel="Adopt a pet"
          onAction={() => router.push("/(onboarding)/adopt" as Href)}
        />
      ) : null}
      <PetMenu open={menuOpen} onClose={() => setMenuOpen(false)} pets={pets} selectedId={pet?.id} onSelect={select} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  greet: { flex: 1, minHeight: 44, justifyContent: "center", alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, maxWidth: "100%" },
  name: { flexShrink: 1 },
});
