import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import { Icon } from "@/components/Icons";
import { TabScreen, TAB_BAR_HEIGHT, type TabScrollHandle } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import { Chevron, Group, IconCircle, PressableScale, Row, Segmented, SheetSubtitle, SheetTitle, TextField } from "@/components/ui";
import { countryByCode } from "@/lib/countries";
import {
  fetchMessages,
  getGlobalRoom,
  getOrCreateLocalRoom,
  sendMessage,
  subscribeToRoom,
  type ChatMessage,
  type ChatRoom,
} from "@/lib/chat";
import {
  blockUser,
  censorText,
  containsProhibitedContent,
  fetchBlockedUsers,
  isModerationUnavailable,
  reportMessage,
  REPORT_REASONS,
  type ReportReason,
} from "@/lib/moderation";
import { useStore } from "@/lib/store";
import { cardShadow, font, radius, useColors, type Colors } from "@/lib/theme";

type Tab = "global" | "local";

/** Compact relative time — "just now", "5m", "3h", "2d", else a date. */
function relativeTime(ts: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MessageBubble({ message, mine, onLongPress }: { message: ChatMessage; mine: boolean; onLongPress?: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <Pressable
        android_ripple={null}
        onLongPress={onLongPress}
        disabled={!onLongPress}
        accessibilityHint={onLongPress ? "Long-press for report and block options" : undefined}
        style={({ pressed }) => [styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, pressed && !!onLongPress && { opacity: 0.7 }]}
      >
        {!mine && message.authorMemberName ? <Text style={styles.bubbleAuthor}>{message.authorMemberName}</Text> : null}
        <Text style={[styles.bubbleBody, mine && styles.bubbleBodyMine]}>{censorText(message.body)}</Text>
      </Pressable>
      <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{relativeTime(message.createdAt)}</Text>
    </View>
  );
}

/**
 * Rides the composer on top of the keyboard: it lifts to sit just above the
 * keys while typing and drops back to its resting spot above the tab bar when
 * the keyboard goes down.
 *
 * NOT `KeyboardAvoidingView`. With `behavior="padding"` it composes its own
 * `paddingBottom` OVER the style it's handed, so the tab-bar allowance this bar
 * needs was replaced by `0` for as long as the keyboard was down — which is
 * exactly what left the input sunk underneath the tab bar. Same JS-measured
 * approach as `useKeyboardInset` in Screen.tsx, for the same reason: the frame
 * events are app-wide, so the bar always lands back at rest.
 *
 * iOS only. Android resizes the window instead, which carries the tab bar and
 * this bar up together — lifting there would double-count.
 *
 * @param restingBottom Distance from the window bottom to the bar when the
 *   keyboard is down (safe area + tab bar + gap).
 * @returns The transform style to apply on top of that resting padding.
 */
function useComposerLift(restingBottom: number) {
  const { height: windowH } = useWindowDimensions();
  const lift = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    // Negative moves up; clamped at 0 so an undocked/floating keyboard (which
    // can cover less than the tab bar does) never pushes the bar back down.
    const settle = (overlap: number, duration: number) => {
      lift.value = withTiming(Math.min(0, restingBottom - overlap - KEYBOARD_GAP), {
        // UIKit reports the keyboard's own animation duration in ms; it can
        // arrive as 0 for a non-animated frame change, so floor it.
        duration: duration > 10 ? duration : 250,
        easing: Easing.out(Easing.ease),
      });
    };
    const onFrame = Keyboard.addListener("keyboardWillChangeFrame", (e) => {
      // `screenY` is the keyboard's top edge; everything below it is covered.
      // A mid-gesture interactive dismiss can report a partial frame, hence the
      // finite guard.
      const overlap = windowH - e.endCoordinates.screenY;
      settle(Number.isFinite(overlap) ? Math.max(0, overlap) : 0, e.duration ?? 0);
    });
    const onHide = Keyboard.addListener("keyboardDidHide", () => {
      lift.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    });
    return () => {
      onFrame.remove();
      onHide.remove();
    };
  }, [lift, restingBottom, windowH]);

  return useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
}

export default function Community() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { state, hydrated, toast } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("global");
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<TabScrollHandle | null>(null);
  // Set when a send lands; consumed by onContentSizeChange so the scroll fires
  // only after the new bubble has actually laid out (scrolling immediately
  // would target the OLD content height and stop one message short).
  const scrollPendingRef = useRef(false);
  const composerBottom = insets.bottom + INPUT_BOTTOM;
  const composerLift = useComposerLift(composerBottom);

  // Moderation: authors this user has blocked, messages reported this session
  // (hidden immediately so "report" visibly does something), and the long-press
  // action sheet's target + stage.
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  const [choosingReason, setChoosingReason] = useState(false);
  const reportBusyRef = useRef(false);

  const currentMember = state.members.find((m) => m.id === state.currentMemberId);
  const currentUserId = state.accounts.find((a) => a.memberId === currentMember?.id)?.userId;

  const loadRoom = useCallback(
    async (nextTab: Tab) => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      setRoom(null);
      setMessages(null);
      try {
        const r = nextTab === "global" ? await getGlobalRoom() : state.country ? await getOrCreateLocalRoom(state.country) : null;
        if (!r) {
          setMessages([]);
          return;
        }
        setRoom(r);
        const rows = await fetchMessages(r.id);
        setMessages(rows);
        unsubscribeRef.current = subscribeToRoom(r.id, (m) => {
          setMessages((prev) => (prev && !prev.some((p) => p.id === m.id) ? [...prev, m] : prev));
        });
      } catch (e) {
        console.error("[petpal] chat room load failed:", e);
        setMessages([]);
        toast("alert", "Couldn't load chat", "Pull to refresh to try again");
      }
    },
    [state.country, toast]
  );

  useFocusEffect(
    useCallback(() => {
      loadRoom(tab);
      return () => {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, state.country])
  );

  // Refreshed on every focus so an unblock made in Settings › Account takes
  // effect the moment the user comes back to the tab. Pre-0041 backends (or a
  // transient failure) just leave the set as-is — nothing extra is hidden.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchBlockedUsers()
        .then((rows) => {
          if (!cancelled) setBlockedIds(new Set(rows.map((r) => r.userId)));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const changeTab = (t: Tab) => setTab(t);

  const closeActions = () => {
    setActionTarget(null);
    setChoosingReason(false);
  };

  const submitReport = async (reason: ReportReason) => {
    const target = actionTarget;
    if (!target || reportBusyRef.current) return;
    reportBusyRef.current = true;
    try {
      await reportMessage(target, reason);
      setHiddenIds((prev) => new Set(prev).add(target.id));
      closeActions();
      toast("check", "Report received", "We review reports within 24 hours");
    } catch (e) {
      closeActions();
      toast(
        "alert",
        "Couldn't send the report",
        isModerationUnavailable(e) ? "Reporting goes live with the next backend update" : "Please try again"
      );
    } finally {
      reportBusyRef.current = false;
    }
  };

  const confirmBlock = () => {
    const target = actionTarget;
    if (!target) return;
    const name = target.authorMemberName ?? "this pet owner";
    Alert.alert(`Block ${name}?`, "You won't see their messages in Community anymore. You can unblock them in Settings › Account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser({ userId: target.authorUserId, memberName: target.authorMemberName });
            setBlockedIds((prev) => new Set(prev).add(target.authorUserId));
            closeActions();
            toast("check", `Blocked ${name}`, "Their messages are now hidden");
          } catch (e) {
            closeActions();
            toast(
              "alert",
              "Couldn't block",
              isModerationUnavailable(e) ? "Blocking goes live with the next backend update" : "Please try again"
            );
          }
        },
      },
    ]);
  };

  const submit = async () => {
    const body = draft.trim();
    if (!body || !room || !state.familyId || sending) return;
    if (containsProhibitedContent(body)) {
      toast("alert", "Message not sent", "This message contains language that isn't permitted in the community. Please revise it and try again.");
      return;
    }
    setSending(true);
    setDraft("");
    try {
      const message = await sendMessage({ roomId: room.id, householdId: state.familyId, memberName: currentMember?.name ?? null, body });
      setMessages((prev) => (prev && !prev.some((p) => p.id === message.id) ? [...prev, message] : prev));
      scrollPendingRef.current = true;
      // Consumed by onContentSizeChange once the new bubble lays out. Fallback
      // for when the realtime echo already delivered the message (dedup → no
      // size change fires): by then the list is at full height, so a late
      // scrollToEnd is correct.
      setTimeout(() => {
        if (scrollPendingRef.current) {
          scrollPendingRef.current = false;
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      }, 150);
    } catch (e) {
      console.error("[petpal] chat send failed:", e);
      toast("alert", "Couldn't send", "That message didn't go through");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const localCountryLabel = state.country ? (countryByCode(state.country)?.name ?? state.country) : null;

  const visibleMessages = messages?.filter((m) => !blockedIds.has(m.authorUserId) && !hiddenIds.has(m.id)) ?? null;
  const targetName = actionTarget?.authorMemberName ?? "this pet owner";

  return (
    <TabScreen
      title="Community"
      subtitle="Chat with pet owners everywhere"
      trailing={<HeaderActions />}
      contentBottomPad={88}
      scrollRef={scrollRef}
      // Fires whenever the feed grows — including the just-sent bubble landing.
      // Scrolling here (not right after setMessages) waits for the new content
      // height, so scrollToEnd actually reaches the new message.
      onContentSizeChange={() => {
        if (scrollPendingRef.current) {
          scrollPendingRef.current = false;
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      }}
      // The composer tracks the keyboard itself (useComposerLift), so a
      // drag-to-dismiss that only lands at the end of the gesture keeps the two
      // in step — `interactive` would slide the keyboard out from under a bar
      // that hasn't moved yet.
      keyboardDismissMode="on-drag"
      overlay={
        <Animated.View
          style={[styles.inputWrap, { paddingBottom: composerBottom }, composerLift]}
          pointerEvents="box-none"
        >
          <View style={styles.inputBar}>
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder={tab === "global" ? "Message everyone…" : localCountryLabel ? `Message ${localCountryLabel}…` : "Set a country first"}
              editable={!!room}
              style={styles.inputField}
              returnKeyType="send"
              onSubmitEditing={submit}
            />
            <PressableScale
              onPress={submit}
              disabled={!draft.trim() || !room || sending}
              accessibilityRole="button"
              accessibilityLabel="Send"
            >
              <View style={[styles.sendButton, (!draft.trim() || !room || sending) && styles.sendButtonDisabled]}>
                <Icon name="arrow-up" size={16} color={colors.white} />
              </View>
            </PressableScale>
          </View>
        </Animated.View>
      }
    >
      <View style={styles.segmentWrap}>
        <Segmented
          options={[
            { value: "global", label: "Global" },
            { value: "local", label: "Local" },
          ]}
          value={tab}
          onChange={changeTab}
        />
      </View>

      {tab === "local" && !state.country ? (
        <View style={{ marginTop: 8 }}>
          <EmptyState
            icon="pin"
            title="Set your country"
            body="Local chat groups you with other pet owners in your country. Set it in Settings to join."
            cta="Set country"
            onCta={() => router.push("/settings/account")}
          />
        </View>
      ) : !hydrated || visibleMessages === null ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : visibleMessages.length === 0 ? (
        <View style={{ marginTop: 8 }}>
          <EmptyState
            icon="people"
            title={tab === "global" ? "No messages yet" : `No messages from ${localCountryLabel} yet`}
            body="Be the first to say hello."
          />
        </View>
      ) : (
        <View style={styles.feed}>
          {visibleMessages.map((m) => {
            const mine = m.authorUserId === currentUserId;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                mine={mine}
                onLongPress={mine ? undefined : () => setActionTarget(m)}
              />
            );
          })}
        </View>
      )}

      <Sheet open={!!actionTarget} onClose={closeActions}>
        {choosingReason ? (
          <>
            <SheetTitle>Report message</SheetTitle>
            <SheetSubtitle>Tell us what&apos;s wrong. Reports are reviewed within 24 hours and offending content is removed.</SheetSubtitle>
            <Group style={styles.actionsGroup}>
              {REPORT_REASONS.map((r) => (
                <Row key={r.value} title={r.label} onPress={() => submitReport(r.value)} trailing={<Chevron />} />
              ))}
            </Group>
          </>
        ) : (
          <>
            <SheetTitle>Message options</SheetTitle>
            {actionTarget ? (
              <View style={styles.quoteCard}>
                {actionTarget.authorMemberName ? <Text style={styles.quoteAuthor}>{actionTarget.authorMemberName}</Text> : null}
                <Text style={styles.quoteBody} numberOfLines={3}>
                  {censorText(actionTarget.body)}
                </Text>
              </View>
            ) : null}
            <Group style={styles.actionsGroup}>
              <Row
                leading={<IconCircle icon="alert" tint={colors.orange} bg={colors.orangeSoft} />}
                title="Report message"
                subtitle="Flag it as offensive or inappropriate"
                onPress={() => setChoosingReason(true)}
                trailing={<Chevron />}
              />
              <Row
                leading={<IconCircle icon="shield" tint={colors.red} bg={colors.redSoft} />}
                destructive
                title={`Block ${targetName}`}
                subtitle="Hide everything they post"
                onPress={confirmBlock}
              />
            </Group>
          </>
        )}
      </Sheet>
    </TabScreen>
  );
}

/**
 * Clears the tab bar, plus a gap. Derived from Screen.tsx's own measurement
 * rather than re-stated as a magic number here — the two used to be written out
 * separately and drifted apart on Android, which sank the composer into the
 * system navigation bar.
 */
const INPUT_BOTTOM = TAB_BAR_HEIGHT + 12;
/** Breathing room between the keyboard's top edge and the composer. */
const KEYBOARD_GAP = 8;

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    segmentWrap: { marginTop: 12, marginBottom: 4 },
    loadingWrap: { marginTop: 40, alignItems: "center" },
    loadingText: { fontSize: 14, fontFamily: font.medium, color: colors.label3 },

    feed: { marginTop: 12, gap: 12 },
    bubbleRow: { maxWidth: "82%", alignSelf: "flex-start" },
    bubbleRowMine: { alignSelf: "flex-end", alignItems: "flex-end" },
    bubble: { borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 9, ...cardShadow },
    bubbleOther: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
    bubbleAuthor: { fontSize: 11.5, fontFamily: font.semibold, color: colors.accent, marginBottom: 2 },
    bubbleBody: { fontSize: 15, fontFamily: font.regular, color: colors.label, lineHeight: 20 },
    bubbleBodyMine: { color: colors.white },
    bubbleTime: { marginTop: 3, fontSize: 11, fontFamily: font.regular, color: colors.label3 },
    bubbleTimeMine: { textAlign: "right" },

    actionsGroup: { marginTop: 16 },
    quoteCard: {
      marginTop: 14,
      backgroundColor: colors.fill,
      borderRadius: radius.md,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    quoteAuthor: { fontSize: 11.5, fontFamily: font.semibold, color: colors.accent, marginBottom: 2 },
    quoteBody: { fontSize: 14, fontFamily: font.regular, color: colors.label2, lineHeight: 19 },

    inputWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: radius.full,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      ...cardShadow,
    },
    inputField: { flex: 1, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0 },
    sendButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
    sendButtonDisabled: { backgroundColor: colors.fill },
  });
