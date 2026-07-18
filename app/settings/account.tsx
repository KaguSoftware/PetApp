import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import { InitialAvatar } from "@/components/PetAvatar";
import { PushedScreen } from "@/components/Screen";
import Sheet from "@/components/Sheet";
import StreakCalendarSheet from "@/components/StreakCalendarSheet";
import { AccentButton, Chevron, ConfirmRow, Group, IconCircle, Row, SectionHeader } from "@/components/ui";
import { friendlyAuthError } from "@/lib/authErrors";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { colors, font, radius } from "@/lib/theme";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { state, hydrated, signOut, setSeenWelcome, userEmail, toast } = useStore();
  const [pwOpen, setPwOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!hydrated) {
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
    if (!newEmail.trim()) return setFormError("Enter a new email.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(false);
    if (error) return setFormError(friendlyAuthError(error.message));
    setEmailOpen(false);
    setNewEmail("");
    toast("bell", "Confirm your new email", "We sent a link to finish the change");
  }

  // SCOPE(P6): needs delete-account Edge Function — GROWS LATER. The web calls a
  // service-role API route (/api/account/delete) that doesn't exist on mobile.
  function deleteAccount() {
    toast("alert", "Account deletion is coming soon", "It arrives in the next backend update");
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
            title={`Viewing as ${currentMember.name}`}
            subtitle={`${currentMember.role} · switch in Family`}
          />
        ) : null}
        <Row
          onPress={() => {
            setFormError(null);
            setPwOpen(true);
          }}
          leading={<IconCircle icon="lock" tint={colors.label2} bg={colors.fill} />}
          title="Change password"
          trailing={<Chevron />}
        />
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

      <SectionHeader>App</SectionHeader>
      <Group>
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
            router.push("/");
          }}
          trailing={<Chevron />}
        />
        <Row destructive onPress={signOut} title="Sign out" />
        <ConfirmRow label="Delete account" confirmLabel="Tap again to permanently delete" onConfirm={deleteAccount} />
      </Group>
      <Text style={styles.footnote}>
        Permanently deletes your account and the whole household — pets, activity, everything. This can&apos;t be undone.
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
        <Text style={styles.sheetTitle}>Change password</Text>
        <View style={styles.form}>
          <TextInput
            secureTextEntry
            placeholder="New password"
            placeholderTextColor={colors.label3}
            value={newPw}
            onChangeText={setNewPw}
            style={styles.input}
          />
          <TextInput
            secureTextEntry
            placeholder="Confirm new password"
            placeholderTextColor={colors.label3}
            value={confirmPw}
            onChangeText={setConfirmPw}
            style={styles.input}
          />
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <AccentButton disabled={busy} onPress={changePassword}>
            {busy ? "Saving…" : "Update password"}
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
        <Text style={styles.sheetTitle}>Change email</Text>
        <Text style={styles.sheetSub}>We&apos;ll email a confirmation link to the new address before the change takes effect.</Text>
        <View style={styles.form}>
          <TextInput
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="New email"
            placeholderTextColor={colors.label3}
            value={newEmail}
            onChangeText={setNewEmail}
            style={styles.input}
          />
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <AccentButton disabled={busy} onPress={changeEmail}>
            {busy ? "Sending…" : "Send confirmation"}
          </AccentButton>
        </View>
      </Sheet>
      <StreakCalendarSheet open={streakOpen} onClose={() => setStreakOpen(false)} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
  sheetTitle: { fontSize: 20, fontFamily: font.bold, letterSpacing: -0.2, color: colors.label },
  sheetSub: { marginTop: 4, fontSize: 13, fontFamily: font.regular, lineHeight: 18, color: colors.label3 },
  form: { marginTop: 20, gap: 12 },
  input: {
    height: 50,
    width: "100%",
    borderRadius: radius.sm,
    backgroundColor: colors.fill,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: font.regular,
    color: colors.label,
  },
  errorText: { fontSize: 13, fontFamily: font.regular, color: colors.red },
});
