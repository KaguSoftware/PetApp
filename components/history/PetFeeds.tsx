import { useEffect } from "react";
import { useVaccinations, useVetVisits, useWeights } from "@/data";
import type { PetFeed } from "./model";

/**
 * Headless collector: the data hooks are per pet, so one of these mounts for each pet
 * and reports its records upward. Renders nothing.
 */
export function PetFeedProbe({ petId, onFeed }: { petId: string; onFeed: (petId: string, feed: PetFeed) => void }) {
  const weights = useWeights(petId);
  const vaccinations = useVaccinations(petId);
  const vetVisits = useVetVisits(petId);
  useEffect(() => {
    onFeed(petId, { weights, vaccinations, vetVisits });
  }, [petId, weights, vaccinations, vetVisits, onFeed]);
  return null;
}
