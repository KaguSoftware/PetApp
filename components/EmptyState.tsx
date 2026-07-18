import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icons";
import { AccentButton } from "@/components/ui";
import { colors, font, radius } from "@/lib/theme";

export default function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: IconName;
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={26} color={colors.label2} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {cta && onCta ? (
        <View style={styles.ctaWrap}>
          <AccentButton variant="tinted" size="sm" onPress={onCta}>
            {cta}
          </AccentButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", borderRadius: radius.md, backgroundColor: colors.card, paddingHorizontal: 24, paddingVertical: 36 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 12, fontSize: 15, fontFamily: font.semibold, color: colors.label },
  body: { marginTop: 4, maxWidth: 240, fontSize: 13, fontFamily: font.regular, color: colors.label2, textAlign: "center", lineHeight: 18 },
  ctaWrap: { marginTop: 16, width: "100%", maxWidth: 220 },
});
