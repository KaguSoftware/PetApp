import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { isLegalDocId, LEGAL_DOCS, type LegalLang } from "@/lib/legal";
import { Chip, Screen, Text, spacing } from "@/ui";

/**
 * One legal document (`/legal/terms` or `/legal/privacy`) with an English /
 * Turkish toggle. Reachable signed in (Settings) and signed out (the consent
 * footnote), hence registered outside the root Protected blocks.
 */
export default function LegalDocScreen() {
  const { doc: docParam } = useLocalSearchParams<{ doc: string }>();
  const docId = isLegalDocId(docParam) ? docParam : "terms";
  const [lang, setLang] = useState<LegalLang>("en");
  const doc = LEGAL_DOCS[docId][lang];

  return (
    <Screen title={doc.title} back>
      <View style={styles.langs}>
        <Chip label="English" selected={lang === "en"} onPress={() => setLang("en")} />
        <Chip label="Türkçe" selected={lang === "tr"} onPress={() => setLang("tr")} />
      </View>
      <Text variant="caption" tone="ink3">
        {doc.updated}
      </Text>
      {doc.intro.map((p, i) => (
        <Text key={i} tone="ink2">
          {p}
        </Text>
      ))}
      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text variant="heading">{section.heading}</Text>
          {section.body.map((p, i) =>
            p.startsWith("• ") ? (
              <View key={i} style={styles.bullet}>
                <Text tone="ink3">•</Text>
                <Text tone="ink2" style={styles.bulletText}>
                  {p.slice(2)}
                </Text>
              </View>
            ) : (
              <Text key={i} tone="ink2">
                {p}
              </Text>
            ),
          )}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  langs: { flexDirection: "row", gap: spacing.sm },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  bullet: { flexDirection: "row", gap: spacing.sm, paddingLeft: spacing.xs },
  bulletText: { flex: 1 },
});
