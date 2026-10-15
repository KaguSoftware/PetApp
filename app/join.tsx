import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, StyleSheet, TextInput, View } from "react-native";
import { LoadErrorState } from "@/components/home/LoadErrorState";
import { Mascot } from "@/components/mascot";
import { redeemInvite, useHousehold, useSession } from "@/data";
import { consumePendingInvite, normalizeInviteCode, peekPendingInvite } from "@/lib/pendingInvite";
import { Confetti, PillButton, Screen, SpeechBubble, Text, borderWidth, fonts, haptic, radius, spacing, useTheme } from "@/ui";

type Failure = "not_found" | "expired" | "already_member" | "rate_limited";

const MESSAGES: Record<Failure, string> = {
  not_found: "That code doesn't match any invite — double-check it?",
  expired: "This invite has expired. Ask for a new one.",
  already_member: "You're already in this family 🎉",
  rate_limited: "Too many tries. Take a breather and try again in a bit.",
};

/** Uppercases, drops everything outside A-Z/0-9, caps at 8 and inserts the dash: ab12cd34 -> AB12-CD34. */
function formatCode(text: string): string {
  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return compact.length > 4 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
}

export default function JoinScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => formatCode(params.code ?? ""));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [joined, setJoined] = useState(false);
  const [burst, setBurst] = useState(0);
  const [love, setLove] = useState(0);
  const touched = useRef(false);
  const household = useHousehold();
  const { session } = useSession();
  const navigation = useNavigation();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const homeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set once we are on our way out (joined, or already a member); the timer starts when the household is usable.
  const [leaveAfter, setLeaveAfter] = useState<number | null>(null);

  // Backing out of the screen (header, swipe, hardware back) drops a parked invite so it never re-prompts.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", () => {
        void consumePendingInvite();
      }),
    [navigation],
  );

  // A link opened while this screen is already up updates the code.
  useEffect(() => {
    if (params.code) setCode(formatCode(params.code));
  }, [params.code]);

  // Otherwise fall back to an invite parked before sign-in.
  useEffect(() => {
    if (params.code) return;
    let alive = true;
    void peekPendingInvite().then((pending) => {
      if (alive && pending && !touched.current) setCode(pending);
    });
    return () => {
      alive = false;
    };
  }, [params.code]);

  // The key present at mount does not play, so the reaction fires just after the success view appears.
  useEffect(() => {
    if (!joined) return;
    const t = setTimeout(() => setLove(1), 250);
    return () => clearTimeout(t);
  }, [joined]);

  const normalized = normalizeInviteCode(code);

  const householdOk = household.ready && !household.loadError && !!household.householdId;
  useEffect(() => {
    if (leaveAfter === null || !householdOk) return;
    homeTimer.current = setTimeout(() => {
      homeTimer.current = null;
      if (sessionRef.current) router.replace("/home");
    }, leaveAfter);
    return () => {
      if (homeTimer.current) clearTimeout(homeTimer.current);
      homeTimer.current = null;
    };
  }, [leaveAfter, householdOk]);

  async function join() {
    if (!normalized || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const res = await redeemInvite(normalized);
      if (res.ok) {
        await consumePendingInvite();
        haptic("success");
        setJoined(true);
        setBurst(1);
        setLeaveAfter(1800);
      } else if (res.reason === "already_member") {
        await consumePendingInvite();
        setFailure("already_member");
        setLeaveAfter(1500);
      } else {
        setFailure(res.reason);
      }
    } catch {
      // The data layer already toasted a generic error; the code stays so they can retry.
    } finally {
      setBusy(false);
    }
  }

  if (joined && household.ready && household.loadError && !household.householdId) {
    return (
      <Screen scroll={false} contentStyle={styles.success}>
        <LoadErrorState title="You joined, but we couldn't load your family" />
      </Screen>
    );
  }

  if (joined) {
    return (
      <Screen scroll={false} contentStyle={styles.success}>
        <SpeechBubble text="Yay, a new family member!" />
        <Mascot species="dog" size={230} mood="happy" reaction={{ type: "love", key: love }} />
        <Text variant="display" style={styles.center} accessibilityRole="header">
          You&apos;re in!
        </Text>
        <Text tone="ink2" style={styles.center}>
          Taking you to your new family…
        </Text>
        <View pointerEvents="none" style={styles.confetti}>
          <Confetti burstKey={burst} />
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <Screen title="Join a family" back>
        <Text tone="ink2">Got an invite code from someone? Pop it in below.</Text>
        <TextInput
          value={code}
          onChangeText={(t) => {
            touched.current = true;
            setFailure(null);
            setCode(formatCode(t));
          }}
          onSubmitEditing={join}
          placeholder="XXXX-XXXX"
          placeholderTextColor={colors.ink3}
          selectionColor={colors.green}
          accessibilityLabel="Invite code"
          accessibilityHint="Eight letters or numbers"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          returnKeyType="go"
          style={[
            styles.input,
            { backgroundColor: colors.surface, color: colors.ink, borderColor: failure && failure !== "already_member" ? colors.danger : colors.border },
          ]}
        />
        {failure ? (
          <Text
            tone={failure === "already_member" ? "green" : "danger"}
            style={styles.center}
            accessibilityLiveRegion="polite"
          >
            {MESSAGES[failure]}
          </Text>
        ) : null}
        <PillButton label="Join" size="lg" onPress={join} disabled={!normalized} loading={busy} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  input: {
    fontFamily: fonts.displayXBold,
    fontSize: 32,
    letterSpacing: 3,
    textAlign: "center",
    minHeight: 80,
    borderRadius: radius.lg,
    borderWidth,
    paddingHorizontal: spacing.lg,
  },
  center: { textAlign: "center" },
  success: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  confetti: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
