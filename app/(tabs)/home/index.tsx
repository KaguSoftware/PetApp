import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import EmptyState from "@/components/EmptyState";
import EditStatSheet from "@/components/EditStatSheet";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import HeaderActions from "@/components/HeaderActions";
import { Icon } from "@/components/Icons";
import PageLoading from "@/components/PageLoading";
import PetAvatar from "@/components/PetAvatar";
import { TabScreen } from "@/components/Screen";
import StreakCalendarSheet from "@/components/StreakCalendarSheet";
import Welcome from "@/components/Welcome";
import Endnote from "@/components/home/Endnote";
import PetChapter from "@/components/home/PetChapter";
import QuickRow from "@/components/home/QuickRow";
import TodayRail from "@/components/home/TodayRail";
import { Chapter, PageButton } from "@/components/plan/Chapter";
import { PressableScale } from "@/components/ui";
import { formatAge, formatWeight, kgToUnit, unitToKg, weightUnitLabel, type ActionType, type Pet } from "@/lib/data";
import { homeDocument, type LedeKind } from "@/lib/home";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";
import { useGooeyBump, useGooeyGlow } from "@/lib/useGooeyBump";

/**
 * Hue means urgency on this page, and only the lede is allowed to be hot. Care
 * spends colour on rhythm and Inbox on horizon because those pages are read
 * end to end; Home is read in three seconds standing at the kitchen counter, so
 * exactly one thing gets to shout and the rest of the document stays grey.
 */
const LEDE_TINT: Record<LedeKind, keyof Colors> = {
  overdue: "red",
  due: "orange",
  open: "accent",
  clear: "green",
};

/** Compact day-streak pill for the Home header (flame + count). */
function StreakPill({ streak, onPress }: { streak: number; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Same liquid bump as the coin pill — extending a streak is an earn, so it
  // gets identical feedback. Shared hook keeps the two pills in step.
  const { style: anim } = useGooeyBump(streak, "streak");
  const glow = useGooeyGlow(streak, "streak");
  return (
    <PressableScale haptic onPress={onPress} accessibilityRole="button" accessibilityLabel={`${streak} day streak`}>
      <View style={styles.streakPillWrap}>
        <Animated.View pointerEvents="none" style={[styles.streakGlow, glow]} />
        <Animated.View style={[styles.streakPill, anim]}>
          <Icon name="flame" size={14} color={colors.orange} />
          {/* One line, always — see the matching note on CoinPill. */}
          <Text style={styles.streakPillLabel} numberOfLines={1}>
            {streak}
          </Text>
        </Animated.View>
      </View>
    </PressableScale>
  );
}

/**
 * Home — the household's front page.
 *
 * What it replaced was a stack of six containers: a shadowed hero card with a
 * carousel inside it, a strip of coloured supply pills, a red alert banner, a
 * two-column grid of shadowed shortcut tiles, a grouped list of reminders with
 * an avatar down the left of every row, and a trivia card. Six vocabularies,
 * three separate icon columns, one flat type scale, and — because the hero
 * paged one animal at a time — no way to see a two-pet household at once.
 *
 * It is a document now, in the vocabulary Care and Inbox already share, with
 * the axis Home alone needs: its chapters are the animals. Reading down the
 * page you get one sentence of state, then the one thing that needs doing with
 * the face of whoever needs it, then the family's own one-tap logs, then the
 * day so far on a single clock, then a section per pet, then what is written
 * down for later, and finally something to read. Rules divide chapters and
 * nothing else; spacing separates the rows. The only filled, rounded things on
 * screen are buttons.
 *
 * Nothing here duplicates a neighbour. The rail shows *when* things happened;
 * the pet sections show *what state* each lever is in; Inbox owns the queue and
 * Logs owns the doing, and both are one button away at the foot of the page.
 */
export default function Home() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated, addWeight, editPet, logAction, toast } = useStore();
  const refreshControl = usePullToRefresh();

  const [streakOpen, setStreakOpen] = useState(false);
  // Sheet targets outlive `open` so the panel can slide away instead of
  // unmounting mid-dismiss and vanishing.
  const [editing, setEditing] = useState<{ pet: Pet; stat: "weight" | "age" } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [feedFor, setFeedFor] = useState<Pet | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);

  // States flip on time passing alone: a slot goes from "ahead" to "missed"
  // with nobody touching the screen. Same 60s tick the Inbox and the Logs
  // dashboard run on, so the three can't disagree about what o'clock it is.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Spam-tap guard: without it every tap in a fast burst fires its own push
  // before the first transition starts, stacking several `/pet/[id]` screens.
  // Unlocked whenever Home regains focus.
  const navLock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      navLock.current = false;
    }, [])
  );
  const openPet = (pet: Pet) => {
    if (navLock.current) return;
    navLock.current = true;
    router.push(`/pet/${pet.id}`);
  };

  const doc = useMemo(
    () => homeDocument(state.pets, state.schedules, state.activities, state.reminders, state.units, now),
    [state.pets, state.schedules, state.activities, state.reminders, state.units, now]
  );

  const me = state.members.find((m) => m.id === state.currentMemberId);
  const hour = new Date().getHours();
  const greeting = `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}${me ? `, ${me.name}` : ""}`;
  const trailing = <HeaderActions showCoins leading={<StreakPill streak={state.streak} onPress={() => setStreakOpen(true)} />} />;

  if (!hydrated) {
    return (
      <TabScreen title="Home" subtitle={greeting} trailing={trailing} refreshControl={refreshControl}>
        <PageLoading />
      </TabScreen>
    );
  }

  if (state.pets.length === 0) {
    return (
      <TabScreen title="Home" subtitle={greeting} trailing={trailing} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="paw"
            title="No pets yet"
            body="Add your first pet and this page becomes the household's day: what's been done, what's late, and who needs you next."
            cta="Add a pet"
            onCta={() => router.push("/pet/new")}
          />
        </View>
        <Welcome />
      </TabScreen>
    );
  }

  const ledeTint = colors[LEDE_TINT[doc.lede.kind]];

  /** The lede's single button. Two of the seven levers need more than a tap
   *  (a portion, which medicine), so those are a door and the rest act here. */
  const runLede = () => {
    const action = doc.lede.action;
    if (!action) return;
    if (action.kind === "route") {
      router.push(action.href);
      return;
    }
    if (action.kind === "feed") {
      setFeedFor(action.pet);
      setFeedOpen(true);
      return;
    }
    logAction(action.pet.id, action.type);
  };

  /** A care line's value logs that lever, for that pet, right there. */
  const pressLine = (pet: Pet, type: ActionType) => {
    if (type === "fed") {
      setFeedFor(pet);
      setFeedOpen(true);
      return;
    }
    if (type === "meds" || type === "vet") {
      router.push("/logs");
      return;
    }
    logAction(pet.id, type);
  };

  const edit = (pet: Pet, stat: "weight" | "age") => {
    setEditing({ pet, stat });
    setEditOpen(true);
  };

  return (
    <TabScreen title="Home" subtitle={greeting} trailing={trailing} refreshControl={refreshControl}>
      <Text style={styles.standfirst}>{doc.standfirst}</Text>

      {/* The lede. One thing, one sentence, one button — and the animal it is
          about, because the answer to "who needs me" should be a face rather
          than a name in a list. */}
      <Chapter label={doc.lede.kicker} tint={ledeTint}>
        <View style={styles.lede}>
          <View style={styles.ledeText}>
            <Text style={[styles.headline, doc.lede.kind === "overdue" && { color: colors.red }]}>{doc.lede.headline}</Text>
            {doc.lede.detail ? <Text style={styles.ledeDetail}>{doc.lede.detail}</Text> : null}
          </View>
          {doc.lede.pet ? (
            <PressableScale
              onPress={() => openPet(doc.lede.pet!)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${doc.lede.pet.name}`}
              hitSlop={6}
              overflowsBounds
            >
              <PetAvatar pet={doc.lede.pet} size="lg" idle />
            </PressableScale>
          ) : null}
        </View>
        {doc.lede.action ? (
          <View style={styles.ledeAction}>
            {/* A chevron means you leave the page. The two levers that need
                more than a tap (which portion, which medicine) are a door; the
                rest are done from here and get a tick instead. */}
            <PageButton
              label={doc.lede.action.label}
              tint={ledeTint}
              icon={doc.lede.action.kind === "route" ? "list" : "check"}
              chevron={doc.lede.action.kind === "route"}
              onPress={runLede}
            />
          </View>
        ) : null}
      </Chapter>

      {/* The page's figure: every pet's day on one clock, under one now-line.
          It sits directly under the lede rather than below the shortcuts,
          because a household with nothing pinned would otherwise get a block of
          teaching prose between the two things it opened the app to see. */}
      <Chapter label="Today so far" tint={colors.label3}>
        <TodayRail days={doc.days} now={now} showFaces={state.pets.length > 1} onPressPet={openPet} />
      </Chapter>

      <Chapter label="One tap" tint={colors.label3}>
        <QuickRow />
      </Chapter>

      {doc.sections.map((section, i) => (
        <PetChapter
          key={section.pet.id}
          section={section}
          first={i === 0}
          onOpenPet={() => openPet(section.pet)}
          onEditAge={() => edit(section.pet, "age")}
          onEditWeight={() => edit(section.pet, "weight")}
          onPressLine={(type) => pressLine(section.pet, type)}
        />
      ))}

      {/* What the family has written down for later. Alerts the app raised
          float to the top of it; the queue itself lives in the Inbox. */}
      <Chapter label="Ahead" tint={colors.label3}>
        {doc.ahead.length === 0 ? (
          <Text style={styles.aheadEmpty}>Nothing written down. Anything the family shouldn&apos;t forget goes in the inbox.</Text>
        ) : (
          doc.ahead.map((item) => (
            <PressableScale
              key={item.id}
              onPress={() => router.push("/inbox")}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}${item.who ? `, ${item.who}` : ""}, ${item.when}`}
            >
              <View style={styles.aheadRow}>
                <Text numberOfLines={1} style={styles.aheadLabel}>
                  {item.label}
                  {item.who ? <Text style={styles.aheadWho}> {item.who}</Text> : null}
                </Text>
                <Text
                  style={[
                    styles.aheadWhen,
                    item.tint === "late" && { color: colors.red },
                    item.tint === "warn" && { color: colors.orange },
                  ]}
                >
                  {item.when}
                </Text>
              </View>
            </PressableScale>
          ))
        )}
        <View style={styles.aheadAction}>
          <PageButton
            label="Inbox"
            tint={colors.accent}
            icon="bell"
            count={doc.openReminders}
            size="sm"
            onPress={() => router.push("/inbox")}
          />
        </View>
      </Chapter>

      <Chapter label="Notes" tint={colors.label3}>
        <Endnote pets={state.pets} />
      </Chapter>

      {/* Colophon: the three doors off this page, as the exits they are. */}
      <View style={styles.colophon}>
        <PageButton label="Log care" tint={colors.accent} icon="check" full onPress={() => router.push("/logs")} />
        <PageButton label="The routine" tint={colors.green} icon="heart-text" full onPress={() => router.push("/plan")} />
        <PageButton label="Your pets" tint={colors.label2} icon="paw" full onPress={() => router.push("/pets")} />
      </View>

      {editing ? (
        editing.stat === "weight" ? (
          <EditStatSheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            title={`${editing.pet.name}'s weight`}
            label={`Weight (${weightUnitLabel(state.units)})`}
            min={0.1}
            max={state.units === "lb" ? 260 : 120}
            unit={weightUnitLabel(state.units)}
            initialValue={kgToUnit(editing.pet.weightKg, state.units)}
            onSave={(v) => {
              const kg = unitToKg(v, state.units);
              addWeight(editing.pet.id, kg);
              toast("scale", `${editing.pet.name}'s weight updated`, formatWeight(kg, state.units));
            }}
          />
        ) : (
          <EditStatSheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            title={`${editing.pet.name}'s age`}
            label="Age (years)"
            min={0}
            max={30}
            unit="yr"
            initialValue={editing.pet.ageYears}
            onSave={(ageYears) => {
              // Typing an age switches the pet back to approximate-age mode — a
              // stored birth date would otherwise silently win on next load.
              editPet(editing.pet.id, {
                name: editing.pet.name,
                breed: editing.pet.breed,
                ageYears,
                weightKg: editing.pet.weightKg,
                cupGrams: editing.pet.cupGrams,
                ...(editing.pet.birthDate != null ? { birthDate: null } : {}),
              });
              toast("calendar", `${editing.pet.name}'s age updated`, formatAge(ageYears));
            }}
          />
        )
      ) : null}

      {feedFor ? <FeedPortionSheet pet={feedFor} open={feedOpen} onClose={() => setFeedOpen(false)} /> : null}

      <StreakCalendarSheet open={streakOpen} onClose={() => setStreakOpen(false)} />

      <Welcome />
    </TabScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    standfirst: { marginTop: 10, maxWidth: 360, fontSize: 15, fontFamily: font.regular, lineHeight: 22, color: colors.label2 },

    lede: { paddingTop: 14, flexDirection: "row", alignItems: "center", gap: 16 },
    ledeText: { flex: 1, minWidth: 0 },
    // The page's largest type after the title. It is a sentence, not a metric:
    // a number here would tell you a quantity instead of a thing to do.
    headline: { fontSize: 27, fontFamily: font.bold, letterSpacing: -0.6, lineHeight: 32, color: colors.label },
    ledeDetail: { marginTop: 6, fontSize: 14.5, fontFamily: font.regular, color: colors.label2 },
    ledeAction: { marginTop: 18, alignSelf: "flex-start" },

    aheadRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44, paddingVertical: 5 },
    aheadLabel: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: font.medium, letterSpacing: -0.2, color: colors.label },
    aheadWho: { fontFamily: font.regular, color: colors.label3 },
    aheadWhen: { fontSize: 14.5, fontFamily: font.semibold, color: colors.label2 },
    aheadEmpty: { paddingTop: 12, maxWidth: 360, fontSize: 14.5, fontFamily: font.regular, lineHeight: 21, color: colors.label2 },
    aheadAction: { marginTop: 14, alignSelf: "flex-start" },

    colophon: { marginTop: 36, paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.sep, gap: 8 },

    streakPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: colors.orangeSoft,
    },
    streakPillLabel: { fontSize: 14, fontFamily: font.bold, color: colors.orange },
    // Untransformed wrapper so the glow scales independently of the pill's
    // squash — see the matching pair on CoinPill in components/ui.tsx.
    streakPillWrap: { position: "relative" },
    // Flush, not inset — the native header clips outside its bounds. See the
    // matching coinGlow note in components/ui.tsx.
    streakGlow: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: radius.full,
      backgroundColor: colors.orange,
      opacity: 0,
    },
  });
