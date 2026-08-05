import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PetChoiceRow } from "@/components/PetChoice";
import { PressableScale } from "@/components/ui";
import type { CareTone } from "@/lib/careDashboard";
import type { InboxDocument, InboxTone } from "@/lib/inbox";
import { inboxHeadline } from "@/lib/inbox";
import type { Pet } from "@/lib/data";
import { font, radius, useColors, type Colors } from "@/lib/theme";

/** The page's four tones against live theme tokens — the Logs tile palette. */
export function toneColor(colors: Colors, tone: InboxTone | "clear"): string {
  switch (tone) {
    case "alert":
    case "late":
      return colors.red;
    case "due":
      return colors.orange;
    case "clear":
      return colors.green;
    default:
      return colors.label3;
  }
}

/**
 * The state of the inbox in one card, plus the faces that narrow it.
 *
 * This is the Logs tab's `HouseholdToday` doing this page's job: same card,
 * same eyebrow-and-headline, same "the household first, a pet only if you ask"
 * order. The difference is that here a face IS a control — filtering by pet is
 * the whole utility of a shared inbox, and the row is the same `PetChoiceRow`
 * the Logs chooser uses, in its radio mode, so a selected pet looks selected in
 * exactly the way it does one tab over.
 */
export default function InboxSummary({
  doc,
  pets,
  now,
  selectedPetId,
  onSelectPet,
  onClearAlerts,
}: {
  doc: InboxDocument;
  pets: Pet[];
  now: number;
  selectedPetId: string | null;
  onSelectPet: (petId: string | null) => void;
  /** Only offered when there are auto-raised alerts to dismiss. */
  onClearAlerts?: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const headline = inboxHeadline(doc, now);
  const openBy = useMemo(() => new Map(doc.perPet.map((p) => [p.pet.id, p])), [doc.perPet]);

  const sub = [
    doc.counts.now > 0 && doc.counts.today > 0 ? `${doc.counts.today} more today` : null,
    doc.counts.ahead > 0 ? `${doc.counts.ahead} ahead` : null,
    doc.done.length > 0 ? `${doc.done.length} done` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.eyebrow}>Inbox</Text>
          <Text style={[styles.headline, { color: toneColor(colors, headline.tone) }]}>{headline.text}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
        {doc.counts.alerts > 0 && onClearAlerts ? (
          <PressableScale onPress={onClearAlerts} accessibilityRole="button" accessibilityLabel="Clear all alerts" hitSlop={10}>
            <Text style={styles.clearAll}>Clear alerts</Text>
          </PressableScale>
        ) : null}
      </View>

      {/* A household of one has nothing to narrow, so the faces disappear and
          the card collapses to the headline it always was. */}
      {pets.length > 1 ? (
        <View style={styles.faces}>
          <PetChoiceRow
            pets={pets}
            selectedId={selectedPetId ?? ""}
            onPress={(petId) => onSelectPet(selectedPetId === petId ? null : petId)}
            toneFor={(pet) => petTone(openBy.get(pet.id))}
            captionFor={(pet) => {
              const entry = openBy.get(pet.id);
              if (!entry || entry.open === 0) return "Clear";
              return entry.late > 0 ? `${entry.late} late` : `${entry.open} open`;
            }}
            extra={
              selectedPetId
                ? { label: "Everyone", icon: "paw", onPress: () => onSelectPet(null) }
                : undefined
            }
          />
        </View>
      ) : null}
    </View>
  );
}

/** Borrowed straight from the dashboard's vocabulary so the rings match the tiles. */
function petTone(entry: { open: number; late: number } | undefined): CareTone | undefined {
  if (!entry) return undefined;
  if (entry.late > 0) return "overdue";
  if (entry.open > 0) return "open";
  return "done";
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      marginTop: 12,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.sep,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 6,
    },
    head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    headText: { flexShrink: 1 },
    eyebrow: { fontSize: 11.5, fontFamily: font.semibold, letterSpacing: 0.8, textTransform: "uppercase", color: colors.label3 },
    headline: { marginTop: 3, fontSize: 20, fontFamily: font.bold, letterSpacing: -0.4 },
    sub: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2 },
    clearAll: { paddingTop: 2, fontSize: 13, fontFamily: font.semibold, color: colors.accent },
    // The chooser brings its own vertical rhythm; this only has to stop the
    // faces colliding with the headline above them.
    faces: { marginTop: 6 },
  });
