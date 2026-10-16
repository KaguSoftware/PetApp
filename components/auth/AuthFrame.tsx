import { Stack } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { layout, Text, useContentPadding, useTheme } from "@/ui";

export interface AuthFrameProps {
  /** Becomes the native (large) header title. */
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pinned under the form (switch-screen links, legal footnote). */
  footer?: React.ReactNode;
}

/**
 * Shared shell for every sign-in / verification screen: the native header carries the title and
 * the back button, so the content starts below it. Keyboard-safe, no art.
 */
export function AuthFrame({ title, subtitle, children, footer }: AuthFrameProps) {
  const { colors } = useTheme();
  const padding = useContentPadding();
  return (
    <>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          alwaysBounceVertical={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, padding]}
        >
          {subtitle ? <Text tone="ink2">{subtitle}</Text> : null}
          <View style={styles.form}>{children}</View>
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: layout.gutter, gap: layout.section },
  form: { gap: layout.item },
});
