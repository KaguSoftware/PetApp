import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export default function PetsScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Pets</Text>
      <Text style={styles.body}>Pixel-art dress-up and the cosmetics stage arrive in Phase 2–3.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, paddingHorizontal: 32 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.label },
  body: { marginTop: 8, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.label2, textAlign: "center" },
});
