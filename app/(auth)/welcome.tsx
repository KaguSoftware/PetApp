import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthProviderButtons } from "@/components/auth/AuthProviderButtons";
import { AuthLink, ErrorText, OrDivider } from "@/components/auth/AuthBits";
import { LegalFootnote } from "@/components/auth/LegalFootnote";
import { BRAND, BRAND_MARK } from "@/lib/brand";
import { Icon, PillButton, Text, spacing, useTheme } from "@/ui";

/** First screen for signed-out users: a pastel hero, then a way in. */
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
        <View style={[styles.blobBig, { backgroundColor: colors.tones.butter.bg }]}>
          <View style={[styles.blobSmall, { backgroundColor: colors.tones.pink.bg, left: -8, top: 20 }]} />
          <View style={[styles.blobSmall, { backgroundColor: colors.tones.ice.bg, right: -8, bottom: 30, width: 56, height: 56, borderRadius: 28 }]} />
          <Icon name="walk" size={96} color={colors.tones.butter.fg} strokeWidth={2} />
        </View>
        <Text variant="display" style={styles.center}>
          {BRAND_MARK}
        </Text>
        <Text tone="ink2" style={styles.center}>
          Little moments of care for your pet, all in one place.
        </Text>
      </View>

      <View style={styles.form}>
        <AuthProviderButtons onError={setError} />
        <OrDivider />
        <PillButton label="Continue with email" variant="secondary" icon="note" onPress={() => router.push("/(auth)/login")} />
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
  hero: { alignItems: "center", gap: spacing.md, paddingTop: spacing["2xl"] },
  blobBig: { width: 200, height: 200, borderRadius: 100, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  blobSmall: { position: "absolute", width: 72, height: 72, borderRadius: 36 },
  center: { textAlign: "center" },
  form: { gap: spacing.md },
});
