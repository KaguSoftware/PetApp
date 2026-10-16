import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { useHousehold, useLogs, useMeds, useNotes, useVaccinations, useVetVisits, useWeights, type Pet } from "@/data";
import { useNow } from "@/components/home/useNow";
import { useReduceMotion } from "@/lib/a11y";
import { Text, spacing } from "@/ui";
import { formAllowed, moreRows, ROW, rootRows, type FormId } from "./careMeta";
import { CareForm } from "./CareForm";
import { careStatus, dateStatus, medsStatus, noteStatus, weightStatus } from "./lastTime";
import { MedsForm } from "./MedsForm";
import { NoteForm } from "./NoteForm";
import { PanelRow } from "./PanelRow";
import { FormHeader } from "./parts";
import { VaccineForm, VetForm } from "./VetForms";
import { WeightForm } from "./WeightForm";

/** hidden: the card is still the + circle growing; shown: rows may appear; closing: everything is leaving. */
export type PanelPhase = "hidden" | "shown" | "closing";
export const PhaseContext = createContext<PanelPhase>("hidden");

/** Card inner padding, the footer band that holds the close button, and the slide distance between levels. */
export const CARD_PAD = spacing.xl;
export const FOOTER = 60;
const SLIDE = 56;
const ROW_STAGGER_MS = 30;
const ROW_MS = 240;
const ROWS_TOTAL_MS = ROW_MS + 8 * ROW_STAGGER_MS;

type Level = { t: "root" } | { t: "more" } | { t: "form"; id: FormId };

interface Item {
  key: number;
  level: Level;
  /** True for the level the panel opened on: it reveals after the morph instead of sliding in. */
  initial: boolean;
  /** +1 slid in from the right (forward), -1 from the left (back). */
  dir: 1 | -1;
  leaving: boolean;
}

const RowsT = createContext<SharedValue<number> | null>(null);

/** One row fading and rising in; `index` sets its place in the 30ms stagger. */
function RowReveal({ index, children }: { index: number; children: ReactNode }) {
  const t = useContext(RowsT);
  const style = useAnimatedStyle(() => {
    const local = t ? Math.min(1, Math.max(0, (t.value * ROWS_TOTAL_MS - index * ROW_STAGGER_MS) / ROW_MS)) : 1;
    const eased = 1 - Math.pow(1 - local, 3);
    return { opacity: eased, transform: [{ translateY: (1 - eased) * 14 }] };
  });
  return t ? <Animated.View style={style}>{children}</Animated.View> : <View>{children}</View>;
}

function FormBody({ pet, id, onDone }: { pet: Pet; id: FormId; onDone: () => void }) {
  switch (id) {
    case "weight":
      return <WeightForm pet={pet} onDone={onDone} />;
    case "meds":
      return <MedsForm pet={pet} onDone={onDone} />;
    case "note":
      return <NoteForm pet={pet} onDone={onDone} />;
    case "vet":
      return <VetForm pet={pet} onDone={onDone} />;
    case "vaccination":
      return <VaccineForm pet={pet} onDone={onDone} />;
    default:
      return <CareForm pet={pet} type={id} onDone={onDone} />;
  }
}

/** One level mounted in the card. Enters from its side, leaves to the other, and stays mounted while leaving so form state survives the slide. */
function LevelItem({ item, rise, onGone, children }: { item: Item; rise: boolean; onGone: (key: number) => void; children: ReactNode }) {
  const reduceMotion = useReduceMotion();
  const phase = useContext(PhaseContext);
  const x = useSharedValue(item.initial || reduceMotion ? 0 : item.dir * SLIDE);
  const y = useSharedValue(item.initial && rise ? 14 : 0);
  const o = useSharedValue(item.initial ? 1 : 0);

  useEffect(() => {
    if (item.initial) return;
    x.set(withSpring(0, { damping: 22, stiffness: 260 }));
    o.set(withTiming(1, { duration: 200 }));
  }, [item.initial, x, o]);

  useEffect(() => {
    if (item.initial && rise && phase === "shown") y.set(withSpring(0, { damping: 20, stiffness: 200 }));
  }, [item.initial, rise, phase, y]);

  useEffect(() => {
    if (!item.leaving) return;
    x.set(withTiming(reduceMotion ? 0 : -item.dir * SLIDE, { duration: 180, easing: Easing.in(Easing.cubic) }));
    o.set(
      withTiming(0, { duration: 150 }, (done) => {
        if (done) runOnJS(onGone)(item.key);
      }),
    );
  }, [item.leaving, item.dir, item.key, reduceMotion, x, o, onGone]);

  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }, { translateY: y.value }] }));
  return (
    <Animated.View pointerEvents={item.leaving ? "none" : "auto"} style={[styles.item, item.leaving && styles.leaving, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * The levels of the panel for one pet: root rows, the More level, and a form pushed in place.
 * Moving between levels slides the old one out and the new one in; the card (PlusPanel)
 * follows the new level's measured height.
 */
export function PanelBody({ pet, initialForm, onDone }: { pet: Pet; initialForm: FormId | null; onDone: () => void }) {
  const now = useNow();
  const { units } = useHousehold();
  const logs = useLogs({ petId: pet.id });
  const weights = useWeights(pet.id);
  const meds = useMeds(pet.id);
  const notes = useNotes(pet.id);
  const visits = useVetVisits(pet.id);
  const vaccinations = useVaccinations(pet.id);
  const phase = useContext(PhaseContext);

  const start: Level = initialForm && formAllowed(pet.species, initialForm) ? { t: "form", id: initialForm } : { t: "root" };
  const [stack, setStack] = useState<Level[]>([start]);
  const [items, setItems] = useState<Item[]>([{ key: 0, level: start, initial: true, dir: 1, leaving: false }]);
  const nextKey = useRef(1);
  const rowsT = useSharedValue(0);
  const busy = phase === "closing" || items.some((i) => i.leaving);

  // The first level's rows stagger in once the card is grown enough.
  useEffect(() => {
    if (phase === "shown" && start.t !== "form") rowsT.set(withTiming(1, { duration: ROWS_TOTAL_MS, easing: Easing.linear }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `start` is fixed for this mount
  }, [phase, rowsT]);

  const gone = useCallback((key: number) => setItems((p) => p.filter((i) => i.key !== key)), []);

  const go = (level: Level, dir: 1 | -1) =>
    setItems((p) => [...p.map((i) => ({ ...i, leaving: true, dir })), { key: nextKey.current++, level, initial: false, dir, leaving: false }]);

  const push = (level: Level) => {
    if (busy) return;
    setStack((s) => [...s, level]);
    go(level, 1);
  };
  // A form opened straight from a deep link has nothing under it: Back lands on the first level.
  const back = () => {
    if (busy) return;
    const target: Level = stack.length > 1 ? stack[stack.length - 2] : { t: "root" };
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ t: "root" }]));
    go(target, -1);
  };

  const status = (id: FormId): string => {
    switch (id) {
      case "weight":
        return weightStatus(weights, units);
      case "meds":
        return medsStatus(meds, logs, now);
      case "note":
        return noteStatus(notes, now);
      case "vet":
        return dateStatus(visits.map((v) => v.date));
      case "vaccination":
        return dateStatus(vaccinations.map((v) => v.date));
      default:
        return careStatus(logs, id, now);
    }
  };

  const rowFor = (id: FormId, index: number) => (
    <RowReveal key={id} index={index}>
      <PanelRow title={ROW[id].title} status={status(id)} icon={ROW[id].icon} onPress={() => push({ t: "form", id })} />
    </RowReveal>
  );

  const footer = (
    <View style={styles.footer}>
      <Text variant="callout" tone="inverse2" numberOfLines={1}>
        {pet.name}
      </Text>
    </View>
  );

  const render = (level: Level): ReactNode => {
    if (level.t === "form") {
      return (
        <View style={[styles.level, styles.formLevel]}>
          <FormHeader title={ROW[level.id].title} onBack={back} />
          <FormBody pet={pet} id={level.id} onDone={onDone} />
        </View>
      );
    }
    if (level.t === "more") {
      const rows = moreRows(pet.species);
      return (
        <View style={styles.level}>
          <FormHeader title="More" onBack={back} />
          <View style={styles.rowsGap} />
          {rows.map(rowFor)}
          {footer}
        </View>
      );
    }
    const rows = rootRows(pet.species);
    return (
      <View style={styles.level}>
        {rows.map(rowFor)}
        <RowReveal index={rows.length}>
          <PanelRow title="More" status="Vet, vaccines, grooming" icon="more" onPress={() => push({ t: "more" })} />
        </RowReveal>
        {footer}
      </View>
    );
  };

  return (
    <>
      {items.map((item) => (
        <LevelItem
          key={item.key}
          item={item}
          rise={item.level.t === "form"}
          onGone={gone}
        >
          <RowsT.Provider value={item.initial && item.level.t !== "form" ? rowsT : null}>{render(item.level)}</RowsT.Provider>
        </LevelItem>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  item: {},
  leaving: { position: "absolute", top: 0, left: 0, right: 0 },
  level: { paddingTop: CARD_PAD, paddingHorizontal: CARD_PAD },
  // Forms end in the Save pill, which shares its line with the close button in the bottom-right 60pt corner.
  formLevel: { gap: spacing.lg, paddingBottom: (FOOTER - 52) / 2 },
  rowsGap: { height: spacing.lg },
  footer: { height: FOOTER, justifyContent: "center" },
});
