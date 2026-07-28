import { useMemo } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { formatDuration } from "@/components/DurationPickerSheet";
import { FadeInItem } from "@/components/Motion";
import { InitialAvatar } from "@/components/PetAvatar";
import { ACTION_ICON } from "@/components/Icons";
import { AccentButton, IconCircle, Row } from "@/components/ui";
import { ACTIONS, type Activity, type Member, type Pet } from "@/lib/data";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * One "who did what" log row — shared by the Logs tab's "Today" timeline and
 * the per-pet "All logs" screen so the two can't drift. Tapping your own log
 * expands it to reveal a "Remove log" action; other members' logs are
 * read-only (no undo button, no expand).
 */
export default function ActivityRow({
  activity,
  pet,
  member,
  isYou,
  expanded,
  onToggleExpand,
  onUndo,
}: {
  activity: Activity;
  pet: Pet;
  member: Member | undefined;
  isYou: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onUndo: (activityId: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const medName = activity.medId ? pet.meds.find((m) => m.id === activity.medId)?.name : undefined;
  const gramsNote = activity.grams != null ? `${Math.round(activity.grams)} g` : undefined;
  const durationNote = activity.durationMinutes != null ? formatDuration(activity.durationMinutes) : undefined;

  return (
    <View>
      <Row
        leading={
          member ? (
            <InitialAvatar name={member.name} gradient={member.gradient} size={36} />
          ) : (
            <IconCircle icon={ACTION_ICON[activity.type].icon} tint={ACTION_ICON[activity.type].tint} bg={ACTION_ICON[activity.type].bg} />
          )
        }
        title={`${member?.name ?? "Someone"} ${ACTIONS[activity.type].verb} ${pet.name}`}
        subtitle={[medName, gramsNote, durationNote].filter(Boolean).join(" · ") || undefined}
        trailing={
          <Text style={styles.timelineTime}>{new Date(activity.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
        }
        onPress={isYou ? onToggleExpand : undefined}
      />
      {expanded && isYou ? (
        <FadeInItem style={styles.timelineExpand}>
          <AccentButton
            variant="tinted"
            size="sm"
            onPress={() => {
              onToggleExpand();
              Alert.alert("Remove this log?", "This undoes the coins and streak credit it gave you.", [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => onUndo(activity.id) },
              ]);
            }}
          >
            Remove log
          </AccentButton>
        </FadeInItem>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    timelineTime: { fontSize: 13, fontFamily: font.regular, color: colors.label3 },
    timelineExpand: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  });
