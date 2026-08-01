import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { UserIdentity } from "@supabase/supabase-js";
import PageLoading from "@/components/PageLoading";
import { InitialAvatar } from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import StreakCalendarSheet from "@/components/StreakCalendarSheet";
import {
  AccentButton,
  Chevron,
  Group,
  IconCircle,
  Row,
  SectionHeader,
  SheetSubtitle,
  SheetTitle,
  SmallButton,
  TextField,
} from "@/components/ui";
import { getConnectedIdentities, linkGoogle, unlinkIdentity } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/authErrors";
import { fetchBlockedUsers, isModerationUnavailable, unblockUser, type BlockedUser } from "@/lib/moderation";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { font, useColors, type Colors } from "@/lib/theme";
import { countryByCode, searchCountries } from "@/lib/countries";

export default function AccountSettingsPage() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated, signOut, setSeenWelcome, setHouseholdCountry, userEmail, toast } = useStore();
  const [pwOpen, setPwOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Which sign-in methods are attached to this account (email / apple / google).
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [identitiesLoaded, setIdentitiesLoaded] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  const loadIdentities = useCallback(() => {
    getConnectedIdentities()
      .then(setIdentities)
      // Never leave the screen stuck behind the loading gate below — an account
      // with no readable identities still renders, just with everything
      // disconnected.
      .catch(() => setIdentities([]))
      .finally(() => setIdentitiesLoaded(true));
  }, []);
  useEffect(loadIdentities, [loadIdentities]);

  const emailIdentity = identities.find((i) => i.provider === "email");
  const appleIdentity = identities.find((i) => i.provider === "apple");
  const googleIdentity = identities.find((i) => i.provider === "google");
  const hasPassword = !!emailIdentity;
  const canUnlink = identities.length >= 2;

  // Wait for identities before painting ANYTHING. This screen's rows are
  // identity-derived — "Change password" only exists with an email identity,
  // "Email & password" reads Connected vs. Not set up, and Disconnect needs two
  // methods. Rendering optimistically first made all three flip a beat later:
  // on a Google-only account "Change password" appeared and then vanished.
  // getUserIdentities() reads the locally cached session, so this costs a
  // microtask, not a round trip.
  if (!hydrated || !identitiesLoaded) {
    return (
      <PushedScreen title="Account">
        <PageLoading />
      </PushedScreen>
    );
  }

  const currentMember = state.members.find((m) => m.id === state.currentMemberId);

  async function changePassword() {
    setFormError(null);
    if (newPw.length < 6) return setFormError("Password must be at least 6 characters.");
    if (newPw !== confirmPw) return setFormError("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) return setFormError(friendlyAuthError(error.message));
    setPwOpen(false);
    setNewPw("");
    setConfirmPw("");
    toast("lock", "Password updated", "Use it next time you log in");
  }

  async function changeEmail() {
    setFormError(null);
    const target = newEmail.trim();
    if (!target) return setFormError("Enter a new email.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: target });
    setBusy(false);
    if (error) return setFormError(friendlyAuthError(error.message));
    setEmailOpen(false);
    setNewEmail("");
    // Secure email change sends codes to BOTH addresses; /verify walks
    // through them one after the other.
    router.push({
      pathname: "/verify",
      params: { email: target, purpose: "email_change", ...(userEmail ? { secondary: userEmail } : {}) },
    });
  }

  async function handleLinkGoogle() {
    if (linkBusy) return;
    setLinkBusy(true);
    const { error, cancelled } = await linkGoogle();
    setLinkBusy(false);
    if (error) {
      Alert.alert("Couldn't connect Google", error);
      return;
    }
    if (!cancelled) {
      toast("check", "Google connected", "You can sign in with it from now on");
      loadIdentities();
    }
  }

  function handleUnlink(identity: UserIdentity, label: string) {
    Alert.alert(`Disconnect ${label}?`, `You'll no longer be able to sign in with ${label}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          const { error } = await unlinkIdentity(identity);
          if (error) Alert.alert("Couldn't disconnect", error);
          else {
            toast("check", `${label} disconnected`, "");
            loadIdentities();
          }
        },
      },
    ]);
  }

  function openBlocked() {
    setBlocked(null);
    setBlockedOpen(true);
    fetchBlockedUsers()
      .then(setBlocked)
      .catch((e) => {
        setBlocked([]);
        if (isModerationUnavailable(e)) toast("alert", "Blocking isn't live yet", "It arrives with the next backend update");
      });
  }

  async function handleUnblock(user: BlockedUser) {
    try {
      await unblockUser(user.userId);
      setBlocked((prev) => prev?.filter((b) => b.userId !== user.userId) ?? prev);
      toast("check", `Unblocked ${user.memberName ?? "pet owner"}`, "You'll see their messages again");
    } catch {
      toast("alert", "Couldn't unblock", "Please try again");
    }
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "You'll need to log back in to see your households.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  // Deletion runs through the `delete-account` Edge Function: it verifies the
  // caller's JWT server-side, hands each shared household to a successor via
  // prepare_account_deletion (migration 0028), then deletes the auth user.
  //
  // If the function isn't deployed yet, invoke() rejects with a
  // FunctionsFetchError / non-2xx — we surface that honestly instead of a vague
  // "try again", since retrying won't help until it's deployed (see HANDOFF EAS
  // step 3: `supabase functions deploy delete-account`).
  async function runDeleteAccount() {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
      if (error) throw error;
      await signOut();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const notDeployed = /not\s*found|404|failed to (send|fetch)|Function not found/i.test(msg);
      Alert.alert(
        "Account deletion unavailable",
        notDeployed
          ? "This build can't reach the deletion service yet. It goes live with the next backend update — your account is untouched."
          : `We couldn't delete your account.\n\n${msg}`,
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "Households you share are handed to the longest-tenured admin or member; households where you're the only member are deleted. Your account itself is gone for good. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => runDeleteAccount() },
      ],
    );
  }

  return (
    <PushedScreen title="Account">
      <SectionHeader>Account</SectionHeader>
      <Group>
        {userEmail ? (
          <Row leading={<IconCircle icon="person" tint={colors.label2} bg={colors.fill} />} title={userEmail} subtitle="Account email" />
        ) : null}
        {currentMember ? (
          <Row
            leading={<InitialAvatar name={currentMember.name} gradient={currentMember.gradient} size={36} />}
            title={currentMember.name}
            subtitle="Your family card — edit it in Family"
          />
        ) : null}
        {hasPassword ? (
          <Row
            onPress={() => {
              setFormError(null);
              setPwOpen(true);
            }}
            leading={<IconCircle icon="lock" tint={colors.label2} bg={colors.fill} />}
            title="Change password"
            trailing={<Chevron />}
          />
        ) : null}
        <Row
          onPress={() => {
            setFormError(null);
            setEmailOpen(true);
          }}
          leading={<IconCircle icon="person" tint={colors.label2} bg={colors.fill} />}
          title="Change email"
          trailing={<Chevron />}
        />
      </Group>

      <SectionHeader>Connected accounts</SectionHeader>
      <Group>
        <Row
          leading={<IconCircle icon="lock" tint={colors.label2} bg={colors.fill} />}
          title="Email & password"
          subtitle={hasPassword ? (userEmail ?? "Connected") : "Not set up for this account"}
        />
        <Row
          leading={<IconCircle icon="sparkles" tint={colors.label2} bg={colors.fill} />}
          title="Apple"
          subtitle={
            appleIdentity
              ? "Connected"
              : "Connects automatically when you use Sign in with Apple with this email"
          }
          interactiveTrailing={!!appleIdentity && canUnlink}
          trailing={
            appleIdentity && canUnlink ? (
              <SmallButton label="Disconnect" tone="gray" onPress={() => handleUnlink(appleIdentity, "Apple")} />
            ) : undefined
          }
        />
        <Row
          leading={<IconCircle icon="star" tint={colors.label2} bg={colors.fill} />}
          title="Google"
          subtitle={googleIdentity ? "Connected" : "Sign in with Google from now on"}
          interactiveTrailing
          trailing={
            googleIdentity ? (
              canUnlink ? (
                <SmallButton label="Disconnect" tone="gray" onPress={() => handleUnlink(googleIdentity, "Google")} />
              ) : undefined
            ) : (
              <SmallButton label={linkBusy ? "Connecting…" : "Connect"} onPress={handleLinkGoogle} />
            )
          }
        />
      </Group>
      <Text style={styles.footnote}>
        Any connected method signs into this same account. You can&apos;t disconnect your only sign-in method.
      </Text>

      <SectionHeader>App</SectionHeader>
      <Group>
        <Row
          onPress={() => {
            setCountryQuery("");
            setCountryOpen(true);
          }}
          leading={<IconCircle icon="pin" tint={colors.accent} bg={colors.accentSoft} />}
          title="Country"
          subtitle="Sets which Community Local chat room you join"
          trailing={
            <Text style={state.country ? styles.identityValue : styles.identityUnset}>
              {state.country ? `${countryByCode(state.country)?.flag ?? ""} ${countryByCode(state.country)?.name ?? state.country}` : "Set"}
            </Text>
          }
        />
        <Row
          onPress={openBlocked}
          leading={<IconCircle icon="shield" tint={colors.label2} bg={colors.fill} />}
          title="Blocked users"
          subtitle="People hidden from Community chat"
          trailing={<Chevron />}
        />
        <Row
          leading={<IconCircle icon="flame" tint={colors.orange} bg={colors.orangeSoft} />}
          title="Day streak"
          subtitle={state.streak === 1 ? "1 day" : `${state.streak} days`}
          onPress={() => setStreakOpen(true)}
          trailing={<Chevron />}
        />
        <Row
          leading={<IconCircle icon="sparkles" tint={colors.label2} bg={colors.fill} />}
          title="Replay intro"
          onPress={() => {
            setSeenWelcome(false);
            router.push("/home");
          }}
          trailing={<Chevron />}
        />
        <Row destructive title="Sign out" onPress={confirmSignOut} />
        <Row destructive title="Delete account" onPress={confirmDeleteAccount} />
      </Group>
      <Text style={styles.footnote}>
        Deleting your account hands shared households to the longest-tenured admin; households where you&apos;re alone are deleted.
        This can&apos;t be undone.
      </Text>

      <View style={{ height: 16 }} />

      <Sheet
        open={pwOpen}
        onClose={() => {
          setPwOpen(false);
          setNewPw("");
          setConfirmPw("");
          setFormError(null);
        }}
      >
        <SheetTitle>Change password</SheetTitle>
        <View style={styles.form}>
          <TextField secureTextEntry placeholder="New password" value={newPw} onChangeText={setNewPw} />
          <TextField secureTextEntry placeholder="Confirm new password" value={confirmPw} onChangeText={setConfirmPw} />
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <AccentButton loading={busy} onPress={changePassword}>
            Update password
          </AccentButton>
        </View>
      </Sheet>

      <Sheet
        open={emailOpen}
        onClose={() => {
          setEmailOpen(false);
          setNewEmail("");
          setFormError(null);
        }}
      >
        <SheetTitle>Change email</SheetTitle>
        <SheetSubtitle>We&apos;ll email 6-digit codes to confirm the change — enter them on the next screen.</SheetSubtitle>
        <View style={styles.form}>
          <TextField
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="New email"
            value={newEmail}
            onChangeText={setNewEmail}
          />
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <AccentButton loading={busy} onPress={changeEmail}>
            Send codes
          </AccentButton>
        </View>
      </Sheet>
      <StreakCalendarSheet open={streakOpen} onClose={() => setStreakOpen(false)} />

      <Sheet open={blockedOpen} onClose={() => setBlockedOpen(false)}>
        <SheetTitle>Blocked users</SheetTitle>
        <SheetSubtitle>
          {blocked === null
            ? "Loading…"
            : blocked.length === 0
              ? "No one is blocked. Long-press a message in Community to block its author."
              : "Blocked people can't reach you in Community chat."}
        </SheetSubtitle>
        {blocked && blocked.length > 0 ? (
          <Group style={{ marginTop: 16 }}>
            {blocked.map((b) => (
              <Row
                key={b.userId}
                leading={<IconCircle icon="person" tint={colors.label2} bg={colors.fill} />}
                title={b.memberName ?? "Pet owner"}
                subtitle={`Blocked ${new Date(b.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                interactiveTrailing
                trailing={<SmallButton label="Unblock" tone="gray" onPress={() => handleUnblock(b)} />}
              />
            ))}
          </Group>
        ) : null}
      </Sheet>

      <Sheet open={countryOpen} onClose={() => setCountryOpen(false)}>
        <SheetTitle>Country</SheetTitle>
        <SheetSubtitle>Sets which Community Local chat room your household joins</SheetSubtitle>
        <View style={styles.form}>
          <TextField placeholder="Search countries" value={countryQuery} onChangeText={setCountryQuery} autoCapitalize="none" autoCorrect={false} />
        </View>
        <Group style={{ marginTop: 12 }}>
          {searchCountries(countryQuery).map((c) => (
            <Row
              key={c.code}
              onPress={() => {
                setHouseholdCountry(c.code);
                setCountryOpen(false);
                toast("pin", `Country set to ${c.name}`, "");
              }}
              title={`${c.flag} ${c.name}`}
              trailing={state.country === c.code ? <Chevron /> : undefined}
            />
          ))}
        </Group>
      </Sheet>
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
    form: { marginTop: 20, gap: 12 },
    errorText: { fontSize: 14, fontFamily: font.medium, color: colors.red, textAlign: "left" },
    identityValue: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
    identityUnset: { fontSize: 13, fontFamily: font.semibold, color: colors.label3 },
  });
