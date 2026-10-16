import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { editPet, usePet, type Pet } from "@/data";
import { DateField, layout, MenuRow, PillButton, SheetScreen, TextField } from "@/ui";

type Gender = "male" | "female" | "none";

function EditForm({ pet }: { pet: Pet }) {
  const [name, setName] = useState(pet.name);
  const [breed, setBreed] = useState(pet.breed ?? "");
  const [birth, setBirth] = useState(pet.birthDate ?? "");
  const [gender, setGender] = useState<Gender>(pet.gender ?? "none");
  const [notes, setNotes] = useState(pet.notes ?? "");

  const save = () => {
    if (router.canGoBack()) router.back();
    editPet(pet.id, {
      name: name.trim(),
      breed: breed.trim() || null,
      birthDate: birth || null,
      gender: gender === "none" ? null : gender,
      notes: notes.trim() || null,
    }).catch(() => undefined); // data layer rolls back and toasts
  };

  return (
    <SheetScreen title={`About ${pet.name}`}>
      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField label="Breed" value={breed} onChangeText={setBreed} placeholder="Optional" />
      <DateField label="Birthday" value={birth} onChange={setBirth} optional maximumDate={new Date()} />
      <MenuRow<Gender>
        label="Gender"
        selected={gender}
        onSelect={setGender}
        options={[
          { value: "female", label: "Girl" },
          { value: "male", label: "Boy" },
          { value: "none", label: "Not set" },
        ]}
      />
      <TextField label="Notes" multiline value={notes} onChangeText={setNotes} placeholder="Allergies, quirks, favourite toy" />
      <PillButton label="Save" style={styles.save} onPress={save} disabled={name.trim().length === 0} />
    </SheetScreen>
  );
}

/** `/pet/[id]/edit`: the About form as a native form sheet. */
export default function EditPetSheet() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const pet = usePet(id ?? "");
  if (!pet) return <SheetScreen title="About">{null}</SheetScreen>;
  return <EditForm pet={pet} />;
}

const styles = StyleSheet.create({
  save: { marginTop: layout.headerGap },
});
