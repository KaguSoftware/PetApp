import { useState } from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeIn, SlideInLeft, SlideInRight } from "react-native-reanimated";
import { usePets } from "@/data";
import { useSelectedPet } from "@/components/home/selectedPet";
import { useReduceMotion } from "@/lib/a11y";
import { Text, haptic, spacing } from "@/ui";
import { careTypesFor, type CareMeta } from "./careMeta";
import { DetailsStep } from "./DetailsStep";
import { HealthStep } from "./HealthStep";
import { NoteStep } from "./NoteStep";
import { PetPicker } from "./PetPicker";
import { quickLog } from "./quickLog";
import { TileGrid, type RecordKind } from "./TileGrid";
import { WeightStep } from "./WeightStep";

type Step = { name: "tiles" } | { name: "details"; meta: CareMeta } | { name: RecordKind };

interface LogSheetProps {
  /** Pet from the route param; otherwise the Home selection. */
  petId?: string;
  /** Deep-link straight into a record step (e.g. the pet profile's "Add weight"). */
  initialStep?: RecordKind;
  close: () => void;
}

export function LogSheet({ petId, initialStep, close }: LogSheetProps) {
  const pets = usePets();
  const { pet: homePet } = useSelectedPet();
  const reduceMotion = useReduceMotion();
  const [picked, setPicked] = useState<string | undefined>(petId);
  const [allPets, setAllPets] = useState(false);
  const [step, setStep] = useState<Step>(initialStep ? { name: initialStep } : { name: "tiles" });
  const [back, setBack] = useState(false);

  const pet = pets.find((p) => p.id === picked) ?? pets.find((p) => p.id === petId) ?? homePet ?? pets[0];
  const targets = allPets ? pets : pet ? [pet] : [];

  const daily = careTypesFor(targets.map((p) => p.species));

  if (!pet) {
    return (
      <Text tone="ink2" style={styles.empty}>
        Add a pet first, then you can log their day.
      </Text>
    );
  }

  const go = (next: Step) => {
    setBack(next.name === "tiles");
    setStep(next);
  };
  const toTiles = () => go({ name: "tiles" });
  const enter = reduceMotion ? FadeIn.duration(120) : (back ? SlideInLeft : SlideInRight).duration(220);

  const body = (() => {
    switch (step.name) {
      case "details":
        return <DetailsStep pets={targets} meta={step.meta} onBack={toTiles} onDone={close} />;
      case "weight":
        return <WeightStep pet={pet} onBack={toTiles} onDone={close} />;
      case "health":
        return <HealthStep pet={pet} onBack={toTiles} onDone={close} />;
      case "note":
        return <NoteStep pet={pet} onBack={toTiles} onDone={close} />;
      default:
        return (
          <>
            <Text variant="title" accessibilityRole="header" style={styles.title}>
              {allPets ? "What did everyone do?" : `What did ${pet.name} do?`}
            </Text>
            {pets.length > 1 ? (
              <PetPicker
                pets={pets}
                selectedId={pet.id}
                allPets={allPets}
                onSelect={(id) => {
                  setAllPets(false);
                  setPicked(id);
                }}
                onToggleAll={() => setAllPets((v) => !v)}
              />
            ) : null}
            <TileGrid
              daily={daily}
              showRecords={!allPets}
              onDaily={(meta) => {
                haptic("success");
                quickLog(targets, meta.type);
                close();
              }}
              onDailyDetails={(meta) => go({ name: "details", meta })}
              onRecord={(kind) => go({ name: kind })}
            />
          </>
        );
    }
  })();

  return (
    <Animated.View key={step.name} entering={enter}>
      {body}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  empty: { paddingVertical: spacing["3xl"], textAlign: "center" },
});
