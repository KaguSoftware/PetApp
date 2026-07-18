import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import EmptyState from "@/components/EmptyState";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import NotificationBell from "@/components/NotificationBell";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import { TabScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon } from "@/components/Icons";
import { AccentButton, Chevron, CoinPill, Group, Row, SectionHeader, Segmented } from "@/components/ui";
import { ACTIONS, CARE_PLANS, type ActionType } from "@/lib/data";
import { ALERT_VERB, useStore } from "@/lib/store";
import { colors, font, radius } from "@/lib/theme";

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
      <TabScreen title="Logs" subtitle="Log care · everyone's notified" trailing={<NotificationBell />}>
        <PageLoading />
      </TabScreen>
    );
  if (!pet) {
    return (
      <TabScreen title="Logs" subtitle="Log care · everyone's notified" trailing={<NotificationBell />}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="list"
            title="No pets yet"
            body="Add your first pet to start logging care."
            cta="Add a pet"
            onCta={() => router.push("/(tabs)/pets")}
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
      trailing={
        <>
          <CoinPill amount={state.coins} />
          <NotificationBell />
        </>
      }
    >
      {state.pets.length > 1 ? (
        <Pressable onPress={() => setPetPickerOpen(true)} style={({ pressed }) => [styles.petSwitcher, pressed && { opacity: 0.6 }]}>
          <Text style={styles.petSwitcherName}>{pet.name}</Text>
          <Chevron />
        </Pressable>
      ) : null}

      <Sheet open={petPickerOpen} onClose={() => setPetPickerOpen(false)}>
        <Text style={[styles.sheetTitle, { marginBottom: 12, paddingHorizontal: 4 }]}>Switch pet</Text>
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
        {actions.map((type) => {
          const a = ACTION_ICON[type];
          const flashing = justLogged === type;
          const warning = !flashing && careWarnings.has(type);
          return (
            <Pressable
              key={type}
              onPress={() => {
                if (type === "fed") {
                  setFeedPortionOpen(true);
                  return;
                }
                if (logAction(pet.id, type)) {
                  if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              {flashing ? <CoinPop /> : null}
              {warning ? (
                <View style={styles.warningBadge} accessibilityLabel={`${ACTIONS[type].label} warning`}>
                  <Icon name="alert" size={14} color={colors.red} />
                </View>
              ) : null}
              <View style={[styles.tileIcon, { backgroundColor: flashing ? colors.green : a.bg }]}>
                {flashing ? <Icon name="check" size={18} color={colors.white} /> : <Icon name={a.icon} size={19} color={a.tint} />}
              </View>
              <Text style={styles.tileLabel}>{type === "meds" && pet.meds.length === 0 ? "No meds" : ACTIONS[type].label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          setRetroType(null);
          setRetroDay("today");
          setRetroTime("");
          setRetroOpen(true);
        }}
        style={({ pressed }) => [styles.retroLink, pressed && { opacity: 0.6 }]}
      >
        <Icon name="clock" size={13} color={colors.accent} />
        <Text style={styles.retroLinkLabel}>Forgot to log something earlier?</Text>
      </Pressable>

      <Text style={styles.footnote}>
        Every action is shared with the family and shows up in Activity. Tap the bell any time to see what everyone&apos;s been up to.
      </Text>

      <Sheet open={retroOpen} onClose={() => setRetroOpen(false)}>
        <Text style={styles.sheetTitle}>Log an earlier action</Text>
        <Text style={styles.sheetSubtitle}>For {pet.name} — backfill something you forgot</Text>

        <Text style={styles.fieldLabel}>WHAT HAPPENED</Text>
        <View style={styles.chipsWrap}>
          {actions
            .filter((t) => !(t === "meds" && pet.meds.length === 0))
            .map((type) => {
              const a = ACTION_ICON[type];
              const active = retroType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setRetroType(type)}
                  style={({ pressed }) => [styles.actionChip, active && styles.actionChipActive, pressed && { transform: [{ scale: 0.96 }] }]}
                >
                  <Icon name={a.icon} size={14} color={active ? colors.white : colors.label} />
                  <Text style={[styles.actionChipLabel, active && { color: colors.white }]}>{ACTIONS[type].label}</Text>
                </Pressable>
              );
            })}
        </View>

        <Text style={styles.fieldLabel}>WHEN</Text>
        <Segmented
          options={[
            { value: "today", label: "Earlier today" },
            { value: "yesterday", label: "Yesterday" },
          ]}
          value={retroDay}
          onChange={setRetroDay}
        />
        <TextInput
          value={retroTime}
          onChangeText={setRetroTime}
          placeholder="HH:MM — e.g. 14:30"
          placeholderTextColor={colors.label3}
          keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
          style={[styles.input, { marginTop: 10 }]}
        />

        <View style={{ marginTop: 28 }}>
          <AccentButton
            disabled={!retroType || !parsedRetroTime}
            onPress={() => {
              const ts = retroTs();
              if (!retroType) return;
              if (ts == null) {
                toast("alert", "That time hasn't happened yet", "Pick a time in the past");
                return;
              }
              if (logAction(pet.id, retroType, undefined, ts)) setRetroOpen(false);
            }}
          >
            Log it
          </AccentButton>
        </View>
      </Sheet>

      <Sheet open={vetDetailOpen} onClose={() => setVetDetailOpen(false)}>
        <Text style={styles.sheetTitle}>Add visit details?</Text>
        <Text style={styles.sheetSubtitle}>Saved to {pet.name}&apos;s health history — skip if it was nothing</Text>

        <Text style={styles.fieldLabel}>REASON</Text>
        <TextInput
          value={vetReason}
          onChangeText={setVetReason}
          placeholder="e.g. Annual checkup, vaccination…"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>VET OR CLINIC (OPTIONAL)</Text>
        <TextInput
          value={vetClinic}
          onChangeText={setVetClinic}
          placeholder="e.g. Dr. Weber, Happy Paws Clinic"
          placeholderTextColor={colors.label3}
          style={styles.input}
        />

        <View style={{ marginTop: 28, gap: 10 }}>
          <AccentButton
            disabled={!vetReason.trim() && !vetClinic.trim()}
            onPress={() => {
              addVetVisit(pet.id, { ts: Date.now(), reason: vetReason.trim() || undefined, vetName: vetClinic.trim() || undefined });
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
      </Sheet>

      <FeedPortionSheet
        pet={pet}
        open={feedPortionOpen}
        onClose={() => setFeedPortionOpen(false)}
        onLogged={() => {
          if (Platform.OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          flash("fed");
        }}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  petSwitcher: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 },
  petSwitcherName: { fontSize: 18, fontFamily: font.semibold, color: colors.label },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "30%",
    flexGrow: 1,
    alignItems: "flex-start",
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: 14,
    shadowColor: "#3a3945",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tileIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
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
  retroLink: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, minHeight: 44 },
  retroLinkLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.accent },
  footnote: { marginTop: 4, paddingHorizontal: 4, fontSize: 13, fontFamily: font.regular, color: colors.label2, lineHeight: 20 },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  sheetSubtitle: { marginTop: 2, fontSize: 13, fontFamily: font.regular, color: colors.label2 },
  fieldLabel: { marginTop: 20, marginBottom: 6, fontSize: 13, fontFamily: font.semibold, letterSpacing: 0.8, color: colors.label2 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#3a3945",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  actionChipActive: { backgroundColor: colors.accent },
  actionChipLabel: { fontSize: 14, fontFamily: font.semibold, color: colors.label },
  input: {
    width: "100%",
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: font.medium,
    color: colors.label,
  },
});
