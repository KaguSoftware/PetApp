import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { AccentButton, SmallButton } from "@/components/ui";
import { copyInviteCode, shareFamilyIdLink, shareInvite } from "@/lib/inviteShare";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

export default function OnboardingInviteScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, createInvite, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{ code: string; expiresAt: number } | null>(null);

  async function makeInvite() {
    if (busy) return;
    setBusy(true);
    // Default invite: member role, multi-use, 7 days (owner decision) — the
    // whole family can join off one code from the group chat.
    const created = await createInvite({ role: "member" });
    setBusy(false);
    if (created) {
      // Show the code first, with Copy and Share side by side, rather than
      // firing the share sheet straight away — plenty of people just want to
      // read it out to someone standing next to them.
      setInvite(created);
    } else if (state.familyId) {
      // Pre-0027 backend: fall back to the legacy Family ID link (createInvite
      // already toasted the explanation).
      await shareFamilyIdLink(state.familyId);
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={styles.iconWrap}>
        <Icon name="people" size={26} color={colors.accent} />
      </View>
      <Text style={styles.title}>Invite your family</Text>
      <Text style={styles.subtitle}>
        PetPal is built for sharing — everyone logs care, sees what{"'"}s done, and nothing gets double-fed. Invites can also be
        created later from Settings.
      </Text>
      {invite ? (
        <View style={styles.codeCard}>
          <Text style={styles.codeValue} selectable accessibilityLabel={`Invite code ${invite.code.split("").join(" ")}`}>
            {invite.code}
          </Text>
          <Text style={styles.codeMeta}>Valid for 7 days · anyone with this code can join</Text>
          <View style={styles.codeActions}>
            <SmallButton
              label="Copy code"
              onPress={async () => {
                await copyInviteCode(invite.code);
                toast("check", "Code copied", invite.code);
              }}
            />
            <SmallButton label="Share" tone="gray" onPress={() => shareInvite(invite)} />
          </View>
        </View>
      ) : null}
      <View style={styles.cta}>
        {invite ? null : (
          <AccentButton onPress={makeInvite} loading={busy}>
            Create an invite code
          </AccentButton>
        )}
        <Pressable onPress={() => router.replace("/home")} style={styles.skip} accessibilityRole="button">
          <Text style={styles.skipLabel}>{invite ? "Done" : "Maybe later"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 24 },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: { fontSize: 24, fontFamily: font.bold, color: colors.label, letterSpacing: -0.4 },
    subtitle: { marginTop: 8, fontSize: 15, fontFamily: font.regular, color: colors.label2, lineHeight: 22 },
    codeCard: {
      marginTop: 20,
      alignSelf: "stretch",
      borderRadius: 16,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 16,
      paddingVertical: 18,
      gap: 4,
    },
    // Wide tracking so the ambiguity-free alphabet survives being read aloud.
    codeValue: { fontSize: 30, fontFamily: font.bold, color: colors.accentDeep, letterSpacing: 3, textAlign: "center" },
    codeMeta: { fontSize: 12, fontFamily: font.regular, color: colors.label2, textAlign: "center" },
    codeActions: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 10 },
    cta: { marginTop: 28, gap: 4 },
    skip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 16 },
    skipLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.label2 },
  });
