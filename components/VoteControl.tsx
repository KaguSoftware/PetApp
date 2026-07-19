import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PressableScale, PRESS_SCALE_SMALL } from "@/components/ui";
import { setVote } from "@/lib/forum";
import { useStore } from "@/lib/store";
import { colors, font, radius } from "@/lib/theme";

/**
 * Upvote pill for a forum post or answer. Optimistic: flips locally on tap and
 * persists via setVote (score is kept in sync by a DB trigger), rolling back
 * and toasting on failure. Seeded from props and re-synced when a refetch
 * hands down fresh score/voted values.
 */
export default function VoteControl({
  target,
  score,
  voted,
  size = "md",
}: {
  target: { postId?: string; answerId?: string };
  score: number;
  voted: boolean;
  size?: "md" | "sm";
}) {
  const { toast } = useStore();
  const [state, setState] = useState({ score, voted });
  const [busy, setBusy] = useState(false);

  // Re-sync when the parent refetches (new props reflect server truth).
  useEffect(() => {
    setState({ score, voted });
  }, [score, voted]);

  const toggle = async () => {
    if (busy) return;
    const next = !state.voted;
    const prev = state;
    setBusy(true);
    setState({ voted: next, score: state.score + (next ? 1 : -1) });
    try {
      await setVote(target, next);
    } catch {
      setState(prev);
      toast("alert", "Vote didn't save", "Check your connection and try again");
    } finally {
      setBusy(false);
    }
  };

  const small = size === "sm";
  const iconSize = small ? 14 : 16;
  const tint = state.voted ? colors.accent : colors.label2;
  return (
    <PressableScale
      scaleTo={PRESS_SCALE_SMALL}
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: state.voted }}
      accessibilityLabel={`${state.score} upvotes${state.voted ? ", you upvoted" : ""}`}
    >
      <View style={[styles.pill, small && styles.pillSm, state.voted && styles.pillOn]}>
        <Icon name="arrow-up" size={iconSize} color={tint} />
        <Text style={[styles.count, small && styles.countSm, { color: tint }]}>{state.score}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    backgroundColor: colors.fill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillSm: { paddingHorizontal: 10, paddingVertical: 4 },
  pillOn: { backgroundColor: colors.accentSoft },
  count: { fontSize: 14, fontFamily: font.semibold, minWidth: 10, textAlign: "center" },
  countSm: { fontSize: 13 },
});
