import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useHousehold, usePet } from "@/data";
import {
  AboutCard,
  AddSheets,
  DangerZone,
  MedsCard,
  ProfileHero,
  VaccinationsCard,
  VetVisitsCard,
  WeightCard,
  type AddKind,
} from "@/components/pet";
import { EmptyState, Screen } from "@/ui";

export default function PetProfileScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { ready } = useHousehold();
  const pet = usePet(id ?? "");
  const [adding, setAdding] = useState<AddKind | null>(null);
  const [rev, setRev] = useState(0);

  if (!pet) {
    return (
      <Screen back>
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
    );
  }

  const open = (k: AddKind) => {
    setRev((r) => r + 1);
    setAdding(k);
  };

  return (
    <Screen back>
      <ProfileHero pet={pet} />
      <AboutCard pet={pet} />
      <WeightCard pet={pet} />
      <VaccinationsCard petId={pet.id} onAdd={open} />
      <VetVisitsCard petId={pet.id} onAdd={open} />
      <MedsCard petId={pet.id} onAdd={open} />
      <DangerZone pet={pet} />
      <AddSheets petId={pet.id} kind={adding} rev={rev} onClose={() => setAdding(null)} />
    </Screen>
  );
}
