import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import PetAvatar from "@/components/PetAvatar";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon } from "@/components/Icons";
import {
  AccentButton,
  FieldLabel,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
} from "@/components/ui";
import { ACTIONS, PORTIONS, shortcutTileLabel, type ActionType, type Pet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { font, useColors, type Colors } from "@/lib/theme";

/** "ask" = open the portion picker on tap (single pet only); the rest bake a portion in. */
type Portion = (typeof PORTIONS)[number]["value"] | "ask";

/** The actions valid for EVERY selected pet — so a bulk shortcut applies to all
 *  of them. fed/water/groomed/vet are universal; litter is cat-only, walk
 *  dog-only, and meds is single-pet-with-meds only. */
function actionsForPets(selected: Pet[]): ActionType[] {
  const base: ActionType[] = ["fed", "water"];
  if (selected.length > 0 && selected.every((p) => p.species === "cat")) base.push("litter");
  if (selected.length > 0 && selected.every((p) => p.species === "dog")) base.push("walk");
  base.push("groomed");
  if (selected.length === 1 && selected[0].meds.length > 0) base.push("meds");
  base.push("vet");
  return base;
}

/** Builder for a new Home shortcut: pick pet(s) → action → (portion / med) → icon → label. */
export default function ShortcutBuilderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { state, addShortcut, toast } = useStore();
  const pets = state.pets;

  const [petIds, setPetIds] = useState<string[]>([]);
  const [type, setType] = useState<ActionType>("fed");
  const [medId, setMedId] = useState<string | null>(null);
  const [portion, setPortion] = useState<Portion>("1");

  // Reset the whole form each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    const first = pets[0];
    setPetIds(first ? [first.id] : []);
    setType("fed");
    setMedId(first?.meds[0]?.id ?? null);
    setPortion("1");
  }, [open, pets]);

  const selected = useMemo(() => pets.filter((p) => petIds.includes(p.id)), [pets, petIds]);
  const actions = actionsForPets(selected);
  const allSelected = pets.length > 1 && selected.length === pets.length;

  // Keep the action valid as the selection (and so its species/meds) changes.
  useEffect(() => {
    if (!actionsForPets(selected).includes(type)) setType("fed");
    setMedId((cur) => (cur && selected[0]?.meds.some((m) => m.id === cur) ? cur : selected[0]?.meds[0]?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petIds]);

  // The icon and the tile label are derived, not asked for — the old picker
  // grid and name field almost always ended on exactly these defaults.
  const icon = ACTION_ICON[type].icon;

  if (pets.length === 0) return null;

  const togglePet = (id: string) => {
    setPetIds((cur) => (cur.includes(id) ? (cur.length === 1 ? cur : cur.filter((x) => x !== id)) : [...cur, id]));
  };
  const toggleAll = () => setPetIds(allSelected ? [pets[0].id] : pets.map((p) => p.id));

  const needsMedPick = type === "meds" && selected.length === 1 && selected[0].meds.length > 1;
  const activeMedId = type === "meds" ? (medId ?? selected[0]?.meds[0]?.id) : undefined;
  const canAsk = selected.length === 1; // "ask each time" can't fan out across pets
  const isAsk = type === "fed" && portion === "ask" && canAsk;
  const chosenFrac = portion === "ask" ? 1 : PORTIONS.find((p) => p.value === portion)?.frac ?? 1;

  // Live preview mirrors the tile — including the portion suffix baked ones get.
  const previewLabel = shortcutTileLabel(
    { id: "", petIds, type, medId: activeMedId, icon, label: undefined, portionFrac: type === "fed" && !isAsk ? chosenFrac : undefined, sort: 0 },
    pets
  );

  const save = () => {
    if (selected.length === 0) return;
    addShortcut({
      petIds: selected.map((p) => p.id),
      type,
      medId: type === "meds" ? activeMedId : undefined,
      icon,
      label: undefined,
      portionFrac: type === "fed" && !isAsk ? chosenFrac : undefined,
    });
    const who = selected.length === 1 ? selected[0].name : allSelected ? "all pets" : `${selected.length} pets`;
    toast("sparkles", "Shortcut added", `${previewLabel} · ${who} one tap away`);
    onClose();
  };

  const fedHint = isAsk
    ? "Tapping opens the portion picker."
    : selected.length > 1
      ? `Logs ${PORTIONS.find((p) => p.value === portion)?.label ?? "1 cup"} to each pet, sized to their own cup.`
      : `Tapping logs ${Math.round(chosenFrac * (selected[0]?.cupGrams ?? 0))} g in one tap.`;

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>New shortcut</SheetTitle>
      <SheetSubtitle>One tap on Home logs it for the family.</SheetSubtitle>

      {/* A single-pet household would see one pre-selected, un-deselectable
          chip here — pure noise, so the whole section only exists with 2+. */}
      {pets.length > 1 ? (
        <>
          <FieldLabel>Pets</FieldLabel>
          <View style={styles.chips}>
            <SelectableChip label="All pets" selected={allSelected} onPress={toggleAll} />
            {pets.map((p) => (
              <SelectableChip
                key={p.id}
                label={p.name}
                selected={petIds.includes(p.id)}
                onPress={() => togglePet(p.id)}
                leading={<PetAvatar pet={p} size="xs" showCosmetics={false} />}
              />
            ))}
          </View>
          {selected.length > 1 ? <Text style={styles.hint}>One tap logs this for all {selected.length} selected pets.</Text> : null}
        </>
      ) : null}

      <FieldLabel>Action</FieldLabel>
      <View style={styles.chips}>
        {actions.map((t) => (
          <SelectableChip
            key={t}
            label={ACTIONS[t].label}
            selected={type === t}
            onPress={() => setType(t)}
            leading={<Icon name={ACTION_ICON[t].icon} size={14} color={type === t ? colors.white : colors.label2} />}
          />
        ))}
      </View>

      {needsMedPick ? (
        <>
          <FieldLabel>Which med?</FieldLabel>
          <View style={styles.chips}>
            {selected[0].meds.map((m) => (
              <SelectableChip key={m.id} label={m.name} selected={activeMedId === m.id} onPress={() => setMedId(m.id)} />
            ))}
          </View>
        </>
      ) : null}

      {type === "fed" ? (
        <>
          <FieldLabel>Portion</FieldLabel>
          <View style={styles.chips}>
            {PORTIONS.map((p) => (
              <SelectableChip key={p.value} label={p.label} selected={portion === p.value} onPress={() => setPortion(p.value)} />
            ))}
            {canAsk ? <SelectableChip label="Ask each time" selected={portion === "ask"} onPress={() => setPortion("ask")} /> : null}
          </View>
          <Text style={styles.hint}>{fedHint}</Text>
        </>
      ) : null}

      <Text style={styles.hint}>Appears on Home as “{previewLabel}”.</Text>

      <SheetFooter>
        <AccentButton disabled={selected.length === 0} onPress={save}>
          Add shortcut
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { marginTop: 8, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
});
