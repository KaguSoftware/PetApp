import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Text, useTheme, spacing, type IconName } from "@/ui";

export interface AuthFrameProps {
  title: string;
  subtitle?: string;
  /** Round pastel badge above the title. */
  badge?: { icon: IconName; tone: string };
  children: React.ReactNode;
  /** Pinned under the form (switch-screen links, legal footnote). */
  footer?: React.ReactNode;
}

/** Shared shell for every signed-out / verification screen: centred, keyboard-safe, pastel badge. */
export function AuthFrame({ title, subtitle, badge, children, footer }: AuthFrameProps) {
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
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.surface }]}>
              <Icon name={badge.icon} size={36} color={colors.ink} />
            </View>
          ) : null}
          <Text variant="largeTitle" accessibilityRole="header" style={styles.center}>
            {title}
          </Text>
          {subtitle ? (
            <Text tone="ink2" style={styles.center}>
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
  head: { alignItems: "center", gap: spacing.md },
  badge: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  center: { textAlign: "center" },
  form: { gap: spacing.md },
});
