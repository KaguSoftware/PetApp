import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
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
  TextField,
} from "@/components/ui";
import { friendlyAuthError } from "@/lib/authErrors";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { colors, font } from "@/lib/theme";

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

  function confirmSignOut() {
    Alert.alert("Sign out", "You'll need to log back in to see your household.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  // Deletion runs through the `delete-account` Edge Function: it verifies the
  // caller's JWT server-side, then deletes the auth user with the service-role
  // key (DB rows cascade). The local session is cleared afterward.
  async function runDeleteAccount() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    setBusy(false);
    if (error) {
      toast("alert", "Couldn't delete account", "Please try again in a moment");
      return;
    }
    await signOut();
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and the whole household — pets, activity, everything. This can't be undone.",
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
            router.push("/home");
          }}
          trailing={<Chevron />}
        />
        <Row destructive title="Sign out" onPress={confirmSignOut} />
        <Row destructive title="Delete account" onPress={confirmDeleteAccount} />
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
        <SheetSubtitle>We&apos;ll email a confirmation link to the new address before the change takes effect.</SheetSubtitle>
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
            Send confirmation
          </AccentButton>
        </View>
      </Sheet>
      <StreakCalendarSheet open={streakOpen} onClose={() => setStreakOpen(false)} />
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
  form: { marginTop: 20, gap: 12 },
  errorText: { fontSize: 14, fontFamily: font.medium, color: colors.red, textAlign: "left" },
});
