import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import PetAvatar from "@/components/PetAvatar";
import Sheet from "@/components/Sheet";
import { ACTION_ICON, Icon, type IconName } from "@/components/Icons";
import {
  AccentButton,
  FieldLabel,
  PressableScale,
  PRESS_SCALE_SMALL,
  SelectableChip,
  SheetFooter,
  SheetSubtitle,
  SheetTitle,
  TextField,
} from "@/components/ui";
import { ACTIONS, PORTIONS, shortcutTileLabel, type ActionType, type Pet } from "@/lib/data";
import { useStore } from "@/lib/store";
import { colors, font, radius, withAlpha } from "@/lib/theme";

/** Glyphs offered in the icon picker — the "you pick the icon" part of a shortcut. */
const ICON_CHOICES: IconName[] = [
  "bowl", "drop", "broom", "paw", "scissors", "pill", "stethoscope", "star",
  "heart-text", "bell", "clock", "gift", "sparkles", "flame", "bag", "box",
  "syringe", "cross", "calendar", "chart",
];

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
  const { state, addShortcut, toast } = useStore();
  const pets = state.pets;

  const [petIds, setPetIds] = useState<string[]>([]);
  const [type, setType] = useState<ActionType>("fed");
  const [medId, setMedId] = useState<string | null>(null);
  const [portion, setPortion] = useState<Portion>("1");
  const [icon, setIcon] = useState<IconName>("bowl");
  const [iconTouched, setIconTouched] = useState(false);
  const [label, setLabel] = useState("");

  // Reset the whole form each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    const first = pets[0];
    setPetIds(first ? [first.id] : []);
    setType("fed");
    setMedId(first?.meds[0]?.id ?? null);
    setPortion("1");
    setIcon("bowl");
    setIconTouched(false);
    setLabel("");
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

  // The icon tracks the action's default until the user picks one deliberately.
  useEffect(() => {
    if (!iconTouched) setIcon(ACTION_ICON[type].icon);
  }, [type, iconTouched]);

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

  // Live preview mirrors the tile.
  const previewLabel = shortcutTileLabel(
    { id: "", petIds, type, medId: activeMedId, icon, label: label.trim() || undefined, portionFrac: undefined, sort: 0 },
    pets
  );

  const save = () => {
    if (selected.length === 0) return;
    addShortcut({
      petIds: selected.map((p) => p.id),
      type,
      medId: type === "meds" ? activeMedId : undefined,
      icon,
      label: label.trim() || undefined,
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

      <FieldLabel>Pets</FieldLabel>
      <View style={styles.chips}>
        {pets.length > 1 ? <SelectableChip label="All pets" selected={allSelected} onPress={toggleAll} /> : null}
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

      <FieldLabel>Icon</FieldLabel>
      <View style={styles.iconGrid}>
        {ICON_CHOICES.map((name) => {
          const selectedIcon = icon === name;
          return (
            <PressableScale
              key={name}
              scaleTo={PRESS_SCALE_SMALL}
              onPress={() => {
                setIcon(name);
                setIconTouched(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${name} icon`}
              accessibilityState={{ selected: selectedIcon }}
              hitSlop={4}
            >
              <View style={[styles.iconCell, selectedIcon && styles.iconCellSelected]}>
                <Icon name={name} size={20} color={selectedIcon ? colors.white : colors.label2} />
              </View>
            </PressableScale>
          );
        })}
      </View>

      <FieldLabel>Label</FieldLabel>
      <TextField value={label} onChangeText={setLabel} placeholder={previewLabel} maxLength={20} returnKeyType="done" />

      <SheetFooter>
        <AccentButton disabled={selected.length === 0} onPress={save}>
          Add shortcut
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { marginTop: 8, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3, lineHeight: 17 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconCell: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  iconCellSelected: { backgroundColor: colors.accent, borderColor: withAlpha(colors.accent, 0.4) },
});
