import { useLocalSearchParams } from "expo-router";
import { Card, Screen, Text } from "@/ui";

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return (
    <Screen title="Join" back>
      <Card tone="ice">
        <Text variant="heading">Enter your invite code</Text>
        <Text tone="ink2">{code ? `Code ${code} is ready to redeem.` : "Redeeming invites arrives with sharing."}</Text>
      </Card>
    </Screen>
  );
}
