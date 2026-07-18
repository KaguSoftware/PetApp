import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import NotificationBell from "@/components/NotificationBell";
import PageLoading from "@/components/PageLoading";
import Paywall from "@/components/Paywall";
import { TabScreen } from "@/components/Screen";
import { Icon } from "@/components/Icons";
import { Chevron, Group, IconCircle, Row, SectionHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colors, font, radius } from "@/lib/theme";

export default function SettingsPage() {
  const router = useRouter();
  const { state, hydrated, setPremium, toast } = useStore();
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (!hydrated) {
    return (
      <TabScreen title="Settings" trailing={<NotificationBell />}>
        <PageLoading />
      </TabScreen>
    );
  }

  const petCount = state.pets.length;
  const memberCount = state.members.length;

  return (
    <TabScreen title="Settings" trailing={<NotificationBell />}>
      {/* PetPal+ status / upgrade */}
      {state.premium ? (
        <Group>
          <Row
            leading={
              <LinearGradient colors={[colors.accent, colors.accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.plusTile}>
                <Icon name="sparkles" size={18} color={colors.white} />
              </LinearGradient>
            }
            title="PetPal+ is active"
            subtitle="Care plans, smart reminders & vet booking"
            trailing={
              <Pressable
                onPress={() => {
                  setPremium(false);
                  toast("sparkles", "PetPal+ deactivated", "You can re-enable it anytime");
                }}
                style={({ pressed }) => [styles.turnOff, pressed && { transform: [{ scale: 0.95 }] }]}
              >
                <Text style={styles.turnOffLabel}>Turn off</Text>
              </Pressable>
            }
          />
        </Group>
      ) : (
        <Pressable onPress={() => setPaywallOpen(true)} style={({ pressed }) => pressed && { transform: [{ scale: 0.98 }] }}>
          <LinearGradient colors={[colors.accent, colors.accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.upgradeCard}>
            <View style={styles.upgradeRow}>
              <View style={styles.upgradeIcon}>
                <Icon name="sparkles" size={20} color={colors.white} />
              </View>
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Upgrade to PetPal+</Text>
                <Text style={styles.upgradeBody}>Vet-built plans · smart reminders · booking</Text>
              </View>
              <Icon name="chevron-right" size={16} color="rgba(255, 255, 255, 0.7)" />
            </View>
          </LinearGradient>
        </Pressable>
      )}

      <SectionHeader>Settings</SectionHeader>
      <Group>
        <Row
          onPress={() => router.push("/settings/family")}
          leading={<IconCircle icon="people" tint={colors.accent} bg={colors.accentSoft} />}
          title="Family"
          subtitle={`${memberCount} member${memberCount === 1 ? "" : "s"} · ${petCount} pet${petCount === 1 ? "" : "s"}`}
          trailing={<Chevron />}
        />
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

      <Paywall open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  plusTile: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  turnOff: {
    borderRadius: radius.full,
    backgroundColor: colors.fill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  turnOffLabel: { fontSize: 13, fontFamily: font.semibold, color: colors.label },
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
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeText: { flex: 1, minWidth: 0 },
  upgradeTitle: { fontSize: 16, fontFamily: font.bold, color: colors.white },
  upgradeBody: { fontSize: 13, fontFamily: font.medium, color: "rgba(255, 255, 255, 0.8)" },
});
