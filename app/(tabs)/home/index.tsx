import { router, Stack, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { LoadErrorState } from "@/components/home/LoadErrorState";
import { useSelectedPet } from "@/components/home/selectedPet";
import { TodayList } from "@/components/home/TodayList";
import { todayItems } from "@/components/home/today";
import { useNow } from "@/components/home/useNow";
import { useHousehold, useLogs, useMeds, useMembers, useNotes, useWeights, type Pet } from "@/data";
import { EmptyState, Screen, useHeaderIcon } from "@/ui";

function PetHome({ pet, streak }: { pet: Pet; streak: number }) {
  const now = useNow();
  const { units } = useHousehold();
  const logs = useLogs({ petId: pet.id });
  const weights = useWeights(pet.id);
  const notes = useNotes(pet.id);
  const meds = useMeds(pet.id);
  const members = useMembers();
  const items = useMemo(() => todayItems({ logs, weights, notes, meds, units, now }), [logs, weights, notes, meds, units, now]);

  return <TodayList items={items} members={members} streak={streak} />;
}

export default function HomeScreen() {
  const { ready, householdId, streak, loadError } = useHousehold();
  const { pet, pets, select } = useSelectedPet();
  const petsIcon = useHeaderIcon("pawprint", "pets");
  const settingsIcon = useHeaderIcon("gearshape", "settings");
  const ios = Platform.OS === "ios";

  // First run: go straight into adoption. Only when the load SUCCEEDED and found no
  // household — a failed load shows LoadErrorState instead, never onboarding. The
  // adopt flow hides Back in this state, so this can't loop; the EmptyState below
  // stays as the fallback if the user lands here anyway (e.g. after leaving).
  const needsAdoption = ready && !householdId && !loadError;
  useEffect(() => {
    if (needsAdoption) router.replace("/(onboarding)/adopt" as Href);
  }, [needsAdoption]);

  return (
    <>
      {/* The native large title is the selected pet's name. */}
      <Stack.Screen options={{ title: pet?.name ?? "Home" }} />
      <Stack.Toolbar placement="right">
        {pets.length > 0 && petsIcon ? (
          <Stack.Toolbar.Menu icon={petsIcon} title="Pets" accessibilityLabel="Switch pet">
            <Stack.Toolbar.Menu inline>
              {pets.map((p) => (
                <Stack.Toolbar.MenuAction key={p.id} isOn={p.id === pet?.id} onPress={() => select(p.id)}>
                  {p.name}
                </Stack.Toolbar.MenuAction>
              ))}
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu inline>
              <Stack.Toolbar.MenuAction icon={ios ? "plus" : undefined} onPress={() => router.push("/pet/new")}>
                Add pet
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        ) : null}
        {settingsIcon ? <Stack.Toolbar.Button icon={settingsIcon} accessibilityLabel="Settings" onPress={() => router.push("/settings")} /> : null}
      </Stack.Toolbar>
      <Screen tabBarPadding>
        {ready && loadError && !householdId ? <LoadErrorState /> : null}
        {pet ? (
          <PetHome key={pet.id} pet={pet} streak={streak} />
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
    </>
  );
}
