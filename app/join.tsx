import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { AccentButton, FieldLabel, TextField } from "@/components/ui";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { font, radius, floatShadow, useColors, type Colors } from "@/lib/theme";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "abc1 2x.y" → "ABC1-2XY" — uppercase, strip non-alphanumerics, hyphen after 4. */
function formatCode(raw: string): string {
  const n = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return n.length > 4 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
}

/** Display name for the card this person gets in the household they're joining. */
function NameField({
  value,
  onChange,
  touched,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  touched: React.MutableRefObject<boolean>;
  onSubmit?: () => void;
}) {
  return (
    <View>
      <FieldLabel>Your name</FieldLabel>
      <TextField
        value={value}
        onChangeText={(t) => {
          touched.current = true;
          onChange(t);
        }}
        placeholder="e.g. Alex"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

/**
 * Invite landing + manual code entry. Reached from petpal://join?code=XXXX-XXXX
 * deep links (replayed across sign-in by the root layout when needed), the
 * onboarding "Join with a code" card, and Settings ▸ Family. Legacy
 * ?f=<household uuid> links from the web demo still work via join_household.
 */
export default function JoinPage() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { state, hydrated, joinHousehold, redeemInvite } = useStore();
  const params = useLocalSearchParams<{ code?: string; f?: string }>();
  const legacyFamilyId = (typeof params.f === "string" ? params.f : "").trim();
  const [code, setCode] = useState(() => formatCode(typeof params.code === "string" ? params.code : ""));
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);
  // Flips when the backend predates invite codes (migration 0027) — the form
  // then falls back to pasting a Family ID.
  const [legacyMode, setLegacyMode] = useState(false);
  const [familyIdInput, setFamilyIdInput] = useState("");

  // The name that will label this person's card in the household they're about
  // to join. Both join RPCs read it from auth metadata AT REDEEM TIME, falling
  // back to "New member" — which is what Google sign-ins got, since (unlike
  // Apple) that flow never backfills a name. Asking here, before redeeming, is
  // the only place the write is guaranteed to land first.
  const [name, setName] = useState("");
  // Prefill without ever clobbering what the user has typed (same guard as the
  // create-household step).
  const nameTouched = useRef(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (nameTouched.current) return;
      const accountName = (data.session?.user?.user_metadata as { name?: string } | null)?.name;
      if (accountName && accountName !== "New member") setName(accountName);
    });
  }, []);

  /** Persists the display name so redeem_invite / join_household pick it up. */
  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await supabase.auth.updateUser({ data: { name: trimmed } });
  }

  if (!hydrated) {
    return (
      <PushedScreen title="Join household">
        <PageLoading />
      </PushedScreen>
    );
  }

  // --- Legacy web invite link: petpal://join?f=<uuid> ------------------------
  if (legacyFamilyId) {
    const valid = UUID_RE.test(legacyFamilyId);
    const alreadyIn = valid && state.households.some((h) => h.id === legacyFamilyId);
    return (
      <PushedScreen title="Join household">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="people" size={26} color={colors.accent} />
          </View>
          {!valid ? (
            <>
              <Text style={styles.title}>This invite link isn&apos;t valid</Text>
              <Text style={styles.body}>Ask your family member to send a fresh invite from Settings ▸ Family.</Text>
            </>
          ) : alreadyIn ? (
            <>
              <Text style={styles.title}>You&apos;re already in this household</Text>
              <Text style={styles.body}>Switch between your households any time from Settings ▸ Household.</Text>
              <View style={styles.cta}>
                <AccentButton variant="tinted" onPress={() => router.push("/settings/household")}>
                  Open household settings
                </AccentButton>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Join this household?</Text>
              <Text style={styles.body}>
                You&apos;ll see its pets, reminders, and family activity, and everything you log is shared with them. Your view
                switches to the new household right away.
              </Text>
              <View style={styles.idPill}>
                <Text style={styles.idPillLabel}>{legacyFamilyId.slice(0, 8)}…</Text>
              </View>
              <View style={styles.form}>
                <NameField value={name} onChange={setName} touched={nameTouched} onSubmit={undefined} />
              </View>
              <View style={styles.cta}>
                <AccentButton
                  loading={joining}
                  disabled={!name.trim()}
                  onPress={async () => {
                    setJoining(true);
                    await saveName();
                    const ok = await joinHousehold(legacyFamilyId);
                    if (!ok) {
                      setJoining(false);
                      return;
                    }
                    router.replace("/home");
                  }}
                >
                  Join household
                </AccentButton>
              </View>
            </>
          )}
        </View>
      </PushedScreen>
    );
  }

  // --- Waiting on admin approval ----------------------------------------------
  if (pendingApproval) {
    return (
      <PushedScreen title="Join household">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="clock" size={26} color={colors.accent} />
          </View>
          <Text style={styles.title}>Request sent</Text>
          <Text style={styles.body}>
            An admin needs to approve you before you can see this household&apos;s pets, reminders, and activity. You&apos;ll get
            access as soon as they do.
          </Text>
          <View style={styles.cta}>
            <AccentButton variant="tinted" onPress={() => router.replace("/home")}>
              Back to home
            </AccentButton>
          </View>
        </View>
      </PushedScreen>
    );
  }

  // --- Invite code entry ------------------------------------------------------
  async function handleRedeem() {
    if (joining) return;
    setError(null);
    setJoining(true);
    // Name first — redeem_invite reads auth metadata to name the new card, so
    // a later write would leave them as "New member" until they edited it.
    await saveName();
    const result = await redeemInvite(code);
    setJoining(false);
    if (result.ok) {
      if (result.status === "pending") {
        setPendingApproval(true);
        return;
      }
      router.replace("/home");
      return;
    }
    if (result.reason === "unavailable") {
      setLegacyMode(true);
      setError(null);
      return;
    }
    setError(
      result.reason === "notFound"
        ? "That code doesn't match any invite. Double-check it and try again."
        : result.reason === "expired"
          ? "This invite expired or was revoked — ask your family for a fresh one."
          : // 42501 from the members_write_guard: the household's backend is
            // missing migration 0040, so joining as a member can't work yet.
            result.reason === "blocked"
            ? "Joining needs the next backend update — the household's database is missing migration 0040."
            : "Couldn't join right now. Please try again."
    );
  }

  async function handleLegacyJoin() {
    if (joining) return;
    setError(null);
    const target = familyIdInput.trim();
    if (!UUID_RE.test(target)) {
      setError("That doesn't look like a Family ID — it's the long code from Settings ▸ Household.");
      return;
    }
    setJoining(true);
    await saveName();
    const ok = await joinHousehold(target);
    setJoining(false);
    if (ok) router.replace("/home");
  }

  return (
    <PushedScreen title="Join household">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name="people" size={26} color={colors.accent} />
        </View>
        <Text style={styles.title}>Enter your invite code</Text>
        <Text style={styles.body}>
          Ask a family member for a code — they can create one from Settings ▸ Family ▸ Invite. Codes look like ABCD-EFGH.
          Your name is what the household will see on your care logs.
        </Text>
        <View style={styles.form}>
          <NameField value={name} onChange={setName} touched={nameTouched} onSubmit={undefined} />
          {legacyMode ? (
            <>
              <FieldLabel>Family ID</FieldLabel>
              <TextField
                value={familyIdInput}
                onChangeText={setFamilyIdInput}
                placeholder="Paste the Family ID"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLegacyJoin}
              />
              <Text style={styles.hint}>Invite codes go live with the next backend update — the Family ID works today.</Text>
            </>
          ) : (
            <TextField
              value={code}
              onChangeText={(t) => {
                setCode(formatCode(t));
                setError(null);
              }}
              placeholder="XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.codeInput}
              onSubmitEditing={handleRedeem}
            />
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AccentButton
            loading={joining}
            disabled={
              !name.trim() || (legacyMode ? !familyIdInput.trim() : code.replace(/[^A-Z0-9]/g, "").length !== 8)
            }
            onPress={legacyMode ? handleLegacyJoin : handleRedeem}
          >
            Join household
          </AccentButton>
        </View>
      </View>
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    marginTop: 24,
    alignItems: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 32,
    ...floatShadow,
  },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 16, fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label, textAlign: "center" },
  body: {
    marginTop: 8,
    maxWidth: 280,
    fontSize: 14,
    fontFamily: font.regular,
    lineHeight: 21,
    color: colors.label2,
    textAlign: "center",
  },
  form: { marginTop: 20, width: "100%", gap: 12 },
  codeInput: { textAlign: "center", fontSize: 20, fontFamily: font.bold, letterSpacing: 3 },
  hint: { fontSize: 12.5, fontFamily: font.regular, color: colors.label3, lineHeight: 17, paddingHorizontal: 2 },
  error: { color: colors.red, fontSize: 14, fontFamily: font.medium, paddingHorizontal: 2 },
  idPill: { marginTop: 12, borderRadius: radius.full, backgroundColor: colors.fill, paddingHorizontal: 12, paddingVertical: 4 },
  idPillLabel: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  cta: { marginTop: 24, width: "100%" },
});
