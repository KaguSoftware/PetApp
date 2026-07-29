import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import BreedField from "@/components/BreedField";
import DateField from "@/components/DateField";
import PetAvatar from "@/components/PetAvatar";
import Sheet from "@/components/Sheet";
import {
  AccentButton,
  Chevron,
  ConfirmRow,
  FieldLabel,
  Group,
  IconCircle,
  Row,
  SectionHeader,
  Segmented,
  SheetTitle,
  SmallButton,
} from "@/components/ui";
import {
  BREEDS_BY_SPECIES,
  formatAge,
  formatWeight,
  kgToUnit,
  OTHER_BREED,
  unitToKg,
  weightUnitLabel,
  type Pet,
  type PetTransfer,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { useColors } from "@/lib/theme";
import { Field, useFamilyStyles } from "./shared";

/* -- Local date helper -- birth-date entry uses the shared <DateField>. -- */

function atNoon(d: Date) {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c.getTime();
}

/**
 * Pets screen — the ANIMALS in this household: the roster, adding one, editing
 * the details every other screen reads (breed, age, weight, cup size, chip,
 * allergies), and the transfers that move a whole pet between households.
 */
export default function PetsSection() {
  const router = useRouter();
  const colors = useColors();
  const shared = useFamilyStyles();
  const {
    state,
    editPet,
    deletePet,
    fetchPetTransfers,
    acceptPetTransfer,
    rejectPetTransfer,
    cancelPetTransfer,
    toast,
  } = useStore();

  const canManage = state.myRole === "owner" || state.myRole === "admin";

  // Pets being offered to or from this household (0039) — admin+ only.
  const [petTransfers, setPetTransfers] = useState<PetTransfer[]>([]);
  const [decidingTransferId, setDecidingTransferId] = useState<string | null>(null);
  useEffect(() => {
    if (!canManage) return;
    fetchPetTransfers().then(setPetTransfers);
  }, [canManage, state.activeHouseholdId, fetchPetTransfers]);

  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editPetName, setEditPetName] = useState("");
  const [editPetBreed, setEditPetBreed] = useState<string>(OTHER_BREED);
  const [editPetCustomBreed, setEditPetCustomBreed] = useState("");
  const [editPetAge, setEditPetAge] = useState("");
  const [editPetWeight, setEditPetWeight] = useState("");
  const [editPetCup, setEditPetCup] = useState("");
  const [editPetGender, setEditPetGender] = useState<"male" | "female" | "unset">("unset");
  const [editPetBirth, setEditPetBirth] = useState<number | null>(null);
  const [editPetChip, setEditPetChip] = useState("");
  const [editPetAllergies, setEditPetAllergies] = useState("");

  const openEditPet = (p: Pet) => {
    setEditingPet(p);
    setEditPetName(p.name);
    if (BREEDS_BY_SPECIES[p.species].includes(p.breed)) {
      setEditPetBreed(p.breed);
      setEditPetCustomBreed("");
    } else {
      setEditPetBreed(OTHER_BREED);
      setEditPetCustomBreed(p.breed);
    }
    setEditPetAge(String(Math.round(p.ageYears * 10) / 10));
    setEditPetWeight(String(kgToUnit(p.weightKg, state.units)));
    setEditPetCup(String(p.cupGrams));
    setEditPetGender(p.gender ?? "unset");
    setEditPetBirth(p.birthDate != null ? atNoon(new Date(p.birthDate)) : null);
    setEditPetChip(p.microchip ?? "");
    setEditPetAllergies(p.allergies ?? "");
  };

  const resolvedEditBreed =
    editPetBreed === OTHER_BREED
      ? editPetCustomBreed.trim() || (editingPet?.species === "dog" ? "Mixed breed" : "House cat")
      : editPetBreed;

  return (
    <>
      <SectionHeader>Pets</SectionHeader>
      <Group>
        {state.pets.map((p) => (
          <Row
            key={p.id}
            onPress={() => router.push(`/pet/${p.id}`)}
            leading={<PetAvatar pet={p} size="sm" />}
            title={p.name}
            subtitle={`${p.breed} · ${formatAge(p.ageYears)} · ${formatWeight(p.weightKg, state.units)}`}
            interactiveTrailing
            trailing={<SmallButton label="Edit" tone="gray" onPress={() => openEditPet(p)} />}
          />
        ))}
        {/* Same affordance as "Invite someone" on the Family screen — adding a
            pet is the other way this household grows, so it gets a real row
            here instead of sending people back out to the Pets tab. */}
        <Row
          onPress={() => router.push("/pet/new")}
          leading={<IconCircle icon="plus" tint={colors.white} bg={colors.accent} size={38} />}
          title="Add a pet"
          subtitle="Everyone in this household can care for them"
          trailing={<Chevron />}
        />
      </Group>
      <Text style={shared.footnote}>Tap a pet for full details, or Edit to change its info.</Text>

      {/* Pets on the way in or out. An incoming one moves the whole animal —
          history, health records, accessories — into this household. */}
      {canManage && petTransfers.length > 0 ? (
        <>
          <SectionHeader>Pet transfers</SectionHeader>
          <Group>
            {petTransfers.map((t) =>
              t.direction === "incoming" ? (
                <Row
                  key={t.id}
                  leading={<IconCircle icon="paw" tint={colors.accent} bg={colors.accentSoft} />}
                  title={t.petName}
                  subtitle={`${t.fromHouseholdName ?? "Another household"} wants to move them here`}
                  interactiveTrailing
                  trailing={
                    <View style={shared.rowActions}>
                      <SmallButton
                        label="Decline"
                        tone="red"
                        disabled={decidingTransferId === t.id}
                        onPress={async () => {
                          setDecidingTransferId(t.id);
                          const ok = await rejectPetTransfer(t.id);
                          setDecidingTransferId(null);
                          if (ok) setPetTransfers((prev) => prev.filter((x) => x.id !== t.id));
                        }}
                      />
                      <SmallButton
                        label="Accept"
                        tone="green"
                        disabled={decidingTransferId === t.id}
                        onPress={async () => {
                          setDecidingTransferId(t.id);
                          const ok = await acceptPetTransfer(t.id);
                          setDecidingTransferId(null);
                          if (ok) setPetTransfers((prev) => prev.filter((x) => x.id !== t.id));
                        }}
                      />
                    </View>
                  }
                />
              ) : (
                <Row
                  key={t.id}
                  leading={<IconCircle icon="paw" tint={colors.orange} bg={colors.orangeSoft} />}
                  title={t.petName}
                  subtitle={`Waiting for ${t.toHouseholdName ?? "the other household"} to accept`}
                  interactiveTrailing
                  trailing={
                    <SmallButton
                      label="Cancel"
                      tone="gray"
                      disabled={decidingTransferId === t.id}
                      onPress={async () => {
                        setDecidingTransferId(t.id);
                        const ok = await cancelPetTransfer(t.id);
                        setDecidingTransferId(null);
                        if (ok) setPetTransfers((prev) => prev.filter((x) => x.id !== t.id));
                      }}
                    />
                  }
                />
              )
            )}
          </Group>
        </>
      ) : null}

      <View style={{ height: 16 }} />

      {/* Edit pet */}
      <Sheet open={editingPet !== null} onClose={() => setEditingPet(null)}>
        {editingPet && (
          <>
            <SheetTitle>Edit {editingPet.name}</SheetTitle>

            <Field label="Name" value={editPetName} onChangeText={setEditPetName} />

            <FieldLabel>Breed</FieldLabel>
            <BreedField
              species={editingPet.species}
              breed={editPetBreed}
              customBreed={editPetCustomBreed}
              onChangeBreed={setEditPetBreed}
              onChangeCustomBreed={setEditPetCustomBreed}
            />

            <View style={styles.twoCol}>
              <Field style={{ flex: 1 }} label="Age (years)" value={editPetAge} onChangeText={setEditPetAge} keyboardType="decimal-pad" />
              <Field
                style={{ flex: 1 }}
                label={`Weight (${weightUnitLabel(state.units)})`}
                value={editPetWeight}
                onChangeText={setEditPetWeight}
                keyboardType="decimal-pad"
              />
            </View>

            <FieldLabel>Gender</FieldLabel>
            <Segmented
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "unset", label: "Not set" },
              ]}
              value={editPetGender}
              onChange={setEditPetGender}
            />
            <Text style={shared.fieldHint}>Used for the age-and-gender-specific weight & feeding guide.</Text>

            <FieldLabel>Birth date (optional)</FieldLabel>
            <DateField value={editPetBirth} onChange={setEditPetBirth} mode="past" allowClear showChips={false} />
            {editPetBirth != null ? (
              <Text style={shared.fieldHint}>With a birth date set, age is calculated automatically.</Text>
            ) : null}

            <Field
              label="Microchip number (optional)"
              value={editPetChip}
              onChangeText={setEditPetChip}
              placeholder="e.g. 985112003456789"
              autoCapitalize="none"
            />

            <Field
              label="Allergies & alerts (optional)"
              value={editPetAllergies}
              onChangeText={setEditPetAllergies}
              placeholder="e.g. Chicken allergy, sensitive stomach"
            />

            <Field
              label="Cup size (grams of food per cup)"
              value={editPetCup}
              onChangeText={setEditPetCup}
              keyboardType="number-pad"
            />

            <View style={{ marginTop: 28 }}>
              <AccentButton
                disabled={!editPetName.trim()}
                onPress={() => {
                  // The stepper clamps at today, but quick chips + stale state
                  // keep the guard worth having.
                  if (editPetBirth != null && editPetBirth > Date.now()) {
                    toast("alert", "Birth date is in the future", "Pick the actual birth date");
                    return;
                  }
                  editPet(editingPet.id, {
                    name: editPetName.trim(),
                    breed: resolvedEditBreed,
                    ageYears: Number(editPetAge) || editingPet.ageYears,
                    weightKg: unitToKg(Number(editPetWeight) || kgToUnit(editingPet.weightKg, state.units), state.units),
                    cupGrams: Math.round(Number(editPetCup)) || editingPet.cupGrams,
                    gender: editPetGender === "unset" ? null : editPetGender,
                    birthDate: editPetBirth,
                    microchip: editPetChip.trim() || null,
                    allergies: editPetAllergies.trim() || null,
                  });
                  toast("paw", `${editPetName.trim()} updated`, "");
                  setEditingPet(null);
                }}
              >
                Save changes
              </AccentButton>
            </View>

            <Group style={{ marginTop: 12 }}>
              <ConfirmRow
                label="Delete pet"
                confirmLabel={`Tap again — deletes ${editingPet.name} and all history`}
                onConfirm={() => {
                  const name = editingPet.name;
                  deletePet(editingPet.id);
                  setEditingPet(null);
                  toast("person", `${name} was removed`, "");
                }}
              />
            </Group>
          </>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  twoCol: { flexDirection: "row", gap: 12 },
});
