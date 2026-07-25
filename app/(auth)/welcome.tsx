import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthProviderButtons from "@/components/AuthProviderButtons";
import BrandMark from "@/components/BrandMark";
import { AccentButton } from "@/components/ui";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * First screen for signed-out users: pick a way in. Apple/Google resolve
 * entirely here (session listener navigates); email continues to login.
 */
export default function WelcomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <BrandMark />
        <Text style={styles.subtitle}>Care for your pets, together</Text>
      </View>
      <View style={styles.form}>
        <AuthProviderButtons onError={setError} />
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <AccentButton onPress={() => router.push("/(auth)/login")}>Continue with email</AccentButton>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to PetPal? </Text>
        <Link href="/(auth)/signup" style={styles.footerLink}>
          Create an account
        </Link>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
    header: { alignItems: "center", marginBottom: 40 },
    subtitle: { marginTop: 6, fontSize: 15, fontFamily: font.regular, color: colors.label2 },
    form: { gap: 12 },
    dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
    dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.sep },
    dividerLabel: { fontSize: 13, fontFamily: font.medium, color: colors.label3 },
    error: { color: colors.red, fontSize: 14, fontFamily: font.medium, paddingHorizontal: 4 },
    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12 },
    footerText: { fontSize: 15, fontFamily: font.regular, color: colors.label2 },
    // Padding lifts the link's tap target to >=44pt without shifting the baseline row.
    footerLink: { fontSize: 15, fontFamily: font.semibold, color: colors.accent, paddingVertical: 14, paddingHorizontal: 8 },
  });
