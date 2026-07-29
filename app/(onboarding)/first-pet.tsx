import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { AccentButton } from "@/components/ui";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

export default function FirstPetScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state } = useStore();
  const householdName = state.households.find((h) => h.id === state.activeHouseholdId)?.name ?? "Your household";

  const next = () => router.replace("/(onboarding)/invite");

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} alwaysBounceVertical={false}>
      <View style={styles.iconWrap}>
        <Icon name="paw" size={26} color={colors.accent} />
      </View>
      <Text style={styles.kicker}>{householdName} is ready</Text>
      <Text style={styles.title}>Add your first pet</Text>
      <Text style={styles.subtitle}>
        Pets are the heart of PetPal — feeding, walks, meds and vet visits all hang off them. You can always add more later.
      </Text>
      <View style={styles.cta}>
        <AccentButton onPress={() => router.push("/pet/new?onboarding=1")}>Add a pet</AccentButton>
        <Pressable onPress={next} style={styles.skip} accessibilityRole="button">
          <Text style={styles.skipLabel}>Skip for now</Text>
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
    kicker: { fontSize: 13, fontFamily: font.semibold, color: colors.accent, textTransform: "uppercase", letterSpacing: 0.6 },
    title: { marginTop: 4, fontSize: 24, fontFamily: font.bold, color: colors.label, letterSpacing: -0.4 },
    subtitle: { marginTop: 8, fontSize: 15, fontFamily: font.regular, color: colors.label2, lineHeight: 22 },
    cta: { marginTop: 28, gap: 4 },
    skip: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 16 },
    skipLabel: { fontSize: 15, fontFamily: font.semibold, color: colors.label2 },
  });
