import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { deletePet, type Pet } from "@/data";
import { PillButton, spacing, Text } from "@/ui";

export function DangerZone({ pet }: { pet: Pet }) {
  const confirm = () =>
    Alert.alert(
      `Remove ${pet.name}?`,
      `${pet.name}'s profile, logs, weights and health records will be deleted for everyone in your household. This can't be undone.`,
      [
        { text: "Keep " + pet.name, style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            // Leave first so the profile never renders as "not found"; delete once the transition is done.
            if (router.canGoBack()) router.back();
            else router.replace("/home");
            setTimeout(() => {
              deletePet(pet.id).catch(() => undefined); // rolled back + toasted by the data layer
            }, 350);
          },
        },
      ],
    );
  return (
    <View style={styles.wrap}>
      <Text variant="small" tone="ink3" style={styles.note}>
        Danger zone
      </Text>
      <PillButton label={`Remove ${pet.name}`} icon="trash" variant="secondary" onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.xl },
  note: { textAlign: "center" },
});
