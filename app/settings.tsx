import { Stack } from "expo-router";
import { AccountSection } from "@/components/settings/AccountSection";
import { PetsSection } from "@/components/settings/PetsSection";
import { AppearanceSection, UnitsSection } from "@/components/settings/PreferencesSection";
import { SharingSection } from "@/components/settings/SharingSection";
import { Screen } from "@/ui";

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <Screen>
        <PetsSection />
        <SharingSection />
        <UnitsSection />
        <AppearanceSection />
        <AccountSection />
      </Screen>
    </>
  );
}
