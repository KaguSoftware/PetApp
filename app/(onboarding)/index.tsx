import { Redirect, router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "@/components/BrandMark";
import { Chevron, Group, IconCircle, Row } from "@/components/ui";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * Create-or-join: the landing screen for a signed-in account with no
 * households. A pending invite deep link is replayed onto /join by the root
 * layout, so this screen only offers the two clean paths.
 */
export default function OnboardingIndex() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { state, hydrated, signOut, userEmail } = useStore();

  // Already in a household (e.g. an invite was redeemed mid-flow) → home.
  if (hydrated && state.households.length > 0) return <Redirect href="/home" />;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.header}>
        <BrandMark />
        <Text style={styles.subtitle}>Let{"'"}s get your family set up</Text>
      </View>

      <Group>
        <Row
          leading={<IconCircle icon="home" tint={colors.accent} bg={colors.accentSoft} />}
          title="Start a household"
          subtitle="Name it, add your pets, invite your family"
          trailing={<Chevron />}
          onPress={() => router.push("/(onboarding)/create")}
        />
        <Row
          leading={<IconCircle icon="people" tint={colors.green} bg={colors.greenSoft} />}
          title="Join with a code"
          subtitle="Got an invite from a family member?"
          trailing={<Chevron />}
          onPress={() => router.push("/join")}
        />
      </Group>

      <View style={styles.footer}>
        {userEmail ? <Text style={styles.footerEmail}>Signed in as {userEmail}</Text> : null}
        <Pressable onPress={() => signOut()} style={styles.signOut} accessibilityRole="button">
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
    header: { alignItems: "center", marginBottom: 32 },
    subtitle: { marginTop: 6, fontSize: 15, fontFamily: font.regular, color: colors.label2 },
    footer: { alignItems: "center", marginTop: 28, gap: 2 },
    footerEmail: { fontSize: 13, fontFamily: font.regular, color: colors.label3 },
    signOut: { paddingVertical: 12, paddingHorizontal: 16 },
    signOutLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.accent },
  });
