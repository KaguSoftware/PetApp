import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ACTION_ICON, Icon } from "@/components/Icons";
import { IconCircle, Row, SmallButton } from "@/components/ui";
import { careItemLabel, type CareItemStatus } from "@/lib/careStatus";
import type { ActionType, Pet } from "@/lib/data";
import { colors, font, radius } from "@/lib/theme";

/** Past-tense lead-in for the "who did it last" line, per action. */
const DONE_VERB: Record<ActionType, string> = {
  fed: "Fed",
  water: "Given",
  litter: "Cleaned",
  walk: "Walked",
  groomed: "Groomed",
  meds: "Given",
  vet: "Visited",
};

/** "+5" coin pill that floats up and fades from the row's log button (~600ms). */
export function CoinPop() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.25, 1], [0, 1, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -30]) },
      { scale: interpolate(t.value, [0, 0.25, 1], [0.6, 1.1, 1]) },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.coinPop, style]}>
      <Text style={styles.coinPopLabel}>+5</Text>
    </Animated.View>
  );
}

function timeLabel(ts: number, now: number): string {
  const time = new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const d = new Date(ts);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) return time;
  const yesterday = new Date(now - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return `yesterday ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

/** "in 40 min" / "6:00 PM" / "tomorrow 8:00 AM" for the next scheduled slot. */
function nextLabel(ts: number, now: number): string {
  const mins = Math.round((ts - now) / 60_000);
  if (mins <= 60) return mins <= 1 ? "now" : `in ${mins} min`;
  return timeLabelFuture(ts, now);
}

function timeLabelFuture(ts: number, now: number): string {
  const time = new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const d = new Date(ts);
  const n = new Date(now);
  if (d.toDateString() === n.toDateString()) return time;
  const tomorrow = new Date(now + 86_400_000);
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

/**
 * One dashboard row on the Logs tab: state-colored icon, "who did it last and
 * when", what's due next, and a one-tap log button. Tapping the row body opens
 * the schedule editor (wired by the caller).
 */
export default function CareStatusRow({
  pet,
  status,
  members,
  warning = false,
  justLogged = false,
  onLog,
  onPress,
  now = Date.now(),
}: {
  pet: Pet;
  status: CareItemStatus;
  members: { id: string; name: string }[];
  /** Outstanding care/health alert — shows the red "!" badge. */
  warning?: boolean;
  /** Flash state right after logging — check icon + coin pop. */
  justLogged?: boolean;
  onLog: () => void;
  /** Row-body tap — opens the schedule editor for this item. */
  onPress: () => void;
  now?: number;
}) {
  const { type, medId, state, last, next, progress } = status;
  const a = ACTION_ICON[type];
  const title = careItemLabel(pet, type, medId);

  const done = state === "done" || justLogged;
  const overdue = state === "overdue" && !justLogged;
  const due = state === "due" && !justLogged;

  const iconBg = done ? colors.greenSoft : overdue ? colors.redSoft : a.bg;
  const iconTint = done ? colors.green : overdue ? colors.red : a.tint;

  const lastBy = last ? (members.find((m) => m.id === last.memberId)?.name ?? "someone") : null;
  const lastLine = last ? `${DONE_VERB[type]} ${timeLabel(last.ts, now)} by ${lastBy}` : "Not yet today";

  const nextLine = overdue
    ? "Overdue — needed earlier today"
    : due && next
      ? `Due ${nextLabel(next.ts, now)}${next.label ? ` · ${next.label}` : ""}`
      : next
        ? `Next ${next.label ?? ""}${next.label ? " · " : ""}${timeLabelFuture(next.ts, now)}`
        : progress
          ? `${progress.count} of ${progress.target} today`
          : null;

  return (
    <Row
      onPress={onPress}
      interactiveTrailing
      leading={
        <View>
          <IconCircle icon={done ? "check" : a.icon} tint={iconTint} bg={iconBg} />
          {warning && !done ? (
            <View style={styles.warningBadge} accessibilityLabel={`${title} warning`}>
              <Icon name="alert" size={13} color={colors.red} />
            </View>
          ) : null}
        </View>
      }
      title={title}
      subtitle={
        <View>
          <Text numberOfLines={1} style={styles.lastLine}>
            {lastLine}
          </Text>
          {nextLine ? (
            <Text numberOfLines={1} style={[styles.nextLine, overdue ? styles.nextOverdue : due ? styles.nextDue : null]}>
              {nextLine}
            </Text>
          ) : null}
        </View>
      }
      trailing={
        <View>
          {justLogged ? <CoinPop /> : null}
          <SmallButton
            label={done ? "✓ Done" : "Log"}
            tone={done ? "green" : overdue ? "red" : "accent"}
            onPress={onLog}
          />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  lastLine: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  nextLine: { marginTop: 1, fontSize: 13, fontFamily: font.regular, color: colors.label3 },
  nextDue: { color: colors.accent, fontFamily: font.medium },
  nextOverdue: { color: colors.red, fontFamily: font.medium },
  warningBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    padding: 1,
  },
  coinPop: {
    position: "absolute",
    right: 0,
    top: -22,
    zIndex: 10,
    borderRadius: radius.full,
    backgroundColor: colors.orangeSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  coinPopLabel: { fontSize: 12, fontFamily: font.bold, color: colors.orange },
});
