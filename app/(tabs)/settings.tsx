import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { colors, radius } from "@/lib/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { userEmail, state, signOut } = useStore();

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.rowLabel}>Signed in as</Text>
        <Text style={styles.rowValue}>{userEmail ?? "—"}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.rowLabel}>Family ID</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {state.familyId || "—"}
        </Text>
      </View>
      <Pressable onPress={signOut} style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.7 }]}>
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: colors.label, letterSpacing: -0.4, marginBottom: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  rowLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.label2 },
  rowValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: colors.label, marginTop: 2 },
  signOut: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, alignItems: "center", marginTop: 16 },
  signOutLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.red },
});
