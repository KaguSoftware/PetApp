import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { isLegalDocId, LEGAL_DOCS, type LegalLang } from "@/lib/legal";
import { layout, Screen, Text, useHeaderIcon } from "@/ui";

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
  const langIcon = useHeaderIcon("globe", "language");

  return (
    <>
    <Stack.Screen options={{ title: doc.title }} />
    <Stack.Toolbar placement="right">
      {langIcon ? (
        <Stack.Toolbar.Menu icon={langIcon} title="Language" accessibilityLabel="Language">
          <Stack.Toolbar.Menu inline>
            <Stack.Toolbar.MenuAction isOn={lang === "en"} onPress={() => setLang("en")}>
              English
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction isOn={lang === "tr"} onPress={() => setLang("tr")}>
              Türkçe
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      ) : null}
    </Stack.Toolbar>
    <Screen contentStyle={styles.body}>
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
          <Text variant="headline">{section.heading}</Text>
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
    </>
  );
}

const styles = StyleSheet.create({
  body: { gap: layout.item },
  section: { gap: layout.item, marginTop: layout.item },
  bullet: { flexDirection: "row", gap: layout.headerGap, paddingLeft: 4 },
  bulletText: { flex: 1 },
});
