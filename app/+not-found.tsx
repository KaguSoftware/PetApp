import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { Mascot } from "@/components/mascot";
import { PillButton, Screen, Text, spacing } from "@/ui";

/** Unknown route: a friendly dead end with a way back. */
export default function NotFound() {
  return (
    <Screen scroll={false} contentStyle={styles.wrap}>
      <Mascot species="dog" size={200} mood="sleepy" />
      <Text variant="display" style={styles.center} accessibilityRole="header">
        Nothing here
      </Text>
      <Text tone="ink2" style={styles.center}>
        We sniffed around but couldn&apos;t find that page.
      </Text>
      <PillButton label="Take me home" onPress={() => router.replace("/")} fullWidth={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  center: { textAlign: "center" },
});
