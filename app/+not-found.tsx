import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { layout, PillButton, Screen, Text } from "@/ui";

/** Unknown route: a friendly dead end with a way back. */
export default function NotFound() {
  return (
    <Screen headerless scroll={false} contentStyle={styles.wrap}>
      <Text variant="largeTitle" style={styles.center} accessibilityRole="header">
        Nothing here
      </Text>
      <Text tone="ink2" style={styles.center}>
        We couldn&apos;t find that page.
      </Text>
      <PillButton label="Take me home" onPress={() => router.replace("/")} fullWidth={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: layout.item },
  center: { textAlign: "center" },
});
