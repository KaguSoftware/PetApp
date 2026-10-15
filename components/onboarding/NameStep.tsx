import { StyleSheet, TextInput, View } from "react-native";
import type { Species } from "@/data";
import { Mascot } from "@/components/mascot";
import { SpeechBubble, Text, borderWidth, fonts, spacing, useTheme } from "@/ui";

interface Props {
  species: Species;
  name: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

/** Step 2: big display-font name field, the mascot under a live "Hi, I'm {name}!" bubble. */
export function NameStep({ species, name, onChange, onSubmit }: Props) {
  const { colors } = useTheme();
  const trimmed = name.trim();
  return (
    <View style={styles.wrap}>
      <Text variant="display" style={styles.center} accessibilityRole="header">
        What&apos;s their name?
      </Text>
      <View style={styles.stage}>
        <SpeechBubble text={trimmed ? `Hi, I'm ${trimmed}!` : "Hi, I'm …"} />
        <Mascot species={species} size={190} mood="happy" />
      </View>
      <TextInput
        value={name}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder="Name"
        placeholderTextColor={colors.ink3}
        selectionColor={colors.green}
        accessibilityLabel="Pet name"
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={24}
        returnKeyType="next"
        style={[styles.input, { color: colors.ink, borderBottomColor: trimmed ? colors.ink : colors.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  center: { textAlign: "center" },
  stage: { alignItems: "center", gap: spacing.lg },
  input: {
    fontFamily: fonts.displayXBold,
    fontSize: 38,
    lineHeight: 48,
    textAlign: "center",
    minHeight: 64,
    borderBottomWidth: borderWidth * 2,
    paddingVertical: spacing.xs,
  },
});
