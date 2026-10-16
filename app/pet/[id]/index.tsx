import { router, Stack, useLocalSearchParams } from "expo-router";
import { useHousehold, usePet } from "@/data";
import { AboutCard, DangerZone, MedsCard, ProfileHero, VaccinationsCard, VetVisitsCard, WeightCard } from "@/components/pet";
import { EmptyState, layout, Screen } from "@/ui";

export default function PetProfileScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { ready } = useHousehold();
  const pet = usePet(id ?? "");

  if (!pet) {
    return (
      <>
        <Stack.Screen options={{ title: "Pet" }} />
        <Screen>
          {ready ? (
            <EmptyState
              icon="heart"
              title="We can't find this pet"
              message="They may have been removed from your household."
              actionLabel="Go back"
              onAction={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
            />
          ) : null}
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: pet.name }} />
      <Screen contentStyle={{ gap: layout.item }}>
        <ProfileHero pet={pet} />
        <AboutCard pet={pet} />
        <WeightCard pet={pet} />
        <VaccinationsCard petId={pet.id} />
        <VetVisitsCard petId={pet.id} />
        <MedsCard petId={pet.id} />
        <DangerZone pet={pet} />
      </Screen>
    </>
  );
}
