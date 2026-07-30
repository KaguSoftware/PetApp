import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { lockFamily } from "@/components/family/lock";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import { PushedScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { Chevron, Group, IconCircle, PressableScale, Row, SectionHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { font, radius, useColors, withAlpha, type Colors } from "@/lib/theme";

export default function SettingsPage() {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, hydrated } = useStore();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // The three Family screens share ONE unlock (components/family/lock). Clearing
  // it on both edges of this screen's life scopes that unlock to a single visit
  // to Settings: arriving re-locks whatever another entry point left open, and
  // leaving locks up behind you — while hopping Family ↔ Household ↔ Pets, which
  // all pass back through here, asks for the password only once.
  useEffect(() => {
    lockFamily();
    return lockFamily;
  }, []);

  if (!hydrated) {
    return (
      <PushedScreen title="Settings">
        <PageLoading />
      </PushedScreen>
    );
  }

  const petCount = state.pets.length;
  const memberCount = state.members.length;
  const householdName = state.households.find((h) => h.id === state.activeHouseholdId)?.name ?? "Household";

  async function emailSupport() {
    const url =
      "mailto:support@kagu.app?subject=" +
      encodeURIComponent("PetPal support") +
      "&body=" +
      encodeURIComponent("\n\n—\nTell us what's going on and we'll help.");
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else Alert.alert("Email us", "Reach the team at support@kagu.app and we'll get back to you.");
  }

  function openHelp() {
    WebBrowser.openBrowserAsync("https://kagu.app/help").catch(() => {
      Alert.alert("Couldn't open help", "Please try again in a moment.");
    });
  }

  return (
    <PushedScreen title="Settings">
      {/* PetPal+ status / upgrade */}
      {state.premium ? (
        <Group>
          <Row
            onPress={() => router.push("/settings/subscription")}
            leading={
              <LinearGradient colors={[colors.accent, colors.accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.plusTile}>
                <Icon name="sparkles" size={18} color={colors.white} />
              </LinearGradient>
            }
            title="Peting Subscription"
            subtitle="Care plans, smart reminders & vet booking"
            trailing={<Chevron />}
          />
        </Group>
      ) : (
        <PressableScale onPress={() => setPaywallOpen(true)} accessibilityRole="button">
          <LinearGradient colors={[colors.accent, colors.accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upgradeCard}>
            <View style={styles.upgradeRow}>
              <View style={styles.upgradeIcon}>
                <Icon name="sparkles" size={20} color={colors.white} />
              </View>
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Upgrade to PetPal+</Text>
                <Text style={styles.upgradeBody}>Vet-built plans · smart reminders · booking</Text>
              </View>
              <Icon name="chevron-right" size={16} color={withAlpha(colors.white, 0.7)} />
            </View>
          </LinearGradient>
        </PressableScale>
      )}

      {/* The household's three jobs — the PEOPLE, the HOME, the PETS — are
          three destinations of their own rather than tabs inside one screen, so
          each is one tap from here. They share a password gate, not a route. */}
      <SectionHeader>Family</SectionHeader>
      <Group>
        <Row
          onPress={() => router.push("/settings/family")}
          leading={<IconCircle icon="people" tint={colors.accent} bg={colors.accentSoft} />}
          title="Family"
          subtitle={`${memberCount} member${memberCount === 1 ? "" : "s"} · roles & invites`}
          trailing={<Chevron />}
        />
        <Row
          onPress={() => router.push("/settings/household")}
          leading={<IconCircle icon="home" tint={colors.green} bg={colors.greenSoft} />}
          title="Household"
          subtitle={`${householdName} · switch, rename & lock`}
          trailing={<Chevron />}
        />
        <Row
          onPress={() => router.push("/settings/pets")}
          leading={<IconCircle icon="paw" tint={colors.orange} bg={colors.orangeSoft} />}
          title="Pets"
          subtitle={`${petCount} pet${petCount === 1 ? "" : "s"} · details & transfers`}
          trailing={<Chevron />}
        />
      </Group>

      <SectionHeader>Settings</SectionHeader>
      <Group>
        <Row
          onPress={() => router.push("/settings/general")}
          leading={<IconCircle icon="gear" tint={colors.label2} bg={colors.fill} />}
          title="General"
          subtitle="Units & notifications"
          trailing={<Chevron />}
        />
        <Row
          onPress={() => router.push("/settings/accessibility")}
          leading={<IconCircle icon="eye" tint={colors.green} bg={colors.greenSoft} />}
          title="Accessibility"
          subtitle="Motion & transparency"
          trailing={<Chevron />}
        />
        <Row
          onPress={() => router.push("/settings/account")}
          leading={<IconCircle icon="person" tint={colors.orange} bg={colors.orangeSoft} />}
          title="Account"
          subtitle="Sign-in, progress & intro"
          trailing={<Chevron />}
        />
      </Group>

      <SectionHeader>Learn & Support</SectionHeader>
      <Group>
        <Row
          onPress={() => router.push("/instructions")}
          leading={<IconCircle icon="list" tint={colors.accent} bg={colors.accentSoft} />}
          title="How-to guides"
          subtitle="Weight checks, dental care & more"
          trailing={<Chevron />}
        />
        <Row
          onPress={emailSupport}
          leading={<IconCircle icon="cross" tint={colors.green} bg={colors.greenSoft} />}
          title="Contact support"
          subtitle="We usually reply within a day"
          trailing={<Chevron />}
        />
        <Row
          onPress={openHelp}
          leading={<IconCircle icon="eye" tint={colors.label2} bg={colors.fill} />}
          title="Help center"
          subtitle="FAQ & troubleshooting"
          trailing={<Chevron />}
        />
      </Group>

      <SectionHeader>Legal</SectionHeader>
      <Group>
        <Row
          onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "terms" } })}
          leading={<IconCircle icon="list" tint={colors.label2} bg={colors.fill} />}
          title="Terms of Service"
          subtitle="The rules for using PetPal"
          trailing={<Chevron />}
        />
        <Row
          onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "privacy" } })}
          leading={<IconCircle icon="shield" tint={colors.label2} bg={colors.fill} />}
          title="Privacy Policy"
          subtitle="What we collect & how it's used"
          trailing={<Chevron />}
        />
      </Group>

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    plusTile: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
    upgradeCard: {
      borderRadius: radius.md,
      padding: 16,
      shadowColor: colors.accent,
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    upgradeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    upgradeIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: withAlpha(colors.white, 0.15),
      alignItems: "center",
      justifyContent: "center",
    },
    upgradeText: { flex: 1, minWidth: 0 },
    upgradeTitle: { fontSize: 16, fontFamily: font.bold, color: colors.white },
    upgradeBody: { fontSize: 13, fontFamily: font.medium, color: withAlpha(colors.white, 0.8) },
  });
