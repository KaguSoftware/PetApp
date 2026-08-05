import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import ActivityRow from "@/components/ActivityRow";
import EmptyState from "@/components/EmptyState";
import FilterSheet from "@/components/FilterSheet";
import { Icon } from "@/components/Icons";
import { FadeInItem } from "@/components/Motion";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import AddReminderSheet from "@/components/inbox/AddReminderSheet";
import InboxRow, { DoneRow } from "@/components/inbox/InboxRow";
import InboxSummary from "@/components/inbox/InboxSummary";
import { Chapter, PageButton } from "@/components/plan/Chapter";
import { Group, IconCircle } from "@/components/ui";
import { dayKey, nextRepeatDue, type Activity } from "@/lib/data";
import { HORIZON_LABEL, inboxDocument, type Horizon } from "@/lib/inbox";
import { dueLabel, useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";
import { useListFilter } from "@/lib/useListFilter";
import { usePullToRefresh } from "@/lib/useRefresh";

const isIOS = Platform.OS === "ios";

/**
 * Hue means *when* here, the way it means *how often* on the Care page. Red is
 * the chapter that has already happened to you; everything below it cools as it
 * moves further out, so the top of the page is the only part that can shout.
 */
const HORIZON_TINT: Record<Horizon, keyof Colors> = {
  now: "red",
  today: "orange",
  tomorrow: "accent",
  week: "green",
  later: "label3",
};

/**
 * Inbox — notifications and reminders, finally the same page.
 *
 * They were two screens answering half a question each. `/activity` was the
 * bell: alerts the app raised, then a feed of what the family had done.
 * `/reminders` was the list the family wrote for itself. Both sorted by time,
 * both keyed by pet, both said "overdue" — and neither could show the third
 * thing that actually pings a phone, the care schedules the Logs tab sets and
 * `lib/notifications.ts` has always merged with reminders before scheduling.
 * `lib/inbox.ts` now does that merge once, and this page is its document.
 *
 * The build follows the two pages this app already got right, each where it is
 * strongest. Everything still AHEAD of you is the Care page's document: chapters
 * by horizon rather than by rhythm, hairline rules, label left and time right,
 * no cards. Everything BEHIND you is the Logs tab's timeline, verbatim — the
 * same `ActivityRow`, day-grouped, paged. And the state language is the
 * dashboard's throughout: the same clock strings, the same tone colours, the
 * same faces with the same rings, so a thing reads here exactly as it does on
 * the tile it came from.
 */
export default function InboxScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated, toggleReminder, deleteReminder, dismissAllAlerts, undoLogAction, toast } = useStore();
  const refreshControl = usePullToRefresh();

  // `?new=1` opens the add sheet on arrival, so a caller that means "write one
  // down" lands on the form rather than on the list with the real target still
  // a tap away in the header.
  const { new: openNew } = useLocalSearchParams<{ new?: string }>();
  const [addOpen, setAddOpen] = useState(openNew === "1");
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [visible, setVisible] = useState(40);
  const filter = useListFilter();

  // Horizons flip on time passing alone — a "today" item becomes a "needs you
  // now" one with nobody touching the screen. Same 60s tick as the dashboard.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Reset paging whenever the filter narrows/widens the feed, so "Show more"
  // doesn't sit on a stale offset into the unfiltered list.
  useEffect(() => {
    setVisible(40);
  }, [filter.petId, filter.types, filter.range, filter.tags]);

  const doc = useMemo(
    () =>
      inboxDocument(state.reminders, state.pets, state.schedules, state.activities, now, {
        petId: filter.petId,
        types: filter.types,
        tags: filter.tags,
      }),
    [state.reminders, state.pets, state.schedules, state.activities, now, filter.petId, filter.types, filter.tags]
  );

  // ONE wrapper view, never a fragment: `react-native-screens` hit-tests only
  // the first `headerRight` subview it finds, so sibling controls returned side
  // by side leave all but one of them dead (see HANDOFF, round 5).
  const headerTrailing = (
    <View style={styles.headerIsland}>
      <Pressable
        onPress={() => setFilterOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Filter inbox"
        hitSlop={6}
        style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
      >
        <Icon name="filter" size={isIOS ? 22 : 17} color={isIOS ? colors.accent : colors.white} />
        {filter.activeCount > 0 ? <View style={styles.filterDot} /> : null}
      </Pressable>
      {/* Plain Pressable with an opacity dim, NOT PressableScale: this renders
          inside the native header's UIBarButtonItem, where a spring-scale
          transform clips against the bar item's bounds mid-animation. */}
      <Pressable
        onPress={() => setAddOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add reminder"
        hitSlop={6}
        style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
      >
        <Icon name="plus" size={isIOS ? 25 : 17} color={isIOS ? colors.accent : colors.white} />
      </Pressable>
    </View>
  );

  if (!hydrated) {
    return (
      <PushedScreen title="Inbox" trailing={headerTrailing} refreshControl={refreshControl}>
        <PageLoading />
      </PushedScreen>
    );
  }

  if (state.pets.length === 0) {
    return (
      <PushedScreen title="Inbox" trailing={headerTrailing} refreshControl={refreshControl}>
        <View style={{ marginTop: 16 }}>
          <EmptyState
            icon="bell"
            title="No pets yet"
            body="Add a pet and everything the family is asked to do lands here."
            cta="Add a pet"
            onCta={() => router.push("/pet/new")}
          />
        </View>
      </PushedScreen>
    );
  }

  const petById = (id: string) => state.pets.find((p) => p.id === id);

  const complete = (reminderId: string) => {
    const r = state.reminders.find((x) => x.id === reminderId);
    if (!r) return;
    toggleReminder(r.id);
    if (r.done) toast("refresh", `Reopened: ${r.title}`, "Marked as not done");
    else if (r.repeatKind)
      toast("repeat", `Done: ${r.title}`, `Next ${dueLabel(nextRepeatDue(r.due, r.repeatKind, r.repeatInterval))}`);
    else toast("check", `Done: ${r.title}`, "Marked complete for the family");
  };

  // The family feed — the past half of the page, and the Logs tab's timeline
  // exactly as it is there, so the same log can't read two ways in two places.
  const feed = [...state.activities]
    .filter((a) => filter.petId == null || a.petId === filter.petId)
    .filter((a) => filter.types.size === 0 || filter.types.has(a.type))
    .filter((a) => filter.range === "all" || a.ts >= filter.rangeCutoff)
    .sort((a, b) => b.ts - a.ts);
  const feedGroups: { day: string; items: Activity[] }[] = [];
  for (const a of feed.slice(0, visible)) {
    const day = dayKey(a.ts);
    const g = feedGroups[feedGroups.length - 1];
    if (g && g.day === day) g.items.push(a);
    else feedGroups.push({ day, items: [a] });
  }

  const extraTags = Array.from(new Set(state.reminders.map((r) => r.tag).filter((t): t is string => !!t)));
  const nothingOpen = doc.chapters.length === 0;

  return (
    <PushedScreen title="Inbox" trailing={headerTrailing} refreshControl={refreshControl}>
      <Text style={styles.standfirst}>
        Everything the family is being asked to do — alerts, reminders and the care times everyone gets pinged about.
      </Text>

      <InboxSummary
        doc={doc}
        pets={state.pets}
        now={now}
        selectedPetId={filter.petId}
        onSelectPet={filter.setPetId}
        onClearAlerts={dismissAllAlerts}
      />

      {nothingOpen ? (
        <View style={styles.clear}>
          <IconCircle icon="check" tint={colors.green} bg={colors.greenSoft} size={48} iconSize={22} />
          <Text style={styles.clearTitle}>{filter.activeCount > 0 ? "Nothing matches" : "All clear"}</Text>
          <Text style={styles.clearBody}>
            {filter.activeCount > 0
              ? "Nothing fits these filters — try resetting them."
              : "No alerts, no reminders due, nothing scheduled in the next two days."}
          </Text>
        </View>
      ) : (
        doc.chapters.map((chapter) => (
          <Chapter key={chapter.horizon} label={HORIZON_LABEL[chapter.horizon]} tint={colors[HORIZON_TINT[chapter.horizon]]}>
            {chapter.items.map((item, i) => (
              <InboxRow
                key={item.id}
                item={item}
                last={i === chapter.items.length - 1}
                expanded={expandedId === item.id}
                onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onComplete={item.reminder ? () => complete(item.reminder!.id) : undefined}
                onDelete={item.reminder ? () => deleteReminder(item.reminder!.id) : undefined}
                onOpenPet={(petId) => router.push(`/pet/${petId}`)}
                onOpenVets={() => router.push("/vets")}
                onOpenLogs={() => router.push("/logs")}
              />
            ))}
          </Chapter>
        ))
      )}

      {/* Completed reminders, folded away. They are the only thing on the page
          that is finished, and a finished thing shouldn't cost a scroll. */}
      {doc.done.length > 0 ? (
        <Chapter label="Done" tint={colors.label3}>
          <View style={styles.doneAction}>
            <PageButton
              label={showDone ? "Hide completed" : `${doc.done.length} completed`}
              tint={colors.label2}
              icon="check"
              chevron={false}
              size="sm"
              onPress={() => setShowDone((v) => !v)}
            />
          </View>
          {showDone
            ? doc.done.map((r, i) => (
                <DoneRow
                  key={r.id}
                  title={r.title}
                  petName={petById(r.petId)?.name}
                  onReopen={() => complete(r.id)}
                  last={i === doc.done.length - 1}
                />
              ))
            : null}
        </Chapter>
      ) : null}

      {/* The past half. Same rows as the Logs tab's timeline — including its
          tap-your-own-log-to-undo — so a log reads the same wherever it's read. */}
      <Chapter label="What everyone did" tint={colors.label3}>
        {feedGroups.length === 0 ? (
          <Text style={styles.feedEmpty}>
            {filter.activeCount > 0
              ? "Nothing fits these filters."
              : "Nothing logged yet — care logged from the Logs tab shows up here for the whole family."}
          </Text>
        ) : (
          <View style={styles.feed}>
            {feedGroups.map((g, gi) => (
              <FadeInItem key={g.day} index={gi}>
                <Text style={styles.feedDay}>{g.day}</Text>
                <Group>
                  {g.items.map((a) => {
                    const pet = petById(a.petId);
                    // A pet that moved in from another household brings its
                    // history but not the card that logged it (`members` RLS
                    // hides it), so a missing member is normal; a missing pet
                    // is not, and there is nothing to name.
                    if (!pet) return null;
                    return (
                      <ActivityRow
                        key={a.id}
                        activity={a}
                        pet={pet}
                        member={state.members.find((m) => m.id === a.memberId)}
                        isYou={a.memberId === state.currentMemberId}
                        expanded={expandedId === a.id}
                        onToggleExpand={() => setExpandedId(expandedId === a.id ? null : a.id)}
                        onUndo={undoLogAction}
                      />
                    );
                  })}
                </Group>
              </FadeInItem>
            ))}
          </View>
        )}
        {visible < feed.length ? (
          <View style={styles.doneAction}>
            <PageButton label="Show more" tint={colors.accent} icon="chevron-down" chevron={false} size="sm" onPress={() => setVisible((v) => v + 40)} />
          </View>
        ) : null}
      </Chapter>

      {/* Colophon: where the things on this page are actually set. Both were
          buried before — the times behind a tile's corner chip, the toggles
          three taps into Settings. */}
      <View style={styles.colophon}>
        <PageButton label="Set care times" tint={colors.accent} icon="clock" full onPress={() => router.push("/logs")} />
        <PageButton
          label="Notification settings"
          tint={colors.label2}
          icon="gear"
          full
          onPress={() => router.push("/settings/general")}
        />
      </View>

      <AddReminderSheet open={addOpen} onClose={() => setAddOpen(false)} pets={state.pets} />
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filter={filter}
        pets={state.pets}
        showRange
        showTypes
        showTags
        extraTags={extraTags}
      />
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    standfirst: { marginTop: 10, maxWidth: 360, fontSize: 15, fontFamily: font.regular, lineHeight: 22, color: colors.label2 },

    headerIsland: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerButton: {
      // iPhone: chromeless 38pt glyph box (matches the bell/gear header metrics).
      // Android: 36pt accent circle (visual + hitSlop → 44pt+ effective target).
      width: isIOS ? 38 : 36,
      height: isIOS ? 38 : 36,
      alignItems: "center",
      justifyContent: "center",
      ...(isIOS
        ? null
        : {
            borderRadius: 18,
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }),
    },
    filterDot: { position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },

    clear: { alignItems: "center", paddingHorizontal: 24, paddingTop: 40, paddingBottom: 12 },
    clearTitle: { marginTop: 12, fontSize: 17, fontFamily: font.semibold, color: colors.label },
    clearBody: { marginTop: 4, maxWidth: 280, fontSize: 13.5, fontFamily: font.regular, lineHeight: 20, color: colors.label2, textAlign: "center" },

    doneAction: { marginTop: 14, alignSelf: "flex-start" },

    feed: { paddingTop: 6, gap: 4 },
    feedDay: { marginTop: 10, marginBottom: 6, fontSize: 12.5, fontFamily: font.semibold, letterSpacing: 0.2, color: colors.label3 },
    feedEmpty: { paddingTop: 12, fontSize: 13.5, fontFamily: font.regular, lineHeight: 20, color: colors.label2 },

    colophon: {
      marginTop: 36,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.sep,
      gap: 8,
    },
  });
