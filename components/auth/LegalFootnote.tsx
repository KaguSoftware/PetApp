import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { Text } from "@/ui";

/** "By continuing, you agree to…" with tappable Terms / Privacy; legal/[doc] is reachable signed out. */
export function LegalFootnote() {
  return (
    <Text variant="callout" tone="ink3" style={styles.footnote}>
      By continuing, you agree to our{" "}
      <Text
        variant="callout"
        tone="ink2"
        style={styles.link}
        accessibilityRole="link"
        onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "terms" } })}
      >
        Terms of Service
      </Text>{" "}
      and{" "}
      <Text
        variant="callout"
        tone="ink2"
        style={styles.link}
        accessibilityRole="link"
        onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "privacy" } })}
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const styles = StyleSheet.create({
  footnote: { textAlign: "center", paddingVertical: 8, paddingHorizontal: 12 },
  link: { fontFamily: "Inter_600SemiBold" },
});
