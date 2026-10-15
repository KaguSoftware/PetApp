import { router } from "expo-router";
import { AdoptFlow } from "@/components/onboarding/AdoptFlow";

export default function AdoptScreen() {
  return <AdoptFlow mode="first" onFinished={() => router.replace("/home")} />;
}
