import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProviderButtons } from "@/components/auth/AuthProviderButtons";
import { AuthLink, ErrorText, OrDivider } from "@/components/auth/AuthBits";
import { LegalFootnote } from "@/components/auth/LegalFootnote";
import { BRAND, BRAND_MARK } from "@/lib/brand";
import { PillButton, Text, spacing, useTheme } from "@/ui";

/** First screen for signed-out users: the brand, then a way in. */
export default function WelcomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={styles.hero}>
        <Text variant="largeTitle" accessibilityRole="header">
          {BRAND_MARK}
        </Text>
        <Text tone="ink2">
          Little moments of care for your pet, all in one place.
        </Text>
      </View>

      <View style={styles.form}>
        <AuthProviderButtons onError={setError} />
        <OrDivider />
        <PillButton label="Continue with email" variant="secondary" onPress={() => router.push("/(auth)/login")} />
        <ErrorText message={error} />
      </View>

      <View>
        <AuthLink prefix={`New to ${BRAND}?`} label="Create an account" onPress={() => router.push("/(auth)/signup")} />
        <LegalFootnote />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: spacing["2xl"], gap: spacing["2xl"] },
  hero: { gap: spacing.sm, paddingTop: spacing["4xl"] },
  form: { gap: spacing.md },
});
