import { router, Stack } from "expo-router";
import { AdoptFlow } from "@/components/onboarding/AdoptFlow";

export default function NewPetScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Add a pet", headerLargeTitleEnabled: false }} />
      <AdoptFlow mode="add" onFinished={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />
    </>
  );
}
