import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { MascotStage, type MascotMood } from "@/components/mascot";
import type { Pet } from "@/data";
import { moodLine, reactionLine } from "@/lib/petLines";
import { emitReaction, useLatestReaction } from "@/lib/reactions";
import { Confetti, Icon, PressableScale, SpeechBubble, Text, haptic, radius, shadow, spacing, useTheme } from "@/ui";

const SPEAK_MS = 9000;

export function HomeHero({ pet, mood, now }: { pet: Pet; mood: MascotMood; now: number }) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const reaction = useLatestReaction(pet.id);
  const lastKey = useRef(reaction?.key);
  const [spoken, setSpoken] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A fresh reaction (from the log sheet or a tap on the pet) speaks and celebrates.
  useEffect(() => {
    if (!reaction || reaction.key === lastKey.current) return;
    lastKey.current = reaction.key;
    setSpoken(reactionLine(reaction.source, pet.species, pet.name, reaction.key));
    if (reaction.source !== "tap") setBurst((n) => n + 1);
    // Restarted per reaction and cleared on unmount only, so a re-render can never strand the bubble.
    if (speakTimer.current) clearTimeout(speakTimer.current);
    speakTimer.current = setTimeout(() => {
      speakTimer.current = null;
      setSpoken(null);
    }, SPEAK_MS);
  }, [reaction, pet.species, pet.name]);
  useEffect(
    () => () => {
      if (speakTimer.current) clearTimeout(speakTimer.current);
    },
    [],
  );

  // The idle line is stable for a few hours so it doesn't flicker on every tick.
  const idle = useMemo(
    () => moodLine(mood, pet.species, pet.name, Math.floor(now / (3 * 3_600_000)) + pet.name.length),
    [mood, pet.species, pet.name, now],
  );

  const dark = colors.scheme === "dark";
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          haptic("select");
          emitReaction({ petId: pet.id, type: "tap" });
        }}
        onLongPress={() => {
          haptic("tap");
          router.push(`/pet/${pet.id}`);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${pet.name}, feeling ${mood}`}
        accessibilityHint="Tap to play. Hold to open the profile."
      >
        <MascotStage
          species={pet.species}
          mood={mood}
          reaction={reaction ? { type: reaction.type, key: reaction.key } : undefined}
          height={Math.round(Math.min(Math.max(height * 0.46, 300), 460))}
          background={colors.tones.ice.bg}
          rug={dark ? "#FFFFFF12" : "#FFFFFF66"}
          bubble={<SpeechBubble text={spoken ?? idle} />}
        />
        <Confetti burstKey={burst} />
      </Pressable>
      <PressableScale
        onPress={() => router.push({ pathname: "/log", params: { petId: pet.id } })}
        scaleTo={0.95}
        haptic="heavy"
        accessibilityRole="button"
        accessibilityLabel={`Log for ${pet.name}`}
        accessibilityHint="Opens the log menu"
        style={[styles.log, shadow.float, { backgroundColor: colors.ink }]}
      >
        <Icon name="plus" size={28} color={colors.onInk} strokeWidth={2.8} />
        <Text variant="title" style={{ color: colors.onInk }} numberOfLines={1}>
          {`Log for ${pet.name}`}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  log: {
    height: 68,
    borderRadius: radius.pill,
    paddingHorizontal: spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
});
