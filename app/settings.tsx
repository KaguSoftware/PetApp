import { Chip, Screen, Text, useTheme, type ThemePreference } from "@/ui";
import { StyleSheet, View } from "react-native";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { preference, setPreference } = useTheme();
  return (
    <Screen title="Settings" back>
      <Text variant="heading">Appearance</Text>
      <View style={styles.row}>
        {OPTIONS.map((o) => (
          <Chip key={o.value} label={o.label} selected={preference === o.value} onPress={() => setPreference(o.value)} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
