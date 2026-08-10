import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import EmptyState from "@/components/EmptyState";
import FeedPortionSheet from "@/components/FeedPortionSheet";
import HeaderActions from "@/components/HeaderActions";
import { Icon } from "@/components/Icons";
import PageLoading from "@/components/PageLoading";
import { TabScreen } from "@/components/Screen";
import StreakCalendarSheet from "@/components/StreakCalendarSheet";
import Welcome from "@/components/Welcome";
import AheadPeek from "@/components/home/AheadPeek";
import LeverTiles from "@/components/home/LeverTiles";
import PetStageRow from "@/components/home/PetStageRow";
import QuickRow from "@/components/home/QuickRow";
import { Chapter, PageButton } from "@/components/plan/Chapter";
import { PressableScale } from "@/components/ui";
import { useReduceMotion } from "@/lib/a11y";
import type { Pet } from "@/lib/data";
import { homeModel, type PetTask } from "@/lib/home";
import { useStore } from "@/lib/store";
import { font, radius, useColors, type Colors } from "@/lib/theme";
import { usePullToRefresh } from "@/lib/useRefresh";
import { useGooeyBump, useGooeyGlow } from "@/lib/useGooeyBump";

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
 * Home — the household's front page. The animals ARE the page.
 *
 * The stage leads: one card per pet, portrait in a day-progress ring, a mood
 * line, the pet most in need tinted and auto-selected. Below it, the selected
 * animal's day as rows you can act on in place; then the family's own one-tap
 * logs, a peek at what is written down for later, and something to read.
 *
 * Nothing here duplicates a neighbour. The ring and the rows are readings of
 * the same lever summaries Logs, Care and Inbox read — computed once in
 * `homeModel` — so a state can't say "late" here and "due" one tab over.
 */
export default function Home() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated, logAction } = useStore();
  const refreshControl = usePullToRefresh();
  const reduceMotion = useReduceMotion();

  const [streakOpen, setStreakOpen] = useState(false);
  // Sheet targets outlive `open` so the panel can slide away instead of
  // unmounting mid-dismiss and vanishing.
  const [feedFor, setFeedFor] = useState<Pet | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);

  // States flip on time passing alone: a slot goes from "due" to "late" with
  // nobody touching the screen. Same 60s tick the Inbox and the Logs dashboard
  // run on, so the three can't disagree about what o'clock it is.
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

  const model = useMemo(
    () => homeModel(state.pets, state.schedules, state.activities, state.reminders, now),
    [state.pets, state.schedules, state.activities, state.reminders, now]
  );

  // null = "follow the neediest". Until the user picks a card, selection
  // derives from the model, so it is right on first render and after every
  // tick; after a tap it is pinned and never jumps under the user.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId =
    selectedId != null && model.cards.some((c) => c.pet.id === selectedId)
      ? selectedId
      : (model.neediestId ?? model.cards[0]?.pet.id);
  const selectedCard = model.cards.find((c) => c.pet.id === effectiveSelectedId);

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
            body="Add your first pet and this page becomes the household's day: who is fed, who is behind, and who needs you next."
            cta="Add a pet"
            onCta={() => router.push("/pet/new")}
          />
        </View>
        <Welcome />
      </TabScreen>
    );
  }

  /** A task row's button. Feed needs a portion and meds a medicine, so those
   *  two are a sheet and a door; the rest log in place and return true so the
   *  row can flash. */
  const runTask = (pet: Pet, task: PetTask): boolean => {
    if (task.action.kind === "feed") {
      setFeedFor(pet);
      setFeedOpen(true);
      return false;
    }
    if (task.action.kind === "route") {
      router.push(task.action.href);
      return false;
    }
    return logAction(pet.id, task.type);
  };

  return (
    <TabScreen title="Home" subtitle={greeting} trailing={trailing} refreshControl={refreshControl}>
      <PetStageRow
        cards={model.cards}
        selectedId={effectiveSelectedId}
        reduceMotion={reduceMotion}
        onSelect={setSelectedId}
      />

      {selectedCard ? (
        <LeverTiles
          // Re-keyed so switching pets replays the enter animation.
          key={selectedCard.pet.id}
          card={selectedCard}
          reduceMotion={reduceMotion}
          onTask={(task) => runTask(selectedCard.pet, task)}
          onOpenPet={() => openPet(selectedCard.pet)}
        />
      ) : null}

      <Chapter label="One tap" tint={colors.label3}>
        <QuickRow />
      </Chapter>

      {/* What the family has written down for later. Alerts the app raised
          float to the top of it; the queue itself lives in the Inbox. */}
      <Chapter label="Ahead" tint={colors.label3}>
        <AheadPeek items={model.ahead} count={model.openReminders} onOpen={() => router.push("/inbox")} />
      </Chapter>

      {/* Colophon: the three doors off this page, as the exits they are. */}
      <View style={styles.colophon}>
        <PageButton label="Log care" tint={colors.accent} icon="check" full onPress={() => router.push("/logs")} />
        <PageButton label="The routine" tint={colors.green} icon="heart-text" full onPress={() => router.push("/plan")} />
        <PageButton label="Your pets" tint={colors.label2} icon="paw" full onPress={() => router.push("/pets")} />
      </View>

      {feedFor ? <FeedPortionSheet pet={feedFor} open={feedOpen} onClose={() => setFeedOpen(false)} /> : null}

      <StreakCalendarSheet open={streakOpen} onClose={() => setStreakOpen(false)} />

      <Welcome />
    </TabScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
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
