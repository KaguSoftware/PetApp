import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { useTheme } from "./theme";
import { layout } from "./tokens";

/**
 * Body of a native formSheet route (`presentation: "formSheet"`, `sheetAllowedDetents:
 * "fitToContents"`): a title, then the form. A plain View, not a ScrollView, so the sheet can
 * measure its contents. Android falls back to a full modal, so it adds the status-bar inset itself.
 */
export function SheetScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View
        style={[
          styles.body,
          {
            backgroundColor: colors.bg,
            paddingTop: Platform.OS === "android" ? insets.top + layout.gutter : layout.section,
            paddingBottom: Math.max(insets.bottom, layout.gutter) + layout.item,
          },
        ]}
      >
        <View style={styles.head}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="callout" tone="ink2">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}

/** Route options for a native form sheet. */
export const formSheetOptions = {
  presentation: "formSheet",
  headerShown: false,
  sheetAllowedDetents: "fitToContents",
  sheetGrabberVisible: true,
  sheetCornerRadius: layout.cardRadius + 8,
} as const;

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: layout.item },
  head: { gap: 4, paddingBottom: layout.headerGap },
});
