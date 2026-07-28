import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyState from "@/components/EmptyState";
import HeaderActions from "@/components/HeaderActions";
import { Icon } from "@/components/Icons";
import { TabScreen, TAB_BAR_HEIGHT } from "@/components/Screen";
import { PressableScale, Segmented, TextField } from "@/components/ui";
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

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        {!mine && message.authorMemberName ? <Text style={styles.bubbleAuthor}>{message.authorMemberName}</Text> : null}
        <Text style={[styles.bubbleBody, mine && styles.bubbleBodyMine]}>{message.body}</Text>
      </View>
      <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>{relativeTime(message.createdAt)}</Text>
    </View>
  );
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

  const changeTab = (t: Tab) => setTab(t);

  const submit = async () => {
    const body = draft.trim();
    if (!body || !room || !state.familyId || sending) return;
    setSending(true);
    setDraft("");
    try {
      const message = await sendMessage({ roomId: room.id, householdId: state.familyId, memberName: currentMember?.name ?? null, body });
      setMessages((prev) => (prev && !prev.some((p) => p.id === message.id) ? [...prev, message] : prev));
    } catch (e) {
      console.error("[petpal] chat send failed:", e);
      toast("alert", "Couldn't send", "That message didn't go through");
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const localCountryLabel = state.country ? (countryByCode(state.country)?.name ?? state.country) : null;

  return (
    <TabScreen
      title="Community"
      subtitle="Chat with pet owners everywhere"
      trailing={<HeaderActions />}
      contentBottomPad={88}
      overlay={
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.inputWrap, { paddingBottom: insets.bottom + INPUT_BOTTOM }]}
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
        </KeyboardAvoidingView>
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
      ) : !hydrated || messages === null ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={{ marginTop: 8 }}>
          <EmptyState
            icon="people"
            title={tab === "global" ? "No messages yet" : `No messages from ${localCountryLabel} yet`}
            body="Be the first to say hello."
          />
        </View>
      ) : (
        <View style={styles.feed}>
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} mine={m.authorUserId === currentUserId} />
          ))}
        </View>
      )}
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
