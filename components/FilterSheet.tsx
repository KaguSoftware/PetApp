import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Sheet from "@/components/Sheet";
import { Icon, ACTION_ICON } from "@/components/Icons";
import { AccentButton, FieldLabel, Segmented, SelectableChip, SheetFooter, SheetSubtitle, SheetTitle, TextField } from "@/components/ui";
import { ACTION_TYPES, ACTIONS, REMINDER_TAGS } from "@/lib/data";
import type { ListFilter, TimeRange } from "@/lib/useListFilter";
import type { Pet } from "@/lib/data";
import { useColors } from "@/lib/theme";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "all", label: "All time" },
];

/**
 * Shared filter sheet for the Notifications (pet + type + time range) and
 * Reminders (pet + tag) screens. Which axes render is prop-gated so each
 * screen only offers what applies to it.
 */
export default function FilterSheet({
  open,
  onClose,
  filter,
  pets,
  showRange = false,
  showTypes = false,
  showTags = false,
  extraTags = [],
}: {
  open: boolean;
  onClose: () => void;
  filter: ListFilter;
  pets: Pet[];
  showRange?: boolean;
  showTypes?: boolean;
  showTags?: boolean;
  extraTags?: string[];
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(), []);
  const [customTagOpen, setCustomTagOpen] = useState(false);
  const [customTag, setCustomTag] = useState("");

  const tagOptions = useMemo(() => {
    const preset = new Set<string>(REMINDER_TAGS);
    extraTags.forEach((t) => preset.add(t));
    return Array.from(preset);
  }, [extraTags]);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetTitle>Filter</SheetTitle>
      <SheetSubtitle>Narrow down what&apos;s shown</SheetSubtitle>

      {showRange ? (
        <>
          <FieldLabel>When</FieldLabel>
          <Segmented options={RANGE_OPTIONS} value={filter.range} onChange={filter.setRange} />
        </>
      ) : null}

      <FieldLabel>Pet</FieldLabel>
      <View style={styles.chipRow}>
        <SelectableChip label="All pets" selected={filter.petId == null} onPress={() => filter.setPetId(null)} />
        {pets.map((p) => (
          <SelectableChip key={p.id} label={p.name} selected={filter.petId === p.id} onPress={() => filter.setPetId(p.id)} />
        ))}
      </View>

      {showTypes ? (
        <>
          <FieldLabel>Type</FieldLabel>
          <View style={styles.chipRow}>
            {ACTION_TYPES.map((t) => {
              const active = filter.types.has(t);
              const a = ACTION_ICON[t];
              return (
                <SelectableChip
                  key={t}
                  label={ACTIONS[t].label}
                  selected={active}
                  onPress={() => filter.toggleType(t)}
                  leading={<Icon name={a.icon} size={14} color={active ? colors.white : colors.label} />}
                />
              );
            })}
          </View>
        </>
      ) : null}

      {showTags ? (
        <>
          <FieldLabel>Tag</FieldLabel>
          <View style={styles.chipRow}>
            {tagOptions.map((tag) => (
              <SelectableChip key={tag} label={tag} selected={filter.tags.has(tag)} onPress={() => filter.toggleTag(tag)} />
            ))}
            <SelectableChip label="+" selected={customTagOpen} onPress={() => setCustomTagOpen((v) => !v)} />
          </View>
          {customTagOpen ? (
            <View style={styles.customTagRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={customTag}
                  onChangeText={setCustomTag}
                  placeholder="Custom tag"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const t = customTag.trim();
                    if (t) filter.toggleTag(t);
                    setCustomTag("");
                    setCustomTagOpen(false);
                  }}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <SheetFooter>
        <AccentButton variant="tinted" onPress={filter.reset}>
          Reset filters
        </AccentButton>
      </SheetFooter>
    </Sheet>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
    customTagRow: { marginTop: 10 },
  });
