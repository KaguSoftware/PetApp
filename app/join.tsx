import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import PageLoading from "@/components/PageLoading";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { AccentButton } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colors, font, radius, floatShadow } from "@/lib/theme";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Invite-link landing (petpal://join?f=<familyId>, mirroring the web's
 * /join?f=<familyId>). Lives inside the auth gate — the user is signed in.
 */
export default function JoinPage() {
  const router = useRouter();
  const { state, hydrated, joinHousehold } = useStore();
  const params = useLocalSearchParams<{ f?: string }>();
  const familyId = (typeof params.f === "string" ? params.f : "").trim();
  const [joining, setJoining] = useState(false);

  if (!hydrated) {
    return (
      <PushedScreen title="Join household">
        <PageLoading />
      </PushedScreen>
    );
  }

  const valid = UUID_RE.test(familyId);
  const alreadyIn = valid && state.households.some((h) => h.id === familyId);

  return (
    <PushedScreen title="Join household">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name="people" size={26} color={colors.accent} />
        </View>
        {!valid ? (
          <>
            <Text style={styles.title}>This invite link isn&apos;t valid</Text>
            <Text style={styles.body}>
              Ask your family member to send the invite again from Settings ▸ Family, or paste the Family ID there yourself.
            </Text>
            <View style={styles.cta}>
              <AccentButton variant="tinted" onPress={() => router.push("/settings/family")}>
                Open family settings
              </AccentButton>
            </View>
          </>
        ) : alreadyIn ? (
          <>
            <Text style={styles.title}>You&apos;re already in this household</Text>
            <Text style={styles.body}>Switch between your households any time from Settings ▸ Family.</Text>
            <View style={styles.cta}>
              <AccentButton variant="tinted" onPress={() => router.push("/settings/family")}>
                Open family settings
              </AccentButton>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Join this household?</Text>
            <Text style={styles.body}>
              You&apos;ll see its pets, reminders, and family activity, and everything you log is shared with them. Your view switches
              to the new household right away.
            </Text>
            <View style={styles.idPill}>
              <Text style={styles.idPillLabel}>{familyId.slice(0, 8)}…</Text>
            </View>
            <View style={styles.cta}>
              <AccentButton
                disabled={joining}
                onPress={async () => {
                  setJoining(true);
                  const ok = await joinHousehold(familyId);
                  if (!ok) setJoining(false);
                }}
              >
                {joining ? "Joining…" : "Join household"}
              </AccentButton>
            </View>
          </>
        )}
      </View>
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
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
  idPill: { marginTop: 12, borderRadius: radius.full, backgroundColor: colors.fill, paddingHorizontal: 12, paddingVertical: 4 },
  idPillLabel: { fontSize: 12, fontFamily: font.medium, color: colors.label2 },
  cta: { marginTop: 24, width: "100%" },
});
