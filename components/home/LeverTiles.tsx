import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ACTION_ICON, Icon } from "@/components/Icons";
import { PressableScale } from "@/components/ui";
import type { CareTone } from "@/lib/careDashboard";
import type { PetDayCard, PetTask } from "@/lib/home";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

/** How long a logged tile stays green before it settles into its real state. */
const FLASH_MS = 1100;
const TILE = 56;
const BADGE = 18;

/**
 * The selected animal's day as a row of tappable tiles — the page's doing
 * surface. Colour is the state (red late, orange due, accent still-to-do,
 * green done, grey nothing); the icon is the lever; the only text is one word
 * under each tile, a "1 of 3" where a count is mid-way, and a single hot line
 * when something is owed loudly. Tap = act: Feed opens the portion sheet, meds
 * are a door to the logs, the rest log right here and flash green.
 *
 * Re-keyed by pet id, so switching pets replays the enter animation — the same
 * shared-value pattern as the rest of the page, no completion callbacks.
 */
export default function LeverTiles({
  card,
  reduceMotion,
  onTask,
  onOpenPet,
}: {
  card: PetDayCard;
  reduceMotion: boolean;
  /** Returns true when the tap logged in place (drives the green flash). */
  onTask: (task: PetTask) => boolean;
  onOpenPet: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [flashed, setFlashed] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const enter = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
    return () => cancelAnimation(enter);
  }, [reduceMotion, enter]);
  const anim = useAnimatedStyle(() => {
    "worklet";
    return { opacity: enter.value, transform: [{ translateY: (1 - enter.value) * 6 }] };
  });

  const TONE_INK: Record<CareTone, string> = {
    overdue: colors.red,
    due: colors.orange,
    open: colors.accent,
    done: colors.green,
    idle: colors.label3,
  };
  const TONE_BG: Record<CareTone, string> = {
    overdue: colors.redSoft,
    due: colors.orangeSoft,
    open: colors.accentSoft,
    done: colors.greenSoft,
    idle: colors.fill,
  };

  const run = (task: PetTask) => {
    if (!onTask(task)) return;
    setFlashed(task.id);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashed(null), FLASH_MS);
  };

  const stateWord = (t: PetTask) =>
    t.tone === "overdue" ? "running late" : t.tone === "due" ? (t.hot ?? "due now") : t.tone === "open" ? (t.progress ?? "not done yet") : t.tone === "done" ? "done" : "nothing due";

  // One hot line, at most — the worst thing, said once, under the row.
  const hottest = card.tasks.find((t) => t.tone === "overdue") ?? card.tasks.find((t) => t.tone === "due");

  const { pet } = card;

  return (
    <Animated.View style={anim}>
      <PressableScale
        onPress={onOpenPet}
        accessibilityRole="header"
        accessibilityLabel={`${pet.name}. Open profile.`}
        hitSlop={{ top: 8, bottom: 4, left: 4, right: 4 }}
      >
        <View style={styles.head}>
          <Text numberOfLines={1} style={styles.name}>
            {pet.name}&rsquo;s day
          </Text>
          <Icon name="chevron-right" size={16} color={colors.label3} strokeWidth={2.2} />
        </View>
      </PressableScale>

      <View style={styles.row}>
        {card.tasks.map((task) => {
          const justRan = flashed === task.id;
          const ink = justRan ? colors.green : TONE_INK[task.tone];
          const bg = justRan ? colors.greenSoft : TONE_BG[task.tone];
          const done = justRan || task.tone === "done";
          return (
            <PressableScale
              key={task.id}
              haptic
              onPress={() => run(task)}
              accessibilityRole="button"
              accessibilityLabel={`${task.label}, ${justRan ? "logged" : stateWord(task)}`}
              accessibilityHint={task.action.kind === "route" ? "Opens the logs" : "Logs it"}
            >
              <View style={styles.tile}>
                <View style={[styles.circle, { backgroundColor: bg }, task.tone === "overdue" && !justRan && { borderWidth: 1.5, borderColor: withAlpha(colors.red, 0.4) }]}>
                  <Icon name={justRan ? "check" : ACTION_ICON[task.type].icon} size={26} color={ink} strokeWidth={1.9} />
                  {task.tone === "overdue" && !justRan ? (
                    <View style={[styles.badge, { backgroundColor: colors.red }]}>
                      <Text style={styles.badgeText}>!</Text>
                    </View>
                  ) : done ? (
                    <View style={[styles.badge, { backgroundColor: colors.green }]}>
                      <Icon name="check" size={11} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={[styles.label, { color: task.tone === "idle" ? colors.label3 : colors.label2 }]}>
                  {task.label}
                </Text>
                {task.progress ? (
                  <Text numberOfLines={1} style={styles.progress}>
                    {task.progress}
                  </Text>
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </View>

      {hottest?.hot ? (
        <Text style={[styles.hot, { color: TONE_INK[hottest.tone] }]}>
          {hottest.label} · {hottest.hot}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    head: { marginTop: 26, flexDirection: "row", alignItems: "center", gap: 6 },
    name: { flexShrink: 1, fontSize: 20, fontFamily: font.bold, letterSpacing: -0.4, color: colors.label },

    row: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", columnGap: 20, rowGap: 14 },
    // Top padding gives the corner badge headroom INSIDE the pressable's
    // rasterized bounds — content outside them clips on Android.
    tile: { alignItems: "center", width: TILE + 8, paddingTop: 4 },
    circle: {
      width: TILE,
      height: TILE,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -2,
      width: BADGE,
      height: BADGE,
      borderRadius: BADGE / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.bg,
    },
    badgeText: { fontSize: 11, fontFamily: font.bold, color: colors.white, lineHeight: 13 },
    label: { marginTop: 6, fontSize: 11, fontFamily: font.semibold, letterSpacing: 0.1 },
    progress: { marginTop: 1, fontSize: 10.5, fontFamily: font.medium, color: colors.label3 },

    hot: { marginTop: 12, fontSize: 13.5, fontFamily: font.semibold, letterSpacing: -0.1 },
  });
