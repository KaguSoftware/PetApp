import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icons";
import { timeAgo, useStore } from "@/lib/store";
import { colors, radius } from "@/lib/theme";

/**
 * Phase-1 Home: proves live hydration from the shared Supabase backend
 * (pets, members, coins, streak, latest activity). The full glance-hero
 * design lands in Phase 2.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { state, hydrated, userEmail } = useStore();

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const latest = state.activities[0];
  const latestPet = latest && state.pets.find((p) => p.id === latest.petId);
  const latestMember = latest && state.members.find((m) => m.id === latest.memberId);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>{userEmail}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Icon name="coin" size={20} color={colors.accent} />
          <Text style={styles.statValue}>{state.coins}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="flame" size={20} color={colors.orange} />
          <Text style={styles.statValue}>{state.streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="people" size={20} color={colors.green} />
          <Text style={styles.statValue}>{state.members.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Pets</Text>
      {state.pets.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardBody}>No pets yet — new pets will appear here once added.</Text>
        </View>
      ) : (
        state.pets.map((pet) => (
          <View key={pet.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.petDot, { backgroundColor: colors.accentSoft }]}>
                <Icon name="paw" size={20} color={colors.accent} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{pet.name}</Text>
                <Text style={styles.cardBody}>
                  {pet.breed} · {pet.ageYears} {pet.ageYears === 1 ? "year" : "years"} · {pet.weightKg} kg
                </Text>
              </View>
            </View>
          </View>
        ))
      )}

      {latest && latestPet && latestMember ? (
        <>
          <Text style={styles.sectionTitle}>Latest activity</Text>
          <View style={styles.card}>
            <Text style={styles.cardBody}>
              {latestMember.name} logged “{latest.type}” for {latestPet.name} · {timeAgo(latest.ts)}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  container: { paddingHorizontal: 16, paddingBottom: 32 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: colors.label, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.label2, marginTop: 2, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.label },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.label2 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.label, marginTop: 20, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  petDot: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.label },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.label2, marginTop: 1 },
});
