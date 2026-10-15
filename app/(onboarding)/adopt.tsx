import { router } from "expo-router";
import { Card, PillButton, Screen, Text } from "@/ui";

export default function AdoptScreen() {
  return (
    <Screen title="Adopt a pet">
      <Card tone="peach">
        <Text variant="heading">Meet your pet</Text>
        <Text tone="ink2">Pick a species, give it a name, and watch it pop in. Coming soon.</Text>
      </Card>
      <PillButton label="I was invited" variant="secondary" onPress={() => router.push("/join")} />
    </Screen>
  );
}
