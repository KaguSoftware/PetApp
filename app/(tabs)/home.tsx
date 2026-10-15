import { router, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LoadErrorState } from "@/components/home/LoadErrorState";
import { HomeHero } from "@/components/home/HomeHero";
import { LetterCard } from "@/components/home/LetterCard";
import { PetSwitcher } from "@/components/home/PetSwitcher";
import { greeting, startOfToday } from "@/components/home/format";
import { useSelectedPet } from "@/components/home/selectedPet";
import { TodayList } from "@/components/home/TodayList";
import { useNow } from "@/components/home/useNow";
import { useHousehold, useLogs, useMembers, type Pet } from "@/data";
import { computeMood } from "@/lib/mood";
import { letterLine } from "@/lib/petLines";
import { Chip, EmptyState, Screen, Text, spacing } from "@/ui";

const DAY = 86_400_000;

function PetHome({ pet }: { pet: Pet }) {
  const now = useNow();
  const logs = useLogs({ petId: pet.id });
  const members = useMembers();
  const { mood } = useMemo(() => computeMood(pet, logs, now), [pet, logs, now]);
  const today = useMemo(() => {
    const from = startOfToday(now);
    return logs.filter((l) => l.ts >= from);
  }, [logs, now]);
  // logs are newest first. A letter only makes sense for a pet with some history.
  const quiet = logs.length > 0 && now - logs[0].ts > DAY;

  return (
    <>
      <HomeHero pet={pet} mood={mood} now={now} />
      {quiet ? <LetterCard line={letterLine(pet.name, Math.floor(now / DAY))} /> : null}
      <TodayList logs={today} members={members} now={now} petName={pet.name} />
    </>
  );
}

export default function HomeScreen() {
  const { ready, householdId, streak, loadError } = useHousehold();
  const { pet, pets, select } = useSelectedPet();
  const now = useNow();

  const openDev = __DEV__ ? () => router.push("/dev/mascot" as Href) : undefined;

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
        <Pressable onLongPress={openDev} accessibilityRole="header" style={styles.greet}>
          <Text variant="display">{greeting(now)}</Text>
        </Pressable>
        {streak > 0 ? <Chip icon="walk" tone="butter" label={`${streak} day${streak === 1 ? "" : "s"}`} /> : null}
      </View>
      {ready && loadError && !householdId ? <LoadErrorState /> : null}
      {pets.length > 1 && pet ? <PetSwitcher pets={pets} selectedId={pet.id} onSelect={select} /> : null}
      {pet ? (
        <PetHome key={pet.id} pet={pet} />
      ) : ready && householdId ? (
        <EmptyState
          icon="heart"
          tone="peach"
          title="Welcome home"
          message="Adopt your first pet and start logging their day."
          actionLabel="Adopt your first pet"
          onAction={() => router.push("/pet/new")}
        />
      ) : ready && !householdId && !loadError ? (
        <EmptyState
          icon="heart"
          tone="peach"
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
});
