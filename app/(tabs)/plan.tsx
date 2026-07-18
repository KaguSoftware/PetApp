import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export default function PlanScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Care</Text>
      <Text style={styles.body}>Care plans and the daily checklist arrive in Phase 5.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, paddingHorizontal: 32 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.label },
  body: { marginTop: 8, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.label2, textAlign: "center" },
});
