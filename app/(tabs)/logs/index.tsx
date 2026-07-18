import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import EmptyState from "@/components/EmptyState";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import HeaderActions from "@/components/HeaderActions";
import { FadeInItem } from "@/components/Motion";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon } from "@/components/Icons";
import {
  AccentButton,
  Chevron,
  FieldLabel,
  Group,
  PressableScale,
  Row,
  SectionHeader,
  Segmented,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { ACTIONS, CARE_PLANS, type ActionType } from "@/lib/data";
import { ALERT_VERB, useStore } from "@/lib/store";
import { cardShadow, colors, font, radius } from "@/lib/theme";

/** TextField forwards every prop to TextInput; React 19 delivers `ref` as a
 *  regular prop, so this alias just teaches the types about it. */

const CAT_ACTIONS: ActionType[] = ["fed", "water", "litter", "groomed", "meds", "vet"];
const DOG_ACTIONS: ActionType[] = ["fed", "water", "walk", "groomed", "meds", "vet"];

const ALERT_VERB_TYPES = Object.keys(ALERT_VERB) as ActionType[];
const CARE_WARNING_EMOJI: Partial<Record<string, ActionType>> = { "🍖": "fed", "💧": "water", "🧹": "litter", "🦮": "walk" };

/** "+5" coin pill that floats up and fades from the tapped tile (~600ms). */
function CoinPop() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.25, 1], [0, 1, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -34]) },
      { scale: interpolate(t.value, [0, 0.25, 1], [0.6, 1.1, 1]) },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.coinPop, style]}>
      <Text style={styles.coinPopLabel}>+5</Text>
    </Animated.View>
  );
}

export default function LogsScreen() {
  const { state, hydrated, logAction, addVetVisit, toast } = useStore();
  const router = useRouter();
  const [petId, setPetId] = useState("");
  const [justLogged, setJustLogged] = useState<ActionType | null>(null);
  const [feedPortionOpen, setFeedPortionOpen] = useState(false);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [retroOpen, setRetroOpen] = useState(false);
  const [retroType, setRetroType] = useState<ActionType | null>(null);
  const [retroDay, setRetroDay] = useState<"today" | "yesterday">("today");
  const [retroTime, setRetroTime] = useState("");
  const [vetDetailOpen, setVetDetailOpen] = useState(false);
  const [vetReason, setVetReason] = useState("");
  const [vetClinic, setVetClinic] = useState("");
  const vetClinicRef = useRef<TextInput>(null);
  const prevDayDoneRef = useRef<{ petId: string; done: boolean } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const activePetId = petId || state.pets[0]?.id || "";
  const pet = state.pets.find((p) => p.id === activePetId) ?? state.pets[0];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todays = useMemo(
    () => (pet ? state.activities.filter((a) => a.petId === pet.id && a.ts >= startOfDay.getTime()) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.activities, pet?.id]
  );

  // "All caught up today" — fires once when the SELECTED pet's day flips to
  // complete via a log action.
  useEffect(() => {
    if (!pet) return;
    const plan = CARE_PLANS[pet.breed];
    const planItems = plan?.items.filter((i) => i.perDay && i.action) ?? [];
    const dayDone =
      state.premium && plan
        ? planItems.length > 0 &&
          planItems.every((item) => todays.filter((a) => a.type === item.action).length >= (item.perDay ?? 1))
        : todays.filter((a) => a.type === "fed").length >= (plan?.items.find((i) => i.action === "fed")?.perDay ?? 2);
    const prev = prevDayDoneRef.current;
    if (prev && prev.petId === pet.id && !prev.done && dayDone) {
      toast("star", "All caught up today!", `${pet.name}'s care is all done for today`);
    }
    prevDayDoneRef.current = { petId: pet.id, done: dayDone };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todays, pet?.id, state.premium]);

  if (!hydrated)
    return (
      <TabScreen title="Logs" subtitle="Log care · everyone's notified" trailing={<HeaderActions />}>
        <PageLoading />
      </TabScreen>
    );
  if (!pet) {
    return (
      <TabScreen title="Logs" subtitle="Log care · everyone's notified" trailing={<HeaderActions />}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="list"
            title="No pets yet"
            body="Add your first pet to start logging care."
            cta="Add a pet"
            onCta={() => router.push("/pets")}
          />
        </View>
      </TabScreen>
    );
  }

  const actions = pet.species === "cat" ? CAT_ACTIONS : DOG_ACTIONS;

  const flash = (type: ActionType) => {
    setJustLogged(type);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setJustLogged(null), 700);
  };

  const successHaptic = () => {
    if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Parsed "HH:MM" from the retro sheet — null while incomplete/invalid.
  const parsedRetroTime = (() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(retroTime.trim());
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
    return { hh, mm };
  })();
  // Timestamp for the retro-log sheet — null while incomplete or in the future.
  const retroTs = () => {
    if (!parsedRetroTime) return null;
    const d = new Date();
    if (retroDay === "yesterday") d.setDate(d.getDate() - 1);
    d.setHours(parsedRetroTime.hh, parsedRetroTime.mm, 0, 0);
    const ts = d.getTime();
    return ts > Date.now() ? null : ts;
  };

  // Every outstanding alert type for this pet — drives the red "!" badge on the
  // matching log box.
  const careWarnings = new Set(
    state.reminders
      .filter((r) => r.alert && !r.done && r.petId === pet.id)
      .flatMap((r): ActionType[] => {
        if (!r.vetId) {
          const t = CARE_WARNING_EMOJI[r.emoji];
          return t ? [t] : [];
        }
        const t = ALERT_VERB_TYPES.find((t) => r.title.includes(ALERT_VERB[t]!));
        return t ? [t, "vet"] : ["vet"];
      })
  );

  return (
    <TabScreen
      title="Logs"
      subtitle="Log care · everyone's notified"
      trailing={<HeaderActions />}
    >
      {state.pets.length > 1 ? (
        <PressableScale onPress={() => setPetPickerOpen(true)} accessibilityRole="button" style={{ marginTop: 12 }}>
          <View style={styles.petSwitcher}>
            <Text style={styles.petSwitcherName}>{pet.name}</Text>
            <Chevron />
          </View>
        </PressableScale>
      ) : null}

      <Sheet open={petPickerOpen} onClose={() => setPetPickerOpen(false)}>
        <View style={{ marginBottom: 12 }}>
          <SheetTitle>Switch pet</SheetTitle>
        </View>
        <Group>
          {state.pets.map((p) => (
            <Row
              key={p.id}
              onPress={() => {
                setPetId(p.id);
                setPetPickerOpen(false);
              }}
              leading={<PetAvatar pet={p} size="sm" />}
              title={p.name}
              subtitle={p.breed}
              trailing={p.id === pet.id ? <Icon name="check" size={18} color={colors.accent} /> : undefined}
            />
          ))}
        </Group>
      </Sheet>

      {/* Log care grid — the whole point of this tab */}
      <SectionHeader>Log care</SectionHeader>
      <View style={styles.grid}>
        {actions.map((type, ti) => {
          const a = ACTION_ICON[type];
          const flashing = justLogged === type;
          const warning = !flashing && careWarnings.has(type);
          return (
            <FadeInItem key={type} index={ti} style={styles.tileWrap}>
            <PressableScale
              haptic
              accessibilityRole="button"
              onPress={() => {
                if (type === "fed") {
                  setFeedPortionOpen(true);
                  return;
                }
                if (logAction(pet.id, type)) {
                  flash(type);
                  // A vet tap naturally produces a health-history record — offer
                  // the details right away, skippable.
                  if (type === "vet") {
                    setVetReason("");
                    setVetClinic("");
                    setVetDetailOpen(true);
                  }
                }
              }}
            >
              <View style={styles.tile}>
                {flashing ? <CoinPop /> : null}
                {warning ? (
                  <View style={styles.warningBadge} accessibilityLabel={`${ACTIONS[type].label} warning`}>
                    <Icon name="alert" size={14} color={colors.red} />
                  </View>
                ) : null}
                <View style={[styles.tileIcon, { backgroundColor: flashing ? colors.green : a.bg }]}>
                  {flashing ? <Icon name="check" size={24} color={colors.white} /> : <Icon name={a.icon} size={24} color={a.tint} />}
                </View>
                <Text style={styles.tileLabel}>{type === "meds" && pet.meds.length === 0 ? "No meds" : ACTIONS[type].label}</Text>
              </View>
            </PressableScale>
            </FadeInItem>
          );
        })}
      </View>

      <PressableScale
        onPress={() => {
          setRetroType(null);
          setRetroDay("today");
          setRetroTime("");
          setRetroOpen(true);
        }}
        accessibilityRole="button"
        style={{ marginTop: 16, alignSelf: "flex-start" }}
      >
        <View style={styles.retroLink}>
          <Icon name="clock" size={13} color={colors.accent} />
          <Text style={styles.retroLinkLabel}>Forgot to log something earlier?</Text>
        </View>
      </PressableScale>

      <Text style={styles.footnote}>
        Every action is shared with the family and shows up in Activity. Tap the bell any time to see what everyone&apos;s been up to.
      </Text>

      <Sheet open={retroOpen} onClose={() => setRetroOpen(false)}>
        <SheetTitle>Log an earlier action</SheetTitle>
        <SheetSubtitle>For {pet.name} — backfill something you forgot</SheetSubtitle>

        <FieldLabel>What happened</FieldLabel>
        <View style={styles.chipsWrap}>
          {actions
            .filter((t) => !(t === "meds" && pet.meds.length === 0))
            .map((type) => {
              const a = ACTION_ICON[type];
              const active = retroType === type;
              return (
                <SelectableChip
                  key={type}
                  label={ACTIONS[type].label}
                  selected={active}
                  onPress={() => setRetroType(type)}
                  leading={<Icon name={a.icon} size={14} color={active ? colors.white : colors.label} />}
                />
              );
            })}
        </View>

        <FieldLabel>When</FieldLabel>
        <Segmented
          options={[
            { value: "today", label: "Earlier today" },
            { value: "yesterday", label: "Yesterday" },
          ]}
          value={retroDay}
          onChange={setRetroDay}
        />
        <TextField
          value={retroTime}
          onChangeText={setRetroTime}
          placeholder="HH:MM — e.g. 14:30"
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          style={{ marginTop: 10 }}
        />

        <SheetFooter>
          <AccentButton
            disabled={!retroType || !parsedRetroTime}
            onPress={() => {
              const ts = retroTs();
              if (!retroType) return;
              if (ts == null) {
                toast("alert", "That time hasn't happened yet", "Pick a time in the past");
                return;
              }
              if (logAction(pet.id, retroType, undefined, ts)) {
                successHaptic();
                setRetroOpen(false);
              }
            }}
          >
            Log it
          </AccentButton>
        </SheetFooter>
      </Sheet>

      <Sheet open={vetDetailOpen} onClose={() => setVetDetailOpen(false)}>
        <SheetTitle>Add visit details?</SheetTitle>
        <SheetSubtitle>Saved to {pet.name}&apos;s health history — skip if it was nothing</SheetSubtitle>

        <FieldLabel>Reason</FieldLabel>
        <TextField
          value={vetReason}
          onChangeText={setVetReason}
          placeholder="e.g. Annual checkup, vaccination…"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => vetClinicRef.current?.focus()}
        />

        <FieldLabel>Vet or clinic (optional)</FieldLabel>
        <TextField
          ref={vetClinicRef}
          value={vetClinic}
          onChangeText={setVetClinic}
          placeholder="e.g. Dr. Weber, Happy Paws Clinic"
          returnKeyType="done"
        />

        <SheetFooter>
          <View style={{ gap: 10 }}>
            <AccentButton
              disabled={!vetReason.trim() && !vetClinic.trim()}
              onPress={() => {
                addVetVisit(pet.id, { ts: Date.now(), reason: vetReason.trim() || undefined, vetName: vetClinic.trim() || undefined });
                successHaptic();
                setVetDetailOpen(false);
                toast("stethoscope", "Visit saved", `${pet.name}'s health history updated`);
              }}
            >
              Save details
            </AccentButton>
            <AccentButton variant="gray" onPress={() => setVetDetailOpen(false)}>
              Skip
            </AccentButton>
          </View>
        </SheetFooter>
      </Sheet>

      <FeedPortionSheet
        pet={pet}
        open={feedPortionOpen}
        onClose={() => setFeedPortionOpen(false)}
        onLogged={() => {
          successHaptic();
          flash("fed");
        }}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  petSwitcher: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 },
  petSwitcherName: { fontSize: 18, fontFamily: font.semibold, color: colors.label },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  // 2 columns → 3 rows for the 6 care actions; wider tiles give each label room.
  tileWrap: { flexBasis: "47%", flexGrow: 1 },
  tile: {
    // Icon centered at the top, label centered beneath it (2-col roomy layout).
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingVertical: 20,
    paddingHorizontal: 12,
    ...cardShadow,
  },
  tileIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label, textAlign: "center" },
  coinPop: {
    position: "absolute",
    right: 8,
    top: 4,
    zIndex: 10,
    borderRadius: radius.full,
    backgroundColor: colors.orangeSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  coinPopLabel: { fontSize: 12, fontFamily: font.bold, color: colors.orange },
  warningBadge: { position: "absolute", right: 8, top: 8, zIndex: 10 },
  retroLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 },
  retroLinkLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  footnote: { marginTop: 4, paddingHorizontal: 4, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 20 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
