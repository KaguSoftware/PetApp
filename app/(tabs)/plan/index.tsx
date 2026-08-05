import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import ScheduleEditorSheet from "@/components/ScheduleEditorSheet";
import { TabScreen } from "@/components/Screen";
import CareItemSheet from "@/components/plan/CareItemSheet";
import { Chapter, PageButton, PlanRow, RunIn } from "@/components/plan/Chapter";
import DayRail from "@/components/plan/DayRail";
import TimesPanel from "@/components/plan/TimesPanel";
import { AccentButton } from "@/components/ui";
import { breedNotes, carePlanDocument, dayRailMarks, RHYTHM_LABEL, type PlanEntry, type PlanLine, type Rhythm } from "@/lib/carePlan";
import { CARE_PLANS, type ActionType, type Pet } from "@/lib/data";
import { GUIDES } from "@/lib/guides";
import { energyBasis } from "@/lib/nutrition";
import { useStore } from "@/lib/store";
import { font, useColors, withAlpha, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";

/**
 * Hue means *time* on this page, not category. Once you've learned that the
 * teal chapter is the once-a-year stuff, you stop reading the headings.
 */
const RHYTHM_TINT: Record<Rhythm, keyof Colors> = {
  day: "accent",
  week: "green",
  weeks: "orange",
  year: "vetTint",
};

/** "Leo", "Leo and Milo", "Leo, Milo and Nala" — first names, like a family. */
function join(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Care — a document whose chapters are rhythms.
 *
 * The page used to be a per-pet reference manual behind a picker at the top:
 * pick Milo, scroll nutrition, guides, links, a checklist, a feeding table and
 * a three-level accordion; pick Luna, scroll it all again. Three things changed.
 *
 * It is organised by *when*, not by *what*. Every day, every week, every few
 * weeks, once a year — the axis pet care actually runs on, so an item's chapter
 * tells you as much as its name does.
 *
 * There are no cards, tiles or containers anywhere on it. Labels sit left,
 * values right, hairline rules divide chapters, and the space between them does
 * the work a border used to.
 *
 * And nothing here asks which pet. A value carries the face of the animal it
 * belongs to and is itself the button, so `(Leo) 2×` opens Leo's meals with no
 * question in between. A household of one drops the faces and the page becomes
 * a plain label-and-number document.
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
  // Hoisted out of the item sheet: two RN Modals cannot be stacked, so the
  // sheet closes and hands its intent up rather than opening the editor itself.
  const [timesFor, setTimesFor] = useState<{ pet: Pet; type: ActionType; medId?: string } | null>(null);
  const [timesOpen, setTimesOpen] = useState(false);
  const [timesPanel, setTimesPanel] = useState(false);

  const pets = state.pets;
  const premium = state.premium;

  const chapters = useMemo(() => carePlanDocument(pets, state.schedules, premium), [pets, state.schedules, premium]);
  const days = useMemo(() => dayRailMarks(pets, state.schedules), [pets, state.schedules]);
  const notes = useMemo(() => (premium ? breedNotes(pets) : []), [pets, premium]);
  const kcal = useMemo(() => pets.reduce((sum, p) => sum + energyBasis(p).kcal, 0), [pets]);
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

  const pick = (line: PlanLine, entry: PlanEntry, tint: string) => {
    setPicked({ line, entry, tint });
    setSheetOpen(true);
  };

  const vetNames = pets.filter((p) => CARE_PLANS[p.breed]).map((p) => p.name);
  const ownNames = pets.filter((p) => !CARE_PLANS[p.breed]).map((p) => p.name);
  const solo = pets.length === 1 ? pets[0] : undefined;

  const standfirst = !premium
    ? `The general routine for ${pets.every((p) => p.species === pets[0].species) ? `a ${pets[0].species}` : "a cat and a dog"}.`
    : solo
      ? CARE_PLANS[solo.breed]
        ? `A vet-built plan for a ${solo.breed}.`
        : `Your own targets for ${solo.name}.`
      : ownNames.length === 0
        ? "Vet-built for every pet in the house."
        : vetNames.length === 0
          ? "Your own targets, for all of them."
          : `Vet-built for ${join(vetNames)} · your own targets for ${join(ownNames)}.`;

  return (
    <TabScreen title="Care" trailing={<HeaderActions />} refreshControl={refreshControl}>
      {/* Masthead. The faces that used to sit here were the same faces the rail
          below carries, and there they each own a day rather than just naming
          an animal — one row of pets on the page is enough. */}
      <Text style={styles.standfirst}>{standfirst}</Text>

      {/* The page's opening figure: one rail per pet on a shared clock,
          carrying the icons that used to run down the left edge of every row.
          Always drawn, empty rows included — hiding it when nothing was
          scheduled hid the whole idea from everyone who had never set a time. */}
      <DayRail days={days} tint={colors.accent} now={Date.now()} showFaces={pets.length > 1} />
      <View style={styles.railAction}>
        <PageButton
          label={days.some((d) => d.marks.length > 0) ? "Edit daily times" : "Set daily times"}
          tint={colors.accent}
          icon="clock"
          full
          expanded={timesPanel}
          onPress={() => setTimesPanel((v) => !v)}
        />
        {timesPanel ? (
          <TimesPanel
            pets={pets}
            schedules={state.schedules}
            tint={colors.accent}
            onEdit={(pet, type, medId) => {
              setTimesFor({ pet, type, medId });
              setTimesOpen(true);
            }}
          />
        ) : null}
      </View>

      {chapters.map((chapter) => {
        const tint = colors[RHYTHM_TINT[chapter.rhythm]];
        const density = chapter.rhythm === "day" ? "day" : chapter.rhythm === "week" ? "week" : "runIn";
        return (
          <Chapter key={chapter.rhythm} label={RHYTHM_LABEL[chapter.rhythm]} tint={tint}>
            {density === "runIn" ? (
              <RunIn
                lines={chapter.lines}
                tint={tint}
                onPick={(line, entry) => pick(line, entry, tint)}
                onGuide={(guideId) => router.push(`/instructions/${guideId}`)}
              />
            ) : (
              chapter.lines.map((line) => (
                <PlanRow
                  key={line.id}
                  line={line}
                  tint={tint}
                  density={density}
                  showFaces={pets.length > 1}
                  onPick={(entry) => pick(line, entry, tint)}
                  onGuide={(guideId) => router.push(`/instructions/${guideId}`)}
                />
              ))
            )}
            {chapter.rhythm === "day" ? (
              <View style={styles.chapterAction}>
                <PageButton
                  label={`Nutrition · ${kcal.toLocaleString()} kcal a day`}
                  tint={tint}
                  icon="bowl"
                  full
                  onPress={() =>
                    router.push(pets.length === 1 ? { pathname: "/nutrition", params: { petId: pets[0].id } } : "/nutrition")
                  }
                />
              </View>
            ) : null}
          </Chapter>
        );
      })}

      {/* The upgrade is an endnote, not a wall. Everything above it already
          works; PetPal+ swaps the species defaults for the breed's own numbers,
          which is a claim best made after someone has read their own routine. */}
      {!premium ? (
        <View style={styles.upgrade}>
          <View style={styles.upgradeRule} />
          <Text style={styles.upgradeTitle}>PetPal+</Text>
          <Text style={styles.upgradeBody}>
            Swaps this for a vet-built plan: portions in grams from {solo ? `${solo.name}'s` : "each pet's"} age and weight, the
            cadences {solo ? `a ${solo.breed}` : "each breed"} actually needs, and the vet&apos;s note behind every line.
          </Text>
          <View style={styles.upgradeCta}>
            <AccentButton onPress={() => setPaywallOpen(true)}>Unlock PetPal+</AccentButton>
          </View>
        </View>
      ) : null}

      {notes.length > 0 ? (
        <Chapter label="Notes" tint={colors.label3}>
          {notes.map((note) => {
            const isOpen = openNote === note.breed;
            return (
              <View key={note.breed} style={styles.note}>
                <Text style={styles.noteBreed}>{note.breed}</Text>
                <Text numberOfLines={isOpen ? undefined : 3} style={styles.noteBody}>
                  {note.intro}
                </Text>
                <View style={styles.noteAction}>
                  <PageButton
                    label={isOpen ? "View less" : "View more"}
                    tint={colors.accent}
                    size="sm"
                    chevron={false}
                    onPress={() => setOpenNote(isOpen ? null : note.breed)}
                  />
                </View>
              </View>
            );
          })}
        </Chapter>
      ) : null}

      {/* Guides, as controls rather than as a line of coloured words. Every
          item that has one also links to it from its own row, so this is the
          index rather than the only door. */}
      <Chapter label="Guides" tint={colors.label3}>
        <View style={styles.index}>
          {GUIDES.map((g) => (
            <PageButton
              key={g.id}
              label={g.title}
              tint={g.tint}
              icon={g.icon}
              chevron={false}
              size="sm"
              onPress={() => router.push(`/instructions/${g.id}`)}
            />
          ))}
        </View>
      </Chapter>

      {/* Colophon: the utilities. They belong to Care but they are not rhythms,
          so putting them in a chapter would be a tile board wearing a rule. As
          the last thing on the page they have to look like the exits they are. */}
      <View style={styles.colophon}>
        <PageButton label="Medication" tint={colors.red} icon="pill" count={medCount} full onPress={() => router.push("/medications")} />
        <PageButton
          label="Inbox"
          tint={colors.orange}
          icon="bell"
          count={openReminders}
          full
          onPress={() => router.push("/inbox")}
        />
        <PageButton label="Find a vet" tint={colors.vetTint} icon="cross" full onPress={() => router.push("/vets")} />
      </View>

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
    standfirst: { marginTop: 10, maxWidth: 340, fontSize: 15, fontFamily: font.regular, lineHeight: 22, color: colors.label2 },
    railAction: { marginTop: 18 },
    chapterAction: { marginTop: 16 },

    upgrade: { marginTop: 36 },
    upgradeRule: { height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(colors.accent, 0.3) },
    upgradeTitle: { marginTop: 18, fontSize: 20, fontFamily: font.bold, letterSpacing: -0.35, color: colors.accent },
    upgradeBody: { marginTop: 8, maxWidth: 360, fontSize: 14.5, fontFamily: font.regular, lineHeight: 22, color: colors.label2 },
    upgradeCta: { marginTop: 20 },

    note: { paddingTop: 14 },
    noteBreed: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
    noteBody: { marginTop: 3, fontSize: 13.5, fontFamily: font.regular, lineHeight: 20, color: colors.label2 },
    noteAction: { marginTop: 10, alignSelf: "flex-start" },

    index: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 12 },

    colophon: {
      marginTop: 36,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.sep,
      gap: 8,
    },
  });
