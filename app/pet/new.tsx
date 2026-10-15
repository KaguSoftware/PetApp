import { router } from "expo-router";
import { AdoptFlow } from "@/components/onboarding/AdoptFlow";

export default function NewPetScreen() {
  return <AdoptFlow mode="add" onFinished={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />;
}
