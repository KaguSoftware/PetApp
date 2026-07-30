import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * The auth screens' consent line: "By continuing, you agree to…" with tappable
 * Terms / Privacy links. Links are nested Text so the line wraps naturally;
 * the whole footnote carries vertical padding to keep the targets comfortable.
 */
export default function LegalFootnote() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Text style={styles.footnote}>
      By continuing, you agree to our{" "}
      <Text
        style={styles.link}
        onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "terms" } })}
        suppressHighlighting
      >
        Terms of Service
      </Text>{" "}
      and{" "}
      <Text
        style={styles.link}
        onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "privacy" } })}
        suppressHighlighting
      >
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    footnote: {
      marginTop: 16,
      paddingVertical: 8,
      paddingHorizontal: 12,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 19,
      fontFamily: font.regular,
      color: colors.label3,
    },
    link: { fontFamily: font.semibold, color: colors.label2 },
  });
