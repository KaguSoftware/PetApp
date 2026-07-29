import FamilyScreen from "@/components/family/FamilyScreen";
import HouseholdSection from "@/components/family/HouseholdSection";

/**
 * Household — the HOME itself: which one you're in, its name, its lock and its
 * lifecycle. People live at `/settings/family`, animals at `/settings/pets`.
 */
export default function HouseholdSettingsPage() {
  return (
    <FamilyScreen title="Household">
      <HouseholdSection />
    </FamilyScreen>
  );
}
