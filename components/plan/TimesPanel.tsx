import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { actionTone, Icon } from "@/components/Icons";
import PetAvatar from "@/components/PetAvatar";
import { PressableScale } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import { describeSchedule, findSchedule, formatSlotTime } from "@/lib/careStatus";
import { ACTIONS, type ActionType, type CareSchedule, type Pet } from "@/lib/data";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";

/** One row per thing that can be put on a clock, in the order the day runs. */
function itemsFor(pet: Pet): { key: string; type: ActionType; medId?: string; label: string }[] {
  const out: { key: string; type: ActionType; medId?: string; label: string }[] = [
    { key: "fed", type: "fed", label: ACTIONS.fed.label },
    { key: "water", type: "water", label: ACTIONS.water.label },
  ];
  if (pet.species === "cat") out.push({ key: "litter", type: "litter", label: ACTIONS.litter.label });
  else out.push({ key: "walk", type: "walk", label: ACTIONS.walk.label });
  for (const med of pet.meds) out.push({ key: `med:${med.id}`, type: "meds", medId: med.id, label: med.name });
  out.push({ key: "groomed", type: "groomed", label: ACTIONS.groomed.label });
  out.push({ key: "vet", type: "vet", label: ACTIONS.vet.label });
  return out;
}

function summarize(schedule: CareSchedule | undefined): string | undefined {
  if (!schedule?.slots.length) return undefined;
  if (schedule.intervalDays != null && schedule.intervalDays > 1) return describeSchedule(schedule);
  return schedule.slots.map((slot) => formatSlotTime(slot.time)).join(" · ");
}

/**
 * Every time in the household, opened in place under the day rail.
 *
 * This was a bottom sheet, and being a sheet is what broke it. Setting a
 * household's times is six or seven passes, and each pass had to close one
 * native Modal and present another — so the list reopened itself behind the
 * editor, and every round trip was a race between a dismissing window and a
 * presenting one. Lose that race once and the list's `open` flag stayed true
 * with nothing on screen, which killed the button until the tab remounted.
 *
 * Inline, there is only ever one Modal in play: the schedule editor. The list
 * simply stays where it was, so closing the editor lands you back on the row
 * you came from with the new time already printed on it.
 */
export default function TimesPanel({
  pets,
  schedules,
  tint,
  onEdit,
}: {
  pets: Pet[];
  schedules: CareSchedule[];
  tint: string;
  onEdit: (pet: Pet, type: ActionType, medId?: string) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();

  return (
    <Animated.View
      style={[styles.panel, { borderColor: withAlpha(tint, 0.3) }]}
      entering={reduceMotion ? undefined : FadeIn.duration(160)}
      exiting={reduceMotion ? undefined : FadeOut.duration(120)}
    >
      <Text style={styles.hint}>The family gets reminded at these times.</Text>
      {pets.map((pet) => (
        <View key={pet.id} style={styles.petBlock}>
          {pets.length > 1 ? (
            <View style={styles.petHead}>
              <PetAvatar pet={pet} size="xs" />
              <Text style={styles.petName}>{pet.name}</Text>
            </View>
          ) : null}
          {itemsFor(pet).map((item) => {
            const tone = actionTone(colors, item.type);
            const times = summarize(findSchedule(schedules, pet.id, item.type, item.medId));
            return (
              <PressableScale
                key={item.key}
                haptic
                onPress={() => onEdit(pet, item.type, item.medId)}
                accessibilityRole="button"
                accessibilityLabel={`${pet.name}, ${item.label}, ${times ?? "no times set"}`}
              >
                <View style={styles.row}>
                  <View style={[styles.disc, { backgroundColor: tone.bg }]}>
                    <Icon name={tone.icon} size={15} color={tone.tint} strokeWidth={1.9} />
                  </View>
                  <Text numberOfLines={1} style={styles.label}>
                    {item.label}
                  </Text>
                  <Text numberOfLines={1} style={[styles.times, !times && { color: colors.label3 }]}>
                    {times ?? "Not set"}
                  </Text>
                  <Icon name="chevron-right" size={14} color={colors.label3} />
                </View>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    // The page has no containers, so this earns its outline by being a thing
    // that opened: a bordered field that wasn't there a moment ago.
    panel: {
      marginTop: 10,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
    },
    hint: { fontSize: 12.5, fontFamily: font.regular, lineHeight: 17, color: colors.label2 },
    petBlock: { marginTop: 10 },
    petHead: { flexDirection: "row", alignItems: "center", gap: 9, paddingBottom: 2 },
    petName: { fontSize: 14, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 48,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: withAlpha(colors.label, 0.08),
    },
    disc: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    label: { flexShrink: 1, fontSize: 15, fontFamily: font.medium, color: colors.label },
    times: { flex: 1, textAlign: "right", fontSize: 14, fontFamily: font.semibold, color: colors.label },
  });
