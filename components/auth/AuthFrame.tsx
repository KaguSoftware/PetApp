import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useTheme, spacing } from "@/ui";

export interface AuthFrameProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pinned under the form (switch-screen links, legal footnote). */
  footer?: React.ReactNode;
}

/** Shared shell for every signed-out / verification screen: keyboard-safe, title top-left, no art. */
export function AuthFrame({ title, subtitle, children, footer }: AuthFrameProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bg }]} behavior="padding">
      <ScrollView
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.head}>
          <Text variant="largeTitle" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text tone="ink2">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.form}>{children}</View>
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing["2xl"], gap: spacing["3xl"] },
  head: { gap: spacing.sm },
  form: { gap: spacing.md },
});
