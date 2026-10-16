import { router, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LoadErrorState } from "@/components/home/LoadErrorState";
import { startOfToday } from "@/components/home/format";
import { useSelectedPet } from "@/components/home/selectedPet";
import { TodayList } from "@/components/home/TodayList";
import { useNow } from "@/components/home/useNow";
import { useHousehold, useLogs, useMembers, type Pet } from "@/data";
import { Chip, EmptyState, RoundButton, Screen, Text, spacing } from "@/ui";

function PetHome({ pet }: { pet: Pet }) {
  const now = useNow();
  const logs = useLogs({ petId: pet.id });
  const members = useMembers();
  const today = useMemo(() => {
    const from = startOfToday(now);
    return logs.filter((l) => l.ts >= from);
  }, [logs, now]);

  return <TodayList logs={today} members={members} now={now} petName={pet.name} />;
}

/** Phase 1 placeholder: Phase 2 replaces this header with the pet dropdown and builds the + button. */
export default function HomeScreen() {
  const { ready, householdId, streak, loadError } = useHousehold();
  const { pet, pets, select } = useSelectedPet();

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
          <Text variant="largeTitle" accessibilityRole="header" numberOfLines={1}>
            {pet ? pet.name : "Home"}
          </Text>
          {pet && streak > 0 ? (
            <Text variant="callout" tone="ink2">{`${streak} day${streak === 1 ? "" : "s"}`}</Text>
          ) : null}
        </View>
        <RoundButton icon="settings" accessibilityLabel="Settings" onPress={() => router.push("/settings")} />
      </View>
      {ready && loadError && !householdId ? <LoadErrorState /> : null}
      {pets.length > 1 && pet ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pets}>
          {pets.map((p) => (
            <Chip key={p.id} label={p.name} selected={p.id === pet.id} onPress={() => select(p.id)} />
          ))}
        </ScrollView>
      ) : null}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  greet: { flex: 1, minHeight: 44, justifyContent: "center" },
  pets: { gap: spacing.sm },
});
