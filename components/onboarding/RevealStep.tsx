import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import type { Species } from "@/data";
import { Text, haptic, layout } from "@/ui";
import { PetDetailsFields, type PetDetails } from "./PetDetailsFields";

interface Props {
  species: Species;
  name: string;
  ownerName: string;
  details: PetDetails;
  onDetails: (d: PetDetails) => void;
}

/** Step 3: confirmation plus the optional details. A haptic, nothing animated. */
export function RevealStep({ name, details, onDetails }: Props) {
  useEffect(() => {
    haptic("success");
  }, []);

  return (
    <View style={styles.wrap}>
      <Text variant="largeTitle" style={styles.center} accessibilityRole="header">
        {name} is here
      </Text>
      <PetDetailsFields petName={name} value={details} onChange={onDetails} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: layout.section },
  center: { textAlign: "center" },
});
