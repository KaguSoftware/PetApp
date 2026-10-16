import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { deletePet, type Pet } from "@/data";
import { HIT, PressableScale, spacing, Text } from "@/ui";

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
      <PressableScale onPress={confirm} haptic="tap" accessibilityRole="button" accessibilityLabel={`Remove ${pet.name}`} style={styles.btn}>
        <Text tone="ink2" variant="headline">
          {`Remove ${pet.name}`}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginTop: spacing.lg },
  btn: { minHeight: HIT, justifyContent: "center", paddingHorizontal: spacing.xl },
});
