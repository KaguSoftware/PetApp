import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import PetAvatar from "@/components/PetAvatar";
import ScheduleEditorSheet from "@/components/ScheduleEditorSheet";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { actionTone, type IconName } from "@/components/Icons";
import CareItemSheet from "@/components/plan/CareItemSheet";
import CareStatTile, { type TilePetValue } from "@/components/plan/CareStatTile";
import { PageButton } from "@/components/plan/Chapter";
import NutritionHero from "@/components/plan/NutritionHero";
import { Chevron, Group, IconCircle, PressableScale, Row, SectionHeader, SheetTitle } from "@/components/ui";
import { BRAND_PLUS } from "@/lib/brand";
import { carePlanDocument, breedNotes, type PlanChapter, type PlanEntry, type PlanLine, type Rhythm } from "@/lib/carePlan";
import { type ActionType, type Pet } from "@/lib/data";
import { GUIDES } from "@/lib/guides";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

/**
 * The slow chapters merge into one board, so the cadence has to move into the
 * value: "1×" under an "Every week" heading becomes "Weekly" on its own.
 * Day-chapter values (counts, grams, times) already carry their meaning.
 */
function cadenceLabel(rhythm: Rhythm, value: string): string {
  if (rhythm === "day") return value;
  if (/[ap]m|:/i.test(value)) return value; // scheduled times print as-is
  const unit = rhythm === "week" ? "a week" : rhythm === "weeks" ? "a month" : "a year";
  if (value === "1×") return rhythm === "week" ? "Weekly" : rhythm === "weeks" ? "Monthly" : "Yearly";
  if (/^\d/.test(value) && value.endsWith("×")) return `${value} ${unit}`;
  if (/wks|mo\b|yr\b|days/.test(value)) return `Every ${value.replace(/^every /i, "")}`;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Merge the week / weeks / year chapters into one ordered line list. The same
 *  item can sit in two slow chapters when two pets run different cadences —
 *  merged by id here so it is one tile with both pets on it. */
function slowLines(chapters: PlanChapter[]): { line: PlanLine; rhythms: Map<string, Rhythm> }[] {
  const out: { line: PlanLine; rhythms: Map<string, Rhythm> }[] = [];
  const byId = new Map<string, { line: PlanLine; rhythms: Map<string, Rhythm> }>();
  for (const chapter of chapters) {
    if (chapter.rhythm === "day") continue;
    for (const line of chapter.lines) {
      const existing = byId.get(line.id);
      if (existing) {
        existing.line = { ...existing.line, entries: [...existing.line.entries, ...line.entries] };
        for (const e of line.entries) existing.rhythms.set(e.pet.id, chapter.rhythm);
        const idx = out.findIndex((o) => o.line.id === line.id);
        if (idx >= 0) out[idx] = existing;
      } else {
        const item = { line, rhythms: new Map(line.entries.map((e) => [e.pet.id, chapter.rhythm] as const)) };
        byId.set(line.id, item);
        out.push(item);
      }
    }
  }
  return out;
}

/** "2×" + "3×" → "2–3×", "300 g" + "460 g" → "300–460 g"; anything messier
 *  than a numeric spread steps back to "Varies" — the floor has the detail. */
function summarize(values: string[]): string {
  const nums = values.map((v) => /^(\d+)\s*(×|g)$/.exec(v)).filter((m): m is RegExpExecArray => m != null);
  if (nums.length === values.length && nums.every((m) => m[2] === nums[0][2])) {
    const ns = nums.map((m) => Number(m[1]));
    const lo = Math.min(...ns);
    const hi = Math.max(...ns);
    const unit = nums[0][2] === "g" ? " g" : "×";
    return lo === hi ? `${lo}${unit}` : `${lo}–${hi}${unit}`;
  }
  return "Varies";
}

/** The hue an item without a loggable action still deserves — an all-violet
 *  "Routine care" board would say nothing at a glance. */
const CANON_TONE: Record<string, { tint: keyof Colors; bg: keyof Colors }> = {
  play: { tint: "green", bg: "greenSoft" },
  potty: { tint: "orange", bg: "orangeSoft" },
  ears: { tint: "vetTint", bg: "vetBg" },
  bathing: { tint: "vetTint", bg: "vetBg" },
  dental: { tint: "accent", bg: "accentSoft" },
  nails: { tint: "groomTint", bg: "groomBg" },
  weight: { tint: "green", bg: "greenSoft" },
  parasite: { tint: "orange", bg: "orangeSoft" },
};

/**
 * Care — the household's routine as a stat board.
 *
 * A violet Nutrition hero opens the page, then two 2-up tile grids: "Every
 * day" (counts and portions) and "Routine care" (everything slower, cadences
 * spelled out). The value is the hero of every tile — 2×, 460 g, Weekly — set
 * large over a soft wash of the item's own hue, the same visual language as
 * the Logs dashboard. When the pets disagree, the tile floor names each
 * animal's number next to its face, and tapping asks which pet first.
 */
export default function CarePage() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated } = useStore();
  const refreshControl = usePullToRefresh();

  const [picked, setPicked] = useState<{ line: PlanLine; entry: PlanEntry; tint: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [openNote, setOpenNote] = useState<string | null>(null);
  // "Which pet?" for a tile whose pets disagree. Values here outlive `open`
  // so the sheet slides away instead of vanishing.
  const [choice, setChoice] = useState<{ line: PlanLine; tint: string; values: string[] } | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const chosenRef = useRef<PlanEntry | null>(null);
  // Hoisted out of the item sheet: two RN Modals cannot be stacked, so each
  // sheet closes and hands its intent up rather than opening the next itself.
  const [timesFor, setTimesFor] = useState<{ pet: Pet; type: ActionType; medId?: string } | null>(null);
  const [timesOpen, setTimesOpen] = useState(false);

  const pets = state.pets;
  const premium = state.premium;

  const chapters = useMemo(() => carePlanDocument(pets, state.schedules, premium), [pets, state.schedules, premium]);
  const daily = chapters.find((c) => c.rhythm === "day");
  const slow = useMemo(() => slowLines(chapters), [chapters]);
  const notes = useMemo(() => (premium ? breedNotes(pets) : []), [pets, premium]);
  const openReminders = state.reminders.filter((r) => !r.done).length;
  const medCount = pets.reduce((n, p) => n + p.meds.length, 0);

  if (!hydrated) {
    return (
      <TabScreen title="Care" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <PageLoading />
      </TabScreen>
    );
  }

  if (pets.length === 0) {
    return (
      <TabScreen title="Care" trailing={<HeaderActions />} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="heart-text"
            title="No pets yet"
            body="Add a pet and its routine, portions and cadences are written here."
            cta="Add a pet"
            onCta={() => router.push("/pet/new")}
          />
        </View>
      </TabScreen>
    );
  }

  const toneFor = (line: PlanLine): { icon: IconName; tint: string; bg: string } => {
    if (line.action) return { ...actionTone(colors, line.action), icon: line.icon };
    const canon = CANON_TONE[line.id];
    return canon
      ? { icon: line.icon, tint: colors[canon.tint], bg: colors[canon.bg] }
      : { icon: line.icon, tint: colors.accent, bg: colors.accentSoft };
  };

  const pick = (line: PlanLine, entry: PlanEntry) => {
    setPicked({ line, entry, tint: toneFor(line).tint });
    setSheetOpen(true);
  };

  /** One item as one tile. */
  const renderLine = (line: PlanLine, rhythmOf: (petId: string) => Rhythm) => {
    const tone = toneFor(line);
    const values = line.entries.map((e) => cadenceLabel(rhythmOf(e.pet.id), e.value));
    const agreed = line.entries.length === 1 || (values.every((v) => v === values[0]) && line.entries.every((e) => e.suggested == null));

    if (agreed) {
      const entry = line.entries[0];
      return (
        <CareStatTile
          key={line.id}
          icon={tone.icon}
          tint={tone.tint}
          bg={tone.bg}
          value={values[0]}
          label={line.label}
          caption={entry.extra}
          own={line.entries.some((e) => e.suggested != null)}
          onPress={() => pick(line, entry)}
        />
      );
    }

    const petValues: TilePetValue[] = line.entries.map((e, i) => ({
      pet: e.pet,
      value: values[i],
      own: e.suggested != null,
    }));
    return (
      <CareStatTile
        key={line.id}
        icon={tone.icon}
        tint={tone.tint}
        bg={tone.bg}
        value={summarize(values)}
        label={line.label}
        petValues={petValues}
        onPress={() => {
          setChoice({ line, tint: tone.tint, values });
          setChoiceOpen(true);
        }}
      />
    );
  };

  /** An odd tile count keeps the last tile at half width. */
  const grid = (tiles: React.ReactNode[]) => (
    <View style={styles.grid}>
      {tiles}
      {tiles.length % 2 === 1 ? <View style={styles.gridFiller} /> : null}
    </View>
  );

  return (
    <TabScreen title="Care" trailing={<HeaderActions />} refreshControl={refreshControl}>
      <NutritionHero pets={pets} />

      {daily ? (
        <View>
          <SectionHeader>Every day</SectionHeader>
          {grid(daily.lines.map((line) => renderLine(line, () => "day")))}
        </View>
      ) : null}

      {slow.length > 0 ? (
        <View>
          <SectionHeader>Routine care</SectionHeader>
          {grid(slow.map(({ line, rhythms }) => renderLine(line, (petId) => rhythms.get(petId) ?? "week")))}
        </View>
      ) : null}

      {notes.length > 0 ? (
        <View>
          <SectionHeader>Breed notes</SectionHeader>
          <Group>
            {notes.map((note) => {
              const isOpen = openNote === note.breed;
              return (
                <PressableScale
                  key={note.breed}
                  onPress={() => setOpenNote(isOpen ? null : note.breed)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`${note.breed} notes`}
                >
                  <View style={styles.note}>
                    <View style={styles.noteHead}>
                      <Text style={styles.noteBreed}>{note.breed}</Text>
                      <Text style={styles.noteToggle}>{isOpen ? "Less" : "More"}</Text>
                    </View>
                    <Text numberOfLines={isOpen ? undefined : 3} style={styles.noteBody}>
                      {note.intro}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </Group>
        </View>
      ) : null}

      <SectionHeader>Guides</SectionHeader>
      <View style={styles.grid}>
        {GUIDES.map((g) => (
          <View key={g.id} style={styles.gridCell}>
            <PageButton label={g.title} tint={g.tint} icon={g.icon} full chevron={false} onPress={() => router.push(`/instructions/${g.id}`)} />
          </View>
        ))}
        {GUIDES.length % 2 === 1 ? <View style={styles.gridFiller} /> : null}
      </View>

      {!premium ? (
        <Group style={styles.upsell}>
          <Row
            leading={<IconCircle icon="sparkles" tint={colors.accent} bg={colors.accentSoft} />}
            title={BRAND_PLUS}
            subtitle={pets.length === 1 ? `A vet-built plan for a ${pets[0].breed}` : "Vet-built plans for each breed"}
            trailing={<Chevron />}
            onPress={() => setPaywallOpen(true)}
          />
        </Group>
      ) : null}

      <SectionHeader>Tasks &amp; tools</SectionHeader>
      <View style={styles.buttons}>
        <PageButton label="Medication" tint={colors.red} icon="pill" count={medCount} full onPress={() => router.push("/medications")} />
        <PageButton label="Inbox" tint={colors.orange} icon="bell" count={openReminders} full onPress={() => router.push("/inbox")} />
        <PageButton label="Find a vet" tint={colors.vetTint} icon="cross" full onPress={() => router.push("/vets")} />
      </View>

      {/* Which pet? — only for tiles whose pets disagree. Closes first, then
          hands the chosen entry to the item sheet (one modal at a time). */}
      {choice ? (
        <Sheet
          open={choiceOpen}
          onClose={() => setChoiceOpen(false)}
          onClosed={() => {
            const entry = chosenRef.current;
            chosenRef.current = null;
            if (entry && choice) pick(choice.line, entry);
          }}
        >
          <SheetTitle>{choice.line.label}</SheetTitle>
          <View style={styles.choiceList}>
            {choice.line.entries.map((entry, i) => (
              <Row
                key={entry.pet.id}
                leading={<PetAvatar pet={entry.pet} size="sm" />}
                title={entry.pet.name}
                trailing={
                  <View style={styles.choiceValueWrap}>
                    <Text style={[styles.choiceValue, entry.suggested != null && { color: colors.accent }]}>{choice.values[i]}</Text>
                    <Chevron />
                  </View>
                }
                onPress={() => {
                  chosenRef.current = entry;
                  setChoiceOpen(false);
                }}
              />
            ))}
          </View>
        </Sheet>
      ) : null}

      {picked ? (
        <CareItemSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          line={picked.line}
          entry={picked.entry}
          tint={picked.tint}
          onSetTimes={() => {
            if (!picked.line.action) return;
            setTimesFor({
              pet: picked.entry.pet,
              type: picked.line.action,
              medId: picked.entry.edit.kind === "med" ? picked.entry.edit.medId : undefined,
            });
            setTimesOpen(true);
          }}
        />
      ) : null}
      {timesFor ? (
        <ScheduleEditorSheet
          pet={timesFor.pet}
          type={timesFor.type}
          medId={timesFor.medId}
          open={timesOpen}
          onClose={() => setTimesOpen(false)}
        />
      ) : null}
      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </TabScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    gridCell: { flexBasis: "47%", flexGrow: 1 },
    gridFiller: { flexBasis: "47%", flexGrow: 1 },

    note: { paddingHorizontal: 16, paddingVertical: 13 },
    noteHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    noteBreed: { fontSize: 15, fontFamily: font.semibold, color: colors.label },
    noteToggle: { fontSize: 13, fontFamily: font.medium, color: colors.accent },
    noteBody: { marginTop: 4, fontSize: 13.5, fontFamily: font.regular, lineHeight: 20, color: colors.label2 },

    buttons: { gap: 8 },
    upsell: { marginTop: 28 },

    choiceList: { marginTop: 10 },
    choiceValueWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
    choiceValue: { fontSize: 15, fontFamily: font.medium, color: colors.label2 },
  });
