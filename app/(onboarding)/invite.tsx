import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { AccentButton } from "@/components/ui";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

export default function OnboardingInviteScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, createInvite } = useStore();
  const [busy, setBusy] = useState(false);
  const [sharedCode, setSharedCode] = useState<string | null>(null);

  async function shareInvite() {
    if (busy) return;
    setBusy(true);
    // Default invite: member role, multi-use, 7 days (owner decision) — the
    // whole family can join off one code from the group chat.
    const invite = await createInvite({ role: "member" });
    setBusy(false);
    if (invite) {
      setSharedCode(invite.code);
      await Share.share({
        message: `Join our PetPal household — invite code ${invite.code} (valid 7 days). In the app: petpal://join?code=${invite.code}`,
      });
    } else if (state.familyId) {
      // Pre-0027 backend: fall back to the legacy Family ID link (createInvite
      // already toasted the explanation).
      await Share.share({
        message: `Join our PetPal household to share pet care. In the app: petpal://join?f=${state.familyId}`,
      });
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
      {sharedCode ? (
        <View style={styles.codePill}>
          <Text style={styles.codePillLabel}>{sharedCode}</Text>
        </View>
      ) : null}
      <View style={styles.cta}>
        <AccentButton onPress={shareInvite} loading={busy}>
          Share an invite code
        </AccentButton>
        <Pressable onPress={() => router.replace("/home")} style={styles.skip} accessibilityRole="button">
          <Text style={styles.skipLabel}>{sharedCode ? "Done" : "Maybe later"}</Text>
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
    codePill: {
      marginTop: 16,
      alignSelf: "flex-start",
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    codePillLabel: { fontSize: 17, fontFamily: font.bold, color: colors.accentDeep, letterSpacing: 1.2 },
    cta: { marginTop: 28, gap: 4 },
    skip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 16 },
    skipLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.label2 },
  });
