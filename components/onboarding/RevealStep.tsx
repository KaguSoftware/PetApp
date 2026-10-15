import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { Species } from "@/data";
import { Mascot, type MascotReaction } from "@/components/mascot";
import { useReduceMotion } from "@/lib/a11y";
import { Confetti, SpeechBubble, Text, haptic, spacing } from "@/ui";
import { PetDetailsFields, type PetDetails } from "./PetDetailsFields";

interface Props {
  species: Species;
  name: string;
  ownerName: string;
  details: PetDetails;
  onDetails: (d: PetDetails) => void;
}

/** Step 3: the pet pops in with a spring, confetti and a love reaction. */
export function RevealStep({ species, name, ownerName, details, onDetails }: Props) {
  const reduceMotion = useReduceMotion();
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const [burst, setBurst] = useState(0);
  const [reaction, setReaction] = useState<MascotReaction>({ type: "love", key: 0 });

  useEffect(() => {
    if (!reduceMotion) pop.value = withSpring(1, { damping: 7, stiffness: 140, mass: 0.9 });
    else pop.value = 1;
    const t = setTimeout(
      () => {
        setBurst(1);
        setReaction({ type: "love", key: 1 });
        haptic("success");
      },
      reduceMotion ? 0 : 450,
    );
    return () => clearTimeout(t);
  }, [reduceMotion, pop]);

  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 3),
    transform: [{ scale: pop.value }, { translateY: (1 - pop.value) * 40 }],
  }));

  return (
    <View style={styles.wrap}>
      <Text variant="display" style={styles.center} accessibilityRole="header">
        {name} is here!
      </Text>
      <View style={styles.stage}>
        <SpeechBubble text={`Nice to meet you, ${ownerName}!`} />
        <Animated.View style={popStyle}>
          <Mascot species={species} size={220} mood="happy" reaction={reaction} accessibilityLabel={`${name}, your new pet`} />
        </Animated.View>
        <View pointerEvents="none" style={styles.confetti}>
          <Confetti burstKey={burst} />
        </View>
      </View>
      <PetDetailsFields petName={name} value={details} onChange={onDetails} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  center: { textAlign: "center" },
  stage: { alignItems: "center", gap: spacing.lg },
  confetti: { position: "absolute", left: 0, right: 0, bottom: 0, height: 220 },
});
