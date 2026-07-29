import { useMemo } from "react";
import { Alert, StyleSheet, Text, View, type KeyboardTypeOptions } from "react-native";
import { FieldLabel, TextField } from "@/components/ui";
import type { HouseholdAccount } from "@/lib/data";
import { font, radius, useColors, type Colors } from "@/lib/theme";

/**
 * Pieces the three Family screens (Family · Household · Pets) share.
 *
 * They live here rather than in a route file because each route is now only a
 * lock gate plus one section — everything below it belongs to exactly one
 * screen, and the handful of things that don't (the role badge, the labelled
 * text field, the destructive confirm, the section footnotes) are these.
 */

export const ROLE_LABEL: Record<HouseholdAccount["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

/** Styles used by more than one screen. Screen-only styles stay in their own file. */
export function useFamilyStyles() {
  const colors = useColors();
  return useMemo(() => makeStyles(colors), [colors]);
}

/** Small role pill shown on account rows ("Owner" / "Admin" / "Member"). */
export function RoleBadge({ role }: { role: HouseholdAccount["role"] }) {
  const colors = useColors();
  const styles = useFamilyStyles();
  const elevated = role === "owner" || role === "admin";
  return (
    <View style={[styles.roleBadge, elevated && { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.roleBadgeLabel, elevated && { color: colors.accentDeep }]}>{ROLE_LABEL[role]}</Text>
    </View>
  );
}

/** Labelled text field — FieldLabel + TextField primitives plus an optional hint line. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure = false,
  autoCapitalize,
  hint,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secure?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  hint?: string;
  style?: object;
}) {
  const styles = useFamilyStyles();
  return (
    <View style={style}>
      <FieldLabel>{label}</FieldLabel>
      <TextField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/** Native two-step confirm for anything that removes access or data. */
export function confirmDestructive(title: string, message: string, actionLabel: string, action: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: actionLabel, style: "destructive", onPress: action },
  ]);
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    rowActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    roleBadge: { borderRadius: radius.full, backgroundColor: colors.fill, paddingHorizontal: 10, paddingVertical: 4 },
    roleBadgeLabel: { fontSize: 12, fontFamily: font.semibold, color: colors.label2 },
    footnote: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
    fieldHint: { marginTop: 6, paddingHorizontal: 4, fontSize: 12, fontFamily: font.regular, color: colors.label3 },
    errorText: {
      marginTop: 8,
      alignSelf: "stretch",
      textAlign: "left",
      fontSize: 14,
      fontFamily: font.medium,
      color: colors.red,
    },
  });
