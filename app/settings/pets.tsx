import FamilyScreen from "@/components/family/FamilyScreen";
import PetsSection from "@/components/family/PetsSection";

/**
 * Pets — the ANIMALS in this household: the roster, their details and the
 * transfers that move one between households. People live at
 * `/settings/family`, the household itself at `/settings/household`.
 */
export default function PetsSettingsPage() {
  return (
    <FamilyScreen title="Pets">
      <PetsSection />
    </FamilyScreen>
  );
}
