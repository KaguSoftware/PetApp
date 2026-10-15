import { Card, Screen, Text } from "@/ui";

export default function NewPetScreen() {
  return (
    <Screen title="New pet" back>
      <Card tone="pink">
        <Text variant="heading">Adopt another pet</Text>
        <Text tone="ink2">The adoption flow arrives with onboarding.</Text>
      </Card>
    </Screen>
  );
}
