import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/Icons";
import { PressableScale, PRESS_SCALE_SMALL, SelectableChip, TextField } from "@/components/ui";
import { SingleWheelPicker } from "@/components/WheelPicker";
import { funRoleWheelOptions, OTHER_ROLE } from "@/lib/data";
import { colors, font, radius } from "@/lib/theme";

/**
 * A member can hold up to 3 roles at once: Admin and/or Pet caregiver
 * (independent toggle chips, no functionality tied to caregiver yet) plus one
 * optional free-text "fun" role with no functionality at all. The fun role
 * reuses the collapsible wheel pattern from BreedField — pick a curated
 * example or "Other" to hand off to a free-text field.
 */
export default function RoleField({
  isAdmin,
  isCaregiver,
  onToggleAdmin,
  onToggleCaregiver,
  funRole,
  customFunRole,
  onChangeFunRole,
  onChangeCustomFunRole,
}: {
  isAdmin: boolean;
  isCaregiver: boolean;
  onToggleAdmin: () => void;
  onToggleCaregiver: () => void;
  funRole: string;
  customFunRole: string;
  onChangeFunRole: (v: string) => void;
  onChangeCustomFunRole: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOtherFunRole = funRole === OTHER_ROLE;

  // Landing on "Other" closes the wheel and hands off straight to the
  // custom-name field below, rather than leaving the wheel open on its last row.
  const handleChange = (r: string) => {
    onChangeFunRole(r);
    if (r === OTHER_ROLE) setOpen(false);
  };

  return (
    <View>
      <View style={styles.chipRow}>
        <SelectableChip label="Admin" selected={isAdmin} onPress={onToggleAdmin} />
        <SelectableChip label="Pet caregiver" selected={isCaregiver} onPress={onToggleCaregiver} />
      </View>

      <PressableScale scaleTo={PRESS_SCALE_SMALL} onPress={() => setOpen((o) => !o)}>
        <View style={styles.row}>
          <Text style={styles.value}>{funRole}</Text>
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <Icon name="chevron-right" size={16} color={colors.label3} />
          </View>
        </View>
      </PressableScale>

      {open ? (
        <View style={{ marginTop: 10 }}>
          <SingleWheelPicker values={funRoleWheelOptions()} value={funRole} onChange={handleChange} />
        </View>
      ) : null}

      {isOtherFunRole ? (
        <TextField
          value={customFunRole}
          onChangeText={onChangeCustomFunRole}
          placeholder="e.g. Walk specialist, Litterbox guardian, Cuddle manager"
          autoCorrect={false}
          returnKeyType="done"
          style={{ marginTop: 10 }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  value: { fontSize: 16, fontFamily: font.medium, color: colors.label },
});
