import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { useSelectedPet } from "@/components/home/selectedPet";
import { formFromStep } from "@/components/plus/careMeta";
import { PlusPanel } from "@/components/plus/PlusPanel";
import { usePets } from "@/data";

/**
 * The + panel, hosted as a transparent-modal route so the floating + button and the
 * pet profile are both just `router.push("/log")`. Logs for the pet selected on Home,
 * or the `petId` param; `step` opens straight at one form.
 */
export default function LogScreen() {
  const { petId, step } = useLocalSearchParams<{ petId?: string; step?: string }>();
  const { pet: selected } = useSelectedPet();
  const pets = usePets();
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  const closed = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/home")), []);

  const pet = (petId ? pets.find((p) => p.id === petId) : undefined) ?? selected;
  return <PlusPanel pet={pet} initialForm={formFromStep(step)} open={open} onClose={close} onClosed={closed} />;
}
