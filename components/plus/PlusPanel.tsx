import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHousehold, useLogs, useMeds, useNotes, useVaccinations, useVetVisits, useWeights, type Pet } from "@/data";
import { useNow } from "@/components/home/useNow";
import { useReduceMotion } from "@/lib/a11y";
import { Icon, PressableScale, Text, shadow, radius, spacing, useTheme } from "@/ui";
import { formAllowed, moreRows, ROW, rootRows, type FormId } from "./careMeta";
import { CareForm } from "./CareForm";
import { PLUS_MARGIN, PLUS_SIZE, plusBottom } from "./layout";
import { careStatus, dateStatus, medsStatus, noteStatus, weightStatus } from "./lastTime";
import { MedsForm } from "./MedsForm";
import { NoteForm } from "./NoteForm";
import { PanelRow } from "./PanelRow";
import { FormHeader } from "./parts";
import { VaccineForm, VetForm } from "./VetForms";
import { WeightForm } from "./WeightForm";

type Level = { t: "root" } | { t: "more" } | { t: "form"; id: FormId };

const MAX_WIDTH = 360;
const GAP = 12;

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

/** The levels of the panel for one pet: root rows, the More level, and a form pushed in place. */
function PanelBody({ pet, initialForm, onDone }: { pet: Pet; initialForm: FormId | null; onDone: () => void }) {
  const now = useNow();
  const { units } = useHousehold();
  const logs = useLogs({ petId: pet.id });
  const weights = useWeights(pet.id);
  const meds = useMeds(pet.id);
  const notes = useNotes(pet.id);
  const visits = useVetVisits(pet.id);
  const vaccinations = useVaccinations(pet.id);

  const start: Level = initialForm && formAllowed(pet.species, initialForm) ? { t: "form", id: initialForm } : { t: "root" };
  const [stack, setStack] = useState<Level[]>([start]);
  const view = stack[stack.length - 1];

  const push = (v: Level) => setStack((s) => [...s, v]);
  // A form opened straight from a deep link has nothing under it: Back lands on the first level.
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ t: "root" }]));

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

  const rowFor = (id: FormId) => (
    <PanelRow
      key={id}
      title={ROW[id].title}
      status={status(id)}
      icon={ROW[id].icon}
      buttonLabel={`Add ${ROW[id].title.toLowerCase()}`}
      onPress={() => push({ t: "form", id })}
    />
  );

  if (view.t === "form") {
    return (
      <View style={styles.form}>
        <FormHeader title={ROW[view.id].title} onBack={back} />
        <FormBody pet={pet} id={view.id} onDone={onDone} />
      </View>
    );
  }

  if (view.t === "more") {
    return (
      <View>
        <FormHeader title="More" onBack={back} />
        {moreRows(pet.species).map(rowFor)}
      </View>
    );
  }

  return (
    <View>
      {rootRows(pet.species).map(rowFor)}
      <PanelRow title="More" status="Vet, vaccines, grooming" icon="more" buttonLabel="More options" onPress={() => push({ t: "more" })} />
    </View>
  );
}

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

export interface PlusPanelProps {
  /** The pet everything logs for (the one selected on Home). */
  pet: Pet | undefined;
  /** Open straight at this form (the `step` param). */
  initialForm: FormId | null;
  open: boolean;
  onClose: () => void;
  /** Fires once the exit fade has finished (the route pops here). */
  onClosed: () => void;
}

/**
 * The + panel: a dimmed scrim and an inverted rounded card anchored above where the
 * + button sits. Hosted by the transparent-modal `/log` route, which draws a matching
 * round button (turned into a close) at the + button's exact position.
 */
export function PlusPanel({ pet, initialForm, open, onClose, onClosed }: PlusPanelProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const keyboard = useKeyboardHeight();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) {
      progress.value = withTiming(1, { duration: reduceMotion ? 80 : 160 });
    } else {
      progress.value = withTiming(0, { duration: reduceMotion ? 60 : 140 }, (done) => {
        if (done) runOnJS(onClosed)();
      });
    }
  }, [open, reduceMotion, progress, onClosed]);
  useEffect(() => () => cancelAnimation(progress), [progress]);

  const fade = useAnimatedStyle(() => ({ opacity: progress.value }));
  const rise = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * 16 }],
  }));

  const anchor = plusBottom(insets.bottom);
  const typing = keyboard > 0;
  const cardBottom = typing ? keyboard + GAP : anchor + PLUS_SIZE + GAP;
  const cardWidth = Math.min(MAX_WIDTH, width * 0.85);
  const maxHeight = height - cardBottom - insets.top - spacing.lg;

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, fade]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View
        style={[styles.card, shadow.float, { backgroundColor: colors.inverse, width: cardWidth, bottom: cardBottom, maxHeight }, rise]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.content}
        >
          {pet ? (
            <PanelBody pet={pet} initialForm={initialForm} onDone={onClose} />
          ) : (
            <View style={styles.empty}>
              <Text variant="headline" tone="inverse">
                Add a pet first
              </Text>
              <Text variant="callout" tone="inverse2">
                Then tap + to log their day.
              </Text>
              <PressableScale
                onPress={() => {
                  onClose();
                  router.push("/pet/new");
                }}
                haptic="tap"
                accessibilityRole="button"
                accessibilityLabel="Add pet"
                style={[styles.addPet, { backgroundColor: colors.inverseInk }]}
              >
                <Text variant="headline" style={{ color: colors.inverse }}>
                  Add pet
                </Text>
              </PressableScale>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {typing ? null : (
        <Animated.View pointerEvents="box-none" style={[styles.closeWrap, { bottom: anchor }, fade]}>
          <PressableScale
            onPress={onClose}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.ink }]}
          >
            <Icon name="close" size={28} color={colors.bg} />
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { position: "absolute", right: PLUS_MARGIN, borderRadius: radius.xl, overflow: "hidden" },
  content: { padding: spacing.xl, paddingVertical: spacing.md },
  form: { gap: spacing.lg, paddingVertical: spacing.sm },
  empty: { gap: spacing.sm, paddingVertical: spacing.lg },
  addPet: { height: 50, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  closeWrap: { position: "absolute", right: PLUS_MARGIN },
  close: { width: PLUS_SIZE, height: PLUS_SIZE, borderRadius: PLUS_SIZE / 2, alignItems: "center", justifyContent: "center" },
});
