import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PushedScreen } from "@/components/Screen";
import { Segmented } from "@/components/ui";
import { isLegalDocId, LEGAL_DOCS, type LegalLang } from "@/lib/legal";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * Renders one legal document (`/legal/terms` or `/legal/privacy`) with an
 * English ⇄ Turkish toggle. Reachable both signed-in (Settings › Legal) and
 * signed-out (the auth screens' consent footnote) — the route is registered
 * OUTSIDE the root layout's Protected blocks for exactly that reason.
 */
export default function LegalDocScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { doc: docParam } = useLocalSearchParams<{ doc: string }>();
  const docId = isLegalDocId(docParam) ? docParam : "terms";
  const [lang, setLang] = useState<LegalLang>("en");
  const doc = LEGAL_DOCS[docId][lang];

  return (
    <PushedScreen title={doc.title}>
      <Segmented
        options={[
          { value: "en", label: "English" },
          { value: "tr", label: "Türkçe" },
        ]}
        value={lang}
        onChange={setLang}
      />
      <Text style={styles.updated}>{doc.updated}</Text>
      {doc.intro.map((p, i) => (
        <Text key={i} style={styles.paragraph}>
          {p}
        </Text>
      ))}
      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          {section.body.map((p, i) =>
            p.startsWith("• ") ? (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={[styles.paragraph, styles.bulletText]}>{p.slice(2)}</Text>
              </View>
            ) : (
              <Text key={i} style={styles.paragraph}>
                {p}
              </Text>
            ),
          )}
        </View>
      ))}
    </PushedScreen>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    updated: { marginTop: 16, fontSize: 13, fontFamily: font.medium, color: colors.label3 },
    section: { marginTop: 8 },
    heading: { marginTop: 16, fontSize: 17, fontFamily: font.semibold, color: colors.label },
    paragraph: { marginTop: 10, fontSize: 15, lineHeight: 22, fontFamily: font.regular, color: colors.label2 },
    bulletRow: { flexDirection: "row", gap: 8, paddingLeft: 4 },
    bulletDot: { marginTop: 10, fontSize: 15, lineHeight: 22, fontFamily: font.regular, color: colors.label3 },
    bulletText: { flex: 1 },
  });
