import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AuthProviderButtons } from "@/components/auth/AuthProviderButtons";
import { AuthLink, ErrorText, OrDivider } from "@/components/auth/AuthBits";
import { LegalFootnote } from "@/components/auth/LegalFootnote";
import { BRAND, BRAND_MARK } from "@/lib/brand";
import { layout, PillButton, Screen, Text } from "@/ui";

/** First screen for signed-out users: the brand, then a way in. No header; the Screen adds the status-bar inset. */
export default function WelcomeScreen() {
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen headerless contentStyle={styles.content}>
      <View style={styles.hero}>
        <Text variant="largeTitle" accessibilityRole="header">
          {BRAND_MARK}
        </Text>
        <Text tone="ink2">Little moments of care for your pet, all in one place.</Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "space-between" },
  hero: { gap: layout.headerGap, paddingTop: layout.section },
  form: { gap: layout.item },
});
