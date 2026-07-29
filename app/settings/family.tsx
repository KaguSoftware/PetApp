import FamilyScreen from "@/components/family/FamilyScreen";
import MembersSection from "@/components/family/MembersSection";

/**
 * Family — the PEOPLE in the household. The HOME lives at
 * `/settings/household`, the ANIMALS at `/settings/pets`; all three are their
 * own row in Settings and share the password gate in <FamilyScreen>.
 */
export default function FamilySettingsPage() {
  return (
    <FamilyScreen title="Family">
      <MembersSection />
    </FamilyScreen>
  );
}
